import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth"; // Changed to googleAuth
import { insertContactSubmissionSchema } from "@shared/schema";
import { supabase } from "./db";
import { registerPaymentRoutes } from "./paymentRoutes";
import { registerDashboardRoutes } from "./dashboardRoutes";

import leadsRoutes from "./routes/leadsRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import userSettingsRoutes from "./routes/userSettingsRoutes";
import reportsRoutes from "./routes/reportsRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import setupNotificationsRoutes from "./routes/setup-notifications";
import setupDatabaseRoutes from "./routes/setup-database";
import aiAgentsRoutes, { setAgentOrchestrator } from "./routes/aiAgentsRoutes";
import { registerOwnerDashboardRoutes } from "./routes/ownerDashboardRoutes.js";
import { setupAIAgenticSystemRoutes } from "./routes/aiAgenticSystemRoutes.js";
import { setupLeadQualificationRoutes } from "./routes/leadQualificationRoutes.js";

import { WebSocketManager } from "./ai-agents/core/WebSocketManager.js";
import { AgentOrchestrator } from "./ai-agents/core/AgentOrchestrator.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);

  // Auth middleware
  await setupAuth(app);

  // Initialize AI Agents System
  console.log("🤖 Initializing AI Agents System...");
  const webSocketManager = new WebSocketManager(server);
  const agentOrchestrator = new AgentOrchestrator(webSocketManager);

  // Set orchestrator for AI agents routes
  setAgentOrchestrator(agentOrchestrator);

  // Register payment routes
  registerPaymentRoutes(app);

  // Register dashboard routes
  registerDashboardRoutes(app);

  // Register owner dashboard routes
  registerOwnerDashboardRoutes(app);

  // Register AI Agentic System routes
  setupAIAgenticSystemRoutes(app);

  // Register Lead Qualification routes
  setupLeadQualificationRoutes(app);

  // Register AI Agents routes
  app.use("/api/ai-agents", aiAgentsRoutes);

  // Register Leads management
  app.use("/api/leads", leadsRoutes);

  // Register Subscription management
  app.use("/api/subscription", subscriptionRoutes);

  // Register User Settings
  app.use("/api/user/settings", userSettingsRoutes);

  // Register Reports
  app.use("/api/reports", reportsRoutes);

  // Register Notifications
  app.use("/api/notifications", notificationRoutes);

  // Register Setup routes
  app.use("/api/setup", setupNotificationsRoutes);
  app.use("/api/setup", setupDatabaseRoutes);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Health check endpoint for Docker and monitoring
  app.get("/api/health", async (req, res) => {
    try {
      // Basic health check - verify server is responding
      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0.0",
        services: {
          database: "unknown",
          redis: "unknown",
        },
      };

      // Optional: Check database connection
      try {
        const { data, error } = await supabase
          .from("users")
          .select("count")
          .limit(1);
        healthStatus.services.database = error ? "unhealthy" : "healthy";
      } catch (dbError) {
        healthStatus.services.database = "unhealthy";
      }

      // Return health status
      res.status(200).json(healthStatus);
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const validatedData = insertContactSubmissionSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);
      res.status(201).json({
        message: "Contact form submitted successfully",
        id: submission.id,
      });
    } catch (error) {
      console.error("Error creating contact submission:", error);
      res.status(400).json({
        message: "Failed to submit contact form",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Graceful shutdown handler
  process.on("SIGTERM", async () => {
    console.log("🛑 SIGTERM received, shutting down gracefully...");
    await agentOrchestrator.cleanup();
    await webSocketManager.cleanup();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("🛑 SIGINT received, shutting down gracefully...");
    await agentOrchestrator.cleanup();
    await webSocketManager.cleanup();
    process.exit(0);
  });

  console.log("✅ AI Agents System initialized successfully");
  return server;
}
