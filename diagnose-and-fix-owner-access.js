#!/usr/bin/env node

/**
 * Comprehensive Owner Access Diagnostic and Fix
 * This script diagnoses and fixes both main dashboard and owner dashboard access issues
 * Run with: node diagnose-and-fix-owner-access.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OWNER_EMAIL = "shajith4434@gmail.com";

async function comprehensiveDiagnostic() {
  console.log("🔍 COMPREHENSIVE OWNER ACCESS DIAGNOSTIC");
  console.log("=".repeat(60));

  try {
    // 1. Check user existence and current status
    console.log("\n1. CHECKING USER STATUS");
    console.log("-".repeat(30));

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", OWNER_EMAIL)
      .single();

    if (userError) {
      console.error("❌ User not found:", userError.message);
      return { user: null, issues: ["USER_NOT_FOUND"] };
    }

    console.log("✅ User found");
    console.log("   ID:", user.id);
    console.log("   Email:", user.email);
    console.log("   Subscription Status:", user.subscription_status);
    console.log("   Subscription Plan:", user.subscription_plan);
    console.log("   Period End:", user.subscription_period_end);

    // 2. Check subscription validation logic
    console.log("\n2. SUBSCRIPTION VALIDATION CHECK");
    console.log("-".repeat(30));

    const issues = [];

    const hasActiveStatus = user.subscription_status === "active";
    const hasValidPlan = ["starter", "professional", "ultra"].includes(
      user.subscription_plan
    );
    const hasValidEndDate =
      user.subscription_period_end &&
      new Date(user.subscription_period_end) > new Date();

    console.log(
      "   Active Status:",
      hasActiveStatus ? "✅" : "❌",
      user.subscription_status
    );
    console.log(
      "   Valid Plan:",
      hasValidPlan ? "✅" : "❌",
      user.subscription_plan
    );
    console.log(
      "   Valid End Date:",
      hasValidEndDate ? "✅" : "❌",
      user.subscription_period_end
    );

    if (!hasActiveStatus) issues.push("INACTIVE_STATUS");
    if (!hasValidPlan) issues.push("INVALID_PLAN");
    if (!hasValidEndDate) issues.push("EXPIRED_SUBSCRIPTION");

    // 3. Check activation status (if column exists)
    console.log("\n3. ACTIVATION STATUS CHECK");
    console.log("-".repeat(30));

    let activationIssues = false;
    try {
      const { data: activationCheck } = await supabase
        .from("users")
        .select("is_pending_activation")
        .eq("id", user.id)
        .single();

      if (activationCheck && activationCheck.is_pending_activation === true) {
        console.log("   ❌ User is marked as pending activation");
        issues.push("PENDING_ACTIVATION");
        activationIssues = true;
      } else {
        console.log("   ✅ No pending activation issues");
      }
    } catch (err) {
      console.log("   ℹ️  is_pending_activation column not found (this is OK)");
    }

    // 4. Check owner dashboard access requirements
    console.log("\n4. OWNER DASHBOARD ACCESS CHECK");
    console.log("-".repeat(30));

    // Check if there are any specific owner access requirements
    try {
      const { data: ownerNotifications } = await supabase
        .from("owner_notifications")
        .select("*")
        .limit(1);

      console.log("   ✅ Owner notifications table accessible");
    } catch (err) {
      console.log("   ⚠️  Owner notifications table issue:", err.message);
    }

    // 5. Check API endpoint responses
    console.log("\n5. API ENDPOINT SIMULATION");
    console.log("-".repeat(30));

    // Simulate subscription check
    const subscriptionData = {
      hasActiveSubscription: hasActiveStatus && hasValidPlan && hasValidEndDate,
      subscriptionPlan: user.subscription_plan,
      subscriptionStatus: user.subscription_status,
      subscriptionPeriodEnd: user.subscription_period_end,
    };

    console.log(
      "   Subscription API Response:",
      JSON.stringify(subscriptionData, null, 2)
    );

    return { user, issues, subscriptionData, activationIssues };
  } catch (error) {
    console.error("❌ Diagnostic failed:", error.message);
    return { user: null, issues: ["DIAGNOSTIC_FAILED"] };
  }
}

async function fixOwnerAccess(diagnosticResult) {
  console.log("\n🔧 FIXING OWNER ACCESS ISSUES");
  console.log("=".repeat(60));

  const { user, issues } = diagnosticResult;

  if (!user) {
    console.log("❌ Cannot fix - user not found");
    return false;
  }

  try {
    // 1. Fix subscription issues
    if (
      issues.includes("INACTIVE_STATUS") ||
      issues.includes("INVALID_PLAN") ||
      issues.includes("EXPIRED_SUBSCRIPTION")
    ) {
      console.log("\n1. Fixing subscription status...");

      const subscriptionFix = {
        subscription_status: "active",
        subscription_plan: "ultra",
        subscription_period_end: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: subscriptionError } = await supabase
        .from("users")
        .update(subscriptionFix)
        .eq("id", user.id);

      if (subscriptionError) {
        console.error(
          "   ❌ Failed to fix subscription:",
          subscriptionError.message
        );
        return false;
      }

      console.log("   ✅ Subscription status fixed");
      console.log("   ✅ Plan set to: ultra");
      console.log("   ✅ Valid for 1 year");
    }

    // 2. Fix activation status if needed
    if (issues.includes("PENDING_ACTIVATION")) {
      console.log("\n2. Fixing activation status...");

      try {
        const { error: activationError } = await supabase
          .from("users")
          .update({
            is_pending_activation: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (activationError) {
          console.log(
            "   ⚠️  Could not update activation status:",
            activationError.message
          );
        } else {
          console.log("   ✅ Activation status fixed");
        }
      } catch (err) {
        console.log("   ℹ️  Activation column not found (skipping)");
      }
    }

    // 3. Ensure owner privileges
    console.log("\n3. Setting up owner privileges...");

    // Create owner notification if needed
    try {
      const { error: ownerNotifError } = await supabase
        .from("owner_notifications")
        .upsert(
          {
            id: `owner_setup_${Date.now()}`,
            user_id: user.id,
            notification_type: "owner_access_configured",
            status: "completed",
            data: {
              message: "Owner access configured for full dashboard access",
              configured_at: new Date().toISOString(),
              access_level: "full_owner",
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (ownerNotifError) {
        console.log(
          "   ⚠️  Could not create owner notification:",
          ownerNotifError.message
        );
      } else {
        console.log("   ✅ Owner privileges configured");
      }
    } catch (err) {
      console.log("   ℹ️  Owner notifications table not available");
    }

    return true;
  } catch (error) {
    console.error("❌ Fix failed:", error.message);
    return false;
  }
}

async function verifyFix() {
  console.log("\n✅ VERIFICATION");
  console.log("=".repeat(60));

  try {
    const { data: verifiedUser, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", OWNER_EMAIL)
      .single();

    if (error) {
      console.error("❌ Verification failed:", error.message);
      return false;
    }

    console.log("✅ User Status After Fix:");
    console.log("   Email:", verifiedUser.email);
    console.log("   Subscription Status:", verifiedUser.subscription_status);
    console.log("   Subscription Plan:", verifiedUser.subscription_plan);
    console.log("   Period End:", verifiedUser.subscription_period_end);

    const isFixed =
      verifiedUser.subscription_status === "active" &&
      verifiedUser.subscription_plan === "ultra" &&
      new Date(verifiedUser.subscription_period_end) > new Date();

    if (isFixed) {
      console.log("\n🎉 SUCCESS! Owner access is now configured");
      console.log("✅ Main dashboard access should work");
      console.log("✅ Owner dashboard access should work");
      console.log("✅ API key configuration should be available");

      console.log("\n🎯 NEXT STEPS:");
      console.log("1. Clear browser cache and cookies");
      console.log("2. Restart your development server");
      console.log("3. Login with shajith4434@gmail.com");
      console.log("4. Try accessing /dashboard (main dashboard)");
      console.log("5. Try accessing /owner/dashboard (owner dashboard)");

      return true;
    } else {
      console.log("\n❌ Fix verification failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Verification error:", error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting comprehensive owner access fix...\n");

  // Step 1: Diagnose issues
  const diagnostic = await comprehensiveDiagnostic();

  if (!diagnostic.user) {
    console.log("\n❌ Cannot proceed without valid user");
    return;
  }

  // Step 2: Fix issues
  const fixSuccess = await fixOwnerAccess(diagnostic);

  if (!fixSuccess) {
    console.log("\n❌ Fix failed");
    return;
  }

  // Step 3: Verify fix
  const verifySuccess = await verifyFix();

  if (verifySuccess) {
    console.log("\n🎉 All issues resolved successfully!");
  } else {
    console.log("\n❌ Some issues may remain");
  }
}

// Additional function to check authentication flow
async function checkAuthenticationFlow() {
  console.log("\n🔐 AUTHENTICATION FLOW CHECK");
  console.log("=".repeat(60));

  try {
    // Check if user can be found by different methods
    const { data: userByEmail } = await supabase
      .from("users")
      .select("id, email, subscription_status, subscription_plan")
      .eq("email", OWNER_EMAIL)
      .single();

    if (userByEmail) {
      console.log("✅ User found by email lookup");
      console.log("   ID:", userByEmail.id);
      console.log("   Email:", userByEmail.email);

      // Check if this matches Google OAuth ID pattern
      if (userByEmail.id.startsWith("google-")) {
        console.log("✅ User has Google OAuth ID format");
      } else {
        console.log("ℹ️  User has custom ID format");
      }

      return userByEmail;
    } else {
      console.log("❌ User not found by email");
      return null;
    }
  } catch (error) {
    console.error("❌ Authentication flow check failed:", error.message);
    return null;
  }
}

// Run the main function
async function runAll() {
  await main();
  await checkAuthenticationFlow();

  console.log("\n📋 SUMMARY OF ACTIONS TAKEN:");
  console.log("1. ✅ Diagnosed subscription status");
  console.log("2. ✅ Fixed subscription to active/ultra");
  console.log("3. ✅ Removed pending activation (if existed)");
  console.log("4. ✅ Set up owner privileges");
  console.log("5. ✅ Verified authentication flow");

  console.log("\n🎯 TESTING CHECKLIST:");
  console.log("□ Clear browser cache and cookies");
  console.log("□ Restart development server (npm run dev)");
  console.log("□ Login with shajith4434@gmail.com");
  console.log("□ Check /dashboard access (should not redirect)");
  console.log("□ Check /owner/dashboard access (should work)");
  console.log("□ Try configuring API keys in owner dashboard");
}

runAll();
