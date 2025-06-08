import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

export interface CompanyProfile {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  subIndustry?: string;
  businessModel?: string;
  companySize?: string;
  annualRevenue?: string;
  targetMarket?: string;
  idealCustomerProfile?: string;
  geographicMarkets?: string[];
  valueProposition?: string;
  keyDifferentiators?: string[];
  competitiveAdvantages?: string;
  brandVoice?: string;
  communicationStyle?: string;
  industryTerminology?: string[];
  qualificationCriteria?: Record<string, any>;
  disqualificationCriteria?: Record<string, any>;
  lastAnalyzed?: Date;
  promptsGenerated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentPrompt {
  id: string;
  userId: string;
  agentName: "falcon" | "sage" | "sentinel" | "prism";
  promptType:
    | "system"
    | "task_specific"
    | "qualification"
    | "completion"
    | "routing";
  customPrompt: string;
  defaultPrompt: string;
  isActive: boolean;
  isCustomized: boolean;
  generatedBy: "ai" | "manual" | "hybrid";
  generationContext: Record<string, any>;
  confidence?: number;
  usageCount: number;
  successRate: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptGenerationResult {
  success: boolean;
  promptsGenerated: number;
  prompts: AgentPrompt[];
  error?: string;
  generationTimeMs: number;
  tokensUsed: number;
}

export class PromptCustomizationService {
  private openai: OpenAI | null;

  constructor() {
    // Initialize OpenAI client if API key is available
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      : null;
  }

  /**
   * Get or create user's OpenAI client using their API keys
   */
  private async getUserOpenAIClient(userId: string): Promise<OpenAI | null> {
    try {
      // Get user's API keys from user_agent_configs
      const { data: configs, error } = await supabase
        .from("user_agent_configs")
        .select("api_keys")
        .eq("user_id", userId)
        .limit(1);

      if (error || !configs || configs.length === 0) {
        console.log(
          `No API keys found for user ${userId}, using development keys`
        );
        return this.openai; // Fallback to development OpenAI
      }

      const apiKeys = configs[0].api_keys;
      if (apiKeys?.openaiApiKey) {
        // Decrypt the API key if needed
        const { decrypt } = await import("../utils/encryption.js");
        const decryptedKey = decrypt(apiKeys.openaiApiKey);

        return new OpenAI({
          apiKey: decryptedKey,
        });
      }

      return this.openai; // Fallback to development OpenAI
    } catch (error) {
      console.error("Error getting user OpenAI client:", error);
      return this.openai; // Fallback to development OpenAI
    }
  }

  /**
   * Create or update company profile
   */
  async createOrUpdateCompanyProfile(
    userId: string,
    profileData: Partial<CompanyProfile>
  ): Promise<CompanyProfile> {
    try {
      const profileId = uuidv4();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("company_profiles")
        .upsert(
          {
            id: profileId,
            user_id: userId,
            ...profileData,
            updated_at: now,
            created_at: now,
          },
          {
            onConflict: "user_id",
          }
        )
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to create/update company profile: ${error.message}`
        );
      }

      return this.mapDatabaseToCompanyProfile(data);
    } catch (error) {
      console.error("Error creating/updating company profile:", error);
      throw error;
    }
  }

  /**
   * Get company profile by user ID
   */
  async getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
    try {
      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // No profile found
        }
        throw new Error(`Failed to get company profile: ${error.message}`);
      }

      return this.mapDatabaseToCompanyProfile(data);
    } catch (error) {
      console.error("Error getting company profile:", error);
      throw error;
    }
  }

  /**
   * Generate customized prompts for all agents based on company profile
   */
  async generateCustomizedPrompts(
    userId: string
  ): Promise<PromptGenerationResult> {
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      // Get company profile
      const companyProfile = await this.getCompanyProfile(userId);
      if (!companyProfile) {
        throw new Error(
          "Company profile not found. Please create a company profile first."
        );
      }

      // Get user's OpenAI client
      const userOpenAI = await this.getUserOpenAIClient(userId);
      if (!userOpenAI) {
        throw new Error("OpenAI not configured for this user");
      }

      // Generate prompts for each agent
      const agents: Array<"falcon" | "sage" | "sentinel" | "prism"> = [
        "falcon",
        "sage",
        "sentinel",
        "prism",
      ];
      const generatedPrompts: AgentPrompt[] = [];

      for (const agentName of agents) {
        const agentPrompts = await this.generateAgentPrompts(
          userOpenAI,
          agentName,
          companyProfile,
          userId
        );
        generatedPrompts.push(...agentPrompts);

        // Estimate tokens used (rough calculation)
        tokensUsed += agentPrompts.length * 500; // Approximate tokens per prompt
      }

      // Save prompts to database
      await this.saveGeneratedPrompts(generatedPrompts);

      // Update company profile to mark prompts as generated
      await supabase
        .from("company_profiles")
        .update({
          prompts_generated: true,
          last_analyzed: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      // Log generation history
      await this.logPromptGeneration(
        userId,
        companyProfile,
        generatedPrompts,
        true,
        Date.now() - startTime,
        tokensUsed
      );

      return {
        success: true,
        promptsGenerated: generatedPrompts.length,
        prompts: generatedPrompts,
        generationTimeMs: Date.now() - startTime,
        tokensUsed,
      };
    } catch (error) {
      console.error("Error generating customized prompts:", error);

      // Log failed generation
      const companyProfile = await this.getCompanyProfile(userId);
      if (companyProfile) {
        await this.logPromptGeneration(
          userId,
          companyProfile,
          [],
          false,
          Date.now() - startTime,
          tokensUsed,
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      return {
        success: false,
        promptsGenerated: 0,
        prompts: [],
        error: error instanceof Error ? error.message : "Unknown error",
        generationTimeMs: Date.now() - startTime,
        tokensUsed,
      };
    }
  }

  /**
   * Generate prompts for a specific agent
   */
  private async generateAgentPrompts(
    openai: OpenAI,
    agentName: "falcon" | "sage" | "sentinel" | "prism",
    companyProfile: CompanyProfile,
    userId: string
  ): Promise<AgentPrompt[]> {
    const prompts: AgentPrompt[] = [];
    const promptTypes = this.getPromptTypesForAgent(agentName);

    for (const promptType of promptTypes) {
      try {
        const { customPrompt, defaultPrompt, confidence } =
          await this.generateSinglePrompt(
            openai,
            agentName,
            promptType,
            companyProfile
          );

        const prompt: AgentPrompt = {
          id: uuidv4(),
          userId,
          agentName,
          promptType,
          customPrompt,
          defaultPrompt,
          isActive: true,
          isCustomized: true,
          generatedBy: "ai",
          generationContext: {
            companyProfileId: companyProfile.id,
            industry: companyProfile.industry,
            businessModel: companyProfile.businessModel,
            generatedAt: new Date().toISOString(),
          },
          confidence,
          usageCount: 0,
          successRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prompts.push(prompt);
      } catch (error) {
        console.error(
          `Error generating ${promptType} prompt for ${agentName}:`,
          error
        );
        // Continue with other prompts even if one fails
      }
    }

    return prompts;
  }

  /**
   * Get prompt types for each agent
   */
  private getPromptTypesForAgent(
    agentName: string
  ): Array<
    "system" | "task_specific" | "qualification" | "completion" | "routing"
  > {
    switch (agentName) {
      case "falcon":
        return ["system", "task_specific", "qualification"];
      case "sage":
        return ["system", "task_specific"];
      case "sentinel":
        return ["system", "task_specific", "completion"];
      case "prism":
        return ["system", "routing"];
      default:
        return ["system"];
    }
  }

  /**
   * Generate a single prompt using OpenAI
   */
  private async generateSinglePrompt(
    openai: OpenAI,
    agentName: string,
    promptType: string,
    companyProfile: CompanyProfile
  ): Promise<{
    customPrompt: string;
    defaultPrompt: string;
    confidence: number;
  }> {
    const systemPrompt = this.getPromptGenerationSystemPrompt(
      agentName,
      promptType
    );
    const userPrompt = this.buildUserPromptFromProfile(
      companyProfile,
      agentName,
      promptType
    );
    const defaultPrompt = this.getDefaultPrompt(agentName, promptType);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      return {
        customPrompt: result.customPrompt || defaultPrompt,
        defaultPrompt,
        confidence: result.confidence || 0.7,
      };
    } catch (error) {
      console.error(
        `Error generating prompt for ${agentName} ${promptType}:`,
        error
      );
      return {
        customPrompt: defaultPrompt,
        defaultPrompt,
        confidence: 0.0,
      };
    }
  }

  /**
   * Get system prompt for prompt generation
   */
  private getPromptGenerationSystemPrompt(
    agentName: string,
    promptType: string
  ): string {
    return `You are an expert AI prompt engineer specializing in business automation and lead generation systems. Your task is to create highly customized prompts for the ${agentName} agent's ${promptType} functionality.

The ${agentName} agent has these capabilities:
${this.getAgentCapabilities(agentName)}

Generate a customized prompt that:
1. Incorporates the company's specific industry, business model, and target market
2. Uses appropriate industry terminology and communication style
3. Aligns with the company's value proposition and competitive advantages
4. Maintains professional quality while being highly specific to their business

Respond in JSON format:
{
  "customPrompt": "The customized prompt text",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of customization approach"
}`;
  }

  /**
   * Build user prompt from company profile with document insights
   */
  private buildUserPromptFromProfile(
    companyProfile: CompanyProfile,
    agentName: string,
    promptType: string
  ): string {
    // Get document-derived insights if available
    const documentInsights = (companyProfile as any).aiExtractedInsights || {};
    const documentTerminology =
      (companyProfile as any).documentDerivedTerminology || [];
    const extractedProducts =
      (companyProfile as any).extractedProductsServices || [];
    const extractedCustomers =
      (companyProfile as any).extractedTargetCustomers || [];

    let prompt = `Create a customized ${promptType} prompt for the ${agentName} agent based on this comprehensive company profile:

## Core Company Information
Company: ${companyProfile.companyName}
Industry: ${companyProfile.industry}${
      companyProfile.subIndustry ? ` (${companyProfile.subIndustry})` : ""
    }
Business Model: ${companyProfile.businessModel || "Not specified"}
Company Size: ${companyProfile.companySize || "Not specified"}
Annual Revenue: ${companyProfile.annualRevenue || "Not specified"}

## Target Market & Customers
Target Market: ${companyProfile.targetMarket || "Not specified"}
Ideal Customer Profile: ${
      companyProfile.idealCustomerProfile || "Not specified"
    }
Geographic Markets: ${
      companyProfile.geographicMarkets?.join(", ") || "Not specified"
    }`;

    // Add document-derived customer insights if available
    if (extractedCustomers.length > 0) {
      prompt += `
Document-Derived Customer Segments: ${extractedCustomers.join(", ")}`;
    }

    prompt += `

## Value Proposition & Positioning
Value Proposition: ${companyProfile.valueProposition || "Not specified"}
Key Differentiators: ${
      companyProfile.keyDifferentiators?.join(", ") || "Not specified"
    }
Competitive Advantages: ${
      companyProfile.competitiveAdvantages || "Not specified"
    }`;

    // Add document-derived value propositions if available
    if (
      documentInsights.valuePropositions &&
      documentInsights.valuePropositions.length > 0
    ) {
      prompt += `
Document-Derived Value Propositions: ${documentInsights.valuePropositions.join(
        ", "
      )}`;
    }

    // Add products/services information
    if (extractedProducts.length > 0) {
      prompt += `

## Products & Services (from documents)
${extractedProducts.join(", ")}`;
    }

    prompt += `

## Communication & Brand
Brand Voice: ${companyProfile.brandVoice || "Professional"}
Communication Style: ${companyProfile.communicationStyle || "Professional"}
Industry Terminology: ${
      companyProfile.industryTerminology?.join(", ") ||
      "Standard business terms"
    }`;

    // Add document-derived terminology if available
    if (documentTerminology.length > 0) {
      prompt += `
Document-Derived Terminology: ${documentTerminology.join(", ")}`;
    }

    // Add document insights summary if available
    if (documentInsights.companyDescription) {
      prompt += `

## Document-Derived Business Intelligence
Company Description: ${documentInsights.companyDescription}`;

      if (
        documentInsights.competitiveAdvantages &&
        documentInsights.competitiveAdvantages.length > 0
      ) {
        prompt += `
Competitive Advantages: ${documentInsights.competitiveAdvantages.join(", ")}`;
      }
    }

    prompt += `

## Instructions
Create a highly personalized ${promptType} prompt for the ${agentName} agent that:
1. Incorporates the company's specific industry context and terminology
2. Reflects their unique value proposition and competitive positioning
3. Uses their preferred communication style and brand voice
4. Leverages document-derived insights for enhanced accuracy
5. Maintains the core functionality of the ${agentName} agent while being highly specific to this business

The prompt should feel like it was written specifically for this company, not a generic template.`;

    return prompt;
  }

  /**
   * Get agent capabilities description
   */
  private getAgentCapabilities(agentName: string): string {
    switch (agentName) {
      case "falcon":
        return `- Lead generation using Apollo.io
- Prospect identification and qualification
- Contact information gathering
- Lead scoring and prioritization`;
      case "sage":
        return `- LinkedIn profile research and analysis
- Company research via Perplexity
- Trustpilot review analysis
- Comprehensive research report generation`;
      case "sentinel":
        return `- Email monitoring and classification
- Automated response generation
- Calendar booking coordination
- Follow-up scheduling and reminders`;
      case "prism":
        return `- Intent recognition and routing
- Multi-agent workflow coordination
- Conversational interface management
- Task delegation and orchestration`;
      default:
        return "General AI agent capabilities";
    }
  }

  /**
   * Get default prompt for agent and type
   */
  private getDefaultPrompt(agentName: string, promptType: string): string {
    const defaultPrompts: Record<string, Record<string, string>> = {
      falcon: {
        system:
          "You are Falcon, a lead generation specialist. Help users find and qualify potential customers using Apollo.io data.",
        task_specific:
          "Generate high-quality leads based on the provided criteria including location, industry, and job titles.",
        qualification:
          "Evaluate leads based on email availability, job title relevance, company size, and industry match.",
      },
      sage: {
        system:
          "You are Sage, a research specialist. Provide comprehensive analysis of leads and companies using multiple data sources.",
        task_specific:
          "Research the provided LinkedIn profile and company to generate detailed insights and recommendations.",
      },
      sentinel: {
        system:
          "You are Sentinel, an email automation specialist. Monitor emails and generate appropriate responses.",
        task_specific:
          "Classify incoming emails and generate contextual responses based on the email content and sender information.",
        completion:
          "Provide a summary of email processing results and any actions taken.",
      },
      prism: {
        system:
          "You are Prism, the central orchestrator. Route user requests to appropriate agents and coordinate workflows.",
        routing:
          "Analyze user intent and determine which agent should handle the request, extracting relevant parameters.",
      },
    };

    return (
      defaultPrompts[agentName]?.[promptType] ||
      "You are an AI assistant helping with business automation tasks."
    );
  }

  /**
   * Save generated prompts to database
   */
  private async saveGeneratedPrompts(prompts: AgentPrompt[]): Promise<void> {
    try {
      const promptsToInsert = prompts.map((prompt) => ({
        id: prompt.id,
        user_id: prompt.userId,
        agent_name: prompt.agentName,
        prompt_type: prompt.promptType,
        custom_prompt: prompt.customPrompt,
        default_prompt: prompt.defaultPrompt,
        is_active: prompt.isActive,
        is_customized: prompt.isCustomized,
        generated_by: prompt.generatedBy,
        generation_context: prompt.generationContext,
        confidence: prompt.confidence,
        usage_count: prompt.usageCount,
        success_rate: prompt.successRate,
        last_used: prompt.lastUsed?.toISOString(),
        created_at: prompt.createdAt.toISOString(),
        updated_at: prompt.updatedAt.toISOString(),
      }));

      const { error } = await supabase
        .from("agent_prompts")
        .upsert(promptsToInsert, {
          onConflict: "user_id,agent_name,prompt_type",
        });

      if (error) {
        throw new Error(`Failed to save prompts: ${error.message}`);
      }
    } catch (error) {
      console.error("Error saving generated prompts:", error);
      throw error;
    }
  }

  /**
   * Log prompt generation attempt
   */
  private async logPromptGeneration(
    userId: string,
    companyProfile: CompanyProfile,
    prompts: AgentPrompt[],
    success: boolean,
    generationTimeMs: number,
    tokensUsed: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("prompt_generation_history")
        .insert({
          id: uuidv4(),
          user_id: userId,
          generation_type: "manual_trigger",
          company_profile_snapshot: companyProfile,
          generated_prompts: prompts.map((p) => ({
            agentName: p.agentName,
            promptType: p.promptType,
            confidence: p.confidence,
          })),
          success,
          error_message: errorMessage,
          prompts_applied: prompts.length,
          generation_time_ms: generationTimeMs,
          openai_tokens_used: tokensUsed,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error logging prompt generation:", error);
      }
    } catch (error) {
      console.error("Error logging prompt generation:", error);
    }
  }

  /**
   * Get user's customized prompts
   */
  async getUserPrompts(
    userId: string,
    agentName?: string
  ): Promise<AgentPrompt[]> {
    try {
      let query = supabase
        .from("agent_prompts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (agentName) {
        query = query.eq("agent_name", agentName);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get user prompts: ${error.message}`);
      }

      return data?.map(this.mapDatabaseToAgentPrompt) || [];
    } catch (error) {
      console.error("Error getting user prompts:", error);
      throw error;
    }
  }

  /**
   * Map database row to AgentPrompt interface
   */
  private mapDatabaseToAgentPrompt(data: any): AgentPrompt {
    return {
      id: data.id,
      userId: data.user_id,
      agentName: data.agent_name,
      promptType: data.prompt_type,
      customPrompt: data.custom_prompt,
      defaultPrompt: data.default_prompt,
      isActive: data.is_active,
      isCustomized: data.is_customized,
      generatedBy: data.generated_by,
      generationContext: data.generation_context || {},
      confidence: data.confidence,
      usageCount: data.usage_count || 0,
      successRate: data.success_rate || 0,
      lastUsed: data.last_used ? new Date(data.last_used) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database row to CompanyProfile interface
   */
  private mapDatabaseToCompanyProfile(data: any): CompanyProfile {
    return {
      id: data.id,
      userId: data.user_id,
      companyName: data.company_name,
      industry: data.industry,
      subIndustry: data.sub_industry,
      businessModel: data.business_model,
      companySize: data.company_size,
      annualRevenue: data.annual_revenue,
      targetMarket: data.target_market,
      idealCustomerProfile: data.ideal_customer_profile,
      geographicMarkets: data.geographic_markets || [],
      valueProposition: data.value_proposition,
      keyDifferentiators: data.key_differentiators || [],
      competitiveAdvantages: data.competitive_advantages,
      brandVoice: data.brand_voice,
      communicationStyle: data.communication_style,
      industryTerminology: data.industry_terminology || [],
      qualificationCriteria: data.qualification_criteria || {},
      disqualificationCriteria: data.disqualification_criteria || {},
      lastAnalyzed: data.last_analyzed
        ? new Date(data.last_analyzed)
        : undefined,
      promptsGenerated: data.prompts_generated || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
