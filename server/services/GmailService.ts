import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
      size?: number;
    };
    parts?: Array<{
      mimeType?: string;
      body?: {
        data?: string;
        size?: number;
      };
    }>;
  };
  internalDate?: string;
  historyId?: string;
}

export interface GmailThread {
  id: string;
  historyId?: string;
  messages?: GmailMessage[];
}

export interface EmailSearchOptions {
  query?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
  includeSpamTrash?: boolean;
}

export interface EmailSendOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  threadId?: string;
  replyToMessageId?: string;
}

export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerDay: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Gmail Service for handling email operations using Gmail API
 * Provides methods for fetching, sending, and managing emails
 */
export class GmailService {
  private oauth2Client: OAuth2Client;
  private gmail: any;
  private credentials: GmailCredentials;
  private rateLimitConfig: RateLimitConfig;
  private retryConfig: RetryConfig;
  private requestCounts: {
    perSecond: { count: number; resetTime: number };
    perMinute: { count: number; resetTime: number };
    perDay: { count: number; resetTime: number };
  };

  constructor(
    credentials: GmailCredentials,
    rateLimitConfig?: RateLimitConfig,
    retryConfig?: RetryConfig
  ) {
    this.credentials = credentials;

    // Set default rate limiting configuration
    this.rateLimitConfig = rateLimitConfig || {
      maxRequestsPerSecond: 10,
      maxRequestsPerMinute: 250,
      maxRequestsPerDay: 1000000000, // Gmail API daily quota
    };

    // Set default retry configuration
    this.retryConfig = retryConfig || {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
    };

    // Initialize request counters
    this.requestCounts = {
      perSecond: { count: 0, resetTime: Date.now() + 1000 },
      perMinute: { count: 0, resetTime: Date.now() + 60000 },
      perDay: { count: 0, resetTime: Date.now() + 86400000 },
    };

    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      "http://localhost:3000/api/auth/google/callback"
    );

    this.oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counters if time windows have passed
    if (now >= this.requestCounts.perSecond.resetTime) {
      this.requestCounts.perSecond = { count: 0, resetTime: now + 1000 };
    }
    if (now >= this.requestCounts.perMinute.resetTime) {
      this.requestCounts.perMinute = { count: 0, resetTime: now + 60000 };
    }
    if (now >= this.requestCounts.perDay.resetTime) {
      this.requestCounts.perDay = { count: 0, resetTime: now + 86400000 };
    }

    // Check if we've exceeded any rate limits
    if (
      this.requestCounts.perSecond.count >=
      this.rateLimitConfig.maxRequestsPerSecond
    ) {
      const waitTime = this.requestCounts.perSecond.resetTime - now;
      console.log(`⏱️ Rate limit exceeded (per second), waiting ${waitTime}ms`);
      await this.delay(waitTime);
      return this.checkRateLimit(); // Recheck after waiting
    }

    if (
      this.requestCounts.perMinute.count >=
      this.rateLimitConfig.maxRequestsPerMinute
    ) {
      const waitTime = this.requestCounts.perMinute.resetTime - now;
      console.log(`⏱️ Rate limit exceeded (per minute), waiting ${waitTime}ms`);
      await this.delay(waitTime);
      return this.checkRateLimit(); // Recheck after waiting
    }

    if (
      this.requestCounts.perDay.count >= this.rateLimitConfig.maxRequestsPerDay
    ) {
      const waitTime = this.requestCounts.perDay.resetTime - now;
      console.log(`⏱️ Rate limit exceeded (per day), waiting ${waitTime}ms`);
      await this.delay(waitTime);
      return this.checkRateLimit(); // Recheck after waiting
    }

    // Increment counters
    this.requestCounts.perSecond.count++;
    this.requestCounts.perMinute.count++;
    this.requestCounts.perDay.count++;
  }

  /**
   * Execute API call with retry logic and rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Check rate limits before making the request
        await this.checkRateLimit();

        console.log(
          `📧 Executing ${operationName} (attempt ${attempt + 1}/${
            this.retryConfig.maxRetries + 1
          })`
        );

        const result = await operation();

        if (attempt > 0) {
          console.log(
            `✅ ${operationName} succeeded after ${attempt + 1} attempts`
          );
        }

        return result;
      } catch (error: any) {
        lastError = error;

        console.error(
          `❌ ${operationName} failed (attempt ${attempt + 1}):`,
          error.message
        );

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          console.log(
            `🚫 Non-retryable error for ${operationName}, not retrying`
          );
          throw error;
        }

        // Don't retry if this was the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          console.log(`🚫 Max retries reached for ${operationName}`);
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay *
            Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );

        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await this.delay(delay);
      }
    }

    throw (
      lastError ||
      new Error(
        `Operation ${operationName} failed after ${
          this.retryConfig.maxRetries + 1
        } attempts`
      )
    );
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    // Don't retry on authentication errors
    if (error.code === 401 || error.message?.includes("authentication")) {
      return true;
    }

    // Don't retry on permission errors
    if (error.code === 403 && !error.message?.includes("rate limit")) {
      return true;
    }

    // Don't retry on bad request errors
    if (error.code === 400) {
      return true;
    }

    return false;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test Gmail API connection
   */
  async testConnection(): Promise<{
    connected: boolean;
    status: string;
    error?: string;
  }> {
    try {
      console.log("📧 Testing Gmail API connection...");

      const response = (await this.executeWithRetry(
        () => this.gmail.users.getProfile({ userId: "me" }),
        "Gmail connection test"
      )) as any;

      if (response.data) {
        console.log("✅ Gmail API connection successful");
        return {
          connected: true,
          status: `Connected to Gmail API for ${response.data.emailAddress}`,
        };
      } else {
        return {
          connected: false,
          status: "Gmail API connection failed - no profile data",
        };
      }
    } catch (error: any) {
      console.error("❌ Gmail API connection failed:", error.message);
      return {
        connected: false,
        status: "Gmail API connection failed",
        error: error.message,
      };
    }
  }

  /**
   * Get new emails since a specific timestamp
   */
  async getNewEmails(
    sinceTimestamp?: Date,
    options: EmailSearchOptions = {}
  ): Promise<GmailMessage[]> {
    try {
      console.log("📧 Fetching new emails from Gmail API...");

      // Build search query
      let query = options.query || "";

      // Add timestamp filter if provided
      if (sinceTimestamp) {
        const timestamp = Math.floor(sinceTimestamp.getTime() / 1000);
        query += ` after:${timestamp}`;
      }

      // Add default filters to exclude spam and trash
      if (!options.includeSpamTrash) {
        query += " -in:spam -in:trash";
      }

      // Only get unread emails by default
      if (!query.includes("is:read") && !query.includes("is:unread")) {
        query += " is:unread";
      }

      console.log(`📧 Gmail search query: "${query}"`);

      const response = (await this.executeWithRetry(
        () =>
          this.gmail.users.messages.list({
            userId: "me",
            q: query.trim(),
            maxResults: options.maxResults || 50,
            pageToken: options.pageToken,
            labelIds: options.labelIds,
          }),
        "Gmail messages list"
      )) as any;

      if (!response.data.messages || response.data.messages.length === 0) {
        console.log("📧 No new emails found");
        return [];
      }

      console.log(`📧 Found ${response.data.messages.length} new emails`);

      // Fetch full message details for each email
      const emails: GmailMessage[] = [];
      for (const message of response.data.messages) {
        try {
          const fullMessage = await this.getMessageById(message.id);
          if (fullMessage) {
            emails.push(fullMessage);
          }
        } catch (error) {
          console.error(`❌ Error fetching message ${message.id}:`, error);
          // Continue with other messages
        }
      }

      console.log(`✅ Successfully fetched ${emails.length} email details`);
      return emails;
    } catch (error: any) {
      console.error("❌ Error fetching new emails:", error);

      // Handle specific Gmail API errors
      if (error.code === 401) {
        throw new Error(
          "Gmail API authentication failed. Please check credentials."
        );
      } else if (error.code === 403) {
        throw new Error(
          "Gmail API access forbidden. Please check permissions."
        );
      } else if (error.code === 429) {
        throw new Error(
          "Gmail API rate limit exceeded. Please try again later."
        );
      }

      throw new Error(`Failed to fetch new emails: ${error.message}`);
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(messageId: string): Promise<GmailMessage | null> {
    try {
      const response = (await this.executeWithRetry(
        () =>
          this.gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full", // Get full message including body
          }),
        `Gmail get message ${messageId}`
      )) as any;

      return response.data as GmailMessage;
    } catch (error: any) {
      console.error(`❌ Error fetching message ${messageId}:`, error.message);
      return null;
    }
  }

  /**
   * Get a complete email thread by thread ID
   */
  async getThreadById(threadId: string): Promise<GmailThread | null> {
    try {
      console.log(`📧 Fetching thread ${threadId}...`);

      const response = (await this.executeWithRetry(
        () =>
          this.gmail.users.threads.get({
            userId: "me",
            id: threadId,
            format: "full",
          }),
        `Gmail get thread ${threadId}`
      )) as any;

      console.log(
        `✅ Fetched thread with ${response.data.messages?.length || 0} messages`
      );
      return response.data as GmailThread;
    } catch (error: any) {
      console.error(`❌ Error fetching thread ${threadId}:`, error.message);
      return null;
    }
  }

  /**
   * Extract email content from Gmail message payload
   */
  extractEmailContent(message: GmailMessage): {
    from: string;
    to: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    date: string;
  } {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ||
      "";

    let textBody = "";
    let htmlBody = "";

    // Extract body content
    if (message.payload?.body?.data) {
      // Simple message body
      textBody = Buffer.from(message.payload.body.data, "base64").toString(
        "utf-8"
      );
    } else if (message.payload?.parts) {
      // Multipart message
      for (const part of message.payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          textBody = Buffer.from(part.body.data, "base64").toString("utf-8");
        } else if (part.mimeType === "text/html" && part.body?.data) {
          htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
    }

    return {
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      textBody,
      htmlBody,
      date: getHeader("Date"),
    };
  }

  /**
   * Send an email
   */
  async sendEmail(
    options: EmailSendOptions
  ): Promise<{ messageId: string; threadId?: string }> {
    try {
      console.log(`📧 Sending email to ${options.to.join(", ")}...`);

      // Build email message
      const messageParts = [
        `To: ${options.to.join(", ")}`,
        options.cc?.length ? `Cc: ${options.cc.join(", ")}` : "",
        options.bcc?.length ? `Bcc: ${options.bcc.join(", ")}` : "",
        `Subject: ${options.subject}`,
        "Content-Type: text/html; charset=utf-8",
        "",
        options.htmlBody || options.textBody || "",
      ].filter(Boolean);

      const message = messageParts.join("\n");
      const encodedMessage = Buffer.from(message).toString("base64url");

      const requestBody: any = {
        raw: encodedMessage,
      };

      // Add thread ID for replies
      if (options.threadId) {
        requestBody.threadId = options.threadId;
      }

      const response = (await this.executeWithRetry(
        () =>
          this.gmail.users.messages.send({
            userId: "me",
            requestBody,
          }),
        `Gmail send email to ${options.to.join(", ")}`
      )) as any;

      console.log(
        `✅ Email sent successfully. Message ID: ${response.data.id}`
      );

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
      };
    } catch (error: any) {
      console.error("❌ Error sending email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    try {
      await this.executeWithRetry(
        () =>
          this.gmail.users.messages.batchModify({
            userId: "me",
            requestBody: {
              ids: messageIds,
              removeLabelIds: ["UNREAD"],
            },
          }),
        `Gmail mark ${messageIds.length} messages as read`
      );

      console.log(`✅ Marked ${messageIds.length} messages as read`);
    } catch (error: any) {
      console.error("❌ Error marking messages as read:", error);
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }
  }
}
