import { supabase } from "../db.js";
import { encrypt } from "../utils/encryption.js";
import { v4 as uuidv4 } from "uuid";

export interface OnboardingData {
  companyName: string;
  industry: string;
  targetMarket: string;
  businessSize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  primaryGoals: string[];
  preferredCommunicationStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  timezone: string;
}

export interface AgentApiKeys {
  openaiApiKey?: string;
  apolloApiKey?: string;
  apifyApiKey?: string;
  perplexityApiKey?: string;
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRefreshToken?: string;
  calendarClientId?: string;
  calendarClientSecret?: string;
  calendarRefreshToken?: string;
}

export class UserOnboardingService {
  /**
   * Complete user onboarding process
   */
  async completeOnboarding(
    userId: string,
    onboardingData: OnboardingData,
    selectedPlan: string,
    agentApiKeys: AgentApiKeys
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Save onboarding data
      await this.saveOnboardingData(userId, onboardingData);

      // 2. Configure agents based on selected plan
      await this.configureUserAgents(userId, selectedPlan, agentApiKeys, onboardingData);

      // 3. Mark onboarding as completed
      await this.markOnboardingCompleted(userId);

      return {
        success: true,
        message: "Onboarding completed successfully! Your AI agents are now configured."
      };
    } catch (error) {
      console.error("Onboarding error:", error);
      return {
        success: false,
        message: "Failed to complete onboarding. Please try again."
      };
    }
  }

  /**
   * Save user onboarding data
   */
  private async saveOnboardingData(userId: string, data: OnboardingData): Promise<void> {
    const { error } = await supabase
      .from('user_onboarding')
      .upsert({
        id: uuidv4(),
        user_id: userId,
        company_name: data.companyName,
        industry: data.industry,
        target_market: data.targetMarket,
        business_size: data.businessSize,
        primary_goals: data.primaryGoals,
        preferred_communication_style: data.preferredCommunicationStyle,
        timezone: data.timezone,
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw new Error(`Failed to save onboarding data: ${error.message}`);
    }
  }

  /**
   * Configure user agents based on subscription plan
   */
  private async configureUserAgents(
    userId: string,
    planName: string,
    apiKeys: AgentApiKeys,
    onboardingData: OnboardingData
  ): Promise<void> {
    // Get plan features to determine which agents to enable
    const { data: planFeatures } = await supabase
      .from('subscription_plan_features')
      .select('agent_name, is_included, monthly_limits')
      .eq('plan_name', planName)
      .eq('is_included', true);

    if (!planFeatures || planFeatures.length === 0) {
      throw new Error(`No features found for plan: ${planName}`);
    }

    // Configure each agent included in the plan
    for (const feature of planFeatures) {
      await this.configureAgent(
        userId,
        feature.agent_name,
        apiKeys,
        onboardingData,
        feature.monthly_limits || {}
      );
    }
  }

  /**
   * Configure individual agent for user
   */
  private async configureAgent(
    userId: string,
    agentName: string,
    apiKeys: AgentApiKeys,
    onboardingData: OnboardingData,
    monthlyLimits: Record<string, any>
  ): Promise<void> {
    // Prepare agent-specific API keys
    const agentApiKeys = this.getAgentSpecificKeys(agentName, apiKeys);
    
    // Encrypt API keys
    const encryptedKeys: Record<string, string> = {};
    for (const [key, value] of Object.entries(agentApiKeys)) {
      if (value) {
        encryptedKeys[key] = encrypt(value);
      }
    }

    // Prepare agent configuration
    const configuration = this.getAgentConfiguration(agentName, onboardingData, monthlyLimits);

    // Save agent configuration
    const { error } = await supabase
      .from('user_agent_configs')
      .upsert({
        id: uuidv4(),
        user_id: userId,
        agent_name: agentName,
        is_enabled: true,
        api_keys: encryptedKeys,
        configuration: configuration,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,agent_name'
      });

    if (error) {
      throw new Error(`Failed to configure ${agentName} agent: ${error.message}`);
    }
  }

  /**
   * Get API keys specific to each agent
   */
  private getAgentSpecificKeys(agentName: string, apiKeys: AgentApiKeys): Record<string, string> {
    const baseKeys = {
      openaiApiKey: apiKeys.openaiApiKey || ''
    };

    switch (agentName.toLowerCase()) {
      case 'falcon':
        return {
          ...baseKeys,
          apolloApiKey: apiKeys.apolloApiKey || '',
          apifyApiKey: apiKeys.apifyApiKey || ''
        };
      
      case 'sage':
        return {
          ...baseKeys,
          apifyApiKey: apiKeys.apifyApiKey || '',
          perplexityApiKey: apiKeys.perplexityApiKey || ''
        };
      
      case 'sentinel':
        return {
          ...baseKeys,
          gmailClientId: apiKeys.gmailClientId || '',
          gmailClientSecret: apiKeys.gmailClientSecret || '',
          gmailRefreshToken: apiKeys.gmailRefreshToken || '',
          calendarClientId: apiKeys.calendarClientId || '',
          calendarClientSecret: apiKeys.calendarClientSecret || '',
          calendarRefreshToken: apiKeys.calendarRefreshToken || ''
        };
      
      default:
        return baseKeys;
    }
  }

  /**
   * Get agent-specific configuration based on onboarding data
   */
  private getAgentConfiguration(
    agentName: string,
    onboardingData: OnboardingData,
    monthlyLimits: Record<string, any>
  ): Record<string, any> {
    const baseConfig = {
      userId: onboardingData,
      industry: onboardingData.industry,
      targetMarket: onboardingData.targetMarket,
      communicationStyle: onboardingData.preferredCommunicationStyle,
      timezone: onboardingData.timezone,
      monthlyLimits: monthlyLimits
    };

    switch (agentName.toLowerCase()) {
      case 'falcon':
        return {
          ...baseConfig,
          leadGeneration: {
            targetIndustries: [onboardingData.industry],
            targetMarkets: [onboardingData.targetMarket],
            businessSize: onboardingData.businessSize,
            maxLeadsPerMonth: monthlyLimits.maxLeadsPerMonth || 100
          }
        };
      
      case 'sage':
        return {
          ...baseConfig,
          research: {
            focusAreas: onboardingData.primaryGoals,
            industry: onboardingData.industry,
            maxResearchPerMonth: monthlyLimits.maxResearchPerMonth || 50
          }
        };
      
      case 'sentinel':
        return {
          ...baseConfig,
          emailAutomation: {
            communicationStyle: onboardingData.preferredCommunicationStyle,
            companyName: onboardingData.companyName,
            timezone: onboardingData.timezone,
            maxEmailsPerMonth: monthlyLimits.maxEmailsPerMonth || 200
          }
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Mark onboarding as completed
   */
  private async markOnboardingCompleted(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_onboarding')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to mark onboarding as completed: ${error.message}`);
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_onboarding')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .single();

    return data?.onboarding_completed || false;
  }

  /**
   * Get user onboarding data
   */
  async getOnboardingData(userId: string): Promise<OnboardingData | null> {
    const { data } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;

    return {
      companyName: data.company_name,
      industry: data.industry,
      targetMarket: data.target_market,
      businessSize: data.business_size,
      primaryGoals: data.primary_goals,
      preferredCommunicationStyle: data.preferred_communication_style,
      timezone: data.timezone
    };
  }
}
