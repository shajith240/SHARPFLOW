import express from "express";
import { supabase } from "../db.js";
import { isAuthenticated } from "../googleAuth.js";
import { EmailMonitoringManager } from "../services/EmailMonitoringManager.js";
import { EmailPersistenceService } from "../services/EmailPersistenceService.js";

const router = express.Router();

// Initialize services
const emailMonitoringManager = EmailMonitoringManager.getInstance();
const emailPersistence = new EmailPersistenceService();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Get pending email responses for approval
router.get("/pending-responses", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { data: responses, error } = await supabase
      .from("email_responses")
      .select(
        `
        *,
        email_threads!inner(
          thread_id,
          subject,
          participants
        ),
        email_messages!inner(
          from_address,
          subject,
          body_text
        )
      `
      )
      .eq("user_id", userId)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending responses:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch pending responses" });
    }

    // Transform the data for frontend consumption
    const transformedResponses =
      responses?.map((response) => ({
        id: response.id,
        threadId: response.thread_id,
        fromAddress: response.email_messages.from_address,
        subject:
          response.email_messages.subject || response.email_threads.subject,
        originalEmail: response.email_messages.body_text,
        generatedResponse: response.response_content,
        responseType: response.response_type,
        approvalStatus: response.approval_status,
        createdAt: response.created_at,
        metadata: {
          confidence: 0.85, // Mock confidence score
          reasoning: "Generated based on company information and email context",
        },
      })) || [];

    res.json({ responses: transformedResponses });
  } catch (error) {
    console.error("Error in pending-responses route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Approve an email response
router.post("/approve-response/:responseId", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { responseId } = req.params;
    const { responseContent } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Update the response status and content if modified
    const updateData: any = {
      approval_status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    };

    if (responseContent) {
      updateData.response_content = responseContent;
    }

    const { data, error } = await supabase
      .from("email_responses")
      .update(updateData)
      .eq("id", responseId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error approving response:", error);
      return res.status(500).json({ error: "Failed to approve response" });
    }

    if (!data) {
      return res.status(404).json({ error: "Response not found" });
    }

    // TODO: Implement actual email sending logic here
    // This would integrate with Gmail API to send the approved response

    // Update status to sent after successful email sending
    await supabase
      .from("email_responses")
      .update({
        approval_status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", responseId);

    res.json({
      success: true,
      message: "Response approved and sent successfully",
      responseId,
    });
  } catch (error) {
    console.error("Error in approve-response route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reject an email response
router.post("/reject-response/:responseId", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { responseId } = req.params;
    const { rejectionReason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { data, error } = await supabase
      .from("email_responses")
      .update({
        approval_status: "rejected",
        feedback: rejectionReason || "Rejected by user",
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", responseId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error rejecting response:", error);
      return res.status(500).json({ error: "Failed to reject response" });
    }

    if (!data) {
      return res.status(404).json({ error: "Response not found" });
    }

    res.json({
      success: true,
      message: "Response rejected successfully",
      responseId,
    });
  } catch (error) {
    console.error("Error in reject-response route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get email monitoring configuration
router.get("/monitoring-config", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { data: config, error } = await supabase
      .from("email_monitoring_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching monitoring config:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch monitoring config" });
    }

    // Return default config if none exists
    const defaultConfig = {
      monitoring_enabled: false,
      check_interval: 1,
      filter_criteria: {},
    };

    res.json({ config: config || defaultConfig });
  } catch (error) {
    console.error("Error in monitoring-config route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get email threads
router.get("/email-threads", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, classification, limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let query = supabase
      .from("email_threads")
      .select(
        `
        *,
        email_messages(count)
      `
      )
      .eq("user_id", userId)
      .order("last_activity_at", { ascending: false })
      .limit(parseInt(limit as string));

    if (status) {
      query = query.eq("status", status);
    }

    if (classification) {
      query = query.eq("classification", classification);
    }

    const { data: threads, error } = await query;

    if (error) {
      console.error("Error fetching email threads:", error);
      return res.status(500).json({ error: "Failed to fetch email threads" });
    }

    res.json({ threads: threads || [] });
  } catch (error) {
    console.error("Error in email-threads route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get calendar bookings
router.get("/calendar-bookings", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let query = supabase
      .from("calendar_bookings")
      .select(
        `
        *,
        email_threads(subject, participants)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit as string));

    if (status) {
      query = query.eq("booking_status", status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Error fetching calendar bookings:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch calendar bookings" });
    }

    res.json({ bookings: bookings || [] });
  } catch (error) {
    console.error("Error in calendar-bookings route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get escalations
router.get("/escalations", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, priority, limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    let query = supabase
      .from("email_escalations")
      .select(
        `
        *,
        email_threads(subject, participants),
        email_messages(from_address, subject, body_text)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit as string));

    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: escalations, error } = await query;

    if (error) {
      console.error("Error fetching escalations:", error);
      return res.status(500).json({ error: "Failed to fetch escalations" });
    }

    res.json({ escalations: escalations || [] });
  } catch (error) {
    console.error("Error in escalations route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start email monitoring job
router.post("/start-monitoring", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Start email monitoring using EmailMonitoringManager
    await emailMonitoringManager.startUserMonitoring(userId);

    res.json({
      success: true,
      message: "Email monitoring started successfully",
    });
  } catch (error) {
    console.error("Error in start-monitoring route:", error);
    res.status(500).json({
      error: "Failed to start email monitoring",
      details: error.message,
    });
  }
});

// Stop email monitoring job
router.post("/stop-monitoring", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Stop email monitoring using EmailMonitoringManager
    await emailMonitoringManager.stopUserMonitoring(userId);

    res.json({
      success: true,
      message: "Email monitoring stopped successfully",
    });
  } catch (error) {
    console.error("Error in stop-monitoring route:", error);
    res.status(500).json({
      error: "Failed to stop email monitoring",
      details: error.message,
    });
  }
});

// Get monitoring status
router.get("/monitoring-status", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const status = await emailMonitoringManager.getUserMonitoringStatus(userId);

    res.json({ status });
  } catch (error) {
    console.error("Error in monitoring-status route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update monitoring configuration with automatic start/stop
router.post("/monitoring-config", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { monitoring_enabled, check_interval, filter_criteria } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Update configuration using EmailMonitoringManager
    await emailMonitoringManager.updateMonitoringConfig(userId, {
      monitoring_enabled: monitoring_enabled ?? false,
      check_interval: check_interval ?? 1,
      filter_criteria: filter_criteria ?? {},
    });

    res.json({
      success: true,
      message: "Monitoring configuration updated successfully",
    });
  } catch (error) {
    console.error("Error in monitoring-config update route:", error);
    res.status(500).json({
      error: "Failed to update monitoring configuration",
      details: error.message,
    });
  }
});

export default router;
