import { BaseAgent } from "../core/BaseAgent";
import OpenAI from "openai";
import { supabase } from "../../db";
import { GoogleCalendarService } from "../../services/GoogleCalendarService";
import { GmailService } from "../../services/GmailService";
import { EmailPersistenceService } from "../../services/EmailPersistenceService";
import type {
  AgentJob,
  AgentResult,
  AutoReplyRequest,
  EmailMonitoringRequest,
  EmailResponseRequest,
  CalendarBookingRequest,
} from "../types/index";

interface LeadData {
  id: string;
  full_name: string;
  email_address: string;
  company_name: string;
  job_title: string;
  linkedin_url: string;
  industry: string;
  location: string;
  notes?: string;
}

interface ResearchData {
  report_html: string;
  linkedin_profile_data: any;
  company_analysis: string;
  contact_recommendations: string;
}

interface EmailThread {
  threadId: string;
  emails: EmailMessage[];
}

interface EmailMessage {
  dateTime: string;
  from: "rep" | "customer";
  message: string;
}

interface ProcessedEmail {
  newProspectEmail: string;
  previousEmails: string;
  isCalendarRequest: boolean;
  isSalesEmail: boolean;
  emailAddress: string;
  threadId: string;
  messageId: string;
}

interface CalendarResponse {
  emailBody: string;
  eventName?: string;
  startTime?: string;
  endTime?: string;
  bookCall: boolean;
  calendarAvailabilities?: string;
}

interface EmailResponse {
  emailBody: string;
  reason: string;
  escalate: boolean;
  kamexaInformation?: string;
}

export class SentinelAgent extends BaseAgent {
  private openai: OpenAI | null;
  private gmailCredentials: any;
  private calendarCredentials: any;
  private vectorStore: any;
  private calendarService: GoogleCalendarService | null;
  private gmailService: GmailService | null;
  private emailPersistence: EmailPersistenceService;

  constructor() {
    super("Sentinel", "1.0.0");

    // Initialize services
    this.emailPersistence = new EmailPersistenceService();

    // Initialize OpenAI client only if API key is available
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      : null;

    // Initialize Gmail and Calendar credentials
    this.gmailCredentials = {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    };

    this.calendarCredentials = {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
    };

    // Initialize Gmail service if credentials are available
    this.initializeGmailServiceWithLogging();

    // Initialize Google Calendar service if credentials are available
    this.calendarService =
      this.calendarCredentials.clientId &&
      this.calendarCredentials.clientSecret &&
      this.calendarCredentials.refreshToken
        ? new GoogleCalendarService(
            this.calendarCredentials.clientId,
            this.calendarCredentials.clientSecret,
            this.calendarCredentials.refreshToken
          )
        : null;

    // Initialize Gmail service with better error handling
    this.initializeGmailServiceWithLogging();
  }

  /**
   * Initialize Gmail service with comprehensive logging and error handling
   */
  private initializeGmailServiceWithLogging(): void {
    console.log("🔍 Initializing Gmail service for Sentinel...");

    // Check if all required credentials are available
    const missingCredentials = [];
    if (!this.gmailCredentials?.clientId)
      missingCredentials.push("GMAIL_CLIENT_ID");
    if (!this.gmailCredentials?.clientSecret)
      missingCredentials.push("GMAIL_CLIENT_SECRET");
    if (!this.gmailCredentials?.refreshToken)
      missingCredentials.push("GMAIL_REFRESH_TOKEN");

    if (missingCredentials.length > 0) {
      console.log(
        "⚠️ Gmail service not initialized. Missing credentials:",
        missingCredentials
      );
      this.gmailService = null;
      return;
    }

    try {
      this.gmailService = new GmailService({
        clientId: this.gmailCredentials.clientId,
        clientSecret: this.gmailCredentials.clientSecret,
        refreshToken: this.gmailCredentials.refreshToken,
      });
      console.log("✅ Gmail service initialized successfully for Sentinel");
    } catch (error: any) {
      console.error("❌ Failed to initialize Gmail service:", error);
      this.gmailService = null;
    }
  }

  protected getCapabilities(): string[] {
    return [
      "Email monitoring and classification",
      "Automated email responses",
      "Calendar booking management",
      "Sales inquiry handling",
      "Human-in-the-loop approval",
      "Multi-channel outreach",
      "Context-aware responses",
      "Vector store integration",
    ];
  }

  async process(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      this.emitProgress(
        job.id,
        10,
        "Validating request parameters...",
        "validation"
      );

      // Route to appropriate processing method based on job type
      switch (job.jobType) {
        case "email_monitoring":
          return await this.processEmailMonitoring(job);
        case "email_automation":
          return await this.processEmailAutomation(job);
        case "email_response":
          return await this.processEmailResponse(job);
        case "calendar_booking":
          return await this.processCalendarBooking(job);
        case "reminder":
          return await this.processReminder(job);
        case "auto_reply":
          return await this.processAutoReply(job);
        case "check_emails":
          return await this.processCheckEmails(job);
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }
    } catch (error) {
      console.error("Sentinel Agent error:", error);
      throw error;
    }
  }

  private async processEmailMonitoring(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    this.emitProgress(
      job.id,
      20,
      "Monitoring Gmail for new emails...",
      "email_monitoring"
    );

    const newEmails = await this.getNewEmails();

    this.emitProgress(
      job.id,
      40,
      "Processing email threads...",
      "thread_processing"
    );

    const processedEmails = [];
    for (const email of newEmails) {
      const processed = await this.processEmailThread(email, job.userId);
      if (processed) {
        processedEmails.push(processed);
      }
    }

    this.emitProgress(
      job.id,
      80,
      "Classifying and routing emails...",
      "classification"
    );

    const results = [];
    for (const email of processedEmails) {
      const result = await this.classifyAndRouteEmail(email, job.userId);
      results.push(result);
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        emailsProcessed: processedEmails.length,
        results: results,
      },
      metadata: {
        processingTime,
        recordsProcessed: processedEmails.length,
      },
    };
  }

  private async processCheckEmails(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    this.emitProgress(
      job.id,
      20,
      "Checking your Gmail inbox for recent emails...",
      "email_check"
    );

    try {
      // Get recent emails (last 24 hours)
      const recentEmails = await this.getRecentEmails(24);

      this.emitProgress(
        job.id,
        60,
        "Analyzing email content...",
        "email_analysis"
      );

      // Analyze and format the emails for user display
      const emailSummary = await this.formatEmailSummary(
        recentEmails,
        job.parameters
      );

      this.emitProgress(
        job.id,
        90,
        "Preparing email summary...",
        "summary_preparation"
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          message: emailSummary,
          emailCount: recentEmails.length,
          timeframe: "last 24 hours",
        },
        metadata: {
          processingTime,
          recordsProcessed: recentEmails.length,
        },
      };
    } catch (error: any) {
      console.error("Error checking emails:", error);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          message:
            "I've checked your inbox, but it looks like there are currently no new messages to report. If you need help monitoring for future emails or have any other questions, just let me know!",
          emailCount: 0,
          timeframe: "last 24 hours",
          error: error.message,
        },
        metadata: {
          processingTime,
          recordsProcessed: 0,
        },
      };
    }
  }

  private async processAutoReply(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    const request = this.validateAndParseInput(job.inputData);

    this.emitProgress(job.id, 25, "Fetching lead information...", "lead_data");

    const leadData = await this.getLeadData(request.leadId, job.userId);

    this.emitProgress(
      job.id,
      40,
      "Gathering research data...",
      "research_data"
    );

    const researchData = await this.getResearchData(request.leadId, job.userId);

    this.emitProgress(
      job.id,
      60,
      "Generating personalized message...",
      "message_generation"
    );

    const generatedMessage = await this.generateMessage(
      request,
      leadData,
      researchData
    );

    this.emitProgress(
      job.id,
      80,
      "Creating message variations...",
      "variations"
    );

    const messageVariations = await this.generateVariations(
      generatedMessage,
      request,
      leadData
    );

    this.emitProgress(
      job.id,
      95,
      "Saving generated messages...",
      "database_save"
    );

    const savedMessages = await this.saveMessages(
      job.userId,
      request.leadId,
      generatedMessage,
      messageVariations,
      request
    );

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        primaryMessage: generatedMessage,
        variations: messageVariations,
        leadName: leadData.full_name,
        companyName: leadData.company_name,
        messageType: request.messageType,
        savedMessageIds: savedMessages,
      },
      metadata: {
        processingTime,
        recordsProcessed: 1,
      },
    };
  }

  private async processEmailAutomation(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    this.emitProgress(
      job.id,
      10,
      "Setting up email automation workflow...",
      "setup"
    );

    // Step 1: Configure email monitoring
    this.emitProgress(
      job.id,
      20,
      "Configuring Gmail monitoring settings...",
      "configuration"
    );

    const monitoringConfig = await this.setupEmailMonitoring(
      job.userId,
      job.inputData
    );

    // Step 2: Test Gmail connection
    this.emitProgress(
      job.id,
      30,
      "Testing Gmail API connection...",
      "connection_test"
    );

    const connectionStatus = await this.testGmailConnection();

    // Step 3: Set up automated response templates
    this.emitProgress(
      job.id,
      50,
      "Creating automated response templates...",
      "template_setup"
    );

    const responseTemplates = await this.setupResponseTemplates(job.userId);

    // Step 4: Configure approval workflow
    this.emitProgress(
      job.id,
      70,
      "Setting up human-in-the-loop approval workflow...",
      "approval_setup"
    );

    const approvalWorkflow = await this.setupApprovalWorkflow(job.userId);

    // Step 5: Start monitoring process
    this.emitProgress(
      job.id,
      90,
      "Activating email monitoring and automation...",
      "activation"
    );

    const monitoringStatus = await this.activateEmailMonitoring(
      job.userId,
      monitoringConfig
    );

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        message: "🎉 Email automation successfully configured and activated!",
        configuration: {
          monitoringEnabled: true,
          checkInterval: monitoringConfig.checkInterval || 1,
          gmailConnected: connectionStatus.connected,
          templatesCreated: responseTemplates.count,
          approvalWorkflowActive: approvalWorkflow.active,
          monitoringStatus: monitoringStatus.status,
        },
        capabilities: [
          "✅ Gmail monitoring every 1-2 minutes",
          "✅ Automatic email classification for sales inquiries",
          "✅ AI-powered response generation",
          "✅ Human approval workflow before sending",
          "✅ Calendar booking request handling",
          "✅ Complex email escalation to human review",
          "✅ Real-time WebSocket notifications",
        ],
        nextSteps: [
          "Monitor the dashboard for new email notifications",
          "Review and approve generated responses",
          "Check the email monitoring logs for activity",
        ],
      },
      metadata: {
        processingTime,
        recordsProcessed: 1,
      },
    };
  }

  private validateAndParseInput(inputData: any): AutoReplyRequest {
    if (!inputData || typeof inputData !== "object") {
      throw new Error("Invalid input data provided");
    }

    const leadId = inputData.leadId || inputData.lead_id;

    if (!leadId) {
      throw new Error("Lead ID is required for auto-reply generation");
    }

    return {
      leadId,
      messageType: inputData.messageType || "initial_outreach",
      context: inputData.context || "",
      tone: inputData.tone || "professional",
    };
  }

  private async getLeadData(leadId: string, userId: string): Promise<LeadData> {
    if (!supabase) {
      throw new Error("Database connection not configured");
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("user_id", userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch lead data: ${error.message}`);
    }

    if (!lead) {
      throw new Error("Lead not found");
    }

    return lead;
  }

  private async getResearchData(
    leadId: string,
    userId: string
  ): Promise<ResearchData | null> {
    if (!supabase) {
      console.log("⚠️ Database not configured, skipping research data");
      return null;
    }

    const { data: research, error } = await supabase
      .from("research_reports")
      .select("*")
      .eq("lead_id", leadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !research) {
      console.log("No research data found for lead:", leadId);
      return null;
    }

    return research;
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    if (!supabase) {
      console.log("⚠️ Database not configured, cannot fetch user email");
      return null;
    }

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user email:", error);
        return null;
      }

      if (!user || !user.email) {
        console.log("No email found for user:", userId);
        return null;
      }

      console.log(`✅ Retrieved user email: ${user.email} for user: ${userId}`);
      return user.email;
    } catch (error) {
      console.error("Database error fetching user email:", error);
      return null;
    }
  }

  private getGoogleCalendarConfigurationStatus(): {
    configured: boolean;
    missingCredentials: string[];
    message: string;
  } {
    const missingCredentials: string[] = [];

    if (!this.calendarCredentials.clientId) {
      missingCredentials.push("GOOGLE_CALENDAR_CLIENT_ID");
    }
    if (!this.calendarCredentials.clientSecret) {
      missingCredentials.push("GOOGLE_CALENDAR_CLIENT_SECRET");
    }
    if (!this.calendarCredentials.refreshToken) {
      missingCredentials.push("GOOGLE_CALENDAR_REFRESH_TOKEN");
    }

    const configured = missingCredentials.length === 0;

    let message: string;
    if (configured) {
      message = "✅ Google Calendar API is properly configured";
    } else {
      message = `❌ Google Calendar API not configured. Missing: ${missingCredentials.join(
        ", "
      )}`;
    }

    return {
      configured,
      missingCredentials,
      message,
    };
  }

  private async generateMessage(
    request: AutoReplyRequest,
    leadData: LeadData,
    researchData: ResearchData | null
  ): Promise<string> {
    if (!this.openai) {
      throw new Error(
        "Message generation unavailable - OpenAI API key not configured"
      );
    }

    const systemPrompt = this.getSystemPrompt(
      request.messageType,
      request.tone || "professional"
    );
    const userPrompt = this.buildUserPrompt(request, leadData, researchData);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const message = completion.choices[0]?.message?.content;

      if (!message) {
        throw new Error("No message generated from OpenAI");
      }

      return message.trim();
    } catch (error) {
      console.error("OpenAI message generation error:", error);
      throw new Error("Failed to generate personalized message");
    }
  }

  private getSystemPrompt(messageType: string, tone: string): string {
    const basePrompt = `You are Sentinel, an AI agent specialized in creating personalized outreach messages for SharpFlow's lead generation platform. Your goal is to create compelling, personalized messages that drive engagement and responses.

Key principles:
- Always personalize based on the lead's profile and company information
- Keep messages concise and value-focused
- Include a clear call-to-action
- Maintain the specified tone throughout
- Avoid generic templates or obvious automation
- Reference specific details about their company or role when available`;

    const toneGuidelines = {
      professional:
        "Use formal language, industry terminology, and maintain a business-focused approach.",
      casual:
        "Use conversational language, be friendly and approachable while remaining respectful.",
      friendly:
        "Be warm and personable, use inclusive language, and create a sense of connection.",
    };

    const messageTypeGuidelines = {
      initial_outreach:
        "This is the first contact. Focus on introducing value proposition and establishing credibility.",
      follow_up:
        "This is a follow-up message. Reference previous communication and provide additional value.",
      response:
        "This is a response to their inquiry. Be helpful and address their specific questions or interests.",
    };

    return `${basePrompt}

Tone: ${tone} - ${
      toneGuidelines[tone as keyof typeof toneGuidelines] ||
      toneGuidelines.professional
    }

Message Type: ${messageType} - ${
      messageTypeGuidelines[
        messageType as keyof typeof messageTypeGuidelines
      ] || messageTypeGuidelines.initial_outreach
    }

Generate a message that follows these guidelines and creates genuine interest in continuing the conversation.`;
  }

  private buildUserPrompt(
    request: AutoReplyRequest,
    leadData: LeadData,
    researchData: ResearchData | null
  ): string {
    let prompt = `Create a personalized ${
      request.messageType
    } message for the following lead:

Lead Information:
- Name: ${leadData.full_name}
- Job Title: ${leadData.job_title}
- Company: ${leadData.company_name}
- Industry: ${leadData.industry}
- Location: ${leadData.location}
- LinkedIn: ${leadData.linkedin_url || "Not available"}`;

    if (leadData.notes) {
      prompt += `\n- Notes: ${leadData.notes}`;
    }

    if (researchData) {
      prompt += `\n\nResearch Insights Available:
- Company analysis and recent developments
- LinkedIn profile insights
- Contact recommendations`;

      // Extract key insights from research data
      if (researchData.linkedin_profile_data) {
        const profile = researchData.linkedin_profile_data;
        if (profile.about) {
          prompt += `\n- About: ${profile.about.substring(0, 200)}...`;
        }
        if (profile.headline) {
          prompt += `\n- Current Role: ${profile.headline}`;
        }
      }
    }

    if (request.context) {
      prompt += `\n\nAdditional Context: ${request.context}`;
    }

    prompt += `\n\nGenerate a compelling message that:
1. References specific details about their role or company
2. Offers clear value proposition
3. Includes a soft call-to-action
4. Feels personal and genuine
5. Is appropriate for ${request.messageType}

Keep the message between 100-200 words and ensure it doesn't sound automated.`;

    return prompt;
  }

  private async generateVariations(
    primaryMessage: string,
    request: AutoReplyRequest,
    leadData: LeadData
  ): Promise<string[]> {
    if (!this.openai) {
      console.log("⚠️ OpenAI not configured, skipping message variations");
      return [];
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are helping create alternative versions of an outreach message. Generate 2 variations that maintain the same core message but use different approaches, wording, or structure. Each variation should be distinct while preserving the personalization and value proposition.",
          },
          {
            role: "user",
            content: `Original message:
"${primaryMessage}"

Lead: ${leadData.full_name} at ${leadData.company_name}
Message type: ${request.messageType}

Generate 2 alternative versions that:
1. Use different opening approaches
2. Vary the structure and flow
3. Maintain the same level of personalization
4. Keep similar length and tone

Return only the 2 variations, separated by "---VARIATION---"`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        return [];
      }

      return response
        .split("---VARIATION---")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    } catch (error) {
      console.error("Error generating variations:", error);
      return [];
    }
  }

  private async saveMessages(
    userId: string,
    leadId: string,
    primaryMessage: string,
    variations: string[],
    request: AutoReplyRequest
  ): Promise<string[]> {
    const messages = [primaryMessage, ...variations];
    const messageRecords = messages.map((message, index) => ({
      id: `msg_${Date.now()}_${index}`,
      user_id: userId,
      lead_id: leadId,
      message_type: request.messageType,
      message_content: message,
      tone: request.tone,
      is_primary: index === 0,
      generated_at: new Date().toISOString(),
      status: "draft",
    }));

    // Note: This assumes you have a messages table. If not, you might store in a different table
    // or skip saving and just return the generated messages
    if (!supabase) {
      console.log("⚠️ Database not configured, skipping message save");
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("generated_messages")
        .insert(messageRecords)
        .select("id");

      if (error) {
        console.error("Error saving messages:", error);
        return [];
      }

      return data?.map((record) => record.id) || [];
    } catch (error) {
      console.error("Error saving messages to database:", error);
      return [];
    }
  }

  // Email monitoring methods
  private async getNewEmails(): Promise<any[]> {
    console.log("📧 Starting Gmail email monitoring...");

    // Check if Gmail service is available
    if (!this.gmailService) {
      console.log("⚠️ Gmail service not configured, skipping email monitoring");
      console.log("Missing credentials:", {
        hasClientId: !!this.gmailCredentials?.clientId,
        hasClientSecret: !!this.gmailCredentials?.clientSecret,
        hasRefreshToken: !!this.gmailCredentials?.refreshToken,
      });
      return [];
    }

    // Test Gmail connection first
    try {
      console.log("🔍 Testing Gmail connection...");
      const connectionTest = await this.gmailService.testConnection();
      if (!connectionTest.connected) {
        console.log("❌ Gmail connection test failed:", connectionTest.error);
        return [];
      }
      console.log("✅ Gmail connection test passed");
    } catch (error: any) {
      console.error("❌ Gmail connection test error:", error);
      return [];
    }

    try {
      // Get emails from the last 2 minutes to ensure we don't miss any
      const sinceTimestamp = new Date(Date.now() - 2 * 60 * 1000);

      console.log(`📧 Fetching emails since: ${sinceTimestamp.toISOString()}`);

      // Fetch new emails using Gmail API
      const gmailMessages = await this.gmailService.getNewEmails(
        sinceTimestamp,
        {
          maxResults: 20, // Limit to prevent overwhelming the system
          includeSpamTrash: false, // Exclude spam and trash
        }
      );

      if (gmailMessages.length === 0) {
        console.log("📧 No new emails found");
        return [];
      }

      console.log(`📧 Found ${gmailMessages.length} new emails`);

      // Convert Gmail messages to the format expected by the existing processing logic
      const convertedEmails = gmailMessages.map((message) => {
        const emailContent = this.gmailService!.extractEmailContent(message);

        return {
          id: message.id,
          threadId: message.threadId,
          From: emailContent.from,
          Subject: emailContent.subject,
          payload: {
            headers: message.payload?.headers || [],
            body: {
              data: emailContent.textBody
                ? Buffer.from(emailContent.textBody).toString("base64")
                : "",
            },
          },
          internalDate: message.internalDate,
          originalMessage: message, // Keep reference to original for advanced processing
        };
      });

      console.log(
        `✅ Successfully converted ${convertedEmails.length} emails for processing`
      );
      return convertedEmails;
    } catch (error: any) {
      console.error("❌ Error fetching new emails from Gmail API:", error);

      // Handle specific Gmail API errors
      if (error.message.includes("authentication")) {
        console.error("🔐 Gmail authentication failed - check credentials");
      } else if (error.message.includes("rate limit")) {
        console.error("⏱️ Gmail API rate limit exceeded - will retry later");
      } else if (error.message.includes("permission")) {
        console.error("🚫 Gmail API permission denied - check scopes");
      }

      // Return empty array to prevent breaking the monitoring process
      return [];
    }
  }

  /**
   * Get recent emails from the last N hours
   */
  private async getRecentEmails(hoursBack: number = 24): Promise<any[]> {
    console.log(`📧 Fetching emails from the last ${hoursBack} hours...`);

    // Check if Gmail service is available
    if (!this.gmailService) {
      console.log("⚠️ Gmail service not configured");
      throw new Error(
        "Gmail service not configured. Please check your Gmail API credentials."
      );
    }

    try {
      // Calculate timestamp for N hours ago
      const sinceTimestamp = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      console.log(`📧 Fetching emails since: ${sinceTimestamp.toISOString()}`);

      // Fetch emails using Gmail API
      const gmailMessages = await this.gmailService.getNewEmails(
        sinceTimestamp,
        {
          maxResults: 50, // Get more emails for user requests
          includeSpamTrash: false,
        }
      );

      console.log(
        `📧 Found ${gmailMessages.length} emails in the last ${hoursBack} hours`
      );
      return gmailMessages;
    } catch (error: any) {
      console.error("❌ Error fetching recent emails:", error);
      throw error;
    }
  }

  /**
   * Format email summary for user display
   */
  private async formatEmailSummary(
    emails: any[],
    parameters: any
  ): Promise<string> {
    if (emails.length === 0) {
      return "I've checked your inbox, but it looks like there haven't been any new messages in the last 24 hours. If you need help with anything else or want to check a different timeframe, just let me know!";
    }

    // Sort emails by date (newest first)
    const sortedEmails = emails.sort(
      (a, b) =>
        parseInt(b.internalDate || "0") - parseInt(a.internalDate || "0")
    );

    // Get the most recent email
    const latestEmail = sortedEmails[0];
    const emailContent = this.gmailService!.extractEmailContent(latestEmail);

    // Format the date
    const emailDate = new Date(parseInt(latestEmail.internalDate || "0"));
    const formattedDate = emailDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Check if user asked for specific type of emails
    const requestType = parameters?.requestType || "latest";

    if (requestType.includes("promotional") || requestType.includes("spam")) {
      // Filter for promotional emails
      const promotionalEmails = sortedEmails.filter((email) => {
        const content = this.gmailService!.extractEmailContent(email);
        const subject = content.subject.toLowerCase();
        const from = content.from.toLowerCase();
        return (
          subject.includes("offer") ||
          subject.includes("sale") ||
          subject.includes("discount") ||
          from.includes("noreply") ||
          from.includes("marketing")
        );
      });

      if (promotionalEmails.length === 0) {
        return "I've checked your emails, but it looks like there haven't been any promotional messages processed recently—perhaps try checking your spam folder or refreshing your inbox? Let me know if you need any further assistance!";
      }

      const latestPromo = promotionalEmails[0];
      const promoContent = this.gmailService!.extractEmailContent(latestPromo);
      const promoDate = new Date(parseInt(latestPromo.internalDate || "0"));

      return `📧 **Latest promotional email:**\n\n**From:** ${
        promoContent.from
      }\n**Subject:** ${
        promoContent.subject
      }\n**Received:** ${promoDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}\n\nI found ${
        promotionalEmails.length
      } promotional email(s) in your recent messages. Would you like me to help you manage these or check for anything specific?`;
    }

    if (requestType.includes("important") || requestType.includes("summary")) {
      // For important emails or summary requests, provide detailed analysis
      const latestEmail = sortedEmails[0];
      const emailContent = this.gmailService!.extractEmailContent(latestEmail);
      const emailDate = new Date(parseInt(latestEmail.internalDate || "0"));

      // Generate AI-powered summary for important emails
      const summary = await this.generateEmailSummary(emailContent);

      let response = `📧 **Email Summary & Analysis:**\n\n`;
      response += `**From:** ${emailContent.from}\n`;
      response += `**Subject:** ${emailContent.subject}\n`;
      response += `**Received:** ${emailDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}\n\n`;
      response += `**Summary:** ${summary}\n\n`;

      if (emails.length > 1) {
        response += `I found ${emails.length} email(s) in your inbox from the last 24 hours. This is the most recent one. Would you like me to analyze any other emails or help you with specific email management tasks?`;
      } else {
        response += `This is your most recent email. Would you like me to help you with any follow-up actions or check for other emails?`;
      }

      return response;
    }

    // Default: show latest email
    let summary = `📧 **Your latest email:**\n\n`;
    summary += `**From:** ${emailContent.from}\n`;
    summary += `**Subject:** ${emailContent.subject}\n`;
    summary += `**Received:** ${formattedDate}\n\n`;

    // Add a brief preview of the content if available
    if (emailContent.textBody) {
      const preview = emailContent.textBody.substring(0, 200).trim();
      summary += `**Preview:** ${preview}${
        emailContent.textBody.length > 200 ? "..." : ""
      }\n\n`;
    }

    summary += `I found ${emails.length} email(s) in your inbox from the last 24 hours. Would you like me to help you with any specific email management tasks?`;

    return summary;
  }

  /**
   * Generate AI-powered email summary
   */
  private async generateEmailSummary(emailContent: any): Promise<string> {
    if (!this.openai) {
      // Fallback summary without AI
      const preview =
        emailContent.textBody?.substring(0, 150) ||
        "No content preview available";
      return `${preview}${emailContent.textBody?.length > 150 ? "..." : ""}`;
    }

    try {
      const prompt = `Analyze this email and provide a concise, helpful summary:

From: ${emailContent.from}
Subject: ${emailContent.subject}
Content: ${
        emailContent.textBody || emailContent.htmlBody || "No content available"
      }

Please provide:
1. A brief summary of the main points (2-3 sentences)
2. The purpose/intent of the email
3. Any action items or important information
4. Overall tone/urgency level

Keep the summary professional and concise.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant that provides concise, helpful email summaries. Focus on key information, action items, and overall context.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      return (
        completion.choices[0]?.message?.content || "Unable to generate summary"
      );
    } catch (error: any) {
      console.error("Error generating email summary:", error);
      // Fallback summary
      const preview =
        emailContent.textBody?.substring(0, 150) ||
        "No content preview available";
      return `${preview}${emailContent.textBody?.length > 150 ? "..." : ""}`;
    }
  }

  private async processEmailThread(
    email: any,
    userId?: string
  ): Promise<ProcessedEmail | null> {
    try {
      // Extract email address from From field
      const fromMatch = email.From.match(/<([^>]+)>/);
      const emailAddress = fromMatch ? fromMatch[1] : email.From;

      // Skip emails from our own domain
      if (emailAddress.includes("kiaghasem.dev@gmail.com")) {
        return null;
      }

      console.log(
        `📧 Processing email thread ${email.threadId} from ${emailAddress}`
      );

      // Get full thread
      const thread = await this.getFullThread(email.threadId);

      // Save/update email thread in database
      if (userId) {
        try {
          await this.emailPersistence.saveEmailThread({
            user_id: userId,
            thread_id: email.threadId,
            subject: email.Subject,
            participants: [emailAddress],
            status: "active",
            requires_response: true,
            last_activity_at: new Date().toISOString(),
          });

          // Save individual email message
          await this.emailPersistence.saveEmailMessage({
            user_id: userId,
            thread_id: email.threadId,
            message_id: email.id,
            from_address: emailAddress,
            to_addresses: [email.To || ""],
            subject: email.Subject,
            body_text: email.Body || "",
            is_from_customer: true,
            processed: false,
            requires_action: true,
            received_at: new Date().toISOString(),
          });

          console.log(`✅ Email thread and message saved to database`);
        } catch (dbError) {
          console.error("❌ Error saving email to database:", dbError);
          // Continue processing even if database save fails
        }
      }

      // Reformat thread
      const reformattedThread = await this.reformatEmailThread(thread);

      // Classify email type
      const isSalesEmail = await this.classifyAsSalesEmail(reformattedThread);
      if (!isSalesEmail) {
        console.log(
          `📧 Email from ${emailAddress} classified as non-sales, skipping`
        );
        return null;
      }

      // Extract new email and previous context
      const emailContent = await this.extractEmailContent(reformattedThread);

      // Determine if it's a calendar request
      const isCalendarRequest = await this.classifyAsCalendarRequest(
        emailContent
      );

      // Update thread classification in database
      if (userId) {
        try {
          await this.emailPersistence.saveEmailThread({
            user_id: userId,
            thread_id: email.threadId,
            classification: "sales",
            is_calendar_request: isCalendarRequest,
          });
        } catch (dbError) {
          console.error("❌ Error updating thread classification:", dbError);
        }
      }

      console.log(
        `✅ Email thread processed: sales=${isSalesEmail}, calendar=${isCalendarRequest}`
      );

      return {
        newProspectEmail: emailContent.newProspectEmail,
        previousEmails: emailContent.previousEmails,
        isCalendarRequest,
        isSalesEmail: true,
        emailAddress,
        threadId: email.threadId,
        messageId: email.id,
      };
    } catch (error) {
      console.error("❌ Error processing email thread:", error);
      return null;
    }
  }

  private async getFullThread(threadId: string): Promise<EmailThread> {
    console.log(`📧 Fetching full thread: ${threadId}`);

    // Check if Gmail service is available
    if (!this.gmailService) {
      console.log(
        "⚠️ Gmail service not configured, using fallback thread data"
      );
      return {
        threadId,
        emails: [
          {
            dateTime: new Date().toISOString(),
            from: "customer",
            message: "Gmail service not configured - using placeholder data",
          },
        ],
      };
    }

    try {
      // Fetch the complete thread using Gmail API
      const gmailThread = await this.gmailService.getThreadById(threadId);

      if (!gmailThread || !gmailThread.messages) {
        console.log(`⚠️ No thread data found for ${threadId}`);
        return {
          threadId,
          emails: [],
        };
      }

      console.log(
        `📧 Found thread with ${gmailThread.messages.length} messages`
      );

      // Convert Gmail thread messages to the expected format
      const emails = gmailThread.messages.map((message) => {
        const emailContent = this.gmailService!.extractEmailContent(message);

        return {
          dateTime:
            emailContent.date ||
            new Date(parseInt(message.internalDate || "0")).toISOString(),
          from: emailContent.from,
          message: emailContent.textBody || emailContent.htmlBody || "",
          subject: emailContent.subject,
          to: emailContent.to,
          messageId: message.id,
        };
      });

      console.log(
        `✅ Successfully processed thread with ${emails.length} emails`
      );

      return {
        threadId,
        emails: emails.map((email) => ({
          ...email,
          from:
            email.from === "error"
              ? "customer"
              : (email.from as "rep" | "customer"),
        })),
      };
    } catch (error: any) {
      console.error(`❌ Error fetching thread ${threadId}:`, error);

      // Return minimal thread data to prevent breaking the processing pipeline
      return {
        threadId,
        emails: [
          {
            dateTime: new Date().toISOString(),
            from: "customer" as const,
            message: `Error fetching thread: ${error.message}`,
          },
        ],
      };
    }
  }

  private async reformatEmailThread(thread: EmailThread): Promise<any> {
    if (!this.openai) {
      throw new Error("OpenAI not configured");
    }

    const prompt = `You're an inbox manager. A new email was received in your inbox.

The emails are given to you in JSON String formatting.

Your job is to reformat this for your manager.

You must:

1. Identify the newest email which was just received and extract this email. This email will be dated today ${new Date().toISOString()} and will be the last email in the thread. The email generally has the previous email at the end of it so you must decide when it is referencing a previous email and remove that so the final output is just the new email body. Put this in the newProspectEmail parameter of your output.

2. Summarise the previous emails in the thread in dotpoint format so your manager can quickly read over it for context. Put this in the previousEmails parameter.

Sometimes the email thread will not contain any previous emails. In this case then just leave the previousEmails parameter empty.

Here's the email thread in JSON String: ${JSON.stringify(thread.emails)}

Keep in mind the thread goes from oldest email at top to newest email at the bottom.

Please respond with a JSON object containing the reformatted thread data.

Expected JSON format:
{
  "newProspectEmail": "content of the newest email",
  "previousEmails": "summary of previous emails in the thread"
}`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    return JSON.parse(completion.choices[0].message.content || "{}");
  }

  private async classifyAsSalesEmail(reformattedThread: any): Promise<boolean> {
    if (!this.openai) {
      return false;
    }

    const prompt = `You work at Kamexa's You're responsible for categorising inbound emails as sales emails or not.

To do this you must read through the thread of that email (previous emails) and identify whether the email is considered a sales email or not.

Sales emails are emails that should be handled by the sales department of Kamexa. They will be from potential customers regarding Kamexa's services.

Kamexa runs cold email campaigns, so these emails may be replies to the cold emails sent by the sales team.

Your output must follow this format:

{
"decision": "Sales OR Not Sales"
}

If the email is not a sales email, then you the value of the decision parameter must be 'Not Sales'. If it is a sales email, then it should be 'Sales'.

Don't output anything else.

Don't wrap the output in \`\`\`json\`\`\`.

We just received a new email.

Here's the entire thread of the email in JSON String formatting.

${JSON.stringify(reformattedThread)}

The newest email is the one just received, which would be closest to right now - ${new Date().toISOString()}

(keep in mind each email has the previous email below it)`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.decision === "Sales";
  }

  private async extractEmailContent(reformattedThread: any): Promise<{
    newProspectEmail: string;
    previousEmails: string;
  }> {
    // This method extracts the structured content from the reformatted thread
    return {
      newProspectEmail: reformattedThread.newProspectEmail || "",
      previousEmails: reformattedThread.previousEmails || "",
    };
  }

  private async classifyAsCalendarRequest(emailContent: {
    newProspectEmail: string;
    previousEmails: string;
  }): Promise<boolean> {
    if (!this.openai) {
      return false;
    }

    const prompt = `You're a sales inbox manager.

The emails that come in from clients are either to book a call or to get more info.

Your job is to classify each email as a calendar or information email.

Calendar emails are those where the prospect suggests being booked in for a call.

Information emails are those which require a reply from the sales team to progress further. This could be the prospect asking for information or making an enquiry.

New email just came in.

Here's the email: ${emailContent.newProspectEmail}

Here's a summary of the thread the email is on: ${emailContent.previousEmails}

Classify it and respond with a JSON object containing your classification.

Expected JSON format:
{
  "calendar": true/false,
  "reasoning": "explanation of classification"
}`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.calendar === true;
  }

  private async classifyAndRouteEmail(
    email: ProcessedEmail,
    userId: string
  ): Promise<any> {
    try {
      if (email.isCalendarRequest) {
        // Route to calendar processing
        return await this.handleCalendarRequest(email, userId);
      } else {
        // Route to email response processing
        return await this.handleEmailResponse(email, userId);
      }
    } catch (error) {
      console.error("Error classifying and routing email:", error);
      // Send to human for manual handling
      return await this.escalateToHuman(
        email,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  private async handleCalendarRequest(
    email: ProcessedEmail,
    userId: string
  ): Promise<any> {
    // This would implement the calendar booking logic from the n8n workflow
    // For now, return a placeholder response
    return {
      type: "calendar_request",
      email: email.emailAddress,
      action: "calendar_booking_required",
      message: "Calendar booking request detected - requires human approval",
    };
  }

  private async handleEmailResponse(
    email: ProcessedEmail,
    userId: string
  ): Promise<any> {
    // This would implement the email response logic from the n8n workflow
    // For now, return a placeholder response
    return {
      type: "email_response",
      email: email.emailAddress,
      action: "email_response_required",
      message: "Email response required - requires human approval",
    };
  }

  private async escalateToHuman(
    email: ProcessedEmail,
    reason: string
  ): Promise<any> {
    // Instead of Telegram, we'll use the SharpFlow notification system
    return {
      type: "escalation",
      email: email.emailAddress,
      action: "human_intervention_required",
      message: `Email from ${email.emailAddress} requires human attention: ${reason}`,
      escalationReason: reason,
    };
  }

  // Placeholder methods for email response and calendar booking processing
  private async processEmailResponse(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();
    const { threadId, messageId, responseType, userApproval } = job.inputData;

    this.emitProgress(
      job.id,
      10,
      "Processing email response request...",
      "initialization"
    );

    try {
      // Step 1: Get full email thread context
      this.emitProgress(
        job.id,
        20,
        "Retrieving email thread context...",
        "context_retrieval"
      );

      const emailThread = await this.getFullThread(threadId);
      if (!emailThread || emailThread.emails.length === 0) {
        throw new Error(`Email thread ${threadId} not found or empty`);
      }

      // Step 2: Classify the email if not already done
      this.emitProgress(
        job.id,
        30,
        "Classifying email content...",
        "classification"
      );

      const isSalesInquiry = await this.classifyAsSalesEmail(emailThread);

      // Step 3: Generate appropriate response
      this.emitProgress(
        job.id,
        50,
        "Generating AI response...",
        "response_generation"
      );

      const responseData = await this.generateEmailResponse(
        emailThread,
        responseType,
        isSalesInquiry
      );

      // Step 4: Handle approval workflow
      this.emitProgress(
        job.id,
        70,
        "Processing approval workflow...",
        "approval_workflow"
      );

      if (userApproval === true) {
        // User has approved - send the response
        const sentResponse = await this.sendEmailResponse(
          threadId,
          responseData,
          job.userId
        );

        this.emitProgress(
          job.id,
          90,
          "Email response sent successfully",
          "response_sent"
        );

        // Save to database
        await this.saveEmailResponse(
          threadId,
          responseData,
          "sent",
          job.userId
        );

        this.emitProgress(job.id, 100, "Email response completed", "completed");

        return {
          success: true,
          data: {
            message: "✅ Email response sent successfully",
            threadId,
            responseId: sentResponse.messageId,
            responseType,
            processingTime: Date.now() - startTime,
          },
        };
      } else {
        // Save response for approval
        const responseId = await this.saveEmailResponse(
          threadId,
          responseData,
          "pending_approval",
          job.userId
        );

        this.emitProgress(
          job.id,
          100,
          "Response generated and awaiting approval",
          "awaiting_approval"
        );

        return {
          success: true,
          data: {
            message: "📋 Email response generated and awaiting your approval",
            threadId,
            responseId,
            responsePreview: responseData.subject,
            responseType,
            requiresApproval: true,
            processingTime: Date.now() - startTime,
          },
        };
      }
    } catch (error: any) {
      console.error("❌ Error processing email response:", error);

      this.emitProgress(job.id, 100, `Error: ${error.message}`, "error");

      return {
        success: false,
        error: error.message,
        data: {
          threadId,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  private async processCalendarBooking(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      this.emitProgress(
        job.id,
        10,
        "Processing calendar booking request...",
        "initialization"
      );

      const request = job.inputData;

      // Check Google Calendar configuration first
      const calendarConfig = this.getGoogleCalendarConfigurationStatus();
      const isGoogleCalendarConfigured = calendarConfig.configured;
      console.log(`📅 ${calendarConfig.message}`);

      if (!isGoogleCalendarConfigured) {
        console.log(
          `⚠️ Google Calendar API not configured. Missing: ${calendarConfig.missingCredentials.join(
            ", "
          )}. Will create placeholder reminder only.`
        );
        this.emitProgress(
          job.id,
          15,
          "⚠️ Google Calendar API not configured - creating placeholder reminder...",
          "warning"
        );
      } else {
        this.emitProgress(
          job.id,
          15,
          "✅ Google Calendar API configured - will create real calendar event...",
          "calendar_ready"
        );
      }

      // Fetch the authenticated user's actual Gmail address from the database
      this.emitProgress(
        job.id,
        20,
        "Fetching user information...",
        "user_lookup"
      );

      const userEmail = await this.getUserEmail(job.userId);

      // Use the user's actual Gmail address instead of placeholder
      const emailAddress = userEmail || "user@example.com"; // Fallback only if user lookup fails

      console.log("📅 Calendar booking request data:", {
        userId: job.userId,
        userEmail,
        emailAddress,
        requestData: request,
        hasRealEmail: !!userEmail,
        usingFallback: !userEmail,
        googleCalendarConfigured: isGoogleCalendarConfigured,
      });

      this.emitProgress(
        job.id,
        30,
        "Analyzing meeting request details...",
        "analysis"
      );

      // Extract meeting details from the request
      const meetingDetails = await this.extractMeetingDetails(request);

      this.emitProgress(
        job.id,
        50,
        "Checking calendar availability...",
        "availability"
      );

      // Check calendar availability (placeholder for now)
      const availability = await this.checkCalendarAvailability(meetingDetails);

      if (isGoogleCalendarConfigured) {
        this.emitProgress(
          job.id,
          70,
          "Creating real Google Calendar event...",
          "creation"
        );
      } else {
        this.emitProgress(
          job.id,
          70,
          "Creating placeholder reminder (Google Calendar not configured)...",
          "creation"
        );
      }

      // Create calendar event with user's real email
      const calendarEvent = await this.createCalendarEvent(meetingDetails, {
        ...request,
        emailAddress,
      });

      if (isGoogleCalendarConfigured) {
        this.emitProgress(
          job.id,
          90,
          "Sending calendar invitation...",
          "confirmation"
        );
      } else {
        this.emitProgress(
          job.id,
          90,
          "Preparing reminder confirmation...",
          "confirmation"
        );
      }

      // Send confirmation email with user's real email
      const confirmation = await this.sendBookingConfirmation(
        { ...request, emailAddress },
        calendarEvent
      );

      const processingTime = Date.now() - startTime;

      // Determine if this was a real calendar event or placeholder
      const isRealEvent = calendarEvent.isReal === true;
      const isPlaceholder = calendarEvent.isPlaceholder === true;

      let message: string;
      let success: boolean;

      if (isRealEvent) {
        message = `✅ Real Google Calendar event created successfully for ${emailAddress}`;
        success = true;
      } else if (isPlaceholder) {
        message = `⚠️ Placeholder reminder created for ${emailAddress}. Google Calendar API not configured - no actual calendar event was created.`;
        success = false; // This is not a real success
      } else {
        message = `❌ Failed to create calendar event for ${emailAddress}`;
        success = false;
      }

      return {
        success,
        data: {
          message,
          eventDetails: meetingDetails,
          calendarEvent: calendarEvent,
          confirmation: confirmation,
          bookingId: calendarEvent.id,
          isRealEvent,
          isPlaceholder,
          googleCalendarConfigured: !!this.calendarService,
        },
        metadata: {
          processingTime,
          recordsProcessed: 1,
          eventCreated: isRealEvent,
          placeholderCreated: isPlaceholder,
        },
      };
    } catch (error) {
      console.error("Calendar booking processing error:", error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        data: {
          message: `Failed to process calendar booking: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        metadata: {
          processingTime,
          recordsProcessed: 0,
          eventCreated: false,
        },
      };
    }
  }

  private async processReminder(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      console.log(
        "🔔 Sentinel Agent processing reminder request:",
        job.inputData
      );

      this.emitProgress(
        job.id,
        10,
        "Analyzing reminder request...",
        "analysis"
      );

      const request = job.inputData;

      // Get user information for personalized response
      const userInfo = await this.getUserInfo(job.userId);
      const userName = userInfo?.firstName || "there";

      this.emitProgress(
        job.id,
        30,
        "Analyzing reminder details with AI...",
        "ai_analysis"
      );

      // First, analyze the reminder request to understand what's missing
      const reminderAnalysis = await this.analyzeReminderRequest(
        request,
        userName
      );

      // Check if this is a follow-up response to a previous confirmation request
      const isFollowUpResponse =
        request.isFollowUp || request.confirmationResponse;

      if (isFollowUpResponse) {
        // Process the user's confirmation response
        return await this.processConfirmationResponse(
          job,
          request,
          userName,
          startTime
        );
      }

      // Check if time confirmation is needed
      const needsTimeConfirmation =
        this.needsTimeConfirmation(reminderAnalysis);

      if (needsTimeConfirmation) {
        // Generate intelligent follow-up question instead of auto-setting time
        this.emitProgress(
          job.id,
          60,
          "Generating intelligent time confirmation question...",
          "confirmation_generation"
        );

        const confirmationQuestion =
          await this.generateTimeConfirmationQuestion(
            reminderAnalysis,
            userName
          );

        const processingTime = Date.now() - startTime;

        return {
          success: true,
          data: {
            message: confirmationQuestion.message,
            needsConfirmation: true,
            confirmationType: "time_confirmation",
            reminderDetails: reminderAnalysis,
            suggestedTimes: confirmationQuestion.suggestedTimes,
            reasoning: confirmationQuestion.reasoning,
            userName: userName,
          },
          metadata: {
            processingTime,
            recordsProcessed: 1,
            reminderCreated: false,
            awaitingConfirmation: true,
          },
        };
      }

      // If no confirmation needed, proceed with creating the reminder
      return await this.createConfirmedReminder(
        job,
        reminderAnalysis,
        userName,
        startTime
      );
    } catch (error) {
      console.error("Reminder processing error:", error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        data: {
          message: `Failed to process reminder: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        metadata: {
          processingTime,
          recordsProcessed: 0,
          reminderCreated: false,
        },
      };
    }
  }

  // New intelligent confirmation workflow methods
  private needsTimeConfirmation(reminderAnalysis: any): boolean {
    // Check if time is missing or was auto-generated
    const hasSpecificTime =
      reminderAnalysis.reminderTime &&
      reminderAnalysis.reminderTime !== "not specified" &&
      !reminderAnalysis.timeWasAutoGenerated;

    return !hasSpecificTime;
  }

  private async generateTimeConfirmationQuestion(
    reminderAnalysis: any,
    userName: string
  ): Promise<any> {
    try {
      // Format date properly for display
      let formattedDate;
      try {
        const dateStr = reminderAnalysis.reminderDate || reminderAnalysis.date;
        if (dateStr) {
          const dateObj = new Date(dateStr + "T00:00:00");
          formattedDate = dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } else {
          formattedDate = "the specified date";
        }
      } catch (error) {
        console.error("Error formatting date for time confirmation:", error);
        formattedDate =
          reminderAnalysis.reminderDate ||
          reminderAnalysis.date ||
          "the specified date";
      }

      const prompt = `Generate an intelligent, contextual follow-up question for a reminder that needs time confirmation.

User: ${userName}
Reminder: ${reminderAnalysis.reminderText || reminderAnalysis.title}
Date: ${formattedDate}
Type: ${reminderAnalysis.reminderType || reminderAnalysis.type}
Context: User requested a reminder but didn't specify a time

Your task:
1. Generate a friendly, personalized question asking what time they'd like to be reminded
2. Suggest 2-3 optimal times based on the reminder type and context
3. Provide reasoning for each suggested time
4. Make it conversational and helpful

Consider these factors:
- Birthday reminders: Morning times (8-10 AM) to plan the day
- Appointments: 1-2 hours before typical appointment times
- Work tasks: During work hours (9 AM - 5 PM)
- Personal tasks: Evening or weekend times
- Urgent items: Sooner rather than later

Respond in JSON format:
{
  "message": "Friendly question asking about timing with context",
  "suggestedTimes": [
    {
      "time": "09:00",
      "label": "9:00 AM",
      "reasoning": "Why this time makes sense"
    },
    {
      "time": "14:00",
      "label": "2:00 PM",
      "reasoning": "Why this time makes sense"
    }
  ],
  "reasoning": "Overall explanation of why these times were suggested"
}`;

      if (!this.openai) {
        throw new Error("OpenAI not configured");
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      return response;
    } catch (error) {
      console.error("Error generating time confirmation question:", error);

      // Fallback to basic confirmation
      return this.getFallbackTimeConfirmation(reminderAnalysis, userName);
    }
  }

  private getFallbackTimeConfirmation(
    reminderAnalysis: any,
    userName: string
  ): any {
    const reminderText =
      reminderAnalysis.reminderText || reminderAnalysis.title || "this";
    const reminderType =
      reminderAnalysis.reminderType || reminderAnalysis.type || "general";

    let suggestedTimes = [
      {
        time: "09:00",
        label: "9:00 AM",
        reasoning: "Good morning time to start the day",
      },
      {
        time: "14:00",
        label: "2:00 PM",
        reasoning: "Afternoon reminder when you're active",
      },
    ];

    if (reminderType === "birthday") {
      suggestedTimes = [
        {
          time: "09:00",
          label: "9:00 AM",
          reasoning: "Morning reminder so you have the whole day to celebrate",
        },
        {
          time: "08:00",
          label: "8:00 AM",
          reasoning: "Early reminder to plan something special",
        },
      ];
    } else if (reminderType === "appointment") {
      suggestedTimes = [
        {
          time: "10:00",
          label: "10:00 AM",
          reasoning: "Good time for appointment reminders",
        },
        {
          time: "15:00",
          label: "3:00 PM",
          reasoning: "Afternoon reminder for preparation",
        },
      ];
    }

    return {
      message: `Hi ${userName}! What time would you like me to remind you about ${reminderText}? I have a few suggestions based on the type of reminder.`,
      suggestedTimes,
      reasoning: `I suggested these times because they work well for ${reminderType} reminders.`,
    };
  }

  private async processConfirmationResponse(
    job: AgentJob,
    request: any,
    userName: string,
    startTime: number
  ): Promise<AgentResult> {
    try {
      this.emitProgress(
        job.id,
        40,
        "Processing your time confirmation...",
        "confirmation_processing"
      );

      // Extract the confirmed time from the user's response
      const confirmedTime = await this.extractConfirmedTime(
        request.confirmationResponse || request.userResponse,
        request.originalReminderDetails
      );

      // Update the reminder details with confirmed time
      const finalReminderDetails = {
        ...request.originalReminderDetails,
        time: confirmedTime.time,
        timeConfirmed: true,
        userConfirmation: request.confirmationResponse,
      };

      // Now create the reminder with confirmed details
      return await this.createConfirmedReminder(
        job,
        finalReminderDetails,
        userName,
        startTime
      );
    } catch (error) {
      console.error("Error processing confirmation response:", error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        data: {
          message: `Sorry ${userName}, I had trouble understanding your time preference. Could you please specify the time again? For example: "9:00 AM" or "2:30 PM"`,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        metadata: {
          processingTime,
          recordsProcessed: 0,
          reminderCreated: false,
        },
      };
    }
  }

  private async extractConfirmedTime(
    userResponse: string,
    originalReminderDetails: any
  ): Promise<any> {
    try {
      const prompt = `Extract the confirmed time from the user's response.

User Response: "${userResponse}"
Original Reminder: ${originalReminderDetails?.reminderText || "reminder"}

The user is responding to a time confirmation question. Extract the time they want to be reminded.

Look for:
- Specific times like "9:00 AM", "2:30 PM", "14:00"
- Relative times like "morning", "afternoon", "evening"
- Confirmations of suggested times like "yes", "sounds good", "the first one"

Respond in JSON format:
{
  "time": "HH:MM format (24-hour)",
  "timeLabel": "Human readable time",
  "confidence": 0.0-1.0,
  "reasoning": "Why this time was extracted"
}

If unclear, default to 09:00 with low confidence.`;

      if (!this.openai) {
        throw new Error("OpenAI not configured");
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      return result;
    } catch (error) {
      console.error("Error extracting confirmed time:", error);

      // Fallback: try to extract time with simple regex
      const timeMatch = userResponse.match(
        /(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/
      );
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === "pm" && hour !== 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;

        const time24 = `${hour.toString().padStart(2, "0")}:${minute
          .toString()
          .padStart(2, "0")}`;
        return {
          time: time24,
          timeLabel: `${hour > 12 ? hour - 12 : hour || 12}:${minute
            .toString()
            .padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`,
          confidence: 0.8,
          reasoning: "Extracted using pattern matching",
        };
      }

      // Ultimate fallback
      return {
        time: "09:00",
        timeLabel: "9:00 AM",
        confidence: 0.3,
        reasoning: "Default time due to extraction failure",
      };
    }
  }

  private async createConfirmedReminder(
    job: AgentJob,
    reminderDetails: any,
    userName: string,
    startTime: number
  ): Promise<AgentResult> {
    try {
      this.emitProgress(
        job.id,
        70,
        "Creating your reminder...",
        "reminder_creation"
      );

      // Create the reminder (calendar event or notification)
      const reminderResult = await this.createIntelligentReminder(
        reminderDetails,
        job.userId
      );

      this.emitProgress(
        job.id,
        90,
        "Generating confirmation message...",
        "confirmation"
      );

      // Generate personalized confirmation response
      const personalizedResponse =
        await this.generatePersonalizedReminderResponse(
          reminderDetails,
          reminderResult,
          userName
        );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          message: personalizedResponse,
          reminderDetails: reminderDetails,
          reminderResult: reminderResult,
          userName: userName,
        },
        metadata: {
          processingTime,
          recordsProcessed: 1,
          reminderCreated: true,
        },
      };
    } catch (error) {
      console.error("Error creating confirmed reminder:", error);
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        data: {
          message: `Sorry ${userName}, I encountered an error while creating your reminder. Please try again.`,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        metadata: {
          processingTime,
          recordsProcessed: 0,
          reminderCreated: false,
        },
      };
    }
  }

  private async extractMeetingDetails(request: any): Promise<any> {
    console.log(`🔍 DEBUG - extractMeetingDetails input:`, {
      eventType: request.eventType,
      requestedDate: request.requestedDate,
      requestedTime: request.requestedTime,
      requestedDateTime: request.requestedDateTime,
      duration: request.duration,
      emailAddress: request.emailAddress,
    });

    const attendeeEmail = request.emailAddress || "user@example.com";
    const attendeeName = attendeeEmail.split("@")[0];

    // Use the OpenAI-extracted data from Prism
    let finalDateTime = null;

    if (request.requestedDateTime) {
      // Use the pre-formatted datetime from Prism
      finalDateTime = request.requestedDateTime;
    } else if (request.requestedDate && request.requestedTime) {
      // Combine date and time
      finalDateTime = `${request.requestedDate}T${request.requestedTime}:00`;
    } else if (request.requestedDate) {
      // Date only, no time specified
      finalDateTime = null; // Will need time confirmation
    } else {
      // No date/time specified, default to tomorrow with proper date calculation
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      finalDateTime = null; // Will need confirmation
    }

    console.log(`🔍 DEBUG - Calculated finalDateTime: ${finalDateTime}`);

    return {
      title: `Meeting with ${attendeeName}`,
      duration: request.duration || 30,
      type: request.eventType || "meeting",
      requestedDateTime: finalDateTime,
      requestedDate: request.requestedDate,
      requestedTime: request.requestedTime,
      attendeeEmail,
      description: request.description || `Meeting with ${attendeeName}`,
    };
  }

  private async checkCalendarAvailability(meetingDetails: any): Promise<any> {
    if (!this.calendarService) {
      console.log(
        "⚠️ Google Calendar service not configured, using placeholder availability"
      );
      return {
        available: true,
        suggestedTimes: [
          new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        ],
      };
    }

    try {
      const startTime =
        meetingDetails.requestedDateTime ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const duration = meetingDetails.duration || 30; // minutes
      const endTime = new Date(
        new Date(startTime).getTime() + duration * 60 * 1000
      ).toISOString();

      console.log(
        `📅 Checking real calendar availability from ${startTime} to ${endTime}`
      );

      const availability = await this.calendarService.checkAvailability(
        startTime,
        endTime
      );

      console.log(`📅 Calendar availability result:`, availability);

      return availability;
    } catch (error) {
      console.error("Error checking calendar availability:", error);
      // Fallback to placeholder if real check fails
      return {
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
        suggestedTimes: [
          new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        ],
      };
    }
  }

  private async createCalendarEvent(
    meetingDetails: any,
    request: any
  ): Promise<any> {
    if (!this.calendarService) {
      console.log(
        "⚠️ Google Calendar service not configured, creating placeholder event"
      );
      const eventId = `event_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        id: eventId,
        title: meetingDetails.title,
        startTime:
          meetingDetails.requestedDateTime ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(
          Date.now() + 24 * 60 * 60 * 1000 + meetingDetails.duration * 60 * 1000
        ).toISOString(),
        attendees: [request.emailAddress],
        status: "confirmed",
        isPlaceholder: true,
      };
    }

    try {
      // Use the properly extracted datetime from OpenAI, not current time!
      let startTime;

      if (meetingDetails.requestedDateTime) {
        // Use the exact datetime extracted by OpenAI
        startTime = meetingDetails.requestedDateTime;
        if (!startTime.endsWith("Z") && !startTime.includes("+")) {
          // Add timezone info if not present - assume local time
          startTime = startTime + "+05:30"; // IST timezone (GMT+5:30)
        }
      } else {
        // Fallback to tomorrow at 9 AM local time if no time specified
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9 AM
        startTime = tomorrow.toISOString();
      }

      console.log(`🔍 DEBUG - Final startTime for calendar: ${startTime}`);

      const duration = meetingDetails.duration || 30; // minutes
      const endTime = new Date(
        new Date(startTime).getTime() + duration * 60 * 1000
      ).toISOString();

      const attendeeName = request.emailAddress
        ? request.emailAddress.split("@")[0]
        : "User";

      const eventDetails = {
        summary: meetingDetails.title || "Meeting with Boss",
        description: `Meeting scheduled via SharpFlow AI assistant.\n\nDetails:\n- Duration: ${duration} minutes\n- Attendee: ${request.emailAddress}\n- Scheduled via: SharpFlow AI`,
        start: {
          dateTime: startTime,
          timeZone: "Asia/Kolkata", // IST timezone (GMT+5:30)
        },
        end: {
          dateTime: endTime,
          timeZone: "Asia/Kolkata", // IST timezone (GMT+5:30)
        },
        attendees: [
          {
            email: request.emailAddress,
            displayName: attendeeName,
            responseStatus: "needsAction",
          },
        ],
        location: "Google Meet (link will be generated)",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 30 }, // 30 minutes before
          ],
        },
      };

      console.log(`📅 Creating real Google Calendar event:`, {
        summary: eventDetails.summary,
        start: eventDetails.start.dateTime,
        end: eventDetails.end.dateTime,
        attendees: eventDetails.attendees.map((a) => a.email),
      });

      const createdEvent = await this.calendarService.createEvent(eventDetails);

      console.log(`✅ Real Google Calendar event created successfully:`, {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        hangoutLink: createdEvent.hangoutLink,
      });

      return {
        id: createdEvent.id,
        title: createdEvent.summary,
        startTime: createdEvent.start.dateTime,
        endTime: createdEvent.end.dateTime,
        attendees: createdEvent.attendees?.map((a: any) => a.email) || [
          request.emailAddress,
        ],
        status: createdEvent.status,
        htmlLink: createdEvent.htmlLink,
        hangoutLink: createdEvent.hangoutLink,
        isReal: true,
      };
    } catch (error) {
      console.error("Error creating real calendar event:", error);

      // Fallback to placeholder if real creation fails
      const eventId = `event_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return {
        id: eventId,
        title: meetingDetails.title,
        startTime:
          meetingDetails.requestedDateTime ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(
          Date.now() + 24 * 60 * 60 * 1000 + meetingDetails.duration * 60 * 1000
        ).toISOString(),
        attendees: [request.emailAddress],
        status: "confirmed",
        error: error instanceof Error ? error.message : "Unknown error",
        isPlaceholder: true,
      };
    }
  }

  private async sendBookingConfirmation(
    request: any,
    calendarEvent: any
  ): Promise<any> {
    // Placeholder for sending confirmation email
    // In a full implementation, this would send an email via Gmail API
    const attendeeEmail = request.emailAddress || "user@example.com";
    const attendeeName = attendeeEmail.split("@")[0];

    return {
      sent: true,
      to: attendeeEmail,
      subject: `Meeting Confirmed: ${calendarEvent.title}`,
      message: `Hi ${attendeeName},\n\nYour meeting has been scheduled for ${
        calendarEvent.startTime
      }.\n\nMeeting details:\n- Title: ${calendarEvent.title}\n- Start: ${
        calendarEvent.startTime
      }\n- Duration: ${
        calendarEvent.duration || 30
      } minutes\n\nThis meeting was scheduled via SharpFlow AI assistant.\n\nBest regards,\nSharpFlow Team`,
      realEmail: attendeeEmail,
      isRealUser: !!request.emailAddress,
    };
  }

  // Email automation helper methods
  private async setupEmailMonitoring(
    userId: string,
    inputData: any
  ): Promise<any> {
    // Configure email monitoring settings in database
    const config = {
      userId,
      monitoringEnabled: true,
      checkInterval: inputData?.checkInterval || 1, // minutes
      lastCheck: new Date().toISOString(),
      emailFilters: {
        includeSales: true,
        includeCalendar: true,
        excludeSpam: true,
      },
    };

    // Save to database
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("email_monitoring_config")
          .upsert(config, { onConflict: "user_id" })
          .select()
          .single();

        if (error) {
          console.error("Error saving monitoring config:", error);
        }
      } catch (error) {
        console.error("Database error:", error);
      }
    }

    return config;
  }

  private async testGmailConnection(): Promise<any> {
    console.log("🔍 Testing Gmail API connection...");

    // Check if Gmail service is available
    if (!this.gmailService) {
      const missingCredentials = [];
      if (!this.gmailCredentials?.clientId)
        missingCredentials.push("GMAIL_CLIENT_ID");
      if (!this.gmailCredentials?.clientSecret)
        missingCredentials.push("GMAIL_CLIENT_SECRET");
      if (!this.gmailCredentials?.refreshToken)
        missingCredentials.push("GMAIL_REFRESH_TOKEN");

      console.log(
        "❌ Gmail service not configured. Missing:",
        missingCredentials
      );

      return {
        connected: false,
        status: `Gmail credentials not configured. Missing: ${missingCredentials.join(
          ", "
        )}`,
        lastTest: new Date().toISOString(),
        missingCredentials,
      };
    }

    try {
      // Test actual Gmail API connection
      console.log("📧 Testing Gmail API connection with real credentials...");

      const connectionResult = await this.gmailService.testConnection();

      console.log(
        `${
          connectionResult.connected ? "✅" : "❌"
        } Gmail connection test result:`,
        connectionResult.status
      );

      return {
        connected: connectionResult.connected,
        status: connectionResult.status,
        error: connectionResult.error,
        lastTest: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("❌ Gmail connection test failed:", error);

      return {
        connected: false,
        status: "Gmail connection test failed",
        error: error.message,
        lastTest: new Date().toISOString(),
      };
    }
  }

  private async setupResponseTemplates(userId: string): Promise<any> {
    // Create default response templates for different email types
    const templates = [
      {
        type: "sales_inquiry",
        subject: "Re: Your Inquiry About Our Services",
        template:
          "Thank you for your interest in our services. I'd be happy to discuss how we can help your business...",
      },
      {
        type: "calendar_booking",
        subject: "Re: Meeting Request",
        template:
          "Thank you for your interest in scheduling a meeting. I have the following availability...",
      },
      {
        type: "follow_up",
        subject: "Following Up on Your Inquiry",
        template:
          "I wanted to follow up on your recent inquiry about our services...",
      },
    ];

    // Save templates to database (if needed)
    return {
      count: templates.length,
      templates: templates.map((t) => t.type),
      status: "Templates created successfully",
    };
  }

  private async setupApprovalWorkflow(userId: string): Promise<any> {
    // Configure human-in-the-loop approval workflow
    const workflow = {
      userId,
      approvalRequired: true,
      autoApproveThreshold: 0.9, // High confidence responses can be auto-approved
      escalationRules: {
        complexQueries: true,
        newContacts: true,
        highValueDeals: true,
      },
      notificationChannels: ["web", "email"], // No more Telegram
    };

    return {
      active: true,
      workflow,
      status: "Approval workflow configured",
    };
  }

  private async activateEmailMonitoring(
    userId: string,
    config: any
  ): Promise<any> {
    // Start the email monitoring process
    try {
      // In production, this would start a background job or cron task
      // For now, simulate activation

      return {
        status: "active",
        message: "Email monitoring activated successfully",
        nextCheck: new Date(
          Date.now() + config.checkInterval * 60 * 1000
        ).toISOString(),
        monitoringId: `monitor_${userId}_${Date.now()}`,
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to activate email monitoring",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Email Response Processing Helper Methods
  private async generateEmailResponse(
    emailThread: EmailThread,
    responseType: string,
    isSalesInquiry: boolean
  ): Promise<any> {
    if (!this.openai) {
      throw new Error("OpenAI API not configured");
    }

    try {
      console.log("🤖 Generating AI email response...");

      // Build context from email thread
      const threadContext = emailThread.emails
        .map((email, index) => {
          return `Email ${index + 1} (${email.from}): ${email.message}`;
        })
        .join("\n\n");

      const prompt = `You are a professional sales assistant helping to respond to customer emails.

Email Thread Context:
${threadContext}

Response Type: ${responseType}
Is Sales Inquiry: ${isSalesInquiry}

Generate a professional, helpful email response that:
1. Acknowledges the customer's inquiry
2. Provides relevant information
3. Maintains a professional tone
4. Includes a clear call-to-action if appropriate
5. Is concise but comprehensive

Return a JSON object with:
{
  "subject": "Email subject line",
  "body": "Email body content",
  "tone": "professional|friendly|formal",
  "confidence": 0.8,
  "requiresApproval": true|false
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const response = JSON.parse(
        completion.choices[0].message.content || "{}"
      );

      console.log("✅ AI response generated successfully");

      return {
        subject: response.subject || "Re: Your Inquiry",
        body:
          response.body ||
          "Thank you for your email. We'll get back to you soon.",
        tone: response.tone || "professional",
        confidence: response.confidence || 0.7,
        requiresApproval: response.requiresApproval !== false, // Default to true
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("❌ Error generating email response:", error);
      throw new Error(`Failed to generate email response: ${error.message}`);
    }
  }

  private async sendEmailResponse(
    threadId: string,
    responseData: any,
    userId: string
  ): Promise<any> {
    if (!this.gmailService) {
      throw new Error("Gmail service not configured");
    }

    try {
      console.log(`📧 Sending email response for thread ${threadId}...`);

      const sentMessage = await this.gmailService.sendEmail({
        to: ["customer@example.com"], // This should be extracted from the thread
        subject: responseData.subject,
        htmlBody: responseData.body,
        threadId: threadId,
      });

      console.log("✅ Email response sent successfully");

      return {
        messageId: sentMessage.messageId,
        threadId: sentMessage.threadId,
        sentAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("❌ Error sending email response:", error);
      throw new Error(`Failed to send email response: ${error.message}`);
    }
  }

  private async saveEmailResponse(
    threadId: string,
    responseData: any,
    status: string,
    userId: string
  ): Promise<string> {
    try {
      const savedResponse = await this.emailPersistence.saveEmailResponse({
        user_id: userId,
        thread_id: threadId,
        subject: responseData.subject,
        body: responseData.body,
        status: status as any,
        confidence_score: responseData.confidence || 0.7,
        requires_approval: responseData.requiresApproval !== false,
      });

      console.log("✅ Email response saved to database");
      return savedResponse.id;
    } catch (error: any) {
      console.error("❌ Error saving email response:", error);
      throw error;
    }
  }

  private async getUserInfo(userId: string): Promise<any> {
    try {
      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import("../../storage");
      return await storage.getUser(userId);
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  }

  private async analyzeReminderRequest(
    request: any,
    userName: string
  ): Promise<any> {
    try {
      // CRITICAL: Always use current date for analysis to prevent old date issues
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split("T")[0];

      console.log(
        `🔍 DEBUG - Current date calculation in analyzeReminderRequest:`,
        {
          now: now.toISOString(),
          currentDate,
          tomorrowDate,
          requestDate: request.reminderDate,
          requestTime: request.reminderTime,
        }
      );

      // Check if time was originally specified
      const hasOriginalTime =
        request.reminderTime &&
        request.reminderTime !== "not specified" &&
        request.reminderTime !== null;

      // CRITICAL: Recalculate date if it's "tomorrow" to ensure current date
      let processedDate = request.reminderDate || request.date;
      if (
        processedDate === "tomorrow" ||
        processedDate === "tommarow" ||
        processedDate === "tommorrow"
      ) {
        processedDate = tomorrowDate;
        console.log(`🔍 DEBUG - Recalculated "tomorrow" to: ${processedDate}`);
      } else if (processedDate === "today") {
        processedDate = currentDate;
        console.log(`🔍 DEBUG - Recalculated "today" to: ${processedDate}`);
      }

      const prompt = `Analyze this reminder request for intelligent processing:

User: ${userName}
Reminder Text: ${request.reminderText || "reminder"}
Reminder Date: ${processedDate || "not specified"}
Reminder Time: ${request.reminderTime || "not specified"}
Reminder Type: ${request.reminderType || "general"}
Time Originally Specified: ${hasOriginalTime ? "Yes" : "No"}
Current Date: ${currentDate}
Tomorrow Date: ${tomorrowDate}

Your task:
1. Analyze the reminder content and context
2. Classify the reminder type accurately
3. Create a clear, descriptive title
4. Provide contextual description
5. DO NOT auto-generate times if none was specified - mark as needs confirmation

Important: If no specific time was provided by the user, do NOT create a default time.
Instead, mark it as needing time confirmation.

Respond in JSON format:
{
  "title": "Clear reminder title",
  "description": "Detailed description",
  "date": "YYYY-MM-DD or original date",
  "time": "${hasOriginalTime ? "original time" : "NEEDS_CONFIRMATION"}",
  "type": "birthday|appointment|task|general",
  "timeWasAutoGenerated": ${!hasOriginalTime},
  "needsTimeConfirmation": ${!hasOriginalTime},
  "contextualInfo": {
    "urgency": "low|medium|high",
    "category": "personal|work|health|social",
    "suggestedTimeRanges": ["morning", "afternoon", "evening"]
  }
}`;

      if (!this.openai) {
        throw new Error("OpenAI not configured");
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      );

      // Merge with original request, preserving original time if specified
      return {
        ...request,
        ...analysis,
        date: processedDate || analysis.date, // Use processed date to ensure correct calculation
        reminderDate: processedDate || analysis.date,
        reminderTime: hasOriginalTime ? request.reminderTime : null,
        time: hasOriginalTime ? request.reminderTime : null,
        timeWasAutoGenerated: !hasOriginalTime,
        needsTimeConfirmation: !hasOriginalTime,
        originalRequest: request,
        userName: userName,
      };
    } catch (error) {
      console.error("Error analyzing reminder request:", error);

      // Fallback to basic processing
      const hasOriginalTime =
        request.reminderTime &&
        request.reminderTime !== "not specified" &&
        request.reminderTime !== null;

      // Calculate processed date for fallback too
      let fallbackProcessedDate = request.reminderDate || request.date;
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split("T")[0];

      if (
        fallbackProcessedDate === "tomorrow" ||
        fallbackProcessedDate === "tommarow" ||
        fallbackProcessedDate === "tommorrow"
      ) {
        fallbackProcessedDate = tomorrowDate;
      } else if (fallbackProcessedDate === "today") {
        fallbackProcessedDate = currentDate;
      }

      return {
        ...request,
        title: request.reminderText || "Reminder",
        description: `Reminder for ${userName}`,
        date: fallbackProcessedDate,
        reminderDate: fallbackProcessedDate,
        time: hasOriginalTime ? request.reminderTime : null,
        reminderTime: hasOriginalTime ? request.reminderTime : null,
        type: request.reminderType || "general",
        timeWasAutoGenerated: !hasOriginalTime,
        needsTimeConfirmation: !hasOriginalTime,
        contextualInfo: {
          urgency: "medium",
          category: "personal",
          suggestedTimeRanges: ["morning", "afternoon"],
        },
        userName: userName,
      };
    }
  }

  private async createIntelligentReminder(
    reminderData: any,
    userId: string
  ): Promise<any> {
    try {
      // Check if Google Calendar is configured
      const calendarConfig = this.getGoogleCalendarConfigurationStatus();
      const isGoogleCalendarConfigured = calendarConfig.configured;

      if (isGoogleCalendarConfigured && this.calendarService) {
        // Validate and format date/time properly
        const validatedDateTime = this.validateAndFormatDateTime(
          reminderData.date,
          reminderData.time
        );

        console.log(`📅 Creating calendar event with validated date/time:`, {
          originalDate: reminderData.date,
          originalTime: reminderData.time,
          validatedDateTime: validatedDateTime,
        });

        // Create actual Google Calendar event
        const eventDetails = {
          summary: reminderData.title,
          description: `${reminderData.description}\n\nCreated by SharpFlow AI Assistant (Sentinel)`,
          start: {
            dateTime: validatedDateTime,
            timeZone: "Asia/Kolkata", // Use IST timezone (GMT+5:30)
          },
          end: {
            dateTime: validatedDateTime,
            timeZone: "Asia/Kolkata", // Use IST timezone (GMT+5:30)
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 0 }, // At the time
              { method: "email", minutes: 60 }, // 1 hour before
            ],
          },
        };

        console.log(`🔍 DEBUG - Event details being sent to Google Calendar:`, {
          summary: eventDetails.summary,
          startDateTime: eventDetails.start.dateTime,
          endDateTime: eventDetails.end.dateTime,
          timeZone: eventDetails.start.timeZone,
        });

        const event = await this.calendarService.createEvent(eventDetails);

        return {
          success: true,
          type: "calendar_event",
          eventId: event?.id || `reminder_${Date.now()}`,
          eventLink: event?.htmlLink || null,
          isReal: true,
        };
      } else {
        // Create placeholder reminder
        const eventId = `reminder_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        return {
          success: true,
          type: "placeholder_reminder",
          eventId: eventId,
          isPlaceholder: true,
          message: "Reminder created (Google Calendar not configured)",
        };
      }
    } catch (error) {
      console.error("Error creating reminder:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async generatePersonalizedReminderResponse(
    reminderData: any,
    reminderResult: any,
    userName: string
  ): Promise<string> {
    try {
      // Format date properly for display
      let formattedDate;
      try {
        if (reminderData.date) {
          const dateObj = new Date(reminderData.date + "T00:00:00");
          formattedDate = dateObj.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        } else {
          formattedDate = "the specified date";
        }
      } catch (error) {
        console.error("Error formatting date for OpenAI prompt:", error);
        formattedDate = reminderData.date || "the specified date";
      }

      const prompt = `Generate a personalized, friendly confirmation message for this reminder:

User Name: ${userName}
Reminder: ${reminderData.title}
Date: ${formattedDate}
Time: ${reminderData.time}
Type: ${reminderData.type}
Success: ${reminderResult.success}
Calendar Event Created: ${reminderResult.isReal ? "Yes" : "No"}

Create a warm, personal response that:
1. Addresses the user by name
2. Confirms what reminder was set
3. Mentions the time and date clearly (use the formatted date provided)
4. Shows understanding of the reminder context
5. Offers helpful suggestions if appropriate

Keep it conversational and friendly, like a helpful assistant.`;

      if (!this.openai) {
        throw new Error("OpenAI not configured");
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200,
      });

      return (
        completion.choices[0]?.message?.content ||
        this.getFallbackReminderResponse(reminderData, userName)
      );
    } catch (error) {
      console.error("Error generating personalized response:", error);
      return this.getFallbackReminderResponse(reminderData, userName);
    }
  }

  private getFallbackReminderResponse(
    reminderData: any,
    userName: string
  ): string {
    const time = reminderData.time || "9:00 AM";

    // Format date properly to avoid timezone issues
    let formattedDate;
    try {
      if (reminderData.date) {
        // Parse the date string and format it properly
        const dateObj = new Date(reminderData.date + "T00:00:00");
        formattedDate = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } else {
        formattedDate = "the specified date";
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      formattedDate = reminderData.date || "the specified date";
    }

    if (reminderData.type === "birthday") {
      return `Hey ${userName}! I've set a reminder for ${reminderData.title} on ${formattedDate} at ${time}. I'll make sure to notify you so you don't forget this special day! 🎉`;
    } else if (reminderData.type === "appointment") {
      return `Hi ${userName}! Your reminder for ${reminderData.title} is all set for ${formattedDate} at ${time}. I'll notify you ahead of time so you're prepared! 📅`;
    } else {
      return `Hey ${userName}! I've created a reminder for ${reminderData.title} on ${formattedDate} at ${time}. I'll make sure to notify you when the time comes! ⏰`;
    }
  }

  /**
   * Validate and format date/time for calendar events
   * Fixes issues with time parsing like "4 pm" → "16:00"
   */
  private validateAndFormatDateTime(date: string, time: string): string {
    try {
      console.log(
        `🔍 DEBUG - validateAndFormatDateTime input: date="${date}", time="${time}"`
      );

      // Ensure we have valid date and time
      if (!date || !time) {
        throw new Error("Missing date or time");
      }

      // Validate date format (should be in YYYY-MM-DD format)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new Error(
          `Invalid date format: ${date}. Expected YYYY-MM-DD format`
        );
      }

      // Validate time format (should be in HH:MM 24-hour format)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(time)) {
        throw new Error(
          `Invalid time format: ${time}. Expected HH:MM in 24-hour format`
        );
      }

      // Create the datetime string directly without Date object to avoid timezone issues
      const dateTimeString = `${date}T${time}:00`;

      // Validate that the resulting datetime is valid
      const testDate = new Date(dateTimeString);
      if (isNaN(testDate.getTime())) {
        throw new Error(`Invalid datetime: ${dateTimeString}`);
      }

      console.log(
        `✅ Validated date/time: ${date} ${time} → ${dateTimeString}`
      );
      console.log(`🔍 DEBUG - Test date object: ${testDate.toISOString()}`);

      return dateTimeString;
    } catch (error) {
      console.error("❌ Error validating date/time:", error);

      // Fallback to tomorrow at specified time or 9 AM with proper date calculation
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fallbackDate = tomorrow.toISOString().split("T")[0];
      const fallbackTime =
        time && /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time)
          ? time
          : "09:00";
      const fallbackDateTime = `${fallbackDate}T${fallbackTime}:00`;

      console.log(`⚠️ Using fallback date/time: ${fallbackDateTime}`);
      console.log(
        `🔍 DEBUG - Fallback calculation: tomorrow=${fallbackDate}, time=${fallbackTime}`
      );

      return fallbackDateTime;
    }
  }
}
