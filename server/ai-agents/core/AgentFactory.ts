import { FalconAgent } from "../agents/FalconAgent.js";
import { SageAgent } from "../agents/SageAgent.js";
import { SentinelAgent } from "../agents/SentinelAgent.js";
import { BaseAgent } from "./BaseAgent.js";
import { supabase } from "../../db.js";
import { decrypt } from "../../utils/encryption.js";

export interface UserAgentConfig {
  userId: string;
  agentName: string;
  isEnabled: boolean;
  apiKeys: Record<string, string>;
  configuration: Record<string, any>;
}

export class AgentFactory {
  private static userAgentInstances = new Map<string, Map<string, BaseAgent>>();

  /**
   * Get or create a user-specific agent instance
   */
  static async getUserAgent(
    userId: string, 
    agentName: string
  ): Promise<BaseAgent | null> {
    const userKey = `${userId}:${agentName}`;
    
    // Check if instance already exists
    if (!this.userAgentInstances.has(userId)) {
      this.userAgentInstances.set(userId, new Map());
    }
    
    const userAgents = this.userAgentInstances.get(userId)!;
    if (userAgents.has(agentName)) {
      return userAgents.get(agentName)!;
    }

    // Load user's agent configuration
    const config = await this.loadUserAgentConfig(userId, agentName);
    if (!config || !config.isEnabled) {
      return null;
    }

    // Create new agent instance with user-specific configuration
    const agent = await this.createAgentInstance(agentName, config);
    if (agent) {
      userAgents.set(agentName, agent);
    }

    return agent;
  }

  /**
   * Load user-specific agent configuration from database
   */
  private static async loadUserAgentConfig(
    userId: string, 
    agentName: string
  ): Promise<UserAgentConfig | null> {
    try {
      const { data, error } = await supabase
        .from('user_agent_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_name', agentName)
        .single();

      if (error || !data) {
        console.log(`No configuration found for user ${userId}, agent ${agentName}`);
        return null;
      }

      // Decrypt API keys
      const decryptedApiKeys: Record<string, string> = {};
      for (const [key, encryptedValue] of Object.entries(data.api_keys as Record<string, string>)) {
        decryptedApiKeys[key] = decrypt(encryptedValue);
      }

      return {
        userId: data.user_id,
        agentName: data.agent_name,
        isEnabled: data.is_enabled,
        apiKeys: decryptedApiKeys,
        configuration: data.configuration as Record<string, any>
      };
    } catch (error) {
      console.error(`Error loading agent config for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Create agent instance with user-specific configuration
   */
  private static async createAgentInstance(
    agentName: string, 
    config: UserAgentConfig
  ): Promise<BaseAgent | null> {
    try {
      switch (agentName.toLowerCase()) {
        case 'falcon':
          return new FalconAgent(config);
        case 'sage':
          return new SageAgent(config);
        case 'sentinel':
          return new SentinelAgent(config);
        default:
          console.error(`Unknown agent type: ${agentName}`);
          return null;
      }
    } catch (error) {
      console.error(`Error creating ${agentName} agent for user ${config.userId}:`, error);
      return null;
    }
  }

  /**
   * Clear user agent instances (for cleanup or config changes)
   */
  static clearUserAgents(userId: string): void {
    this.userAgentInstances.delete(userId);
  }

  /**
   * Check if user has access to specific agent based on subscription
   */
  static async hasAgentAccess(userId: string, agentName: string): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status')
        .eq('id', userId)
        .single();

      if (!user || user.subscription_status !== 'active') {
        return false;
      }

      const { data: planFeature } = await supabase
        .from('subscription_plan_features')
        .select('is_included')
        .eq('plan_name', user.subscription_plan)
        .eq('agent_name', agentName)
        .single();

      return planFeature?.is_included || false;
    } catch (error) {
      console.error(`Error checking agent access for user ${userId}:`, error);
      return false;
    }
  }
}
