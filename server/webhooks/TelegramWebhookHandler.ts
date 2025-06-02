import express from "express";
import { supabase } from "../db";
// import { AgentJobQueue } from "../queue/AgentJobQueue";
// import { WebSocketManager } from "../websocket/WebSocketManager";

const router = express.Router();

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  voice?: {
    file_id: string;
    duration: number;
  };
}

interface TelegramWebhookPayload {
  update_id: number;
  message?: TelegramMessage;
}

// Telegram Bot Token - should be in environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Store user sessions for conversation context
const userSessions = new Map<
  number,
  {
    userId: string;
    conversationState:
      | "idle"
      | "awaiting_lead_criteria"
      | "awaiting_research_url";
    lastActivity: Date;
  }
>();

// Webhook endpoint for Telegram
router.post("/telegram", async (req, res) => {
  try {
    const payload: TelegramWebhookPayload = req.body;

    if (!payload.message) {
      return res.status(200).json({ ok: true });
    }

    const message = payload.message;
    const telegramUserId = message.from.id;
    const chatId = message.chat.id;
    const messageText = message.text || "";

    // Check if this is a verification code (6 digits)
    if (/^\d{6}$/.test(messageText.trim())) {
      await handleVerificationCode(
        chatId,
        messageText.trim(),
        telegramUserId,
        message.from.username
      );
      return res.status(200).json({ ok: true });
    }

    // Get or create user session
    let session = userSessions.get(telegramUserId);
    if (!session) {
      // Find user by Telegram ID or create new session
      const user = await findUserByTelegramId(telegramUserId);
      if (!user) {
        await sendTelegramMessage(
          chatId,
          "Welcome to SharpFlow! Please link your account by visiting your dashboard settings and connecting your Telegram account."
        );
        return res.status(200).json({ ok: true });
      }

      session = {
        userId: user.id,
        conversationState: "idle",
        lastActivity: new Date(),
      };
      userSessions.set(telegramUserId, session);
    }

    // Update last activity
    session.lastActivity = new Date();

    // Process the message based on conversation state
    await processMessage(chatId, messageText, session);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function processMessage(
  chatId: number,
  messageText: string,
  session: { userId: string; conversationState: string; lastActivity: Date }
) {
  const lowerText = messageText.toLowerCase();

  // Handle commands
  if (lowerText.startsWith("/start")) {
    await sendTelegramMessage(
      chatId,
      "🚀 Welcome to SharpFlow Lead Generation!\n\n" +
        "Available commands:\n" +
        "• 'generate leads' - Start lead generation\n" +
        "• 'research profile' - Generate research report\n" +
        "• 'status' - Check your current usage\n" +
        "• 'help' - Show this help message"
    );
    return;
  }

  if (lowerText.includes("help")) {
    await sendTelegramMessage(
      chatId,
      "📋 SharpFlow Commands:\n\n" +
        "🔍 Lead Generation:\n" +
        "Say 'generate leads' and I'll help you find prospects\n\n" +
        "📊 Research Reports:\n" +
        "Say 'research profile' and provide a LinkedIn URL\n\n" +
        "📈 Status Check:\n" +
        "Say 'status' to see your current usage and limits\n\n" +
        "💡 Just describe what you need in natural language!"
    );
    return;
  }

  if (lowerText.includes("status")) {
    await handleStatusRequest(chatId, session.userId);
    return;
  }

  // Handle conversation states
  switch (session.conversationState) {
    case "idle":
      await handleIdleState(chatId, messageText, session);
      break;
    case "awaiting_lead_criteria":
      await handleLeadCriteriaInput(chatId, messageText, session);
      break;
    case "awaiting_research_url":
      await handleResearchUrlInput(chatId, messageText, session);
      break;
  }
}

async function handleIdleState(
  chatId: number,
  messageText: string,
  session: any
) {
  const lowerText = messageText.toLowerCase();

  if (lowerText.includes("generate") && lowerText.includes("lead")) {
    // Check user's plan and limits
    const canGenerate = await checkLeadGenerationLimits(session.userId);
    if (!canGenerate.allowed) {
      await sendTelegramMessage(
        chatId,
        `❌ ${canGenerate.reason}\n\n` +
          `Current usage: ${canGenerate.current}/${canGenerate.limit} leads this month\n\n` +
          "Upgrade your plan at: https://sharpflow.com/pricing"
      );
      return;
    }

    session.conversationState = "awaiting_lead_criteria";
    await sendTelegramMessage(
      chatId,
      "🎯 Let's generate some leads!\n\n" +
        "Please provide your search criteria in this format:\n\n" +
        "**Locations:** San Francisco, New York\n" +
        "**Industries:** Technology, SaaS\n" +
        "**Job Titles:** CEO, Founder, CTO\n\n" +
        "Or just describe what you're looking for in natural language!"
    );
  } else if (
    lowerText.includes("research") &&
    (lowerText.includes("profile") || lowerText.includes("report"))
  ) {
    // Check user's plan for research access
    const hasAccess = await checkResearchAccess(session.userId);
    if (!hasAccess.allowed) {
      await sendTelegramMessage(
        chatId,
        `❌ ${hasAccess.reason}\n\n` +
          "Research reports require Professional or Ultra plan.\n\n" +
          "Upgrade at: https://sharpflow.com/pricing"
      );
      return;
    }

    session.conversationState = "awaiting_research_url";
    await sendTelegramMessage(
      chatId,
      "📊 Let's create a research report!\n\n" +
        "Please provide the LinkedIn profile URL you'd like me to research.\n\n" +
        "Example: https://linkedin.com/in/johndoe"
    );
  } else {
    // Use AI to understand the intent
    await handleNaturalLanguageInput(chatId, messageText, session);
  }
}

async function handleLeadCriteriaInput(
  chatId: number,
  messageText: string,
  session: any
) {
  try {
    // Parse the criteria using AI or regex
    const criteria = await parseLeadCriteria(messageText);

    if (
      !criteria.locations.length ||
      !criteria.businesses.length ||
      !criteria.jobTitles.length
    ) {
      await sendTelegramMessage(
        chatId,
        "❌ I couldn't parse your criteria properly.\n\n" +
          "Please provide:\n" +
          "• At least one location\n" +
          "• At least one industry/business type\n" +
          "• At least one job title\n\n" +
          "Try again with a clearer format!"
      );
      return;
    }

    // Execute user's personal n8n workflow
    await executeN8nWorkflow(
      session.userId,
      "lead_generation",
      criteria,
      chatId
    );

    await sendTelegramMessage(
      chatId,
      "🚀 Starting lead generation...\n\n" +
        `📍 Locations: ${criteria.locations.join(", ")}\n` +
        `🏢 Industries: ${criteria.businesses.join(", ")}\n` +
        `👔 Job Titles: ${criteria.jobTitles.join(", ")}\n\n` +
        "I'll notify you when the leads are ready! You can also check your dashboard for real-time updates."
    );

    // Reset conversation state
    session.conversationState = "idle";
  } catch (error) {
    console.error("Lead criteria parsing error:", error);
    await sendTelegramMessage(
      chatId,
      "❌ Something went wrong processing your request. Please try again."
    );
  }
}

async function handleResearchUrlInput(
  chatId: number,
  messageText: string,
  session: any
) {
  try {
    // Extract LinkedIn URL
    const linkedinUrl = extractLinkedInUrl(messageText);

    if (!linkedinUrl) {
      await sendTelegramMessage(
        chatId,
        "❌ Please provide a valid LinkedIn profile URL.\n\n" +
          "Example: https://linkedin.com/in/johndoe"
      );
      return;
    }

    // Check if we already have this lead
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, full_name")
      .eq("user_id", session.userId)
      .eq("linkedin_url", linkedinUrl)
      .single();

    let leadId = existingLead?.id;

    if (!existingLead) {
      // Create a new lead record
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          user_id: session.userId,
          linkedin_url: linkedinUrl,
          lead_status: "new",
          source: "telegram",
        })
        .select()
        .single();

      leadId = newLead?.id;
    }

    await sendTelegramMessage(
      chatId,
      "📊 Starting research report generation...\n\n" +
        `🔗 LinkedIn URL: ${linkedinUrl}\n\n` +
        "This may take a few minutes. I'll notify you when it's ready! " +
        "You can also check your dashboard for real-time updates."
    );

    // Add research job to queue (temporarily disabled for testing)
    // const jobId = await AgentJobQueue.addResearchJob(
    //   session.userId,
    //   leadId,
    //   linkedinUrl
    // );

    // Send real-time update to dashboard (temporarily disabled for testing)
    // WebSocketManager.broadcastToUser(session.userId, {
    //   type: "job_started",
    //   data: {
    //     jobId,
    //     agentType: "research",
    //     status: "pending",
    //     leadId,
    //     linkedinUrl,
    //   },
    // });

    // Reset conversation state
    session.conversationState = "idle";
  } catch (error) {
    console.error("Research URL processing error:", error);
    await sendTelegramMessage(
      chatId,
      "❌ Something went wrong processing your request. Please try again."
    );
  }
}

async function handleNaturalLanguageInput(
  chatId: number,
  messageText: string,
  session: any
) {
  // Simple keyword matching - could be enhanced with AI
  const lowerText = messageText.toLowerCase();

  if (
    lowerText.includes("lead") ||
    lowerText.includes("prospect") ||
    lowerText.includes("find")
  ) {
    await sendTelegramMessage(
      chatId,
      "🔍 It sounds like you want to generate leads!\n\n" +
        "Say 'generate leads' to get started."
    );
  } else if (
    lowerText.includes("research") ||
    lowerText.includes("report") ||
    lowerText.includes("linkedin")
  ) {
    await sendTelegramMessage(
      chatId,
      "📊 It sounds like you want a research report!\n\n" +
        "Say 'research profile' to get started."
    );
  } else {
    await sendTelegramMessage(
      chatId,
      "🤔 I'm not sure what you're looking for.\n\n" +
        "Try saying:\n" +
        "• 'generate leads' - to find new prospects\n" +
        "• 'research profile' - to analyze a LinkedIn profile\n" +
        "• 'help' - to see all available commands"
    );
  }
}

// n8n Workflow Execution
async function executeN8nWorkflow(
  userId: string,
  requestType: string,
  requestData: any,
  telegramChatId?: number
) {
  try {
    console.log(`🔄 Executing n8n workflow for user ${userId}: ${requestType}`);

    // Get user's n8n configuration
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("n8n_webhook_url, n8n_api_key, n8n_workflow_id, n8n_status")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error(`❌ User configuration not found for ${userId}`);
      if (telegramChatId) {
        await sendTelegramMessage(
          telegramChatId,
          "❌ **Configuration Error**\n\n" +
            "Your n8n workflow is not configured. Please visit your dashboard to set up your personal workflow."
        );
      }
      return { success: false, error: "User configuration not found" };
    }

    if (user.n8n_status !== "active" || !user.n8n_webhook_url) {
      console.error(`❌ n8n workflow not active for user ${userId}`);
      if (telegramChatId) {
        await sendTelegramMessage(
          telegramChatId,
          "❌ **Workflow Not Active**\n\n" +
            "Your n8n workflow is not configured or inactive. Please visit your dashboard to configure your workflow."
        );
      }
      return { success: false, error: "Workflow not active" };
    }

    // Create workflow log entry
    const { data: logEntry, error: logError } = await supabase
      .from("n8n_workflow_logs")
      .insert({
        user_id: userId,
        request_type: requestType,
        request_data: requestData,
        telegram_message_id: telegramChatId,
        n8n_webhook_url: user.n8n_webhook_url,
        status: "pending",
      })
      .select()
      .single();

    if (logError) {
      console.error("❌ Failed to create workflow log:", logError);
      return { success: false, error: "Failed to create log" };
    }

    // Prepare payload for n8n
    const n8nPayload = {
      type: requestType,
      data: requestData,
      user: {
        id: userId,
        sharpflow_log_id: logEntry.id,
        telegram_chat_id: telegramChatId,
      },
      callback_url: `${
        process.env.BASE_URL || "http://localhost:3000"
      }/api/n8n/webhook-response`,
      timestamp: new Date().toISOString(),
    };

    const headers: any = {
      "Content-Type": "application/json",
      "User-Agent": "SharpFlow-TelegramBot/1.0",
      "X-SharpFlow-User-ID": userId,
      "X-SharpFlow-Log-ID": logEntry.id,
    };

    if (user.n8n_api_key) {
      headers["Authorization"] = `Bearer ${user.n8n_api_key}`;
    }

    // Send request to user's n8n workflow
    const response = await fetch(user.n8n_webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify(n8nPayload),
    });

    if (response.ok) {
      const responseData = await response.json();

      // Update log with n8n execution ID if provided
      if (responseData.executionId) {
        await supabase
          .from("n8n_workflow_logs")
          .update({
            n8n_execution_id: responseData.executionId,
            status: "processing",
          })
          .eq("id", logEntry.id);
      }

      console.log(`✅ n8n workflow executed successfully for user ${userId}`);
      return {
        success: true,
        logId: logEntry.id,
        executionId: responseData.executionId,
      };
    } else {
      // Update log with error
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      await supabase
        .from("n8n_workflow_logs")
        .update({
          status: "failed",
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);

      console.error(
        `❌ n8n workflow execution failed for user ${userId}: ${errorMessage}`
      );

      if (telegramChatId) {
        await sendTelegramMessage(
          telegramChatId,
          "❌ **Workflow Execution Failed**\n\n" +
            "There was an error executing your workflow. Please check your n8n configuration or contact support."
        );
      }

      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error("❌ Error executing n8n workflow:", error);

    if (telegramChatId) {
      await sendTelegramMessage(
        telegramChatId,
        "❌ **System Error**\n\n" +
          "An unexpected error occurred. Please try again later or contact support."
      );
    }

    return { success: false, error: "System error" };
  }
}

// Helper functions
async function handleVerificationCode(
  chatId: number,
  code: string,
  telegramUserId: number,
  username?: string
) {
  try {
    console.log(
      `🔍 Processing verification code: ${code} from user ${telegramUserId}`
    );

    // Find verification code in database
    const { data: verification, error: verificationError } = await supabase
      .from("telegram_verification_codes")
      .select("*, users(*)")
      .eq("verification_code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .single();

    if (verificationError || !verification) {
      console.log(`❌ Verification code ${code} not found or expired`);
      await sendTelegramMessage(
        chatId,
        `❌ **Invalid Code**\n\n` +
          `The verification code is invalid or expired.\n\n` +
          `💡 **Generate a new code:**\n` +
          `1. Go to https://sharpflow.com/dashboard\n` +
          `2. Navigate to Telegram settings\n` +
          `3. Click "Generate Verification Code"\n` +
          `4. Send the new code here`
      );
      return;
    }

    console.log(
      `✅ Valid verification code found for user: ${verification.user_id}`
    );

    // Link the account
    const { error: linkError } = await supabase
      .from("users")
      .update({
        telegram_id: telegramUserId,
        telegram_username: username,
        telegram_linked_at: new Date().toISOString(),
      })
      .eq("id", verification.user_id);

    if (linkError) {
      console.error("❌ Error linking account:", linkError);
      await sendTelegramMessage(
        chatId,
        `❌ **Linking Failed**\n\n` +
          `There was an error linking your account. Please try again or contact support.`
      );
      return;
    }

    // Mark code as used
    await supabase
      .from("telegram_verification_codes")
      .update({ used: true })
      .eq("id", verification.id);

    const user = verification.users;
    const plan = user.subscription_plan || "starter";

    console.log(
      `🎉 Account linked successfully: ${user.email} -> Telegram ${telegramUserId}`
    );

    await sendTelegramMessage(
      chatId,
      `🎉 **Account Linked Successfully!**\n\n` +
        `✅ Your Telegram account is now connected to SharpFlow\n\n` +
        `👤 **Account:** ${user.first_name} ${user.last_name}\n` +
        `📧 **Email:** ${user.email}\n` +
        `📊 **Plan:** ${plan.charAt(0).toUpperCase() + plan.slice(1)}\n\n` +
        `🚀 **You can now:**\n` +
        `• Generate leads via Telegram\n` +
        `• Receive real-time notifications\n` +
        `• Access your dashboard data\n\n` +
        `💡 Type "help" to see available commands!`
    );
  } catch (error) {
    console.error("❌ Error handling verification code:", error);
    await sendTelegramMessage(
      chatId,
      `❌ **Linking Failed**\n\n` +
        `There was an error linking your account. Please try again or contact support.`
    );
  }
}

async function findUserByTelegramId(telegramId: number) {
  const { data: user } = await supabase
    .from("users")
    .select("id, subscription_plan")
    .eq("telegram_id", telegramId)
    .single();

  return user;
}

async function sendTelegramMessage(chatId: number, text: string) {
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

async function parseLeadCriteria(text: string) {
  // Enhanced parsing for both structured and natural language
  const lowerText = text.toLowerCase();

  // Try structured format first
  let locations = extractList(text, ["location", "city", "country", "region"]);
  let businesses = extractList(text, [
    "industry",
    "business",
    "company",
    "sector",
  ]);
  let jobTitles = extractList(text, ["title", "position", "role", "job"]);

  // If structured parsing failed, try natural language parsing
  if (
    locations.length === 0 ||
    businesses.length === 0 ||
    jobTitles.length === 0
  ) {
    // Parse natural language like "find leads in new york in restaurants with job title ceo"

    // Extract locations from natural language
    if (locations.length === 0) {
      // Try multiple patterns for location extraction
      let locationMatches = text.match(
        /(?:in|from|at)\s+([^,\n]+?)(?:\s+,?\s*in\s+|\s+with\s+|\s*,|\s*$)/gi
      );

      if (locationMatches) {
        locations = locationMatches
          .map((match) =>
            match
              .replace(/^(?:in|from|at)\s+/i, "")
              .replace(/\s+,?\s*(?:in|with)\s+.*$/i, "")
              .replace(/\s*,\s*$/, "")
              .trim()
          )
          .filter((loc) => loc.length > 0);
      }

      // If still no locations, try simpler pattern
      if (locations.length === 0) {
        const simpleLocationMatch = text.match(
          /(?:in|from|at)\s+([a-zA-Z\s]+?)(?:\s+,|\s+in\s+|\s*$)/i
        );
        if (simpleLocationMatch) {
          const locationText = simpleLocationMatch[1].trim();
          // Split by common separators
          locations = locationText
            .split(/\s+|,/)
            .filter((loc) => loc.length > 2);
        }
      }
    }

    // Extract industries/businesses
    if (businesses.length === 0) {
      const industryKeywords = [
        "restaurant",
        "restaurants",
        "hotel",
        "hotels",
        "hospitality",
        "technology",
        "tech",
        "saas",
        "software",
        "finance",
        "financial",
        "banking",
        "healthcare",
        "medical",
        "health",
        "retail",
        "e-commerce",
        "ecommerce",
        "manufacturing",
        "industrial",
        "consulting",
        "services",
        "marketing",
        "advertising",
        "real estate",
        "property",
        "education",
        "training",
        "construction",
        "building",
        "automotive",
        "transportation",
        "entertainment",
        "media",
        "fitness",
        "gym",
        "wellness",
      ];

      // First try direct keyword matching
      for (const keyword of industryKeywords) {
        if (lowerText.includes(keyword)) {
          businesses.push(keyword);
        }
      }

      // If no direct match, try pattern matching for "in [industry] industry"
      if (businesses.length === 0) {
        const industryMatch = text.match(
          /(?:in|for)\s+([a-zA-Z\s]+?)\s+industry/i
        );
        if (industryMatch) {
          businesses.push(industryMatch[1].trim());
        }
      }
    }

    // Extract job titles
    if (jobTitles.length === 0) {
      const titleKeywords = [
        "ceo",
        "founder",
        "cto",
        "cfo",
        "president",
        "director",
        "manager",
        "vp",
        "vice president",
        "owner",
        "partner",
      ];
      for (const title of titleKeywords) {
        if (lowerText.includes(title)) {
          jobTitles.push(title);
        }
      }
    }
  }

  // Remove duplicates and clean up
  const uniqueLocations = [
    ...new Set(locations.map((loc) => loc.toLowerCase())),
  ];
  const uniqueBusinesses = [
    ...new Set(businesses.map((biz) => biz.toLowerCase())),
  ];
  const uniqueJobTitles = [
    ...new Set(jobTitles.map((title) => title.toLowerCase())),
  ];

  return {
    locations: uniqueLocations,
    businesses: uniqueBusinesses,
    jobTitles: uniqueJobTitles,
  };
}

function extractList(text: string, keywords: string[]): string[] {
  const items: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    for (const keyword of keywords) {
      if (lowerLine.includes(keyword)) {
        const parts = line.split(":");
        if (parts.length > 1) {
          const values = parts[1]
            .split(",")
            .map((v) => v.trim().replace(/\s+/g, "+"));
          items.push(...values);
        }
      }
    }
  }

  return items.filter((item) => item.length > 0);
}

function extractLinkedInUrl(text: string): string | null {
  const linkedinRegex = /https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+/;
  const match = text.match(linkedinRegex);
  return match ? match[0] : null;
}

async function checkLeadGenerationLimits(userId: string) {
  // Implementation from LeadGenService
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("month_year", currentMonth)
    .single();

  const { data: user } = await supabase
    .from("users")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  const planLimits = {
    starter: 100,
    professional: 500,
    ultra: 1000,
  };

  const limit =
    planLimits[user?.subscription_plan as keyof typeof planLimits] || 100;
  const current = usage?.leads_generated || 0;
  const remaining = limit - current;

  return {
    allowed: remaining > 0,
    current,
    limit,
    remaining,
    reason: remaining <= 0 ? "Monthly lead generation limit exceeded" : "",
  };
}

async function checkResearchAccess(userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  const hasAccess = ["professional", "ultra"].includes(
    user?.subscription_plan || ""
  );

  return {
    allowed: hasAccess,
    reason: hasAccess
      ? ""
      : "Research reports require Professional or Ultra plan",
  };
}

async function handleStatusRequest(chatId: number, userId: string) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", currentMonth)
      .single();

    const { data: user } = await supabase
      .from("users")
      .select("subscription_plan")
      .eq("id", userId)
      .single();

    const plan = user?.subscription_plan || "starter";
    const planLimits = {
      starter: { leads: 100, research: 0, emails: 0 },
      professional: { leads: 500, research: 50, emails: 0 },
      ultra: { leads: 1000, research: 100, emails: 2000 },
    };

    const limits = planLimits[plan as keyof typeof planLimits];
    const current = {
      leads: usage?.leads_generated || 0,
      research: usage?.research_reports_created || 0,
      emails: usage?.emails_sent || 0,
    };

    await sendTelegramMessage(
      chatId,
      `📊 **Your SharpFlow Status**\n\n` +
        `💼 **Plan:** ${plan.charAt(0).toUpperCase() + plan.slice(1)}\n\n` +
        `🔍 **Lead Generation:** ${current.leads}/${limits.leads}\n` +
        `📊 **Research Reports:** ${current.research}/${limits.research}\n` +
        `📧 **Emails Sent:** ${current.emails}/${limits.emails}\n\n` +
        `📅 **Period:** ${new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}\n\n` +
        `🌐 **Dashboard:** https://sharpflow.com/dashboard`
    );
  } catch (error) {
    console.error("Status request error:", error);
    await sendTelegramMessage(
      chatId,
      "❌ Unable to fetch your status. Please try again later."
    );
  }
}

export default router;
