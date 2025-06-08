import express from "express";
import { ConversationMemoryService } from "../../services/ConversationMemoryService.js";
import { ConversationCleanupService } from "../../services/ConversationCleanupService.js";
import { isAuthenticated } from "../../googleAuth.js";

const router = express.Router();

console.log("🔧 Initializing ConversationMemoryService...");
const conversationMemoryService = new ConversationMemoryService();
console.log("✅ ConversationMemoryService initialized successfully");

console.log("🔧 Initializing ConversationCleanupService...");
const conversationCleanupService = new ConversationCleanupService();
console.log("✅ ConversationCleanupService initialized successfully");

/**
 * Get conversation history for a specific agent
 */
router.get("/history/:agentType", isAuthenticated, async (req, res) => {
  try {
    console.log("🔍 Conversation history route called:", req.params, req.query);
    const { agentType } = req.params;
    const { sessionId, limit = 50 } = req.query;
    const userId = (req.user as any)?.id;
    console.log("🔍 User ID:", userId, "Agent Type:", agentType);

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate agent type
    const validAgentTypes = ["falcon", "sage", "sentinel", "prism"];
    if (!validAgentTypes.includes(agentType)) {
      return res.status(400).json({ error: "Invalid agent type" });
    }

    const messages = await conversationMemoryService.getConversationHistory(
      userId,
      agentType as "falcon" | "sage" | "sentinel" | "prism",
      sessionId as string,
      parseInt(limit as string)
    );

    // Transform messages to match frontend ChatMessage interface
    const transformedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
      metadata: {
        agentName: msg.agentType,
        messageType: msg.messageType,
        ...msg.contextData,
      },
    }));

    res.json({
      success: true,
      messages: transformedMessages,
      count: transformedMessages.length,
    });
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    res.status(500).json({
      error: "Failed to fetch conversation history",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get conversation sessions for a user
 */
router.get("/sessions", isAuthenticated, async (req, res) => {
  try {
    const { agentType } = req.query;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // For now, we'll return a simple response since we don't have a sessions endpoint
    // This can be expanded later to show multiple conversation sessions
    res.json({
      success: true,
      sessions: [],
      message: "Session management will be implemented in future updates",
    });
  } catch (error) {
    console.error("Error fetching conversation sessions:", error);
    res.status(500).json({
      error: "Failed to fetch conversation sessions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get conversation context for an agent (formatted for AI)
 */
router.get("/context/:agentType", isAuthenticated, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { sessionId } = req.query;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate agent type
    const validAgentTypes = ["falcon", "sage", "sentinel", "prism"];
    if (!validAgentTypes.includes(agentType)) {
      return res.status(400).json({ error: "Invalid agent type" });
    }

    const context = await conversationMemoryService.formatContextForAgent(
      userId,
      agentType as "falcon" | "sage" | "sentinel" | "prism",
      sessionId as string
    );

    res.json({
      success: true,
      context,
      agentType,
      sessionId: sessionId || null,
    });
  } catch (error) {
    console.error("Error fetching conversation context:", error);
    res.status(500).json({
      error: "Failed to fetch conversation context",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Archive old conversation sessions
 */
router.post("/archive", isAuthenticated, async (req, res) => {
  try {
    const { daysThreshold = 30 } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const archivedCount = await conversationMemoryService.archiveOldSessions(
      userId,
      daysThreshold
    );

    res.json({
      success: true,
      archivedCount,
      message: `Archived ${archivedCount} old conversation sessions`,
    });
  } catch (error) {
    console.error("Error archiving conversation sessions:", error);
    res.status(500).json({
      error: "Failed to archive conversation sessions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Generate conversation summary
 */
router.post("/summary/:agentType", isAuthenticated, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { sessionId } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate agent type
    const validAgentTypes = ["falcon", "sage", "sentinel", "prism"];
    if (!validAgentTypes.includes(agentType)) {
      return res.status(400).json({ error: "Invalid agent type" });
    }

    const summary = await conversationMemoryService.generateConversationSummary(
      userId,
      agentType as "falcon" | "sage" | "sentinel" | "prism",
      sessionId
    );

    if (!summary) {
      return res.json({
        success: false,
        message: "Not enough conversation data to generate summary",
      });
    }

    res.json({
      success: true,
      summary,
      agentType,
      sessionId: sessionId || null,
    });
  } catch (error) {
    console.error("Error generating conversation summary:", error);
    res.status(500).json({
      error: "Failed to generate conversation summary",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Clean up expired cache
 */
router.post("/cleanup", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const cleanedCount = await conversationMemoryService.cleanupExpiredCache();

    res.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired cache entries`,
    });
  } catch (error) {
    console.error("Error cleaning up cache:", error);
    res.status(500).json({
      error: "Failed to clean up cache",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get cleanup status and configuration
 */
router.get("/cleanup/status", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const status = await conversationCleanupService.getCleanupStatus();

    res.json({
      success: true,
      status,
      message: "Cleanup status retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting cleanup status:", error);
    res.status(500).json({
      error: "Failed to get cleanup status",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Manually trigger cleanup for current user
 */
router.post("/cleanup/run", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const stats = await conversationCleanupService.cleanupUserData(userId);

    res.json({
      success: true,
      stats,
      message: "User data cleanup completed successfully",
    });
  } catch (error) {
    console.error("Error running user cleanup:", error);
    res.status(500).json({
      error: "Failed to run cleanup",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Update retention settings for a user and agent
 */
router.put("/retention/:agentType", isAuthenticated, async (req, res) => {
  try {
    const { agentType } = req.params;
    const { retentionDays } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validate agent type
    const validAgentTypes = ["falcon", "sage", "sentinel", "prism"];
    if (!validAgentTypes.includes(agentType)) {
      return res.status(400).json({ error: "Invalid agent type" });
    }

    // Validate retention days
    if (!retentionDays || retentionDays < 1 || retentionDays > 365) {
      return res
        .status(400)
        .json({ error: "Retention days must be between 1 and 365" });
    }

    await conversationCleanupService.updateUserRetentionSettings(
      userId,
      agentType as "falcon" | "sage" | "sentinel" | "prism",
      retentionDays
    );

    res.json({
      success: true,
      message: `Retention settings updated for ${agentType}: ${retentionDays} days`,
    });
  } catch (error) {
    console.error("Error updating retention settings:", error);
    res.status(500).json({
      error: "Failed to update retention settings",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
