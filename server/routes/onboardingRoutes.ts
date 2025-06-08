import type { Express } from "express";
import { UserOnboardingService } from "../services/UserOnboardingService.js";
import { isAuthenticated } from "../googleAuth.js";
import { supabase } from "../db.js";

const onboardingService = new UserOnboardingService();

export function registerOnboardingRoutes(app: Express) {
  // Get onboarding status
  app.get("/api/onboarding/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const hasCompleted = await onboardingService.hasCompletedOnboarding(userId);
      const onboardingData = await onboardingService.getOnboardingData(userId);
      
      res.json({
        completed: hasCompleted,
        data: onboardingData
      });
    } catch (error) {
      console.error("Error getting onboarding status:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  });

  // Complete onboarding
  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { onboardingData, selectedPlan, agentApiKeys } = req.body;

      // Validate required fields
      if (!onboardingData || !selectedPlan) {
        return res.status(400).json({ 
          message: "Missing required fields: onboardingData and selectedPlan" 
        });
      }

      // Validate onboarding data structure
      const requiredFields = ['companyName', 'industry', 'targetMarket', 'businessSize', 'primaryGoals', 'preferredCommunicationStyle', 'timezone'];
      for (const field of requiredFields) {
        if (!onboardingData[field]) {
          return res.status(400).json({ 
            message: `Missing required onboarding field: ${field}` 
          });
        }
      }

      // Complete onboarding process
      const result = await onboardingService.completeOnboarding(
        userId,
        onboardingData,
        selectedPlan,
        agentApiKeys || {}
      );

      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.message 
        });
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to complete onboarding. Please try again." 
      });
    }
  });

  // Update API keys for specific agent
  app.post("/api/onboarding/update-api-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { agentName, apiKeys } = req.body;

      if (!agentName || !apiKeys) {
        return res.status(400).json({ 
          message: "Missing required fields: agentName and apiKeys" 
        });
      }

      // Validate agent name
      const validAgents = ['falcon', 'sage', 'sentinel'];
      if (!validAgents.includes(agentName)) {
        return res.status(400).json({ 
          message: "Invalid agent name. Must be one of: " + validAgents.join(", ") 
        });
      }

      // Check if user has access to this agent
      const { data: user } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status')
        .eq('id', userId)
        .single();

      if (!user || user.subscription_status !== 'active') {
        return res.status(403).json({ 
          message: "Active subscription required to configure agents" 
        });
      }

      // Check if agent is included in user's plan
      const { data: planFeature } = await supabase
        .from('subscription_plan_features')
        .select('is_included')
        .eq('plan_name', user.subscription_plan)
        .eq('agent_name', agentName)
        .single();

      if (!planFeature?.is_included) {
        return res.status(403).json({ 
          message: `${agentName} agent is not included in your current plan. Please upgrade to access this agent.` 
        });
      }

      // Update API keys (this would use the UserOnboardingService)
      // For now, we'll implement a simple update
      const { encrypt } = await import("../utils/encryption.js");
      
      const encryptedKeys: Record<string, string> = {};
      for (const [key, value] of Object.entries(apiKeys)) {
        if (value && typeof value === 'string') {
          encryptedKeys[key] = encrypt(value);
        }
      }

      const { error } = await supabase
        .from('user_agent_configs')
        .update({
          api_keys: encryptedKeys,
          is_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('agent_name', agentName);

      if (error) {
        throw error;
      }

      res.json({ 
        success: true, 
        message: `API keys updated successfully for ${agentName} agent` 
      });
    } catch (error) {
      console.error("Error updating API keys:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update API keys. Please try again." 
      });
    }
  });

  // Get user's agent configurations
  app.get("/api/onboarding/agent-configs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      const { data: configs, error } = await supabase
        .from('user_agent_configs')
        .select('agent_name, is_enabled, configuration')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Get user's plan to show available agents
      const { data: user } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      const { data: planFeatures } = await supabase
        .from('subscription_plan_features')
        .select('agent_name, is_included, monthly_limits')
        .eq('plan_name', user?.subscription_plan || 'falcon_individual')
        .eq('is_included', true);

      res.json({
        userConfigs: configs || [],
        availableAgents: planFeatures || [],
        currentPlan: user?.subscription_plan || 'falcon_individual'
      });
    } catch (error) {
      console.error("Error getting agent configurations:", error);
      res.status(500).json({ 
        message: "Failed to get agent configurations" 
      });
    }
  });

  // Enable/disable specific agent
  app.post("/api/onboarding/toggle-agent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { agentName, enabled } = req.body;

      if (!agentName || typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          message: "Missing required fields: agentName and enabled (boolean)" 
        });
      }

      const { error } = await supabase
        .from('user_agent_configs')
        .update({
          is_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('agent_name', agentName);

      if (error) {
        throw error;
      }

      res.json({ 
        success: true, 
        message: `${agentName} agent ${enabled ? 'enabled' : 'disabled'} successfully` 
      });
    } catch (error) {
      console.error("Error toggling agent:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to toggle agent. Please try again." 
      });
    }
  });

  // Get available subscription plans with agent access
  app.get("/api/onboarding/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: "falcon_individual",
          name: "Falcon Individual",
          price: 29,
          currency: "USD",
          agents: ["Falcon"],
          features: [
            "Lead Generation Agent",
            "200 leads per month",
            "Apollo.io Integration",
            "Basic lead filtering",
            "Email support"
          ],
          limits: {
            maxLeadsPerMonth: 200
          }
        },
        {
          id: "sage_individual", 
          name: "Sage Individual",
          price: 29,
          currency: "USD",
          agents: ["Sage"],
          features: [
            "Research Agent",
            "100 research reports per month",
            "LinkedIn profile analysis",
            "Company research",
            "Email support"
          ],
          limits: {
            maxResearchPerMonth: 100
          }
        },
        {
          id: "sentinel_individual",
          name: "Sentinel Individual", 
          price: 29,
          currency: "USD",
          agents: ["Sentinel"],
          features: [
            "Email Automation Agent",
            "500 emails per month",
            "Auto-reply generation",
            "Calendar booking",
            "Email support"
          ],
          limits: {
            maxEmailsPerMonth: 500
          }
        },
        {
          id: "professional_combo",
          name: "Professional Combo",
          price: 79,
          currency: "USD", 
          agents: ["Falcon", "Sage"],
          features: [
            "Lead Generation + Research",
            "500 leads per month",
            "200 research reports per month",
            "Advanced filtering",
            "Priority email support"
          ],
          limits: {
            maxLeadsPerMonth: 500,
            maxResearchPerMonth: 200
          },
          popular: true
        },
        {
          id: "ultra_premium",
          name: "Ultra Premium",
          price: 199,
          currency: "USD",
          agents: ["Falcon", "Sage", "Sentinel", "Prism"],
          features: [
            "All AI Agents + Orchestrator",
            "1000 leads per month", 
            "500 research reports per month",
            "2000 emails per month",
            "Full automation workflow",
            "Priority support",
            "Custom integrations"
          ],
          limits: {
            maxLeadsPerMonth: 1000,
            maxResearchPerMonth: 500,
            maxEmailsPerMonth: 2000
          },
          enterprise: true
        }
      ];

      res.json({ plans });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });
}
