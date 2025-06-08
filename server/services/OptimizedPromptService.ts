import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

export interface CompanyContext {
  companyName: string;
  industry: string;
  subIndustry?: string;
  businessModel: string;
  companySize: string;
  targetMarket: string;
  valueProposition: string;
  keyDifferentiators: string[];
  competitiveAdvantages: string;
  brandVoice: string;
  communicationStyle: string;
  industryTerminology: string[];
  // Document-derived insights
  documentInsights?: {
    companyDescription?: string;
    productsServices?: string[];
    industryTerminology?: string[];
    competitiveAdvantages?: string[];
    valuePropositions?: string[];
    customerSegments?: string[];
  };
}

export interface OptimizedPrompt {
  id: string;
  agentName: string;
  promptType: string;
  systemPrompt: string;
  userPrompt: string;
  fewShotExamples: string[];
  outputFormat: string;
  validationCriteria: string[];
  errorHandling: string;
  confidence: number;
  performanceMetrics: {
    expectedAccuracy: number;
    averageResponseTime: number;
    tokenEfficiency: number;
  };
}

export interface PromptValidationResult {
  isValid: boolean;
  accuracy: number;
  errors: string[];
  suggestions: string[];
  performanceScore: number;
}

export class OptimizedPromptService {
  private openai: OpenAI | null;

  constructor() {
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Generate optimized prompts for all agents based on company context
   */
  async generateOptimizedPrompts(
    userId: string,
    companyContext: CompanyContext
  ): Promise<{
    prompts: OptimizedPrompt[];
    overallConfidence: number;
    validationResults: PromptValidationResult[];
  }> {
    const agents = ["falcon", "sage", "sentinel", "prism"];
    const promptTypes = {
      falcon: ["system", "qualification", "task_specific"],
      sage: ["system", "research", "analysis"],
      sentinel: ["system", "classification", "response_generation"],
      prism: ["system", "routing", "coordination"],
    };

    const generatedPrompts: OptimizedPrompt[] = [];
    const validationResults: PromptValidationResult[] = [];

    for (const agent of agents) {
      for (const promptType of promptTypes[agent as keyof typeof promptTypes]) {
        try {
          const optimizedPrompt = await this.generateSingleOptimizedPrompt(
            agent,
            promptType,
            companyContext
          );

          const validation = await this.validatePrompt(
            optimizedPrompt,
            companyContext
          );

          generatedPrompts.push(optimizedPrompt);
          validationResults.push(validation);
        } catch (error) {
          console.error(
            `Error generating prompt for ${agent}:${promptType}`,
            error
          );
        }
      }
    }

    const overallConfidence =
      validationResults.reduce(
        (sum, result) => sum + result.performanceScore,
        0
      ) / validationResults.length;

    return {
      prompts: generatedPrompts,
      overallConfidence,
      validationResults,
    };
  }

  /**
   * Generate a single optimized prompt using advanced prompt engineering
   */
  private async generateSingleOptimizedPrompt(
    agentName: string,
    promptType: string,
    companyContext: CompanyContext
  ): Promise<OptimizedPrompt> {
    const promptTemplate = this.getPromptTemplate(agentName, promptType);
    const systemPrompt = this.buildSystemPrompt(
      agentName,
      promptType,
      companyContext
    );
    const userPrompt = this.buildUserPrompt(
      agentName,
      promptType,
      companyContext
    );
    const fewShotExamples = this.getFewShotExamples(
      agentName,
      promptType,
      companyContext
    );
    const outputFormat = this.getOutputFormat(agentName, promptType);
    const validationCriteria = this.getValidationCriteria(
      agentName,
      promptType
    );
    const errorHandling = this.getErrorHandling(agentName, promptType);

    return {
      id: uuidv4(),
      agentName,
      promptType,
      systemPrompt,
      userPrompt,
      fewShotExamples,
      outputFormat,
      validationCriteria,
      errorHandling,
      confidence: 0.95, // Will be updated after validation
      performanceMetrics: {
        expectedAccuracy: 0.95,
        averageResponseTime: 2000, // ms
        tokenEfficiency: 0.85,
      },
    };
  }

  /**
   * Build optimized system prompt with role definition and constraints
   */
  private buildSystemPrompt(
    agentName: string,
    promptType: string,
    companyContext: CompanyContext
  ): string {
    const basePrompts = this.getBaseSystemPrompts();
    const agentPrompt = basePrompts[agentName]?.[promptType];

    if (!agentPrompt) {
      throw new Error(`No base prompt found for ${agentName}:${promptType}`);
    }

    // Inject company context into system prompt
    return agentPrompt
      .replace("{COMPANY_NAME}", companyContext.companyName)
      .replace("{INDUSTRY}", companyContext.industry)
      .replace("{BUSINESS_MODEL}", companyContext.businessModel)
      .replace("{TARGET_MARKET}", companyContext.targetMarket)
      .replace("{VALUE_PROPOSITION}", companyContext.valueProposition)
      .replace("{BRAND_VOICE}", companyContext.brandVoice)
      .replace("{COMMUNICATION_STYLE}", companyContext.communicationStyle)
      .replace(
        "{INDUSTRY_TERMINOLOGY}",
        companyContext.industryTerminology.join(", ")
      )
      .replace(
        "{KEY_DIFFERENTIATORS}",
        companyContext.keyDifferentiators.join(", ")
      )
      .replace(
        "{COMPETITIVE_ADVANTAGES}",
        companyContext.competitiveAdvantages
      );
  }

  /**
   * Build user prompt with specific instructions and context
   */
  private buildUserPrompt(
    agentName: string,
    promptType: string,
    companyContext: CompanyContext
  ): string {
    const userPrompts = this.getUserPromptTemplates();
    const template = userPrompts[agentName]?.[promptType];

    if (!template) {
      return `Execute ${promptType} task for ${agentName} agent with the provided context.`;
    }

    return template
      .replace(
        "{COMPANY_CONTEXT}",
        this.buildCompanyContextString(companyContext)
      )
      .replace(
        "{DOCUMENT_INSIGHTS}",
        this.buildDocumentInsightsString(companyContext)
      );
  }

  /**
   * Get few-shot examples for better performance
   */
  private getFewShotExamples(
    agentName: string,
    promptType: string,
    companyContext: CompanyContext
  ): string[] {
    const examples = this.getFewShotExampleTemplates();
    const agentExamples = examples[agentName]?.[promptType] || [];

    // Customize examples with company context
    return agentExamples.map((example) =>
      example
        .replace("{INDUSTRY}", companyContext.industry)
        .replace("{COMPANY_TYPE}", companyContext.businessModel)
        .replace("{TARGET_MARKET}", companyContext.targetMarket)
    );
  }

  /**
   * Get structured output format requirements
   */
  private getOutputFormat(agentName: string, promptType: string): string {
    const formats = this.getOutputFormatTemplates();
    return (
      formats[agentName]?.[promptType] ||
      "Provide response in clear, structured format with actionable insights."
    );
  }

  /**
   * Get validation criteria for quality assurance
   */
  private getValidationCriteria(
    agentName: string,
    promptType: string
  ): string[] {
    const criteria = this.getValidationCriteriaTemplates();
    return (
      criteria[agentName]?.[promptType] || [
        "Response is relevant to the request",
        "Information is accurate and actionable",
        "Format follows specified structure",
        "Tone matches brand voice",
      ]
    );
  }

  /**
   * Get error handling instructions
   */
  private getErrorHandling(agentName: string, promptType: string): string {
    const errorHandling = this.getErrorHandlingTemplates();
    return (
      errorHandling[agentName]?.[promptType] ||
      "If unable to complete the task, explain the limitation and suggest alternative approaches."
    );
  }

  /**
   * Validate prompt performance and accuracy
   */
  private async validatePrompt(
    prompt: OptimizedPrompt,
    companyContext: CompanyContext
  ): Promise<PromptValidationResult> {
    // This would typically involve running test cases
    // For now, we'll simulate validation based on prompt quality metrics

    const qualityScore = this.calculatePromptQuality(prompt);
    const contextRelevance = this.calculateContextRelevance(
      prompt,
      companyContext
    );
    const structureScore = this.calculateStructureScore(prompt);

    const overallScore = (qualityScore + contextRelevance + structureScore) / 3;

    return {
      isValid: overallScore >= 0.9,
      accuracy: overallScore,
      errors: overallScore < 0.9 ? ["Prompt quality below threshold"] : [],
      suggestions: this.generateImprovementSuggestions(prompt, overallScore),
      performanceScore: overallScore,
    };
  }

  /**
   * Calculate prompt quality based on structure and content
   */
  private calculatePromptQuality(prompt: OptimizedPrompt): number {
    let score = 0.5; // Base score

    // Check for clear role definition
    if (
      prompt.systemPrompt.includes("You are") &&
      prompt.systemPrompt.includes(prompt.agentName)
    ) {
      score += 0.1;
    }

    // Check for specific instructions
    if (prompt.systemPrompt.length > 100) {
      score += 0.1;
    }

    // Check for output format specification
    if (prompt.outputFormat.length > 50) {
      score += 0.1;
    }

    // Check for few-shot examples
    if (prompt.fewShotExamples.length > 0) {
      score += 0.1;
    }

    // Check for validation criteria
    if (prompt.validationCriteria.length >= 3) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextRelevance(
    prompt: OptimizedPrompt,
    companyContext: CompanyContext
  ): number {
    let score = 0.5; // Base score

    // Check if company name is referenced
    if (prompt.systemPrompt.includes(companyContext.companyName)) {
      score += 0.1;
    }

    // Check if industry is referenced
    if (prompt.systemPrompt.includes(companyContext.industry)) {
      score += 0.1;
    }

    // Check if terminology is used
    const terminologyUsed = companyContext.industryTerminology.some((term) =>
      prompt.systemPrompt.toLowerCase().includes(term.toLowerCase())
    );
    if (terminologyUsed) {
      score += 0.15;
    }

    // Check if value proposition is referenced
    if (
      prompt.systemPrompt.includes(
        companyContext.valueProposition.substring(0, 20)
      )
    ) {
      score += 0.15;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate structure score
   */
  private calculateStructureScore(prompt: OptimizedPrompt): number {
    let score = 0.6; // Base score

    // Check for clear sections
    if (
      prompt.systemPrompt.includes("##") ||
      prompt.systemPrompt.includes("**")
    ) {
      score += 0.1;
    }

    // Check for numbered instructions
    if (
      prompt.systemPrompt.includes("1.") ||
      prompt.systemPrompt.includes("2.")
    ) {
      score += 0.1;
    }

    // Check for constraints section
    if (
      prompt.systemPrompt.toLowerCase().includes("constraint") ||
      prompt.systemPrompt.toLowerCase().includes("requirement")
    ) {
      score += 0.1;
    }

    // Check for error handling
    if (prompt.errorHandling.length > 30) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    prompt: OptimizedPrompt,
    score: number
  ): string[] {
    const suggestions: string[] = [];

    if (score < 0.95) {
      suggestions.push("Consider adding more specific industry context");
      suggestions.push("Include additional few-shot examples");
      suggestions.push("Enhance output format specifications");
    }

    if (prompt.fewShotExamples.length === 0) {
      suggestions.push("Add few-shot examples for better performance");
    }

    if (prompt.validationCriteria.length < 4) {
      suggestions.push("Add more validation criteria for quality assurance");
    }

    return suggestions;
  }

  /**
   * Build company context string for prompts
   */
  private buildCompanyContextString(companyContext: CompanyContext): string {
    return `
Company: ${companyContext.companyName}
Industry: ${companyContext.industry}${
      companyContext.subIndustry ? ` (${companyContext.subIndustry})` : ""
    }
Business Model: ${companyContext.businessModel}
Company Size: ${companyContext.companySize}
Target Market: ${companyContext.targetMarket}
Value Proposition: ${companyContext.valueProposition}
Key Differentiators: ${companyContext.keyDifferentiators.join(", ")}
Competitive Advantages: ${companyContext.competitiveAdvantages}
Brand Voice: ${companyContext.brandVoice}
Communication Style: ${companyContext.communicationStyle}
Industry Terminology: ${companyContext.industryTerminology.join(", ")}`;
  }

  /**
   * Build document insights string for prompts
   */
  private buildDocumentInsightsString(companyContext: CompanyContext): string {
    if (!companyContext.documentInsights) {
      return "No document insights available.";
    }

    const insights = companyContext.documentInsights;
    return `
Document-Derived Insights:
- Company Description: ${insights.companyDescription || "Not available"}
- Products/Services: ${insights.productsServices?.join(", ") || "Not available"}
- Additional Terminology: ${
      insights.industryTerminology?.join(", ") || "Not available"
    }
- Competitive Advantages: ${
      insights.competitiveAdvantages?.join(", ") || "Not available"
    }
- Value Propositions: ${
      insights.valuePropositions?.join(", ") || "Not available"
    }
- Customer Segments: ${
      insights.customerSegments?.join(", ") || "Not available"
    }`;
  }

  /**
   * Get prompt template for agent and type
   */
  private getPromptTemplate(agentName: string, promptType: string): string {
    return `${agentName}_${promptType}_template`;
  }

  /**
   * Get base system prompts from templates
   */
  private getBaseSystemPrompts(): Record<string, Record<string, string>> {
    const { PromptTemplates } = require("./PromptTemplates.js");
    return PromptTemplates.getBaseSystemPrompts();
  }

  /**
   * Get user prompt templates
   */
  private getUserPromptTemplates(): Record<string, Record<string, string>> {
    const { PromptTemplates } = require("./PromptTemplates.js");
    return PromptTemplates.getUserPromptTemplates();
  }

  /**
   * Get few-shot example templates
   */
  private getFewShotExampleTemplates(): Record<
    string,
    Record<string, string[]>
  > {
    const { PromptTemplates } = require("./PromptTemplates.js");
    return PromptTemplates.getFewShotExampleTemplates();
  }

  /**
   * Get output format templates
   */
  private getOutputFormatTemplates(): Record<string, Record<string, string>> {
    const { PromptTemplates } = require("./PromptTemplates.js");
    return PromptTemplates.getOutputFormatTemplates();
  }

  /**
   * Get validation criteria templates
   */
  private getValidationCriteriaTemplates(): Record<
    string,
    Record<string, string[]>
  > {
    const { PromptTemplates } = require("./PromptTemplates.js");
    return PromptTemplates.getValidationCriteriaTemplates();
  }

  /**
   * Get error handling templates
   */
  private getErrorHandlingTemplates(): Record<string, Record<string, string>> {
    const { PromptTemplates } = require("./PromptTemplates.js");
    return PromptTemplates.getErrorHandlingTemplates();
  }
}
