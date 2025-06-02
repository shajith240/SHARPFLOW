import express from "express";
import { supabase } from "../db";
import { TelegramNotificationService } from "../services/TelegramNotificationService";
import { isAuthenticated } from "../googleAuth";
const router = express.Router();

// Generate verification code for linking Telegram account
router.post("/generate-link-code", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in database
    const { error } = await supabase.from("telegram_verification_codes").upsert(
      {
        user_id: userId,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
        used: false,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      verificationCode,
      expiresAt: expiresAt.toISOString(),
      instructions: "Send this code to your Telegram bot to link your account",
    });
  } catch (error) {
    console.error("Failed to generate verification code:", error);
    res.status(500).json({ error: "Failed to generate verification code" });
  }
});

// Link Telegram account
router.post("/link", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { telegramId, username, verificationCode } = req.body;

    // Verify the code
    const { data: verification } = await supabase
      .from("telegram_verification_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("verification_code", verificationCode)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (!verification) {
      return res.status(400).json({
        error: "Invalid or expired verification code",
      });
    }

    // Check if Telegram ID is already linked to another account
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .neq("id", userId)
      .single();

    if (existingUser) {
      return res.status(400).json({
        error: "This Telegram account is already linked to another user",
      });
    }

    // Link the account
    await TelegramNotificationService.linkTelegramAccount(
      userId,
      telegramId,
      username
    );

    // Mark verification code as used
    await supabase
      .from("telegram_verification_codes")
      .update({ used: true })
      .eq("user_id", userId);

    res.json({
      success: true,
      message: "Telegram account linked successfully",
      telegramId,
      username,
    });
  } catch (error) {
    console.error("Failed to link Telegram account:", error);
    res.status(500).json({ error: "Failed to link Telegram account" });
  }
});

// Unlink Telegram account
router.post("/unlink", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    await TelegramNotificationService.unlinkTelegramAccount(userId);

    res.json({
      success: true,
      message: "Telegram account unlinked successfully",
    });
  } catch (error) {
    console.error("Failed to unlink Telegram account:", error);
    res.status(500).json({ error: "Failed to unlink Telegram account" });
  }
});

// Get Telegram account status
router.get("/status", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user } = await supabase
      .from("users")
      .select("telegram_id, telegram_username, telegram_linked_at")
      .eq("id", userId)
      .single();

    const isLinked = !!user?.telegram_id;

    res.json({
      isLinked,
      telegramId: user?.telegram_id || null,
      username: user?.telegram_username || null,
      linkedAt: user?.telegram_linked_at || null,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || "sharpflow_bot",
    });
  } catch (error) {
    console.error("Failed to get Telegram status:", error);
    res.status(500).json({ error: "Failed to get Telegram status" });
  }
});

// Test Telegram notification (for debugging)
router.post("/test-notification", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Check if user has Telegram linked
    const { data: user } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", userId)
      .single();

    if (!user?.telegram_id) {
      return res.status(400).json({ error: "Telegram account not linked" });
    }

    // Send test message
    const testMessage = `🧪 **Test Notification**\n\n${message}\n\n📱 Sent from SharpFlow Dashboard`;

    await TelegramNotificationService.sendMessage(
      user.telegram_id,
      testMessage
    );

    res.json({
      success: true,
      message: "Test notification sent successfully",
    });
  } catch (error) {
    console.error("Failed to send test notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// Get notification preferences
router.get("/preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: preferences } = await supabase
      .from("telegram_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Default preferences if none exist
    const defaultPreferences = {
      leadGenerationComplete: true,
      researchReportComplete: true,
      jobFailed: true,
      planLimitReached: true,
      dailySummary: false,
      systemAnnouncements: true,
    };

    res.json({
      preferences: preferences || defaultPreferences,
    });
  } catch (error) {
    console.error("Failed to get notification preferences:", error);
    res.status(500).json({ error: "Failed to get notification preferences" });
  }
});

// Update notification preferences
router.put("/preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    // Validate preferences
    const validKeys = [
      "leadGenerationComplete",
      "researchReportComplete",
      "jobFailed",
      "planLimitReached",
      "dailySummary",
      "systemAnnouncements",
    ];

    const filteredPreferences = {};
    for (const key of validKeys) {
      if (typeof preferences[key] === "boolean") {
        filteredPreferences[key] = preferences[key];
      }
    }

    // Upsert preferences
    const { error } = await supabase.from("telegram_preferences").upsert(
      {
        user_id: userId,
        ...filteredPreferences,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "Notification preferences updated",
      preferences: filteredPreferences,
    });
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    res
      .status(500)
      .json({ error: "Failed to update notification preferences" });
  }
});

// Admin endpoint to broadcast announcement
router.post("/admin/broadcast", isAuthenticated, async (req, res) => {
  try {
    // Check if user is admin (you'll need to implement admin check)
    const isAdmin = req.user.role === "admin"; // Adjust based on your auth system

    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { message, planFilter } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await TelegramNotificationService.broadcastAnnouncement(
      message,
      planFilter
    );

    res.json({
      success: true,
      message: "Announcement broadcasted",
      sentTo: result.sent,
    });
  } catch (error) {
    console.error("Failed to broadcast announcement:", error);
    res.status(500).json({ error: "Failed to broadcast announcement" });
  }
});

export default router;
