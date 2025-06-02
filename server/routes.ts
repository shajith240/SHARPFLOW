import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./googleAuth"; // Changed to googleAuth
import { insertContactSubmissionSchema } from "@shared/schema";
import { registerPaymentRoutes } from "./paymentRoutes";
import { registerDashboardRoutes } from "./dashboardRoutes";
import telegramRoutes from "./routes/telegramRoutes";
import multiBotRoutes from "./routes/multiBotRoutes";
import leadsRoutes from "./routes/leadsRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import userSettingsRoutes from "./routes/userSettingsRoutes";
import reportsRoutes from "./routes/reportsRoutes";
import MultiBotWebhookHandler from "./webhooks/MultiBotWebhookHandler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register payment routes
  registerPaymentRoutes(app);

  // Register dashboard routes
  registerDashboardRoutes(app);

  // Register Telegram routes (legacy)
  app.use("/api/telegram", telegramRoutes);

  // Register Multi-Bot system
  app.use("/api/multi-bot", multiBotRoutes);

  // Register Leads management
  app.use("/api/leads", leadsRoutes);

  // Register Subscription management
  app.use("/api/subscription", subscriptionRoutes);

  // Register User Settings
  app.use("/api/user/settings", userSettingsRoutes);

  // Register Reports
  app.use("/api/reports", reportsRoutes);

  // Multi-Bot webhook handler (supports multiple bot tokens)
  app.post("/webhook/telegram/:botToken", MultiBotWebhookHandler.handleWebhook);
  app.post("/webhook/telegram", MultiBotWebhookHandler.handleWebhook);

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

  const httpServer = createServer(app);
  return httpServer;
}
