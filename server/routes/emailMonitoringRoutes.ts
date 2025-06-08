import express from "express";
import { EmailMonitoringSetup } from "../services/EmailMonitoringSetup.js";
import { EmailMonitoringManager } from "../services/EmailMonitoringManager.js";
import { EmailPersistenceService } from "../services/EmailPersistenceService.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const emailSetup = new EmailMonitoringSetup();
const emailManager = EmailMonitoringManager.getInstance();
const emailPersistence = new EmailPersistenceService();

/**
 * Setup email monitoring for the authenticated user
 * POST /api/email-monitoring/setup
 */
router.post("/setup", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      monitoring_enabled = true,
      check_interval = 1,
      filter_criteria = {},
      notification_preferences = {
        email_notifications: true,
        websocket_notifications: true,
        notification_sound: true,
      },
    } = req.body;

    console.log(`📧 Setting up email monitoring for user ${userId}`);

    const result = await emailSetup.setupEmailMonitoring({
      userId,
      monitoring_enabled,
      check_interval,
      filter_criteria,
      notification_preferences,
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          configuration: result.configuration,
          warnings: result.warnings,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        errors: result.errors,
        warnings: result.warnings,
      });
    }
  } catch (error: any) {
    console.error("❌ Email monitoring setup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during email monitoring setup",
      error: error.message,
    });
  }
});

/**
 * Get email monitoring status for the authenticated user
 * GET /api/email-monitoring/status
 */
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`📊 Getting email monitoring status for user ${userId}`);

    const status = await emailSetup.getMonitoringStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error("❌ Error getting monitoring status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get monitoring status",
      error: error.message,
    });
  }
});

/**
 * Update email monitoring configuration
 * PUT /api/email-monitoring/config
 */
router.put("/config", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    console.log(`🔧 Updating email monitoring config for user ${userId}`);

    const result = await emailSetup.updateConfiguration(userId, updates);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          configuration: result.configuration,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error: any) {
    console.error("❌ Error updating monitoring config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update monitoring configuration",
      error: error.message,
    });
  }
});

/**
 * Enable email monitoring
 * POST /api/email-monitoring/enable
 */
router.post("/enable", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { check_interval = 1 } = req.body;

    console.log(`✅ Enabling email monitoring for user ${userId}`);

    await emailManager.updateMonitoringConfig(userId, {
      monitoring_enabled: true,
      check_interval,
    });

    res.json({
      success: true,
      message: "Email monitoring enabled successfully",
      data: {
        monitoring_enabled: true,
        check_interval,
      },
    });
  } catch (error: any) {
    console.error("❌ Error enabling monitoring:", error);
    res.status(500).json({
      success: false,
      message: "Failed to enable email monitoring",
      error: error.message,
    });
  }
});

/**
 * Disable email monitoring
 * POST /api/email-monitoring/disable
 */
router.post("/disable", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    console.log(`🛑 Disabling email monitoring for user ${userId}`);

    const result = await emailSetup.disableMonitoring(userId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        errors: result.errors,
      });
    }
  } catch (error: any) {
    console.error("❌ Error disabling monitoring:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disable email monitoring",
      error: error.message,
    });
  }
});

/**
 * Get email threads for the authenticated user
 * GET /api/email-monitoring/threads
 */
router.get("/threads", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, classification } = req.query;

    console.log(`📧 Getting email threads for user ${userId}`);

    // This would need to be implemented in EmailPersistenceService
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        threads: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          pages: 0,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error getting email threads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get email threads",
      error: error.message,
    });
  }
});

/**
 * Get pending email responses for approval
 * GET /api/email-monitoring/responses/pending
 */
router.get("/responses/pending", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    console.log(`📋 Getting pending responses for user ${userId}`);

    const pendingResponses = await emailPersistence.getPendingResponses(userId);

    res.json({
      success: true,
      data: {
        responses: pendingResponses,
        count: pendingResponses.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Error getting pending responses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pending responses",
      error: error.message,
    });
  }
});

/**
 * Approve or reject an email response
 * POST /api/email-monitoring/responses/:responseId/approve
 */
router.post("/responses/:responseId/approve", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { responseId } = req.params;
    const { approved = true } = req.body;

    console.log(`${approved ? '✅' : '❌'} ${approved ? 'Approving' : 'Rejecting'} response ${responseId} for user ${userId}`);

    const status = approved ? "approved" : "rejected";
    const updatedResponse = await emailPersistence.updateResponseStatus(
      responseId,
      status,
      userId,
      userId
    );

    if (!updatedResponse) {
      return res.status(404).json({
        success: false,
        message: "Response not found or access denied",
      });
    }

    res.json({
      success: true,
      message: `Response ${approved ? 'approved' : 'rejected'} successfully`,
      data: {
        response: updatedResponse,
      },
    });
  } catch (error: any) {
    console.error("❌ Error updating response status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update response status",
      error: error.message,
    });
  }
});

export default router;
