import type { Express } from "express";
import { OwnerNotificationService } from "../services/OwnerNotificationService.js";
import { isAuthenticated } from "../googleAuth.js";
import { requireOwnerAuth } from "../middleware/ownerAuth.js";
import { supabase } from "../db.js";
import { encrypt } from "../utils/encryption.js";

const ownerNotificationService = new OwnerNotificationService();

export function registerOwnerDashboardRoutes(app: Express) {
  // Get dashboard summary
  app.get(
    "/api/owner/dashboard/summary",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        // Set cache-busting headers to prevent stale data
        res.set({
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });

        const { data: summary, error } = await supabase
          .from("owner_dashboard_summary")
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        res.json(summary);
      } catch (error) {
        console.error("Error getting dashboard summary:", error);
        res.status(500).json({ message: "Failed to get dashboard summary" });
      }
    }
  );

  // Get pending customer setups
  app.get(
    "/api/owner/dashboard/pending-setups",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        // Set cache-busting headers to prevent stale data
        res.set({
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        });

        const pendingSetups = await ownerNotificationService.getPendingSetups();

        // Get associated setup tasks for each notification
        const setupsWithTasks = await Promise.all(
          pendingSetups.map(async (setup) => {
            const { data: tasks } = await supabase
              .from("customer_setup_tasks")
              .select("*")
              .eq("user_id", setup.userId)
              .order("created_at", { ascending: true });

            // Debug logging
            console.log(`🔍 Setup tasks for ${setup.userEmail}:`, {
              taskCount: tasks?.length || 0,
              tasks: tasks?.map((task) => ({
                agent: task.agent_name,
                status: task.status,
                apiKeysCount: Object.keys(task.api_keys_configured || {})
                  .length,
                apiKeys: task.api_keys_configured,
              })),
            });

            return {
              ...setup,
              setupTasks: tasks || [],
            };
          })
        );

        console.log(`📤 Sending ${setupsWithTasks.length} setups to frontend`);
        res.json(setupsWithTasks);
      } catch (error) {
        console.error("Error getting pending setups:", error);
        res.status(500).json({ message: "Failed to get pending setups" });
      }
    }
  );

  // Update customer API keys
  app.post(
    "/api/owner/dashboard/update-api-keys",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { userId, agentName, apiKeys, taskId } = req.body;

        if (!userId || !agentName || !apiKeys) {
          return res.status(400).json({
            message: "Missing required fields: userId, agentName, apiKeys",
          });
        }

        // Encrypt API keys (filter out empty values)
        const encryptedKeys: Record<string, string> = {};
        for (const [key, value] of Object.entries(apiKeys)) {
          if (value && typeof value === "string" && value.trim() !== "") {
            // Don't encrypt test keys - they should be replaced
            if (!value.startsWith("test-encrypted:")) {
              encryptedKeys[key] = encrypt(value);
            }
          }
        }

        // Determine if agent should be enabled based on API keys
        const hasValidKeys = Object.keys(encryptedKeys).length > 0;

        // Update user agent configuration
        const { error: configError } = await supabase
          .from("user_agent_configs")
          .upsert(
            {
              id: `${userId}-${agentName}`,
              user_id: userId,
              agent_name: agentName,
              is_enabled: hasValidKeys, // Enable agent when API keys are configured
              api_keys: encryptedKeys,
              configuration: {},
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,agent_name",
            }
          );

        if (configError) {
          throw configError;
        }

        // Determine task status based on whether we have valid API keys
        const taskStatus = hasValidKeys ? "completed" : "pending";

        // Update setup task status
        if (taskId) {
          const { error: taskError } = await supabase
            .from("customer_setup_tasks")
            .update({
              status: taskStatus,
              api_keys_configured: encryptedKeys,
              completed_by: hasValidKeys ? req.user.email : null,
              completed_at: hasValidKeys ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId);

          if (taskError) {
            throw taskError;
          }
        }

        // Log the action
        await supabase.from("customer_communications").insert({
          id: `comm-${Date.now()}`,
          user_id: userId,
          communication_type: "internal_note",
          direction: "internal",
          subject: `API Keys Configured for ${agentName}`,
          content: `API keys configured for ${agentName} agent by ${
            req.user.email
          }. Keys: ${Object.keys(apiKeys).join(", ")}`,
          created_by: req.user.email,
          created_at: new Date().toISOString(),
        });

        res.json({
          success: true,
          message: `API keys configured successfully for ${agentName} agent`,
        });
      } catch (error) {
        console.error("Error updating API keys:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update API keys",
        });
      }
    }
  );

  // Activate customer agents (complete setup)
  app.post(
    "/api/owner/dashboard/activate-customer",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { userId, notificationId } = req.body;

        if (!userId || !notificationId) {
          return res.status(400).json({
            message: "Missing required fields: userId, notificationId",
          });
        }

        await ownerNotificationService.activateCustomerAgents(
          userId,
          notificationId
        );

        // Log the activation
        await supabase.from("customer_communications").insert({
          id: `comm-${Date.now()}`,
          user_id: userId,
          notification_id: notificationId,
          communication_type: "internal_note",
          direction: "internal",
          subject: "Customer Agents Activated",
          content: `All agents activated for customer by ${req.user.email}. Customer can now use SharpFlow.`,
          created_by: req.user.email,
          created_at: new Date().toISOString(),
        });

        res.json({
          success: true,
          message: "Customer agents activated successfully",
        });
      } catch (error) {
        console.error("Error activating customer:", error);
        res.status(500).json({
          success: false,
          message: "Failed to activate customer",
        });
      }
    }
  );

  // Add communication note
  app.post(
    "/api/owner/dashboard/add-note",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const {
          userId,
          notificationId,
          subject,
          content,
          communicationType = "internal_note",
        } = req.body;

        if (!userId || !content) {
          return res.status(400).json({
            message: "Missing required fields: userId, content",
          });
        }

        const { error } = await supabase
          .from("customer_communications")
          .insert({
            id: `comm-${Date.now()}`,
            user_id: userId,
            notification_id: notificationId,
            communication_type: communicationType,
            direction: "internal",
            subject: subject || "Owner Note",
            content,
            created_by: req.user.email,
            created_at: new Date().toISOString(),
          });

        if (error) {
          throw error;
        }

        res.json({
          success: true,
          message: "Note added successfully",
        });
      } catch (error) {
        console.error("Error adding note:", error);
        res.status(500).json({
          success: false,
          message: "Failed to add note",
        });
      }
    }
  );

  // Get customer communications
  app.get(
    "/api/owner/dashboard/customer-communications/:userId",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { userId } = req.params;

        const { data: communications, error } = await supabase
          .from("customer_communications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        res.json(communications || []);
      } catch (error) {
        console.error("Error getting customer communications:", error);
        res
          .status(500)
          .json({ message: "Failed to get customer communications" });
      }
    }
  );

  // Activate user account after API keys are configured
  app.post(
    "/api/owner/dashboard/activate-user",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { userId, notificationId } = req.body;

        if (!userId || !notificationId) {
          return res.status(400).json({
            message: "Missing required fields: userId, notificationId",
          });
        }

        // Use the database function to activate user
        const { data: result, error } = await supabase.rpc(
          "activate_user_account",
          { target_user_id: userId }
        );

        if (error) {
          throw error;
        }

        const activationResult = result;

        if (!activationResult.success) {
          return res.status(400).json({
            message: activationResult.message,
            details: activationResult,
          });
        }

        // Update notification status using the service
        await ownerNotificationService.updateSetupStatus(
          notificationId,
          "completed"
        );

        // Send welcome email to customer
        await ownerNotificationService.sendCustomerWelcomeEmail(userId);

        console.log(`✅ User activated successfully: ${userId}`);

        res.json({
          success: true,
          message: "User account activated successfully",
          data: activationResult,
        });
      } catch (error) {
        console.error("Error activating user:", error);
        res.status(500).json({ message: "Failed to activate user account" });
      }
    }
  );

  // Get all customers with their setup status
  app.get(
    "/api/owner/dashboard/customers",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { data: customers, error } = await supabase
          .from("users")
          .select(
            `
          id,
          email,
          first_name,
          last_name,
          subscription_plan,
          subscription_status,
          activation_status,
          created_at,
          user_agent_configs (
            agent_name,
            is_enabled
          ),
          owner_notifications (
            id,
            status,
            created_at
          )
        `
          )
          .eq("subscription_status", "active")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        res.json(customers || []);
      } catch (error) {
        console.error("Error getting customers:", error);
        res.status(500).json({ message: "Failed to get customers" });
      }
    }
  );

  // Update dashboard settings
  app.post(
    "/api/owner/dashboard/settings",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { settingKey, settingValue } = req.body;

        if (!settingKey || !settingValue) {
          return res.status(400).json({
            message: "Missing required fields: settingKey, settingValue",
          });
        }

        const { error } = await supabase
          .from("owner_dashboard_settings")
          .upsert(
            {
              id: `${req.user.id}-${settingKey}`,
              owner_id: req.user.id,
              setting_key: settingKey,
              setting_value: settingValue,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "owner_id,setting_key",
            }
          );

        if (error) {
          throw error;
        }

        res.json({
          success: true,
          message: "Settings updated successfully",
        });
      } catch (error) {
        console.error("Error updating settings:", error);
        res.status(500).json({
          success: false,
          message: "Failed to update settings",
        });
      }
    }
  );

  // Get dashboard settings
  app.get(
    "/api/owner/dashboard/settings",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const { data: settings, error } = await supabase
          .from("owner_dashboard_settings")
          .select("setting_key, setting_value")
          .eq("owner_id", req.user.id);

        if (error) {
          throw error;
        }

        // Convert to key-value object
        const settingsObject =
          settings?.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
          }, {} as Record<string, any>) || {};

        res.json(settingsObject);
      } catch (error) {
        console.error("Error getting settings:", error);
        res.status(500).json({ message: "Failed to get settings" });
      }
    }
  );

  // Debug endpoint to check specific user configuration
  app.get(
    "/api/owner/dashboard/debug-user/:email",
    isAuthenticated,
    requireOwnerAuth,
    async (req, res) => {
      try {
        const userEmail = req.params.email;

        // Get user data
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .single();

        if (userError) {
          return res.status(404).json({
            success: false,
            message: "User not found",
            error: userError.message,
          });
        }

        // Get user agent configurations
        const { data: agentConfigs, error: configError } = await supabase
          .from("user_agent_configs")
          .select("*")
          .eq("user_id", user.id);

        // Get customer setup tasks
        const { data: setupTasks, error: tasksError } = await supabase
          .from("customer_setup_tasks")
          .select("*")
          .eq("user_id", user.id);

        // Get owner notifications
        const { data: notifications, error: notifError } = await supabase
          .from("owner_notifications")
          .select("*")
          .eq("user_id", user.id);

        res.json({
          success: true,
          user: {
            ...user,
            // Don't expose sensitive data in debug
            paypal_customer_id: user.paypal_customer_id ? "***masked***" : null,
          },
          agentConfigs: agentConfigs || [],
          setupTasks: setupTasks || [],
          notifications: notifications || [],
          configError: configError?.message,
          tasksError: tasksError?.message,
          notifError: notifError?.message,
        });
      } catch (error) {
        console.error("Error debugging user:", error);
        res.status(500).json({
          success: false,
          message: "Failed to debug user",
        });
      }
    }
  );
}
