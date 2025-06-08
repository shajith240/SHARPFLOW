import { Router } from "express";
import { isAuthenticated } from "../googleAuth.js";
import { AgentOrchestrator } from "../ai-agents/core/AgentOrchestrator.js";
import { supabase } from "../db.js";
import jwt from "jsonwebtoken";
import sentinelRoutes from "./sentinelRoutes.js";
import conversationRoutes from "../ai-agents/routes/conversationRoutes.js";

const router = Router();

// This will be injected by the main server
let agentOrchestrator: AgentOrchestrator;

export function setAgentOrchestrator(orchestrator: AgentOrchestrator) {
  agentOrchestrator = orchestrator;
}

// Mount Sentinel-specific routes
router.use("/sentinel", sentinelRoutes);

// Mount conversation memory routes
console.log("🔧 Mounting conversation routes...");
router.use("/conversations", conversationRoutes);
console.log("✅ Conversation routes mounted successfully");

// Generate WebSocket authentication token
router.post("/auth/websocket-token", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const token = jwt.sign(
      {
        userId,
        type: "websocket",
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "24h" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Error generating WebSocket token:", error);
    res.status(500).json({ error: "Failed to generate authentication token" });
  }
});

// Get agent statuses
router.get("/agents/status", isAuthenticated, async (req, res) => {
  try {
    if (!agentOrchestrator) {
      return res.status(503).json({ error: "Agent system not available" });
    }

    const agentStatuses =
      agentOrchestrator.jobQueue?.getAllAgentStatuses() || [];
    const queueStats =
      (await agentOrchestrator.jobQueue?.getAllQueueStats()) || [];

    res.json({
      agents: agentStatuses,
      queues: queueStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting agent status:", error);
    res.status(500).json({ error: "Failed to get agent status" });
  }
});

// Start agent job directly (alternative to chat interface)
router.post("/agents/:agentName/jobs", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { agentName } = req.params;
    const { jobType, inputData, priority, delay } = req.body;

    if (!agentOrchestrator) {
      return res.status(503).json({ error: "Agent system not available" });
    }

    // Validate agent name
    const validAgents = ["falcon", "sage", "sentinel"];
    if (!validAgents.includes(agentName)) {
      return res.status(400).json({ error: "Invalid agent name" });
    }

    // Validate input data based on agent type
    const validationError = validateAgentInput(agentName, inputData);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const jobId = await agentOrchestrator.jobQueue.addJob(agentName, {
      userId,
      jobType: jobType || agentName,
      inputData,
      priority: priority || 0,
      delay: delay || 0,
    });

    res.json({
      success: true,
      jobId,
      agentName,
      message: `Job started with ${getAgentDisplayName(agentName)} agent`,
    });
  } catch (error) {
    console.error("Error starting agent job:", error);
    res.status(500).json({ error: "Failed to start agent job" });
  }
});

// Get job status
router.get("/jobs/:jobId/status", isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queueName } = req.query;

    if (!agentOrchestrator) {
      return res.status(503).json({ error: "Agent system not available" });
    }

    if (!queueName) {
      return res.status(400).json({ error: "Queue name is required" });
    }

    const jobStatus = await agentOrchestrator.jobQueue.getJobStatus(
      jobId,
      queueName as string
    );

    if (!jobStatus) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(jobStatus);
  } catch (error) {
    console.error("Error getting job status:", error);
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// Cancel/remove job
router.delete("/jobs/:jobId", isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queueName } = req.query;

    if (!agentOrchestrator) {
      return res.status(503).json({ error: "Agent system not available" });
    }

    if (!queueName) {
      return res.status(400).json({ error: "Queue name is required" });
    }

    const removed = await agentOrchestrator.jobQueue.removeJob(
      jobId,
      queueName as string
    );

    if (!removed) {
      return res
        .status(404)
        .json({ error: "Job not found or already completed" });
    }

    res.json({ success: true, message: "Job cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling job:", error);
    res.status(500).json({ error: "Failed to cancel job" });
  }
});

// Get chat sessions
router.get("/chat/sessions", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { data: sessions, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.json({
      sessions: sessions || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        hasMore: (sessions?.length || 0) === Number(limit),
      },
    });
  } catch (error) {
    console.error("Error getting chat sessions:", error);
    res.status(500).json({ error: "Failed to get chat sessions" });
  }
});

// Get chat messages for a session
router.get(
  "/chat/sessions/:sessionId/messages",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { sessionId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Verify session belongs to user
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (sessionError || !session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .range(offset, offset + Number(limit) - 1);

      if (error) {
        throw error;
      }

      res.json({
        messages: messages || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          hasMore: (messages?.length || 0) === Number(limit),
        },
      });
    } catch (error) {
      console.error("Error getting chat messages:", error);
      res.status(500).json({ error: "Failed to get chat messages" });
    }
  }
);

// Create new chat session
router.post("/chat/sessions", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { title } = req.body;

    const sessionData = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title: title || `Chat Session - ${new Date().toLocaleDateString()}`,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: session, error } = await supabase
      .from("chat_sessions")
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(session);
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({ error: "Failed to create chat session" });
  }
});

// Test intent recognition (for debugging)
router.post("/test-intent", async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!agentOrchestrator) {
      return res.status(503).json({ error: "Agent system not available" });
    }

    console.log(`🧪 Testing intent recognition for message: "${message}"`);

    // Get Prism instance and test intent recognition
    const prism = agentOrchestrator.prism;
    const intentResult = await prism.processMessage(
      message,
      userId,
      "test-session"
    );

    res.json({
      message,
      intent: intentResult.intent,
      response: intentResult.response,
    });
  } catch (error) {
    console.error("Error testing intent:", error);
    res
      .status(500)
      .json({ error: "Failed to test intent", details: error.message });
  }
});

// Helper functions
function validateAgentInput(agentName: string, inputData: any): string | null {
  switch (agentName) {
    case "falcon":
      if (
        !inputData.locations ||
        !Array.isArray(inputData.locations) ||
        inputData.locations.length === 0
      ) {
        return "Locations array is required for Falcon agent";
      }
      if (
        !inputData.businesses ||
        !Array.isArray(inputData.businesses) ||
        inputData.businesses.length === 0
      ) {
        return "Businesses array is required for Falcon agent";
      }
      if (
        !inputData.jobTitles ||
        !Array.isArray(inputData.jobTitles) ||
        inputData.jobTitles.length === 0
      ) {
        return "Job titles array is required for Falcon agent";
      }
      break;

    case "sage":
      if (!inputData.linkedinUrl && !inputData.linkedinURL) {
        return "LinkedIn URL is required for Sage agent";
      }
      break;

    case "sentinel":
      // Validate based on job type
      const jobType = inputData.jobType || "auto_reply";

      if (jobType === "auto_reply") {
        if (!inputData.leadId && !inputData.lead_id) {
          return "Lead ID is required for Sentinel auto-reply jobs";
        }
      } else if (jobType === "email_response") {
        if (!inputData.emailAddress || !inputData.threadId) {
          return "Email address and thread ID are required for email response jobs";
        }
      } else if (jobType === "calendar_booking") {
        if (!inputData.emailAddress || !inputData.eventType) {
          return "Email address and event type are required for calendar booking jobs";
        }
      } else if (jobType === "email_monitoring") {
        // Email monitoring doesn't require specific input data
      } else if (jobType === "email_automation") {
        // Email automation doesn't require specific input data
      } else {
        return "Invalid job type for Sentinel agent";
      }
      break;

    default:
      return "Unknown agent type";
  }

  return null;
}

function getAgentDisplayName(agentName: string): string {
  const displayNames = {
    falcon: "Falcon (Lead Generation)",
    sage: "Sage (Lead Research)",
    sentinel: "Sentinel (Email Automation)",
  };

  return displayNames[agentName as keyof typeof displayNames] || agentName;
}

export default router;
