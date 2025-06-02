import { Router } from "express";
import { isAuthenticated } from "../googleAuth";
import { supabase } from "../db";

const router = Router();

// Get user settings
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    // Get user profile data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id,
        email,
        first_name,
        last_name,
        profile_image_url,
        subscription_status,
        subscription_plan,
        created_at
      `)
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user:", userError);
      return res.status(500).json({ error: "Failed to fetch user data" });
    }

    // Get user preferences (if they exist)
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Get notification preferences
    const { data: notificationPrefs } = await supabase
      .from("telegram_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Default settings structure
    const defaultSettings = {
      profile: {
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: "",
        bio: "",
        avatar: user.profile_image_url || "",
      },
      preferences: {
        theme: preferences?.theme || "dark",
        language: preferences?.language || "en",
        timezone: preferences?.timezone || "UTC",
        layout: preferences?.layout || "expanded",
        defaultTimeRange: preferences?.default_time_range || "30",
      },
      notifications: {
        email: {
          systemUpdates: notificationPrefs?.system_announcements ?? true,
          billing: true,
          automationAlerts: notificationPrefs?.job_failed ?? true,
          weeklyReports: notificationPrefs?.daily_summary ?? false,
        },
        inApp: {
          enabled: true,
          sound: true,
          desktop: true,
        },
        frequency: "immediate",
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 30,
        loginNotifications: true,
      },
      automation: {
        defaultConfigs: {},
        apiKeys: [],
      },
    };

    res.json(defaultSettings);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user settings
router.patch("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const settings = req.body;

    // Update user profile if provided
    if (settings.profile) {
      const { error: profileError } = await supabase
        .from("users")
        .update({
          first_name: settings.profile.firstName,
          last_name: settings.profile.lastName,
          profile_image_url: settings.profile.avatar,
        })
        .eq("id", userId);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return res.status(500).json({ error: "Failed to update profile" });
      }
    }

    // Update preferences if provided
    if (settings.preferences) {
      const { error: prefsError } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: userId,
          theme: settings.preferences.theme,
          language: settings.preferences.language,
          timezone: settings.preferences.timezone,
          layout: settings.preferences.layout,
          default_time_range: settings.preferences.defaultTimeRange,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (prefsError) {
        console.error("Error updating preferences:", prefsError);
        return res.status(500).json({ error: "Failed to update preferences" });
      }
    }

    // Update notification preferences if provided
    if (settings.notifications) {
      const { error: notifError } = await supabase
        .from("telegram_preferences")
        .upsert({
          user_id: userId,
          system_announcements: settings.notifications.email.systemUpdates,
          job_failed: settings.notifications.email.automationAlerts,
          daily_summary: settings.notifications.email.weeklyReports,
          lead_generation_complete: true,
          research_report_complete: true,
          plan_limit_reached: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (notifError) {
        console.error("Error updating notifications:", notifError);
        return res.status(500).json({ error: "Failed to update notifications" });
      }
    }

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
