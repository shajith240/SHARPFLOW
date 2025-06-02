import { Router } from "express";
import { supabase } from "../db";
import { isAuthenticated } from "../googleAuth";

const router = Router();

// Activate user subscription (called after PayPal payment)
router.post("/activate", async (req, res) => {
  try {
    const { userEmail, planName, paypalCustomerId, paypalSubscriptionId } =
      req.body;

    if (!userEmail || !planName) {
      return res
        .status(400)
        .json({ error: "User email and plan name are required" });
    }

    console.log(`🔄 Activating subscription for ${userEmail}: ${planName}`);

    // Call the database function to activate subscription
    const { data: result, error } = await supabase.rpc(
      "activate_user_subscription",
      {
        user_email: userEmail,
        plan_name: planName,
        paypal_customer_id: paypalCustomerId,
      }
    );

    if (error) {
      console.error("❌ Subscription activation error:", error);
      return res.status(500).json({ error: "Failed to activate subscription" });
    }

    const activationResult = result[0];

    if (!activationResult.success) {
      return res.status(404).json({ error: activationResult.message });
    }

    // Update additional PayPal fields if provided
    if (paypalSubscriptionId) {
      await supabase
        .from("users")
        .update({
          paypal_subscription_id: paypalSubscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activationResult.user_id);
    }

    console.log(
      `✅ Subscription activated successfully for user: ${activationResult.user_id}`
    );

    // Get user stats after activation
    const { data: userStats, error: statsError } = await supabase.rpc(
      "get_user_stats",
      { target_user_id: activationResult.user_id }
    );

    if (statsError) {
      console.error("Warning: Could not fetch user stats:", statsError);
    }

    res.json({
      success: true,
      message: "Subscription activated successfully",
      userId: activationResult.user_id,
      userStats: userStats?.[0] || null,
    });
  } catch (error) {
    console.error("❌ Subscription activation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user subscription status
router.get("/status", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    const { data: user, error } = await supabase
      .from("users")
      .select(
        `
        subscription_status,
        subscription_plan,
        subscription_period_end,
        bot_status,
        paypal_customer_id,
        created_at
      `
      )
      .eq("id", userId)
      .single();

    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to fetch subscription status" });
    }

    // Get user stats
    const { data: userStats, error: statsError } = await supabase.rpc(
      "get_user_stats",
      { target_user_id: userId }
    );

    if (statsError) {
      console.error("Warning: Could not fetch user stats:", statsError);
    }

    res.json({
      subscription: {
        status: user.subscription_status,
        plan: user.subscription_plan,
        periodEnd: user.subscription_period_end,
        botStatus: user.bot_status,
        hasPaypalId: !!user.paypal_customer_id,
        accountCreated: user.created_at,
      },
      stats: userStats?.[0] || null,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deactivate subscription
router.post("/deactivate", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    const { error } = await supabase
      .from("users")
      .update({
        subscription_status: "inactive",
        subscription_period_end: new Date().toISOString(),
        bot_status: "not_configured",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to deactivate subscription" });
    }

    console.log(`🔄 Subscription deactivated for user: ${userId}`);
    res.json({
      success: true,
      message: "Subscription deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Verify data isolation for user
router.get("/verify-isolation", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    const { data: isolationCheck, error } = await supabase.rpc(
      "verify_data_isolation",
      { test_user_id: userId }
    );

    if (error) {
      return res.status(500).json({ error: "Failed to verify data isolation" });
    }

    const allIsolated = isolationCheck.every((check) =>
      check.isolation_status.includes("✅")
    );

    res.json({
      isolated: allIsolated,
      details: isolationCheck,
      message: allIsolated
        ? "Data isolation verified ✅"
        : "Data isolation issues detected ❌",
    });
  } catch (error) {
    console.error("Error verifying data isolation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Get system overview
router.get("/admin/overview", isAuthenticated, async (req, res) => {
  try {
    // TODO: Add admin role check here
    const userId = (req.user as any)?.id;

    // For now, allow any authenticated user to see overview
    // In production, add proper admin role verification

    const { data: overview, error } = await supabase.rpc("get_system_overview");

    if (error) {
      return res.status(500).json({ error: "Failed to fetch system overview" });
    }

    res.json({
      overview: overview[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system overview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Get all users with stats
router.get("/admin/users", isAuthenticated, async (req, res) => {
  try {
    // TODO: Add admin role check here
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: users, error } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        first_name,
        last_name,
        subscription_status,
        subscription_plan,
        bot_status,
        created_at,
        updated_at,
        bot_last_activity
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return res.status(500).json({ error: "Failed to count users" });
    }

    res.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Get detailed user stats
router.get("/admin/users/:userId/stats", isAuthenticated, async (req, res) => {
  try {
    // TODO: Add admin role check here
    const targetUserId = req.params.userId;

    const { data: userStats, error } = await supabase.rpc("get_user_stats", {
      target_user_id: targetUserId,
    });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch user stats" });
    }

    if (!userStats || userStats.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get data isolation verification
    const { data: isolationCheck, error: isolationError } = await supabase.rpc(
      "verify_data_isolation",
      { test_user_id: targetUserId }
    );

    res.json({
      stats: userStats[0],
      isolation: {
        verified:
          !isolationError &&
          isolationCheck?.every((check) =>
            check.isolation_status.includes("✅")
          ),
        details: isolationCheck || [],
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Test endpoint for subscription activation
router.post("/test-activation", async (req, res) => {
  try {
    const { userEmail, planName } = req.body;

    if (!userEmail || !planName) {
      return res
        .status(400)
        .json({ error: "User email and plan name are required" });
    }

    // This is a test endpoint - in production, this would be called by PayPal webhook
    const activationResponse = await fetch(
      `${
        process.env.BASE_URL || "http://localhost:3000"
      }/api/subscription/activate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail,
          planName,
          paypalCustomerId: `test_customer_${Date.now()}`,
          paypalSubscriptionId: `test_sub_${Date.now()}`,
        }),
      }
    );

    const result = await activationResponse.json();

    res.json({
      test: true,
      result,
      message: "Test activation completed",
    });
  } catch (error) {
    console.error("Error in test activation:", error);
    res.status(500).json({ error: "Test activation failed" });
  }
});

export default router;
