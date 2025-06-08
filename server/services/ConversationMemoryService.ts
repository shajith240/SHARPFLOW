import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";

export interface ConversationSession {
  id: string;
  userId: string;
  agentType: "falcon" | "sage" | "sentinel" | "prism";
  sessionTitle: string;
  status: "active" | "completed" | "archived" | "paused";
  contextSummary?: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  userId: string;
  agentType: "falcon" | "sage" | "sentinel" | "prism";
  role: "user" | "assistant" | "system";
  content: string;
  messageType: "chat" | "command" | "result" | "error" | "system";
  contextData: Record<string, any>;
  parentMessageId?: string;
  isContextRelevant: boolean;
  tokenCount: number;
  createdAt: Date;
}

export interface AgentMemoryPreferences {
  id: string;
  userId: string;
  agentType: "falcon" | "sage" | "sentinel" | "prism";
  maxContextMessages: number;
  maxContextTokens: number;
  autoSummarizeThreshold: number;
  retainSystemMessages: boolean;
  retainErrorMessages: boolean;
  contextRelevanceThreshold: number;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  summary?: string;
  totalTokens: number;
  messageCount: number;
}

export class ConversationMemoryService {
  private openai: OpenAI | null;

  constructor() {
    // Initialize OpenAI for context summarization
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Get or create a conversation session for a user and agent
   */
  async getOrCreateSession(
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism",
    sessionId?: string
  ): Promise<ConversationSession> {
    try {
      // If sessionId provided, try to get existing session
      if (sessionId) {
        const { data: existingSession, error } = await supabase
          .from("conversation_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .eq("agent_type", agentType)
          .single();

        if (!error && existingSession) {
          return this.mapDbSessionToSession(existingSession);
        }
      }

      // Get the most recent active session for this user and agent
      const { data: recentSession, error: recentError } = await supabase
        .from("conversation_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("agent_type", agentType)
        .eq("status", "active")
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .single();

      if (!recentError && recentSession) {
        // Update last activity
        await this.updateSessionActivity(recentSession.id);
        return this.mapDbSessionToSession(recentSession);
      }

      // Create new session
      const newSessionId = sessionId || uuidv4();
      const now = new Date();

      const { data: newSession, error: createError } = await supabase
        .from("conversation_sessions")
        .insert({
          id: newSessionId,
          user_id: userId,
          agent_type: agentType,
          session_title: `${
            agentType.charAt(0).toUpperCase() + agentType.slice(1)
          } Chat - ${now.toLocaleDateString()}`,
          status: "active",
          last_activity_at: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (createError) {
        throw new Error(
          `Failed to create conversation session: ${createError.message}`
        );
      }

      return this.mapDbSessionToSession(newSession);
    } catch (error) {
      console.error("Error in getOrCreateSession:", error);
      throw error;
    }
  }

  /**
   * Save a conversation message
   */
  async saveMessage(
    sessionId: string,
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism",
    role: "user" | "assistant" | "system",
    content: string,
    options: {
      messageType?: "chat" | "command" | "result" | "error" | "system";
      contextData?: Record<string, any>;
      parentMessageId?: string;
      isContextRelevant?: boolean;
    } = {}
  ): Promise<ConversationMessage> {
    try {
      const messageId = uuidv4();
      const now = new Date();

      // Estimate token count (rough approximation: 1 token ≈ 4 characters)
      const tokenCount = Math.ceil(content.length / 4);

      const messageData = {
        id: messageId,
        session_id: sessionId,
        user_id: userId,
        agent_type: agentType,
        role,
        content,
        message_type: options.messageType || "chat",
        context_data: options.contextData || {},
        parent_message_id: options.parentMessageId,
        is_context_relevant: options.isContextRelevant !== false,
        token_count: tokenCount,
        created_at: now.toISOString(),
      };

      const { data: savedMessage, error } = await supabase
        .from("conversation_messages")
        .insert(messageData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save message: ${error.message}`);
      }

      // Update session activity
      await this.updateSessionActivity(sessionId);

      return this.mapDbMessageToMessage(savedMessage);
    } catch (error) {
      console.error("Error saving conversation message:", error);
      throw error;
    }
  }

  /**
   * Get conversation context for an agent
   */
  async getConversationContext(
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism",
    sessionId?: string,
    maxMessages?: number
  ): Promise<ConversationContext> {
    try {
      // Get user's memory preferences for this agent
      const preferences = await this.getMemoryPreferences(userId, agentType);
      const messageLimit = maxMessages || preferences.maxContextMessages;

      // Build query
      let query = supabase
        .from("conversation_messages")
        .select(
          `
          *,
          conversation_sessions!inner(status)
        `
        )
        .eq("user_id", userId)
        .eq("agent_type", agentType)
        .eq("is_context_relevant", true)
        .in("conversation_sessions.status", ["active", "paused"])
        .order("created_at", { ascending: false })
        .limit(messageLimit);

      // Filter by session if provided
      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      const { data: messages, error } = await query;

      if (error) {
        throw new Error(`Failed to get conversation context: ${error.message}`);
      }

      // Map and reverse to get chronological order
      const contextMessages = (messages || [])
        .map(this.mapDbMessageToMessage)
        .reverse();

      // Calculate total tokens
      const totalTokens = contextMessages.reduce(
        (sum, msg) => sum + msg.tokenCount,
        0
      );

      // Get cached summary if available
      const summary = await this.getCachedContextSummary(
        userId,
        agentType,
        sessionId
      );

      return {
        messages: contextMessages,
        summary,
        totalTokens,
        messageCount: contextMessages.length,
      };
    } catch (error) {
      console.error("Error getting conversation context:", error);
      throw error;
    }
  }

  /**
   * Get memory preferences for a user and agent
   */
  async getMemoryPreferences(
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism"
  ): Promise<AgentMemoryPreferences> {
    try {
      const { data: preferences, error } = await supabase
        .from("agent_memory_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("agent_type", agentType)
        .single();

      if (error || !preferences) {
        // Return default preferences if not found
        return this.getDefaultMemoryPreferences(agentType);
      }

      return {
        id: preferences.id,
        userId: preferences.user_id,
        agentType: preferences.agent_type,
        maxContextMessages: preferences.max_context_messages,
        maxContextTokens: preferences.max_context_tokens,
        autoSummarizeThreshold: preferences.auto_summarize_threshold,
        retainSystemMessages: preferences.retain_system_messages,
        retainErrorMessages: preferences.retain_error_messages,
        contextRelevanceThreshold: preferences.context_relevance_threshold,
      };
    } catch (error) {
      console.error("Error getting memory preferences:", error);
      return this.getDefaultMemoryPreferences(agentType);
    }
  }

  /**
   * Update session activity timestamp
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await supabase
        .from("conversation_sessions")
        .update({
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session activity:", error);
    }
  }

  /**
   * Get cached context summary
   */
  private async getCachedContextSummary(
    userId: string,
    agentType: string,
    sessionId?: string
  ): Promise<string | undefined> {
    try {
      let query = supabase
        .from("conversation_context_cache")
        .select("context_summary")
        .eq("user_id", userId)
        .eq("agent_type", agentType)
        .gt("expires_at", new Date().toISOString());

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      const { data, error } = await query.single();

      if (!error && data) {
        return data.context_summary;
      }
    } catch (error) {
      // Ignore cache errors
    }
    return undefined;
  }

  /**
   * Get default memory preferences for an agent type
   */
  private getDefaultMemoryPreferences(
    agentType: string
  ): AgentMemoryPreferences {
    const defaults = {
      prism: { maxMessages: 30, maxTokens: 6000 },
      sentinel: { maxMessages: 25, maxTokens: 5000 },
      sage: { maxMessages: 20, maxTokens: 4000 },
      falcon: { maxMessages: 15, maxTokens: 3000 },
    };

    const agentDefaults =
      defaults[agentType as keyof typeof defaults] || defaults.prism;

    return {
      id: "",
      userId: "",
      agentType: agentType as any,
      maxContextMessages: agentDefaults.maxMessages,
      maxContextTokens: agentDefaults.maxTokens,
      autoSummarizeThreshold: 50,
      retainSystemMessages: true,
      retainErrorMessages: false,
      contextRelevanceThreshold: 0.7,
    };
  }

  /**
   * Map database session to ConversationSession
   */
  private mapDbSessionToSession(dbSession: any): ConversationSession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      agentType: dbSession.agent_type,
      sessionTitle: dbSession.session_title,
      status: dbSession.status,
      contextSummary: dbSession.context_summary,
      lastActivityAt: new Date(dbSession.last_activity_at),
      createdAt: new Date(dbSession.created_at),
      updatedAt: new Date(dbSession.updated_at),
    };
  }

  /**
   * Map database message to ConversationMessage
   */
  private mapDbMessageToMessage(dbMessage: any): ConversationMessage {
    return {
      id: dbMessage.id,
      sessionId: dbMessage.session_id,
      userId: dbMessage.user_id,
      agentType: dbMessage.agent_type,
      role: dbMessage.role,
      content: dbMessage.content,
      messageType: dbMessage.message_type,
      contextData: dbMessage.context_data || {},
      parentMessageId: dbMessage.parent_message_id,
      isContextRelevant: dbMessage.is_context_relevant,
      tokenCount: dbMessage.token_count || 0,
      createdAt: new Date(dbMessage.created_at),
    };
  }

  /**
   * Format conversation context for AI agents
   */
  async formatContextForAgent(
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism",
    sessionId?: string
  ): Promise<string> {
    try {
      const context = await this.getConversationContext(
        userId,
        agentType,
        sessionId
      );

      if (context.messages.length === 0) {
        return "";
      }

      let formattedContext = "";

      // Add summary if available
      if (context.summary) {
        formattedContext += `Previous conversation summary: ${context.summary}\n\n`;
      }

      // Add recent messages
      formattedContext += "Recent conversation:\n";
      context.messages.forEach((message) => {
        const timestamp = message.createdAt.toLocaleString();
        const roleLabel =
          message.role === "user"
            ? "User"
            : message.role === "assistant"
            ? `${agentType.charAt(0).toUpperCase() + agentType.slice(1)}`
            : "System";

        formattedContext += `[${timestamp}] ${roleLabel}: ${message.content}\n`;
      });

      return formattedContext.trim();
    } catch (error) {
      console.error("Error formatting context for agent:", error);
      return "";
    }
  }

  /**
   * Generate conversation summary using OpenAI
   */
  async generateConversationSummary(
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism",
    sessionId?: string
  ): Promise<string | null> {
    if (!this.openai) {
      console.warn(
        "OpenAI not configured, cannot generate conversation summary"
      );
      return null;
    }

    try {
      const context = await this.getConversationContext(
        userId,
        agentType,
        sessionId
      );

      if (context.messages.length < 5) {
        return null; // Not enough messages to summarize
      }

      // Format messages for summarization
      const conversationText = context.messages
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const prompt = `Please provide a concise summary of this conversation between a user and the ${agentType} AI agent. Focus on:
1. Key requests made by the user
2. Important information shared
3. Current context and ongoing tasks
4. Any pending actions or follow-ups

Conversation:
${conversationText}

Summary:`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      const summary = completion.choices[0]?.message?.content?.trim();

      if (summary) {
        // Cache the summary
        await this.cacheContextSummary(
          userId,
          agentType,
          sessionId,
          summary,
          context
        );
        return summary;
      }

      return null;
    } catch (error) {
      console.error("Error generating conversation summary:", error);
      return null;
    }
  }

  /**
   * Cache context summary for performance
   */
  private async cacheContextSummary(
    userId: string,
    agentType: string,
    sessionId: string | undefined,
    summary: string,
    context: ConversationContext
  ): Promise<void> {
    try {
      const cacheId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      await supabase.from("conversation_context_cache").upsert(
        {
          id: cacheId,
          session_id: sessionId || "",
          user_id: userId,
          agent_type: agentType,
          context_window: context.messages.map((m) => m.content).join("\n"),
          context_summary: summary,
          message_count: context.messageCount,
          total_tokens: context.totalTokens,
          last_updated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: "session_id,agent_type",
        }
      );
    } catch (error) {
      console.error("Error caching context summary:", error);
    }
  }

  /**
   * Get conversation history for display in chat interface
   */
  async getConversationHistory(
    userId: string,
    agentType: "falcon" | "sage" | "sentinel" | "prism",
    sessionId?: string,
    limit: number = 50
  ): Promise<ConversationMessage[]> {
    try {
      let query = supabase
        .from("conversation_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("agent_type", agentType)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      const { data: messages, error } = await query;

      if (error) {
        throw new Error(`Failed to get conversation history: ${error.message}`);
      }

      // Return in chronological order (oldest first)
      return (messages || []).map(this.mapDbMessageToMessage).reverse();
    } catch (error) {
      console.error("Error getting conversation history:", error);
      return [];
    }
  }

  /**
   * Archive old conversation sessions
   */
  async archiveOldSessions(
    userId: string,
    daysThreshold: number = 30
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

      const { data, error } = await supabase
        .from("conversation_sessions")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "active")
        .lt("last_activity_at", cutoffDate.toISOString())
        .select("id");

      if (error) {
        throw new Error(`Failed to archive sessions: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error archiving old sessions:", error);
      return 0;
    }
  }

  /**
   * Clean up expired context cache
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("conversation_context_cache")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .select("id");

      if (error) {
        throw new Error(`Failed to cleanup cache: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error cleaning up expired cache:", error);
      return 0;
    }
  }
}
