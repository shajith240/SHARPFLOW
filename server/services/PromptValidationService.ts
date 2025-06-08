import {
  OptimizedPromptService,
  CompanyContext,
  OptimizedPrompt,
} from "./OptimizedPromptService.js";
import OpenAI from "openai";

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  industry: string;
  companyContext: CompanyContext;
  testCases: TestCase[];
  expectedOutcomes: ExpectedOutcome[];
}

export interface TestCase {
  id: string;
  agentName: string;
  promptType: string;
  inputData: any;
  expectedResponse: string;
  validationCriteria: string[];
  minimumAccuracy: number;
}

export interface ExpectedOutcome {
  metric: string;
  target: number;
  tolerance: number;
  description: string;
}

export interface ValidationResult {
  testScenarioId: string;
  overallScore: number;
  passedTests: number;
  totalTests: number;
  agentResults: AgentValidationResult[];
  performanceMetrics: PerformanceMetrics;
  recommendations: string[];
}

export interface AgentValidationResult {
  agentName: string;
  promptType: string;
  accuracy: number;
  responseTime: number;
  qualityScore: number;
  errors: string[];
  suggestions: string[];
}

export interface PerformanceMetrics {
  averageAccuracy: number;
  averageResponseTime: number;
  tokenEfficiency: number;
  errorRate: number;
  consistencyScore: number;
}

export class PromptValidationService {
  private optimizedPromptService: OptimizedPromptService;
  private openai: OpenAI | null;

  constructor() {
    this.optimizedPromptService = new OptimizedPromptService();
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Run comprehensive validation tests across all scenarios
   */
  async runComprehensiveValidation(
    userId: string
  ): Promise<ValidationResult[]> {
    const testScenarios = this.getTestScenarios();
    const results: ValidationResult[] = [];

    for (const scenario of testScenarios) {
      try {
        const result = await this.validateScenario(userId, scenario);
        results.push(result);
      } catch (error) {
        console.error(`Error validating scenario ${scenario.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Validate a specific test scenario
   */
  async validateScenario(
    userId: string,
    scenario: TestScenario
  ): Promise<ValidationResult> {
    console.log(`🧪 Validating scenario: ${scenario.name}`);

    // Generate optimized prompts for this scenario
    const { prompts } =
      await this.optimizedPromptService.generateOptimizedPrompts(
        userId,
        scenario.companyContext
      );

    const agentResults: AgentValidationResult[] = [];
    let totalTests = 0;
    let passedTests = 0;

    // Test each agent's prompts
    for (const testCase of scenario.testCases) {
      const prompt = prompts.find(
        (p) =>
          p.agentName === testCase.agentName &&
          p.promptType === testCase.promptType
      );

      if (!prompt) {
        console.warn(
          `No prompt found for ${testCase.agentName}:${testCase.promptType}`
        );
        continue;
      }

      const agentResult = await this.validateAgentPrompt(
        prompt,
        testCase,
        scenario.companyContext
      );
      agentResults.push(agentResult);

      totalTests++;
      if (agentResult.accuracy >= testCase.minimumAccuracy) {
        passedTests++;
      }
    }

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(agentResults);
    const overallScore = (passedTests / totalTests) * 100;

    return {
      testScenarioId: scenario.id,
      overallScore,
      passedTests,
      totalTests,
      agentResults,
      performanceMetrics,
      recommendations: this.generateRecommendations(agentResults, scenario),
    };
  }

  /**
   * Validate a specific agent prompt against test case
   */
  private async validateAgentPrompt(
    prompt: OptimizedPrompt,
    testCase: TestCase,
    companyContext: CompanyContext
  ): Promise<AgentValidationResult> {
    const startTime = Date.now();

    try {
      if (!this.openai) {
        throw new Error("OpenAI not configured");
      }

      // Simulate prompt execution with test input
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt.systemPrompt },
          {
            role: "user",
            content: this.formatTestInput(testCase.inputData, companyContext),
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const responseTime = Date.now() - startTime;
      const generatedResponse = response.choices[0]?.message?.content || "";

      // Validate response against criteria
      const accuracy = await this.calculateAccuracy(
        generatedResponse,
        testCase.expectedResponse,
        testCase.validationCriteria
      );

      const qualityScore = this.calculateQualityScore(
        generatedResponse,
        prompt,
        companyContext
      );

      return {
        agentName: testCase.agentName,
        promptType: testCase.promptType,
        accuracy,
        responseTime,
        qualityScore,
        errors:
          accuracy < testCase.minimumAccuracy
            ? ["Accuracy below threshold"]
            : [],
        suggestions: this.generateAgentSuggestions(
          accuracy,
          qualityScore,
          responseTime
        ),
      };
    } catch (error) {
      return {
        agentName: testCase.agentName,
        promptType: testCase.promptType,
        accuracy: 0,
        responseTime: Date.now() - startTime,
        qualityScore: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        suggestions: ["Fix technical issues before retesting"],
      };
    }
  }

  /**
   * Calculate accuracy by comparing response to expected output
   */
  private async calculateAccuracy(
    response: string,
    expected: string,
    criteria: string[]
  ): Promise<number> {
    if (!this.openai) {
      // Fallback to simple text similarity
      return this.calculateTextSimilarity(response, expected);
    }

    try {
      const evaluationPrompt = `
Evaluate the accuracy of this AI response against the expected output and criteria.

Expected Output:
${expected}

Actual Response:
${response}

Validation Criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Rate the accuracy from 0-100 based on:
- Content accuracy and completeness
- Adherence to validation criteria
- Professional quality and clarity
- Actionability of recommendations

Respond with just the numerical score (0-100).`;

      const evaluation = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: evaluationPrompt }],
        temperature: 0.1,
        max_tokens: 10,
      });

      const score = parseInt(evaluation.choices[0]?.message?.content || "0");
      return Math.max(0, Math.min(100, score)) / 100; // Convert to 0-1 scale
    } catch (error) {
      console.error("Error calculating accuracy:", error);
      return this.calculateTextSimilarity(response, expected);
    }
  }

  /**
   * Calculate text similarity as fallback accuracy measure
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const intersection = words1.filter((word) => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  /**
   * Calculate quality score based on prompt adherence
   */
  private calculateQualityScore(
    response: string,
    prompt: OptimizedPrompt,
    companyContext: CompanyContext
  ): number {
    let score = 0.5; // Base score

    // Check for company name usage
    if (response.includes(companyContext.companyName)) {
      score += 0.1;
    }

    // Check for industry terminology
    const terminologyUsed = companyContext.industryTerminology.some((term) =>
      response.toLowerCase().includes(term.toLowerCase())
    );
    if (terminologyUsed) {
      score += 0.15;
    }

    // Check for structured format
    if (
      response.includes("•") ||
      response.includes("-") ||
      response.includes("1.")
    ) {
      score += 0.1;
    }

    // Check for actionable content
    if (
      response.toLowerCase().includes("recommend") ||
      response.toLowerCase().includes("suggest") ||
      response.toLowerCase().includes("next step")
    ) {
      score += 0.15;
    }

    // Check response length appropriateness
    if (response.length > 100 && response.length < 2000) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall performance metrics
   */
  private calculatePerformanceMetrics(
    results: AgentValidationResult[]
  ): PerformanceMetrics {
    if (results.length === 0) {
      return {
        averageAccuracy: 0,
        averageResponseTime: 0,
        tokenEfficiency: 0,
        errorRate: 1,
        consistencyScore: 0,
      };
    }

    const averageAccuracy =
      results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    const averageResponseTime =
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const errorRate =
      results.filter((r) => r.errors.length > 0).length / results.length;
    const averageQuality =
      results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;

    // Calculate consistency (how similar the quality scores are)
    const qualityVariance =
      results.reduce(
        (sum, r) => sum + Math.pow(r.qualityScore - averageQuality, 2),
        0
      ) / results.length;
    const consistencyScore = Math.max(0, 1 - qualityVariance);

    return {
      averageAccuracy,
      averageResponseTime,
      tokenEfficiency: 0.85, // Placeholder - would need token counting
      errorRate,
      consistencyScore,
    };
  }

  /**
   * Format test input for prompt execution
   */
  private formatTestInput(
    inputData: any,
    companyContext: CompanyContext
  ): string {
    if (typeof inputData === "string") {
      return inputData;
    }

    return `Test Input: ${JSON.stringify(inputData, null, 2)}

Company Context: ${companyContext.companyName} in ${companyContext.industry}
Target Market: ${companyContext.targetMarket}
Value Proposition: ${companyContext.valueProposition}`;
  }

  /**
   * Generate improvement suggestions for agents
   */
  private generateAgentSuggestions(
    accuracy: number,
    qualityScore: number,
    responseTime: number
  ): string[] {
    const suggestions: string[] = [];

    if (accuracy < 0.9) {
      suggestions.push(
        "Improve prompt specificity and add more detailed instructions"
      );
      suggestions.push(
        "Include additional few-shot examples for better performance"
      );
    }

    if (qualityScore < 0.8) {
      suggestions.push("Enhance company context integration in prompts");
      suggestions.push("Add more structured output format requirements");
    }

    if (responseTime > 5000) {
      suggestions.push(
        "Optimize prompt length and complexity for faster responses"
      );
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "Performance meets standards - consider minor optimizations"
      );
    }

    return suggestions;
  }

  /**
   * Generate overall recommendations for scenario
   */
  private generateRecommendations(
    results: AgentValidationResult[],
    scenario: TestScenario
  ): string[] {
    const recommendations: string[] = [];
    const avgAccuracy =
      results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;

    if (avgAccuracy < 0.95) {
      recommendations.push(
        "Overall accuracy below 95% target - review and enhance prompts"
      );
    }

    const highErrorAgents = results.filter((r) => r.errors.length > 0);
    if (highErrorAgents.length > 0) {
      recommendations.push(
        `Address errors in: ${highErrorAgents
          .map((r) => r.agentName)
          .join(", ")}`
      );
    }

    const slowAgents = results.filter((r) => r.responseTime > 3000);
    if (slowAgents.length > 0) {
      recommendations.push(
        "Optimize response times for better user experience"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "All agents performing within acceptable parameters"
      );
    }

    return recommendations;
  }

  /**
   * Get comprehensive test scenarios for validation
   */
  private getTestScenarios(): TestScenario[] {
    return [
      {
        id: "tech_saas_scenario",
        name: "Technology SaaS Company",
        description:
          "Mid-market B2B SaaS company targeting workflow automation",
        industry: "Technology",
        companyContext: {
          companyName: "TechFlow Solutions",
          industry: "Technology",
          subIndustry: "SaaS",
          businessModel: "B2B",
          companySize: "medium",
          targetMarket:
            "Mid-market companies seeking workflow automation and process optimization",
          valueProposition:
            "AI-powered process automation platform that reduces manual work by 70%",
          keyDifferentiators: [
            "No-code platform",
            "5x faster deployment",
            "Enterprise security",
          ],
          competitiveAdvantages:
            "Our platform requires zero coding knowledge and can be deployed 5x faster than traditional automation tools",
          brandVoice: "professional",
          communicationStyle: "consultative",
          industryTerminology: [
            "workflow automation",
            "process optimization",
            "digital transformation",
            "API integrations",
          ],
        },
        testCases: [
          {
            id: "falcon_lead_gen_tech",
            agentName: "falcon",
            promptType: "system",
            inputData:
              "Find 20 qualified leads for our workflow automation platform targeting technology companies with 100-500 employees",
            expectedResponse:
              "Generated qualified prospect list with technology companies, proper qualification scoring, and actionable next steps",
            validationCriteria: [
              "Focuses on technology industry companies",
              "Targets companies with 100-500 employees",
              "Mentions workflow automation context",
              "Provides qualification methodology",
              "Includes actionable recommendations",
            ],
            minimumAccuracy: 0.9,
          },
        ],
        expectedOutcomes: [
          {
            metric: "Overall Accuracy",
            target: 95,
            tolerance: 3,
            description: "All agents should achieve 95%+ accuracy",
          },
          {
            metric: "Response Time",
            target: 3000,
            tolerance: 1000,
            description: "Average response time under 3 seconds",
          },
          {
            metric: "Industry Alignment",
            target: 90,
            tolerance: 5,
            description: "Technology-specific terminology usage",
          },
          {
            metric: "Brand Consistency",
            target: 95,
            tolerance: 3,
            description: "Consistent professional tone and messaging",
          },
        ],
      },
    ];
  }
}
