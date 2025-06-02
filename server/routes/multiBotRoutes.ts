import { Router } from "express";
import { supabase } from "../db";
import { isAuthenticated } from "../googleAuth";

const router = Router();

// Get user's bot configuration
router.get("/config", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    const { data: user, error } = await supabase
      .from("users")
      .select(
        `
        telegram_bot_token,
        telegram_bot_username,
        n8n_webhook_url,
        bot_status,
        bot_last_activity
      `
      )
      .eq("id", userId)
      .single();

    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to fetch bot configuration" });
    }

    // Don't send sensitive data to frontend
    res.json({
      botToken: user.telegram_bot_token ? "***masked***" : "",
      botUsername: user.telegram_bot_username || "",
      webhookUrl: user.n8n_webhook_url || "",
      status: user.bot_status || "not_configured",
      lastActivity: user.bot_last_activity,
    });
  } catch (error) {
    console.error("Error fetching bot config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save user's bot configuration
router.post("/config", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { botToken, botUsername, webhookUrl } = req.body;

    // Validate required fields
    if (!botToken || !botUsername || !webhookUrl) {
      return res
        .status(400)
        .json({ error: "Bot token, username, and webhook URL are required" });
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch {
      return res.status(400).json({ error: "Invalid webhook URL format" });
    }

    // Validate bot token format
    if (!botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return res.status(400).json({ error: "Invalid bot token format" });
    }

    const updateData: any = {
      n8n_webhook_url: webhookUrl,
      telegram_bot_username: botUsername,
      bot_status: "configured",
    };

    // Only update bot token if it's not masked
    if (botToken !== "***masked***") {
      updateData.telegram_bot_token = botToken;
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to save bot configuration" });
    }

    console.log(
      `✅ Bot configuration saved for user: ${userId} (@${botUsername})`
    );
    res.json({
      success: true,
      message: "Bot configuration saved successfully",
    });
  } catch (error) {
    console.error("Error saving bot config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Test bot connection
router.post("/test", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { botToken, webhookUrl } = req.body;

    if (!botToken || botToken === "***masked***") {
      return res
        .status(400)
        .json({ error: "Bot token is required for testing" });
    }

    // Test bot token with Telegram API
    const botResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    );
    const botInfo = await botResponse.json();

    if (!botInfo.ok) {
      return res.status(400).json({ error: "Invalid bot token" });
    }

    // Test webhook if provided
    if (webhookUrl) {
      const startTime = Date.now();

      const testPayload = {
        type: "connection_test",
        message: "test connection from sharpflow",
        user: {
          id: userId,
          source: "bot_test",
        },
        timestamp: new Date().toISOString(),
      };

      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SharpFlow-BotTest/1.0",
          },
          body: JSON.stringify(testPayload),
          timeout: 10000,
        });

        const responseTime = Date.now() - startTime;

        if (!webhookResponse.ok) {
          return res.status(400).json({
            error: `Webhook test failed: ${webhookResponse.status} ${webhookResponse.statusText}`,
          });
        }
      } catch (webhookError) {
        return res.status(400).json({ error: "Webhook connection failed" });
      }
    }

    // Update user status to active
    await supabase
      .from("users")
      .update({
        bot_status: "active",
        telegram_bot_username: botInfo.result.username,
      })
      .eq("id", userId);

    console.log(
      `✅ Bot test successful for user ${userId}: @${botInfo.result.username}`
    );
    res.json({
      success: true,
      botUsername: botInfo.result.username,
      message: "Bot test successful",
    });
  } catch (error) {
    console.error("Error testing bot:", error);
    res.status(500).json({ error: "Bot test failed" });
  }
});

// Get bot statistics
router.get("/stats", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    // Get activity stats
    const { data: activityStats, error: activityError } = await supabase
      .from("bot_activity_logs")
      .select(
        "processing_status, leads_generated, reports_generated, created_at"
      )
      .eq("user_id", userId);

    if (activityError) {
      return res.status(500).json({ error: "Failed to fetch activity stats" });
    }

    // Get leads count
    const { count: leadsCount, error: leadsError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (leadsError) {
      return res.status(500).json({ error: "Failed to fetch leads count" });
    }

    // Get reports count
    const { count: reportsCount, error: reportsError } = await supabase
      .from("research_reports")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (reportsError) {
      return res.status(500).json({ error: "Failed to fetch reports count" });
    }

    // Calculate stats
    const totalMessages = activityStats?.length || 0;
    const totalLeadsGenerated =
      activityStats?.reduce(
        (sum, log) => sum + (log.leads_generated || 0),
        0
      ) || 0;
    const totalReportsGenerated =
      activityStats?.reduce(
        (sum, log) => sum + (log.reports_generated || 0),
        0
      ) || 0;

    // Last week activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lastWeekActivity =
      activityStats?.filter((log) => new Date(log.created_at) > oneWeekAgo)
        .length || 0;

    res.json({
      totalMessages,
      leadsGenerated: Math.max(totalLeadsGenerated, leadsCount || 0),
      reportsCreated: Math.max(totalReportsGenerated, reportsCount || 0),
      lastWeekActivity,
    });
  } catch (error) {
    console.error("Error fetching bot stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bot activity logs
router.get("/activity-logs", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const { data: logs, error } = await supabase
      .from("bot_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch activity logs" });
    }

    res.json({ logs: logs || [] });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Process message from user's dedicated bot (called by multi-bot webhook handler)
router.post("/process-message", async (req, res) => {
  try {
    const {
      userId,
      botUsername,
      telegramChatId,
      telegramUserId,
      messageType,
      messageContent,
    } = req.body;

    if (!userId || !messageContent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user's configuration
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("n8n_webhook_url, bot_status, telegram_bot_username")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.bot_status !== "active" || !user.n8n_webhook_url) {
      return res
        .status(400)
        .json({ error: "User bot not configured or inactive" });
    }

    const startTime = Date.now();

    // Create activity log entry
    const { data: logEntry, error: logError } = await supabase
      .from("bot_activity_logs")
      .insert({
        user_id: userId,
        bot_username: botUsername,
        telegram_chat_id: telegramChatId,
        telegram_user_id: telegramUserId,
        message_type: messageType,
        message_content: messageContent,
        n8n_webhook_url: user.n8n_webhook_url,
        processing_status: "pending",
      })
      .select()
      .single();

    if (logError) {
      return res.status(500).json({ error: "Failed to create activity log" });
    }

    // Prepare payload for n8n (direct passthrough)
    const n8nPayload = {
      type: "telegram_message",
      message: messageContent,
      message_type: messageType,
      user: {
        id: userId,
        telegram_chat_id: telegramChatId,
        telegram_user_id: telegramUserId,
        sharpflow_log_id: logEntry.id,
      },
      callback_url: `${
        process.env.BASE_URL || "http://localhost:3000"
      }/api/multi-bot/n8n-callback`,
      timestamp: new Date().toISOString(),
    };

    // Forward to user's n8n workflow
    const response = await fetch(user.n8n_webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SharpFlow-MultiBot/1.0",
        "X-SharpFlow-User-ID": userId,
        "X-SharpFlow-Log-ID": logEntry.id,
      },
      body: JSON.stringify(n8nPayload),
      timeout: 30000,
    });

    const processingTime = Date.now() - startTime;

    if (response.ok) {
      const responseData = await response.json();

      // Update log with success
      await supabase
        .from("bot_activity_logs")
        .update({
          processing_status: "processing",
          n8n_execution_id: responseData.executionId,
          processing_time_ms: processingTime,
        })
        .eq("id", logEntry.id);

      console.log(
        `✅ Message processed for user ${userId} via @${botUsername}: "${messageContent}"`
      );
      res.json({
        success: true,
        logId: logEntry.id,
        executionId: responseData.executionId,
        message: "Message forwarded to n8n workflow",
      });
    } else {
      // Update log with error
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      await supabase
        .from("bot_activity_logs")
        .update({
          processing_status: "failed",
          error_message: errorMessage,
          processing_time_ms: processingTime,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);

      console.error(
        `❌ Failed to process message for user ${userId}: ${errorMessage}`
      );
      res
        .status(400)
        .json({ error: `Failed to process message: ${errorMessage}` });
    }
  } catch (error) {
    console.error("Error processing bot message:", error);
    res.status(500).json({ error: "Message processing failed" });
  }
});

// n8n callback endpoint for receiving processed data
router.post("/n8n-callback", async (req, res) => {
  try {
    const {
      sharpflow_log_id,
      user_id,
      leads_data,
      reports_data,
      status,
      error_message,
    } = req.body;

    if (!sharpflow_log_id || !user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update activity log
    const logUpdate: any = {
      processing_status: status || "completed",
      completed_at: new Date().toISOString(),
    };

    if (error_message) {
      logUpdate.error_message = error_message;
      logUpdate.processing_status = "failed";
    }

    let leadsCreated = 0;
    let reportsCreated = 0;

    // Insert leads data
    if (leads_data && Array.isArray(leads_data) && leads_data.length > 0) {
      const leadsToInsert = leads_data.map((lead) => ({
        user_id,
        full_name:
          lead.full_name ||
          `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
        email_address: lead.email_address || lead.email,
        phone_number: lead.phone_number || lead.phone,
        country: lead.country,
        location:
          lead.location ||
          `${lead.city || ""}, ${lead.state || ""}`
            .trim()
            .replace(/^,\s*|,\s*$/g, ""),
        industry: lead.industry,
        company_name: lead.company_name,
        job_title: lead.job_title,
        seniority: lead.seniority,
        website_url: lead.website_url || lead.company_website,
        linkedin_url: lead.linkedin_url,
        research_report: lead.research_report,
        lead_score: lead.lead_score || 0,
        source: "telegram",
        apollo_person_id: lead.apollo_person_id,
        apollo_organization_id: lead.apollo_organization_id,
      }));

      const { error: leadsError } = await supabase
        .from("leads")
        .insert(leadsToInsert);

      if (leadsError) {
        console.error("Error inserting leads:", leadsError);
        logUpdate.error_message = "Failed to insert leads into database";
        logUpdate.processing_status = "failed";
      } else {
        leadsCreated = leads_data.length;
        console.log(`✅ Inserted ${leadsCreated} leads for user ${user_id}`);
      }
    }

    // Insert reports data
    if (
      reports_data &&
      Array.isArray(reports_data) &&
      reports_data.length > 0
    ) {
      const reportsToInsert = reports_data.map((report) => ({
        user_id,
        lead_id: report.lead_id,
        report_title: report.title,
        report_content: report.content,
        report_summary: report.summary,
        linkedin_profile_data: report.linkedin_data,
        company_analysis: report.company_analysis,
        contact_recommendations: report.contact_recommendations,
        report_type: report.type || "lead_research",
      }));

      const { error: reportsError } = await supabase
        .from("research_reports")
        .insert(reportsToInsert);

      if (reportsError) {
        console.error("Error inserting reports:", reportsError);
      } else {
        reportsCreated = reports_data.length;
        console.log(
          `✅ Inserted ${reportsCreated} reports for user ${user_id}`
        );
      }
    }

    logUpdate.leads_generated = leadsCreated;
    logUpdate.reports_generated = reportsCreated;

    // Update activity log
    const { error } = await supabase
      .from("bot_activity_logs")
      .update(logUpdate)
      .eq("id", sharpflow_log_id)
      .eq("user_id", user_id);

    if (error) {
      console.error("Error updating activity log:", error);
      return res.status(500).json({ error: "Failed to update log" });
    }

    console.log(
      `✅ n8n callback processed for user ${user_id}: ${leadsCreated} leads, ${reportsCreated} reports`
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing n8n callback:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
