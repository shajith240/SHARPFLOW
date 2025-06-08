import { EventEmitter } from "events";
import OpenAI from "openai";
import type {
  ChatMessage,
  ChatSession,
  UserIntent,
  IntentRecognitionResult,
  AgentJob,
} from "../types/index";
import { v4 as uuidv4 } from "uuid";

/**
 * Prism - Pure Routing Orchestrator
 *
 * Acts as a lightweight message router that identifies the appropriate target agent
 * and forwards the original user message without modification. Does not process,
 * analyze, or execute requests - only routes them to specialized agents.
 */
export class Prism extends EventEmitter {
  private openai: OpenAI | null;

  constructor() {
    super();

    // Initialize OpenAI client for parameter extraction
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      : null;
  }

  /**
   * Pure message routing - identifies target agent and forwards original message
   */

  async processMessage(
    message: string,
    userId: string,
    sessionId: string
  ): Promise<IntentRecognitionResult> {
    console.log(`🧠 Prism routing message from ${userId}: ${message}`);

    // Perform lightweight intent recognition to determine target agent
    const routingResult = this.identifyTargetAgent(message);

    // If routing to a specific agent, extract parameters using OpenAI
    if (routingResult.intent.requiredAgent !== "prism") {
      const extractedParams = await this.extractParametersForAgent(
        message,
        routingResult.intent.requiredAgent,
        routingResult.intent.type
      );

      // Merge extracted parameters with the routing result
      routingResult.intent.parameters = {
        ...routingResult.intent.parameters,
        ...extractedParams,
      };
    }

    console.log(`🎯 Prism routing decision:`, {
      targetAgent: routingResult.intent.requiredAgent,
      intentType: routingResult.intent.type,
      confidence: routingResult.intent.confidence,
      extractedParams: routingResult.intent.parameters,
    });

    return routingResult;
  }

  /**
   * Lightweight intent recognition for routing decisions only
   * Does not extract parameters or process requests - just identifies target agent
   */
  private identifyTargetAgent(message: string): IntentRecognitionResult {
    const lowerMessage = message.toLowerCase();

    // Lead Generation → Falcon
    if (
      lowerMessage.includes("find") ||
      lowerMessage.includes("generate") ||
      lowerMessage.includes("scrape") ||
      lowerMessage.includes("apollo") ||
      (lowerMessage.includes("lead") &&
        (lowerMessage.includes("find") || lowerMessage.includes("generate")))
    ) {
      return this.createRoutingResult("lead_generation", "falcon", message);
    }

    // Lead Research → Sage
    if (
      lowerMessage.includes("research") ||
      lowerMessage.includes("linkedin") ||
      lowerMessage.includes("analyze") ||
      (lowerMessage.includes("lead") && lowerMessage.includes("research"))
    ) {
      return this.createRoutingResult("lead_research", "sage", message);
    }

    // Email/Calendar/Reminder → Sentinel
    if (
      // Email patterns
      lowerMessage.includes("email") ||
      lowerMessage.includes("gmail") ||
      lowerMessage.includes("inbox") ||
      lowerMessage.includes("message") ||
      lowerMessage.includes("mail") ||
      // Calendar patterns
      lowerMessage.includes("calendar") ||
      lowerMessage.includes("cal") ||
      lowerMessage.includes("schedule") ||
      lowerMessage.includes("meeting") ||
      lowerMessage.includes("appointment") ||
      // Reminder patterns
      lowerMessage.includes("remind") ||
      lowerMessage.includes("reminder") ||
      // Automation patterns
      lowerMessage.includes("automate") ||
      lowerMessage.includes("automation") ||
      lowerMessage.includes("monitor") ||
      lowerMessage.includes("workflow")
    ) {
      return this.createRoutingResult("sentinel_request", "sentinel", message);
    }

    // Default → Prism handles directly
    return this.createRoutingResult("general_query", "prism", message);
  }

  /**
   * Extract parameters for specific agents using OpenAI
   */
  private async extractParametersForAgent(
    message: string,
    targetAgent: string,
    intentType: string
  ): Promise<any> {
    if (!this.openai) {
      console.log("⚠️ OpenAI not available for parameter extraction");
      return { originalMessage: message };
    }

    try {
      let extractionPrompt = "";

      switch (targetAgent) {
        case "falcon":
          extractionPrompt = `Extract lead generation parameters from this message: "${message}"

Please extract and return a JSON object with these fields:
- locations: array of location names (cities, states, countries)
- businesses: array of business types or industries
- jobTitles: array of job titles or roles
- maxResults: number (default 100 if not specified)

If any field is not mentioned, use reasonable defaults:
- locations: ["United States"] if not specified
- businesses: ["Technology", "SaaS"] if not specified
- jobTitles: ["CEO", "Founder", "VP"] if not specified

Return only valid JSON, no explanation.`;
          break;

        case "sage":
          extractionPrompt = `Extract research parameters from this message: "${message}"

Please extract and return a JSON object with these fields:
- linkedinUrl: the LinkedIn profile URL if provided
- leadId: lead ID if mentioned
- researchType: type of research requested

If linkedinUrl is not provided, set it to null.
Return only valid JSON, no explanation.`;
          break;

        case "sentinel":
          extractionPrompt = `Extract email/reminder parameters from this message: "${message}"

Please extract and return a JSON object with these fields:
- reminderText: the reminder message
- reminderTime: time/date if specified
- emailType: type of email task if mentioned
- requestType: "reminder", "email_check", or "auto_reply"

Return only valid JSON, no explanation.`;
          break;

        default:
          return { originalMessage: message };
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: extractionPrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        try {
          // Clean the response to handle ```json blocks
          let cleanedResponse = response.trim();
          if (cleanedResponse.startsWith("```json")) {
            cleanedResponse = cleanedResponse
              .replace(/^```json\s*/, "")
              .replace(/\s*```$/, "");
          } else if (cleanedResponse.startsWith("```")) {
            cleanedResponse = cleanedResponse
              .replace(/^```\s*/, "")
              .replace(/\s*```$/, "");
          }

          const extractedParams = JSON.parse(cleanedResponse);
          console.log(
            `🔍 Extracted parameters for ${targetAgent}:`,
            extractedParams
          );
          return { ...extractedParams, originalMessage: message };
        } catch (parseError) {
          console.error("Error parsing extracted parameters:", parseError);
          return { originalMessage: message };
        }
      }
    } catch (error) {
      console.error("Error extracting parameters:", error);
    }

    return { originalMessage: message };
  }

  /**
   * Creates a routing result for the target agent
   */
  private createRoutingResult(
    intentType: string,
    targetAgent: string,
    originalMessage: string
  ): IntentRecognitionResult {
    return {
      intent: {
        type: intentType,
        confidence: 0.9,
        parameters: { originalMessage }, // Pass the original message to the target agent
        requiredAgent: targetAgent,
      },
      extractedEntities: {},
      suggestedActions: [],
      requiresConfirmation: false,
      response: null, // No response from Prism - let target agent handle it
    };
  }

  /**
   * Create agent job for routing
   */
  async createAgentJob(
    intent: UserIntent,
    userId: string,
    sessionId: string
  ): Promise<AgentJob> {
    const job: AgentJob = {
      id: uuidv4(),
      userId,
      agentName: intent.requiredAgent,
      jobType: intent.type,
      status: "pending",
      progress: 0,
      inputData: {
        ...intent.parameters,
        sessionId,
        originalIntent: intent,
      },
      createdAt: new Date(),
    };

    return job;
  }

  /**
   * Generate response using OpenAI for natural conversation
   */
  async generateResponse(intent: UserIntent, context?: any): Promise<string> {
    // For agent routing, generate a simple routing message
    if (intent.requiredAgent !== "prism") {
      return this.generateRoutingMessage(intent);
    }

    // For Prism-handled requests, ALWAYS use OpenAI for natural responses
    return this.generateOpenAIResponse(intent, context);
  }

  /**
   * Generate routing message for agent tasks
   */
  private generateRoutingMessage(intent: UserIntent): string {
    const agentNames = {
      falcon: "Falcon (Lead Generation)",
      sage: "Sage (Research)",
      sentinel: "Sentinel (Auto Reply)",
    };

    const agentName =
      agentNames[intent.requiredAgent as keyof typeof agentNames] ||
      intent.requiredAgent;

    return `I'm contacting ${agentName} to handle your request, please wait...`;
  }

  /**
   * Generate natural, conversational responses using OpenAI
   */
  private async generateOpenAIResponse(
    intent: UserIntent,
    context?: any
  ): Promise<string> {
    try {
      // Check if OpenAI is available
      if (!this.openai || !process.env.OPENAI_API_KEY) {
        console.log("⚠️ OpenAI not available, using simple fallback");
        return this.getSimpleFallback(intent);
      }

      console.log(
        "🤖 Generating natural response with OpenAI for intent:",
        intent.type
      );

      // Create a natural conversation prompt based on the user's message
      const conversationPrompt = this.buildConversationPrompt(intent, context);

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Prism, a friendly AI assistant. You work for SharpFlow but you're NOT a salesperson or marketer.

CRITICAL RULES:
- NEVER use marketing language or sales copy
- NEVER list features or capabilities unless specifically asked
- Be conversational like a real person, not a corporate bot
- Keep responses SHORT and natural
- Respond to the actual message, not what you think they want to hear

EXAMPLES:
- "hi" → "Hi there! I'm Prism. How can I help you?"
- "what's your name" → "I'm Prism, your AI assistant here at SharpFlow."
- "hello" → "Hello! What can I do for you today?"

PERSONALITY: Friendly, helpful, conversational, human-like. Think casual assistant, not corporate spokesperson.`,
          },
          {
            role: "user",
            content: conversationPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150, // Keep responses concise
      });

      const response = completion.choices[0]?.message?.content;
      return response || this.getSimpleFallback(intent);
    } catch (error) {
      console.error("Error generating OpenAI response:", error);
      return this.getSimpleFallback(intent);
    }
  }

  /**
   * Build conversation prompt for natural responses
   */
  private buildConversationPrompt(intent: UserIntent, context?: any): string {
    const originalMessage = intent.parameters?.originalMessage || "";
    const conversationHistory = context?.conversationHistory || "";

    // Build context-aware prompt
    let prompt = "";

    // Add conversation history if available
    if (conversationHistory) {
      prompt += `Previous conversation context:\n${conversationHistory}\n\n`;
    }

    prompt += `Current user message: "${originalMessage}"\n\n`;

    switch (intent.type) {
      case "general_query":
        prompt += `Respond naturally like a human would, taking into account any previous conversation context. If it's a greeting, just greet them back. If they ask your name, just say you're Prism. Keep it simple and conversational - NO marketing language or feature lists.`;
        break;

      case "platform_help":
        prompt += `User is asking for help. Give a brief, helpful response based on the conversation context. Don't list features unless they specifically ask.`;
        break;

      case "data_export":
        prompt += `User wants to export data. Ask what they'd like to export in a natural way, considering any previous context.`;
        break;

      case "analytics_reporting":
        prompt += `User is asking about analytics. Ask what they'd like to see in a conversational way, taking previous context into account.`;
        break;

      default:
        prompt += `Respond naturally and helpfully, like a real person would, considering the conversation context.`;
    }

    return prompt;
  }

  /**
   * Simple fallback responses when OpenAI is not available
   */
  private getSimpleFallback(intent: UserIntent): string {
    switch (intent.type) {
      case "general_query":
        return "Hi! I'm Prism. How can I help you?";
      case "platform_help":
        return "I can help you with a few things. What do you need?";
      case "data_export":
        return "What would you like to export?";
      case "analytics_reporting":
        return "What metrics would you like to see?";
      default:
        return "How can I help you?";
    }
  }

  // Email Monitoring Detection
  private isEmailMonitoringRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    return (
      lowerMessage.includes("recent email") ||
      lowerMessage.includes("latest message") ||
      lowerMessage.includes("last message") ||
      lowerMessage.includes("recent message") ||
      lowerMessage.includes("check inbox") ||
      lowerMessage.includes("check my inbox") ||
      lowerMessage.includes("check email") ||
      lowerMessage.includes("check my email") ||
      lowerMessage.includes("what email") ||
      lowerMessage.includes("promotional message") ||
      lowerMessage.includes("promotional email") ||
      lowerMessage.includes("spam folder") ||
      lowerMessage.includes("mailbox") ||
      // Enhanced patterns for email summaries
      lowerMessage.includes("email summary") ||
      lowerMessage.includes("summary of email") ||
      lowerMessage.includes("summary of my email") ||
      lowerMessage.includes("summarize email") ||
      lowerMessage.includes("summarize my email") ||
      lowerMessage.includes("important email") ||
      lowerMessage.includes("important message") ||
      lowerMessage.includes("summary of important") ||
      (lowerMessage.includes("summary") && lowerMessage.includes("email")) ||
      (lowerMessage.includes("summarize") && lowerMessage.includes("email")) ||
      (lowerMessage.includes("get") &&
        lowerMessage.includes("summary") &&
        lowerMessage.includes("email")) ||
      (lowerMessage.includes("check") &&
        lowerMessage.includes("latest") &&
        lowerMessage.includes("email")) ||
      (lowerMessage.includes("what") &&
        lowerMessage.includes("got") &&
        lowerMessage.includes("mail"))
    );
  }

  // Email Monitoring and Automation Detection
  private async detectEmailMonitoring(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    if (this.isEmailMonitoringRequest(message)) {
      // Determine request type
      let requestType = "latest";
      if (
        lowerMessage.includes("promotional") ||
        lowerMessage.includes("spam")
      ) {
        requestType = "promotional";
      } else if (
        lowerMessage.includes("important") ||
        lowerMessage.includes("summary")
      ) {
        requestType = "important";
      }

      return {
        intent: {
          type: "check_emails",
          confidence: 0.9,
          parameters: {
            requestType: requestType,
          },
          requiredAgent: "sentinel",
        },
        extractedEntities: { requestType },
        suggestedActions: ["Check Gmail inbox for recent emails"],
        requiresConfirmation: false,
        response: null, // Will be generated by generateRoutingMessage
      };
    }

    return null;
  }

  // Check Existing Reminders/Calendar Detection
  private async detectCalendarReminders(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Check Existing Reminders/Calendar Detection
    if (
      (lowerMessage.includes("what") && lowerMessage.includes("reminder")) ||
      (lowerMessage.includes("check") && lowerMessage.includes("reminder")) ||
      (lowerMessage.includes("show") && lowerMessage.includes("reminder")) ||
      (lowerMessage.includes("my") && lowerMessage.includes("reminder")) ||
      (lowerMessage.includes("today") && lowerMessage.includes("reminder")) ||
      (lowerMessage.includes("what") && lowerMessage.includes("cal")) ||
      (lowerMessage.includes("check") && lowerMessage.includes("cal")) ||
      (lowerMessage.includes("show") && lowerMessage.includes("cal")) ||
      (lowerMessage.includes("my") && lowerMessage.includes("cal")) ||
      (lowerMessage.includes("today") && lowerMessage.includes("cal")) ||
      lowerMessage.includes("calendar events") ||
      lowerMessage.includes("calendar today") ||
      lowerMessage.includes("today's reminders") ||
      lowerMessage.includes("today's calendar") ||
      lowerMessage.includes("what's on my calendar") ||
      lowerMessage.includes("whats on my calendar")
    ) {
      // Determine the timeframe for checking
      let timeframe = "today";
      if (lowerMessage.includes("tomorrow")) {
        timeframe = "tomorrow";
      } else if (lowerMessage.includes("week")) {
        timeframe = "week";
      }

      return {
        intent: {
          type: "check_calendar",
          confidence: 0.9,
          parameters: {
            timeframe: timeframe,
            requestType: "reminders_and_events",
          },
          requiredAgent: "sentinel",
        },
        extractedEntities: { timeframe },
        suggestedActions: ["Check calendar for reminders and events"],
        requiresConfirmation: false,
        response: null, // Will be generated by generateRoutingMessage
      };
    }

    return null;
  }

  // Create New Reminder Detection
  private async detectNewReminder(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Create New Reminder Detection
    if (
      lowerMessage.includes("remind") ||
      lowerMessage.includes("reminder") ||
      (lowerMessage.includes("set") &&
        (lowerMessage.includes("birthday") ||
          lowerMessage.includes("birth day"))) ||
      lowerMessage.includes("don't forget") ||
      lowerMessage.includes("dont forget")
    ) {
      const extractedDetails = await this.extractReminderDetails(message);

      return {
        intent: {
          type: "reminder",
          confidence: 0.9,
          parameters: {
            reminderText: extractedDetails.reminderText,
            reminderDate: extractedDetails.reminderDate,
            reminderTime: extractedDetails.reminderTime,
            reminderType: extractedDetails.reminderType,
          },
          requiredAgent: "sentinel",
        },
        extractedEntities: extractedDetails,
        suggestedActions: ["Configure reminder settings"],
        requiresConfirmation: false,
        response: null, // Will be generated by generateRoutingMessage
      };
    }

    return null;
  }

  // Calendar Booking Detection
  private async detectCalendarBooking(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Calendar Booking
    if (
      lowerMessage.includes("calendar") ||
      lowerMessage.includes("schedule") ||
      lowerMessage.includes("meeting") ||
      lowerMessage.includes("appointment") ||
      lowerMessage.includes("book")
    ) {
      // Extract meeting details using OpenAI
      const extractedDetails = await this.extractCalendarDetails(message);

      return {
        intent: {
          type: "calendar_booking",
          confidence: 0.8,
          parameters: {
            emailAddress: extractedDetails.emailAddress || "boss@company.com", // Default for boss meetings
            eventType: extractedDetails.eventType || "meeting",
            requestedDateTime: extractedDetails.requestedDateTime,
            requestedDate: extractedDetails.requestedDate,
            duration: extractedDetails.duration || 30,
          },
          requiredAgent: "sentinel",
        },
        extractedEntities: extractedDetails,
        suggestedActions: ["Configure calendar integration"],
        requiresConfirmation: false,
        response: null, // Will be generated by generateRoutingMessage
      };
    }

    return null;
  }

  // Auto-Reply Detection
  private async detectAutoReply(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Auto-Reply for existing leads
    if (
      lowerMessage.includes("reply") ||
      lowerMessage.includes("message") ||
      (lowerMessage.includes("email") &&
        !this.isEmailAutomationRequest(message))
    ) {
      return {
        intent: {
          type: "auto_reply",
          confidence: 0.7,
          parameters: {},
          requiredAgent: "sentinel",
        },
        extractedEntities: {},
        suggestedActions: ["Specify the lead ID and message type"],
        requiresConfirmation: true,
        response: null, // Will be generated by generateRoutingMessage
      };
    }

    return null;
  }

  // Data Export Detection
  private async detectDataExport(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Data Export
    if (
      lowerMessage.includes("export") ||
      lowerMessage.includes("download") ||
      lowerMessage.includes("csv") ||
      lowerMessage.includes("data")
    ) {
      return {
        intent: {
          type: "data_export",
          confidence: 0.8,
          parameters: {},
          requiredAgent: "prism",
        },
        extractedEntities: {},
        suggestedActions: ["Specify what data you'd like to export"],
        requiresConfirmation: false,
        response:
          "I can help you export your data! I can export leads, research reports, or analytics data in various formats. What would you like to export?",
      };
    }

    return null;
  }

  // Platform Help Detection
  private async detectPlatformHelp(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Platform Help
    if (
      lowerMessage.includes("help") ||
      lowerMessage.includes("how") ||
      lowerMessage.includes("tutorial") ||
      lowerMessage.includes("guide") ||
      lowerMessage.includes("feature")
    ) {
      return {
        intent: {
          type: "platform_help",
          confidence: 0.8,
          parameters: {},
          requiredAgent: "prism",
        },
        extractedEntities: {},
        suggestedActions: ["Ask about specific features or capabilities"],
        requiresConfirmation: false,
        response:
          "I'm here to help! SharpFlow offers lead generation (Falcon), lead research (Sage), and email automation (Sentinel). What specific feature would you like to learn about?",
      };
    }

    return null;
  }

  // Analytics & Reporting Detection
  private async detectAnalyticsReporting(
    message: string
  ): Promise<IntentAnalysisResult | null> {
    const lowerMessage = message.toLowerCase();

    // Analytics & Reporting
    if (
      lowerMessage.includes("analytics") ||
      lowerMessage.includes("report") ||
      lowerMessage.includes("stats") ||
      lowerMessage.includes("metrics") ||
      lowerMessage.includes("dashboard")
    ) {
      return {
        intent: {
          type: "analytics_reporting",
          confidence: 0.8,
          parameters: {},
          requiredAgent: "prism",
        },
        extractedEntities: {},
        suggestedActions: ["Specify what analytics you'd like to see"],
        requiresConfirmation: false,
        response:
          "I can provide analytics and insights about your lead generation performance, email automation metrics, and overall platform usage. What specific metrics would you like to see?",
      };
    }

    return null;
  }

  // Default fallback method
  private getDefaultFallback(): IntentAnalysisResult {
    return {
      intent: {
        type: "general_query",
        confidence: 0.6,
        parameters: {},
        requiredAgent: "prism",
      },
      extractedEntities: {},
      suggestedActions: [
        "Ask about lead generation, research, email automation, or platform features",
      ],
      requiresConfirmation: false,
      response:
        "I'm Prism, your AI orchestrator for SharpFlow! I can help with lead generation, research, email automation, analytics, and more. What would you like to accomplish today?",
    };
  }

  private extractLeadGenParams(message: string): LeadGenerationRequest {
    const params: LeadGenerationRequest = {
      locations: [],
      businesses: [],
      jobTitles: [],
    };

    const lowerMessage = message.toLowerCase();
    const prismConfig = agentConfig.getPrismConfig();

    // Extract locations using dynamic patterns
    const locationPatterns = prismConfig.fallback.locationPatterns;

    locationPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(lowerMessage)) !== null) {
        const location = match[1].trim();
        if (location && !params.locations!.includes(location)) {
          params.locations!.push(location);
        }
      }
    });

    // Extract business types using dynamic configuration
    const businessKeywords = prismConfig.fallback.businessKeywords;

    businessKeywords.forEach((keyword) => {
      if (lowerMessage.includes(keyword)) {
        params.businesses!.push(keyword);
      }
    });

    // Additional pattern matching for common variations and typos
    if (
      (lowerMessage.includes("coffee") || lowerMessage.includes("coffe")) &&
      !params.businesses!.some((b) => b.includes("coffee"))
    ) {
      params.businesses!.push("coffee shop");
    }

    if (lowerMessage.includes("restaurant") || lowerMessage.includes("food")) {
      if (!params.businesses!.includes("restaurant")) {
        params.businesses!.push("restaurant");
      }
    }

    if (lowerMessage.includes("shop") && params.businesses!.length === 0) {
      // If "shop" is mentioned but no specific business type, default to retail
      params.businesses!.push("retail");
    }

    // Extract job titles using dynamic configuration
    const titleKeywords = prismConfig.fallback.jobTitleKeywords;

    titleKeywords.forEach((title) => {
      if (lowerMessage.includes(title)) {
        params.jobTitles!.push(title);
      }
    });

    // Default fallbacks if nothing found
    if (params.locations!.length === 0) {
      params.locations!.push("United States");
    }

    if (params.businesses!.length === 0) {
      params.businesses!.push("business");
    }

    if (params.jobTitles!.length === 0) {
      params.jobTitles!.push("manager", "owner");
    }

    return params;
  }

  private extractResearchParams(message: string): LeadResearchRequest {
    const params: LeadResearchRequest = {
      linkedinUrl: "", // Will be populated below
    };

    // Extract LinkedIn URL
    const linkedinMatch = message.match(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/i
    );
    if (linkedinMatch) {
      params.linkedinUrl = `https://www.linkedin.com/in/${linkedinMatch[1]}`;
    }

    return params;
  }

  private async extractCalendarDetails(message: string): Promise<any> {
    // Use OpenAI to intelligently extract calendar/meeting details
    if (!this.openai) {
      console.warn("⚠️ OpenAI not available, using basic calendar fallback");
      return this.getFallbackCalendarExtraction(message);
    }

    try {
      // Get current date and time with proper timezone handling
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Calculate tomorrow's date for reference
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split("T")[0];

      // Calculate next week's date for reference
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekDate = nextWeek.toISOString().split("T")[0];

      const prompt = `Extract calendar/meeting details from this message intelligently:

Message: "${message}"
Current Date: ${currentDate}
Current Time: ${currentTime}
Tomorrow Date: ${tomorrowDate}
Next Week Date: ${nextWeekDate}

Extract:
1. Meeting/event type (meeting, appointment, call, demo, consultation, etc.)
2. Requested date in YYYY-MM-DD format
3. Requested time in HH:MM 24-hour format (if specified)
4. Email address (if mentioned)
5. Duration in minutes (if specified, default to 30)
6. Meeting description/purpose

CRITICAL DATE CALCULATIONS:
- For "tomorrow" and all its misspellings → use ${tomorrowDate}
- For "today" → use ${currentDate}
- For "next week" → use ${nextWeekDate}
- For specific dates → parse and format correctly

CRITICAL: For time parsing:
- "4 pm" should become "16:00" (not current time)
- "9 am" should become "09:00"
- "2:30 PM" should become "14:30"
- If no time specified, set as null

Respond in JSON format:
{
  "eventType": "meeting|appointment|call|demo|consultation",
  "requestedDate": "YYYY-MM-DD",
  "requestedTime": "HH:MM or null if not specified",
  "requestedDateTime": "YYYY-MM-DDTHH:MM:00 or null if no time",
  "emailAddress": "email@domain.com or null",
  "duration": 30,
  "description": "meeting purpose/description",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of parsing"
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      console.log(`🤖 OpenAI extracted calendar details:`, {
        eventType: result.eventType,
        requestedDate: result.requestedDate,
        requestedTime: result.requestedTime,
        requestedDateTime: result.requestedDateTime,
        confidence: result.confidence,
        reasoning: result.reasoning,
      });

      return {
        eventType: result.eventType || "meeting",
        requestedDate: result.requestedDate,
        requestedTime: result.requestedTime,
        requestedDateTime: result.requestedDateTime,
        emailAddress: result.emailAddress,
        duration: result.duration || 30,
        description: result.description || "Meeting",
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error("❌ Error with OpenAI calendar extraction:", error);
      return this.getFallbackCalendarExtraction(message);
    }
  }

  private getFallbackCalendarExtraction(message: string): any {
    console.log("⚠️ Using basic fallback calendar extraction");

    // Very basic fallback with proper date calculation
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      eventType: "meeting",
      requestedDate: tomorrow.toISOString().split("T")[0],
      requestedTime: null,
      requestedDateTime: null,
      emailAddress: null,
      duration: 30,
      description: "Meeting",
      confidence: 0.3,
      reasoning: "Fallback extraction due to OpenAI unavailability",
    };
  }

  private async extractReminderDetails(message: string): Promise<any> {
    // Use OpenAI to intelligently extract ALL reminder details
    if (!this.openai) {
      console.warn("⚠️ OpenAI not available, using basic fallback");
      return this.getFallbackReminderExtraction(message);
    }

    try {
      // Get current date and time with proper timezone handling
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const currentTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });

      // Calculate tomorrow's date for reference
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split("T")[0];

      // Calculate next week's date for reference
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekDate = nextWeek.toISOString().split("T")[0];

      const prompt = `Extract reminder details from this message intelligently:

Message: "${message}"
Current Date: ${currentDate}
Current Time: ${currentTime}
Tomorrow Date: ${tomorrowDate}
Next Week Date: ${nextWeekDate}

Your task:
1. Extract the reminder text/description (what to be reminded about)
2. Determine the reminder type (birthday, appointment, task, general)
3. Calculate the exact date in YYYY-MM-DD format
4. Extract the time in HH:MM 24-hour format (if specified)
5. Handle ALL variations of date references (tomorrow, today, next week, specific dates, etc.)
6. Handle ALL variations of time references (9am, 4 pm, 2:30, etc.)

CRITICAL DATE CALCULATIONS:
- For "tomorrow" and all its misspellings → use ${tomorrowDate}
- For "today" → use ${currentDate}
- For "next week" → use ${nextWeekDate}
- For specific dates → parse and format correctly
- For times → convert to 24-hour format
- If no time specified → set time as null

Respond in JSON format:
{
  "reminderText": "clear description of what to remind about",
  "reminderType": "birthday|appointment|task|general",
  "reminderDate": "YYYY-MM-DD format",
  "reminderTime": "HH:MM format or null if not specified",
  "confidence": 0.0-1.0,
  "reasoning": "explanation of how you parsed the date/time"
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 400,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      console.log(`🤖 OpenAI extracted reminder details:`, {
        text: result.reminderText,
        type: result.reminderType,
        date: result.reminderDate,
        time: result.reminderTime,
        confidence: result.confidence,
        reasoning: result.reasoning,
      });

      return {
        reminderText: result.reminderText || "reminder",
        reminderType: result.reminderType || "general",
        reminderDate: result.reminderDate,
        reminderTime: result.reminderTime,
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error("❌ Error with OpenAI reminder extraction:", error);
      return this.getFallbackReminderExtraction(message);
    }
  }

  private getFallbackReminderExtraction(message: string): any {
    console.log("⚠️ Using basic fallback reminder extraction");

    // Very basic fallback - just set tomorrow as default with proper date calculation
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      reminderText: "reminder",
      reminderType: "general",
      reminderDate: tomorrow.toISOString().split("T")[0],
      reminderTime: null,
      confidence: 0.3,
      reasoning: "Fallback extraction due to OpenAI unavailability",
    };
  }

  private isEmailAutomationRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Check for email automation keywords
    const emailAutomationKeywords = [
      "email automation",
      "automate email",
      "automated email",
      "monitor email",
      "email monitoring",
      "gmail monitor",
      "monitor gmail",
      "email workflow",
      "automated response",
      "automate response",
      "email replies",
      "automated replies",
      "email classification",
      "sales inquiries",
      "calendar booking",
      "email integration",
    ];

    return (
      emailAutomationKeywords.some((keyword) =>
        lowerMessage.includes(keyword)
      ) ||
      (lowerMessage.includes("email") &&
        (lowerMessage.includes("automate") ||
          lowerMessage.includes("monitor") ||
          lowerMessage.includes("automation") ||
          lowerMessage.includes("workflow") ||
          lowerMessage.includes("setup") ||
          lowerMessage.includes("configure")))
    );
  }
}
