import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

export interface QualificationRule {
  id: string;
  userId: string;
  ruleName: string;
  ruleType:
    | "industry_match"
    | "company_size"
    | "geographic"
    | "title_seniority"
    | "budget_indicators"
    | "technology_stack"
    | "employee_count"
    | "decision_maker_level";
  criteria: Record<string, any>;
  weight: number; // 0.00-1.00
  threshold: number; // 0.00-1.00
  isActive: boolean;
  isAiGenerated: boolean;
  generationReasoning?: string;
  applicationsCount: number;
  accuracyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualificationResult {
  id: string;
  leadId: string;
  userId: string;
  overallScore: number; // 0.00-100.00
  qualificationStatus:
    | "qualified"
    | "unqualified"
    | "pending_review"
    | "requires_manual_review";
  confidence: number; // 0.00-1.00
  criteriaScores: Record<string, number>;
  qualificationReasoning: string;
  disqualificationReasons: string[];
  aiAnalysis: Record<string, any>;
  recommendedActions: string[];
  manualReview: boolean;
  manualOverride: boolean;
  actualOutcome?: "converted" | "lost" | "in_progress" | "not_contacted";
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  userId: string;
  fullName: string;
  emailAddress?: string;
  phoneNumber?: string;
  country?: string;
  location: string;
  industry: string;
  companyName: string;
  jobTitle: string;
  seniority?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  leadStatus: string;
  contactStatus: string;
  leadScore: number;
  source: string;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualificationAnalysis {
  success: boolean;
  result?: QualificationResult;
  error?: string;
  processingTimeMs: number;
  rulesApplied: number;
}

export class LeadQualificationService {
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
   * Generate AI-powered qualification rules based on company profile
   */
  async generateQualificationRules(
    userId: string
  ): Promise<QualificationRule[]> {
    try {
      // Get company profile
      const { data: profile, error: profileError } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        throw new Error(
          "Company profile not found. Please create a company profile first."
        );
      }

      // Get user's OpenAI client
      const userOpenAI = await this.getUserOpenAIClient(userId);
      if (!userOpenAI) {
        throw new Error("OpenAI not configured for this user");
      }

      // Generate rules using AI
      const rules = await this.generateRulesWithAI(userOpenAI, profile, userId);

      // Save rules to database
      await this.saveQualificationRules(rules);

      return rules;
    } catch (error) {
      console.error("Error generating qualification rules:", error);
      throw error;
    }
  }

  /**
   * Generate qualification rules using AI
   */
  private async generateRulesWithAI(
    openai: OpenAI,
    companyProfile: any,
    userId: string
  ): Promise<QualificationRule[]> {
    const systemPrompt = `You are an expert lead qualification specialist. Based on the company profile provided, generate intelligent qualification rules that will help identify high-quality leads.

Generate rules for these categories:
1. Industry Match - Target industries and related sectors
2. Company Size - Employee count and revenue ranges
3. Geographic - Target locations and markets
4. Title Seniority - Decision maker levels and job titles
5. Budget Indicators - Signs of budget availability
6. Technology Stack - Relevant technologies used
7. Employee Count - Specific employee ranges
8. Decision Maker Level - Authority levels

For each rule, provide:
- Specific criteria (as JSON object)
- Weight (importance, 0.0-1.0)
- Threshold (minimum score to qualify, 0.0-1.0)
- Reasoning for the rule

Respond in JSON format with an array of rules.`;

    const userPrompt = `Company Profile:
Company: ${companyProfile.company_name}
Industry: ${companyProfile.industry}
Sub-Industry: ${companyProfile.sub_industry || "Not specified"}
Business Model: ${companyProfile.business_model || "Not specified"}
Company Size: ${companyProfile.company_size || "Not specified"}
Annual Revenue: ${companyProfile.annual_revenue || "Not specified"}
Target Market: ${companyProfile.target_market || "Not specified"}
Ideal Customer Profile: ${
      companyProfile.ideal_customer_profile || "Not specified"
    }
Geographic Markets: ${JSON.stringify(companyProfile.geographic_markets || [])}
Value Proposition: ${companyProfile.value_proposition || "Not specified"}
Key Differentiators: ${JSON.stringify(companyProfile.key_differentiators || [])}

Generate qualification rules that will help identify leads most likely to convert for this company.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );
      const aiRules = result.rules || [];

      // Convert AI-generated rules to our format
      const qualificationRules: QualificationRule[] = aiRules.map(
        (rule: any) => ({
          id: uuidv4(),
          userId,
          ruleName: rule.name || "Generated Rule",
          ruleType: rule.type || "industry_match",
          criteria: rule.criteria || {},
          weight: Math.min(Math.max(rule.weight || 0.5, 0), 1),
          threshold: Math.min(Math.max(rule.threshold || 0.7, 0), 1),
          isActive: true,
          isAiGenerated: true,
          generationReasoning:
            rule.reasoning || "AI-generated based on company profile",
          applicationsCount: 0,
          accuracyRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      return qualificationRules;
    } catch (error) {
      console.error("Error generating rules with AI:", error);
      // Return default rules if AI generation fails
      return this.getDefaultQualificationRules(userId, companyProfile);
    }
  }

  /**
   * Get default qualification rules as fallback
   */
  private getDefaultQualificationRules(
    userId: string,
    companyProfile: any
  ): QualificationRule[] {
    return [
      {
        id: uuidv4(),
        userId,
        ruleName: "Industry Match",
        ruleType: "industry_match",
        criteria: {
          targetIndustries: [companyProfile.industry],
          matchType: "exact_or_related",
        },
        weight: 0.25,
        threshold: 0.7,
        isActive: true,
        isAiGenerated: false,
        generationReasoning: "Default industry matching rule",
        applicationsCount: 0,
        accuracyRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId,
        ruleName: "Decision Maker Level",
        ruleType: "title_seniority",
        criteria: {
          targetLevels: ["C-Level", "VP", "Director", "Manager"],
          weights: { "C-Level": 1.0, VP: 0.8, Director: 0.6, Manager: 0.4 },
        },
        weight: 0.3,
        threshold: 0.5,
        isActive: true,
        isAiGenerated: false,
        generationReasoning: "Default decision maker level rule",
        applicationsCount: 0,
        accuracyRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId,
        ruleName: "Company Size",
        ruleType: "company_size",
        criteria: {
          minEmployees: 10,
          maxEmployees: 10000,
          revenueRange: "1M-100M",
        },
        weight: 0.2,
        threshold: 0.6,
        isActive: true,
        isAiGenerated: false,
        generationReasoning: "Default company size rule",
        applicationsCount: 0,
        accuracyRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId,
        ruleName: "Geographic Match",
        ruleType: "geographic",
        criteria: {
          targetRegions: companyProfile.geographic_markets || ["US"],
          matchType: "country_or_region",
        },
        weight: 0.15,
        threshold: 0.8,
        isActive: true,
        isAiGenerated: false,
        generationReasoning: "Default geographic targeting rule",
        applicationsCount: 0,
        accuracyRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        userId,
        ruleName: "Budget Indicators",
        ruleType: "budget_indicators",
        criteria: {
          companyGrowthSignals: true,
          recentFunding: true,
          technologyAdoption: true,
        },
        weight: 0.1,
        threshold: 0.6,
        isActive: true,
        isAiGenerated: false,
        generationReasoning: "Default budget qualification signals",
        applicationsCount: 0,
        accuracyRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Save qualification rules to database
   */
  private async saveQualificationRules(
    rules: QualificationRule[]
  ): Promise<void> {
    try {
      const rulesToInsert = rules.map((rule) => ({
        id: rule.id,
        user_id: rule.userId,
        rule_name: rule.ruleName,
        rule_type: rule.ruleType,
        criteria: rule.criteria,
        weight: rule.weight,
        threshold: rule.threshold,
        is_active: rule.isActive,
        is_ai_generated: rule.isAiGenerated,
        generation_reasoning: rule.generationReasoning,
        applications_count: rule.applicationsCount,
        accuracy_rate: rule.accuracyRate,
        created_at: rule.createdAt.toISOString(),
        updated_at: rule.updatedAt.toISOString(),
      }));

      const { error } = await supabase
        .from("lead_qualification_rules")
        .upsert(rulesToInsert, {
          onConflict: "user_id,rule_name",
        });

      if (error) {
        throw new Error(`Failed to save qualification rules: ${error.message}`);
      }
    } catch (error) {
      console.error("Error saving qualification rules:", error);
      throw error;
    }
  }

  /**
   * Qualify a single lead using AI and qualification rules
   */
  async qualifyLead(
    leadId: string,
    userId: string
  ): Promise<QualificationAnalysis> {
    const startTime = Date.now();

    try {
      // Get lead data
      const lead = await this.getLead(leadId, userId);
      if (!lead) {
        throw new Error("Lead not found");
      }

      // Get user's qualification rules
      const rules = await this.getUserQualificationRules(userId);
      if (rules.length === 0) {
        throw new Error(
          "No qualification rules found. Please generate qualification rules first."
        );
      }

      // Get user's OpenAI client
      const userOpenAI = await this.getUserOpenAIClient(userId);
      if (!userOpenAI) {
        throw new Error("OpenAI not configured for this user");
      }

      // Perform AI-powered qualification
      const qualificationResult = await this.performAIQualification(
        userOpenAI,
        lead,
        rules,
        userId
      );

      // Save qualification result
      await this.saveQualificationResult(qualificationResult);

      // Update rule application counts
      await this.updateRuleApplicationCounts(rules.map((r) => r.id));

      return {
        success: true,
        result: qualificationResult,
        processingTimeMs: Date.now() - startTime,
        rulesApplied: rules.length,
      };
    } catch (error) {
      console.error("Error qualifying lead:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: Date.now() - startTime,
        rulesApplied: 0,
      };
    }
  }

  /**
   * Perform AI-powered lead qualification
   */
  private async performAIQualification(
    openai: OpenAI,
    lead: Lead,
    rules: QualificationRule[],
    userId: string
  ): Promise<QualificationResult> {
    const systemPrompt = `You are an expert lead qualification analyst. Analyze the provided lead against the qualification rules and provide a comprehensive qualification assessment.

For each rule, evaluate how well the lead matches the criteria and assign a score (0.0-1.0).
Calculate an overall qualification score and determine the qualification status.
Provide clear reasoning for your assessment and recommend next actions.

Respond in JSON format:
{
  "overallScore": 0.0-100.0,
  "qualificationStatus": "qualified|unqualified|pending_review|requires_manual_review",
  "confidence": 0.0-1.0,
  "criteriaScores": {"rule_id": score},
  "qualificationReasoning": "detailed explanation",
  "disqualificationReasons": ["reason1", "reason2"],
  "recommendedActions": ["action1", "action2"],
  "requiresManualReview": boolean
}`;

    const userPrompt = `Lead Information:
Name: ${lead.fullName}
Email: ${lead.emailAddress || "Not provided"}
Phone: ${lead.phoneNumber || "Not provided"}
Company: ${lead.companyName}
Job Title: ${lead.jobTitle}
Seniority: ${lead.seniority || "Not specified"}
Industry: ${lead.industry}
Location: ${lead.location}
Country: ${lead.country || "Not specified"}
Website: ${lead.websiteUrl || "Not provided"}
LinkedIn: ${lead.linkedinUrl || "Not provided"}
Current Lead Score: ${lead.leadScore}
Source: ${lead.source}
Tags: ${lead.tags.join(", ")}
Notes: ${lead.notes || "None"}

Qualification Rules:
${rules
  .map(
    (rule) => `
Rule: ${rule.ruleName} (${rule.ruleType})
Weight: ${rule.weight}
Threshold: ${rule.threshold}
Criteria: ${JSON.stringify(rule.criteria)}
Reasoning: ${rule.generationReasoning}
`
  )
  .join("\n")}

Analyze this lead against all qualification rules and provide a comprehensive assessment.`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const aiResult = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      // Create qualification result
      const qualificationResult: QualificationResult = {
        id: uuidv4(),
        leadId: lead.id,
        userId,
        overallScore: Math.min(Math.max(aiResult.overallScore || 0, 0), 100),
        qualificationStatus: aiResult.qualificationStatus || "pending_review",
        confidence: Math.min(Math.max(aiResult.confidence || 0.5, 0), 1),
        criteriaScores: aiResult.criteriaScores || {},
        qualificationReasoning:
          aiResult.qualificationReasoning || "AI analysis completed",
        disqualificationReasons: aiResult.disqualificationReasons || [],
        aiAnalysis: {
          model: "gpt-4o-mini",
          analysisDate: new Date().toISOString(),
          rulesApplied: rules.length,
          rawResponse: aiResult,
        },
        recommendedActions: aiResult.recommendedActions || [],
        manualReview: aiResult.requiresManualReview || false,
        manualOverride: false,
        analyzedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return qualificationResult;
    } catch (error) {
      console.error("Error performing AI qualification:", error);

      // Return fallback qualification result
      return {
        id: uuidv4(),
        leadId: lead.id,
        userId,
        overallScore: 50, // Neutral score
        qualificationStatus: "requires_manual_review",
        confidence: 0.0,
        criteriaScores: {},
        qualificationReasoning:
          "AI qualification failed, manual review required",
        disqualificationReasons: ["AI analysis error"],
        aiAnalysis: {
          error: error instanceof Error ? error.message : "Unknown error",
          analysisDate: new Date().toISOString(),
        },
        recommendedActions: ["Manual review required"],
        manualReview: true,
        manualOverride: false,
        analyzedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Get lead by ID and user ID
   */
  private async getLead(leadId: string, userId: string): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Lead not found
        }
        throw new Error(`Failed to get lead: ${error.message}`);
      }

      return this.mapDatabaseToLead(data);
    } catch (error) {
      console.error("Error getting lead:", error);
      throw error;
    }
  }

  /**
   * Get user's qualification rules
   */
  private async getUserQualificationRules(
    userId: string
  ): Promise<QualificationRule[]> {
    try {
      const { data, error } = await supabase
        .from("lead_qualification_rules")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) {
        throw new Error(`Failed to get qualification rules: ${error.message}`);
      }

      return data?.map(this.mapDatabaseToQualificationRule) || [];
    } catch (error) {
      console.error("Error getting qualification rules:", error);
      throw error;
    }
  }

  /**
   * Save qualification result to database
   */
  private async saveQualificationResult(
    result: QualificationResult
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("lead_qualification_results")
        .upsert(
          {
            id: result.id,
            lead_id: result.leadId,
            user_id: result.userId,
            overall_score: result.overallScore,
            qualification_status: result.qualificationStatus,
            confidence: result.confidence,
            criteria_scores: result.criteriaScores,
            qualification_reasoning: result.qualificationReasoning,
            disqualification_reasons: result.disqualificationReasons,
            ai_analysis: result.aiAnalysis,
            recommended_actions: result.recommendedActions,
            manual_review: result.manualReview,
            manual_override: result.manualOverride,
            actual_outcome: result.actualOutcome,
            analyzed_at: result.analyzedAt.toISOString(),
            created_at: result.createdAt.toISOString(),
            updated_at: result.updatedAt.toISOString(),
          },
          {
            onConflict: "lead_id",
          }
        );

      if (error) {
        throw new Error(
          `Failed to save qualification result: ${error.message}`
        );
      }
    } catch (error) {
      console.error("Error saving qualification result:", error);
      throw error;
    }
  }

  /**
   * Update rule application counts
   */
  private async updateRuleApplicationCounts(ruleIds: string[]): Promise<void> {
    try {
      for (const ruleId of ruleIds) {
        await supabase
          .from("lead_qualification_rules")
          .update({
            applications_count: supabase.raw("applications_count + 1"),
            updated_at: new Date().toISOString(),
          })
          .eq("id", ruleId);
      }
    } catch (error) {
      console.error("Error updating rule application counts:", error);
    }
  }

  /**
   * Get qualification results for user's leads
   */
  async getQualificationResults(
    userId: string,
    filters?: {
      status?: string;
      minScore?: number;
      maxScore?: number;
      limit?: number;
    }
  ): Promise<QualificationResult[]> {
    try {
      let query = supabase
        .from("lead_qualification_results")
        .select("*")
        .eq("user_id", userId);

      if (filters?.status) {
        query = query.eq("qualification_status", filters.status);
      }

      if (filters?.minScore !== undefined) {
        query = query.gte("overall_score", filters.minScore);
      }

      if (filters?.maxScore !== undefined) {
        query = query.lte("overall_score", filters.maxScore);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      query = query.order("analyzed_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(
          `Failed to get qualification results: ${error.message}`
        );
      }

      return data?.map(this.mapDatabaseToQualificationResult) || [];
    } catch (error) {
      console.error("Error getting qualification results:", error);
      throw error;
    }
  }

  /**
   * Batch qualify multiple leads
   */
  async batchQualifyLeads(
    leadIds: string[],
    userId: string
  ): Promise<{
    success: number;
    failed: number;
    results: QualificationAnalysis[];
  }> {
    const results: QualificationAnalysis[] = [];
    let success = 0;
    let failed = 0;

    for (const leadId of leadIds) {
      try {
        const analysis = await this.qualifyLead(leadId, userId);
        results.push(analysis);

        if (analysis.success) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          processingTimeMs: 0,
          rulesApplied: 0,
        });
      }
    }

    return { success, failed, results };
  }

  /**
   * Map database row to Lead interface
   */
  private mapDatabaseToLead(data: any): Lead {
    return {
      id: data.id,
      userId: data.user_id,
      fullName: data.full_name,
      emailAddress: data.email_address,
      phoneNumber: data.phone_number,
      country: data.country,
      location: data.location,
      industry: data.industry,
      companyName: data.company_name,
      jobTitle: data.job_title,
      seniority: data.seniority,
      websiteUrl: data.website_url,
      linkedinUrl: data.linkedin_url,
      leadStatus: data.lead_status,
      contactStatus: data.contact_status,
      leadScore: data.lead_score || 0,
      source: data.source,
      tags: data.tags || [],
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database row to QualificationRule interface
   */
  private mapDatabaseToQualificationRule(data: any): QualificationRule {
    return {
      id: data.id,
      userId: data.user_id,
      ruleName: data.rule_name,
      ruleType: data.rule_type,
      criteria: data.criteria || {},
      weight: data.weight || 0.5,
      threshold: data.threshold || 0.7,
      isActive: data.is_active,
      isAiGenerated: data.is_ai_generated,
      generationReasoning: data.generation_reasoning,
      applicationsCount: data.applications_count || 0,
      accuracyRate: data.accuracy_rate || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database row to QualificationResult interface
   */
  private mapDatabaseToQualificationResult(data: any): QualificationResult {
    return {
      id: data.id,
      leadId: data.lead_id,
      userId: data.user_id,
      overallScore: data.overall_score || 0,
      qualificationStatus: data.qualification_status,
      confidence: data.confidence || 0,
      criteriaScores: data.criteria_scores || {},
      qualificationReasoning: data.qualification_reasoning || "",
      disqualificationReasons: data.disqualification_reasons || [],
      aiAnalysis: data.ai_analysis || {},
      recommendedActions: data.recommended_actions || [],
      manualReview: data.manual_review || false,
      manualOverride: data.manual_override || false,
      actualOutcome: data.actual_outcome,
      analyzedAt: new Date(data.analyzed_at),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
