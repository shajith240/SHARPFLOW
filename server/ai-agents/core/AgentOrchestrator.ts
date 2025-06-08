import { EventEmitter } from "events";
import { Prism } from "./Prism.js";
import { JobQueue } from "./JobQueue.js";
import { InMemoryJobQueue } from "./InMemoryJobQueue.js";
import { WebSocketManager } from "./WebSocketManager.js";
import { NotificationService } from "../../services/NotificationService.js";
import { ConversationMemoryService } from "../../services/ConversationMemoryService.js";
import { supabase } from "../../db.js";
import { AgentFactory } from "./AgentFactory.js";
import { BaseAgent } from "./BaseAgent.js";
import { FalconAgent } from "../agents/FalconAgent.js";
import { SageAgent } from "../agents/SageAgent.js";
import { SentinelAgent } from "../agents/SentinelAgent.js";
import type {
  ChatMessage,
  ChatSession,
  UserIntent,
  AgentJob,
  IntentRecognitionResult,
} from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export class AgentOrchestrator extends EventEmitter {
  private prism: Prism;
  private jobQueue: JobQueue | InMemoryJobQueue;
  private webSocketManager: WebSocketManager;
  private notificationService: NotificationService;
  private conversationMemoryService: ConversationMemoryService;
  private activeSessions: Map<string, ChatSession> = new Map();
  private conversationContext: Map<
    string,
    {
      lastAgentInteraction: string;
      pendingConfirmation: boolean;
      confirmationType: string;
      originalRequest: any;
      timestamp: Date;
    }
  > = new Map();

  constructor(webSocketManager: WebSocketManager) {
    super();

    this.prism = new Prism();

    // Always use in-memory queue for development to avoid Redis connection errors
    console.log("🔄 Using in-memory job queue for development");
    this.jobQueue = new InMemoryJobQueue();

    this.webSocketManager = webSocketManager;
    this.notificationService = new NotificationService(webSocketManager);
    this.conversationMemoryService = new ConversationMemoryService();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle WebSocket events
    console.log("🔍 DEBUG - AgentOrchestrator setting up event handlers...");
    this.webSocketManager.on("chat:message", (data) => {
      console.log(
        "🔍 DEBUG - AgentOrchestrator received chat:message event:",
        data.message
      );
      this.handleChatMessage(data);
    });

    this.webSocketManager.on("agent:job_request", (data) => {
      this.handleDirectAgentRequest(data);
    });

    this.webSocketManager.on("agent:status_request", (data) => {
      this.handleAgentStatusRequest(data);
    });

    this.webSocketManager.on("job:status_request", (data) => {
      this.handleJobStatusRequest(data);
    });

    // Handle job queue events
    this.jobQueue.on("job:progress", (progressUpdate) => {
      this.handleJobProgress(progressUpdate);
    });

    this.jobQueue.on("job:completed", (completionData) => {
      this.handleJobCompleted(completionData);
    });

    this.jobQueue.on("job:failed", (errorData) => {
      this.handleJobFailed(errorData);
    });

    this.jobQueue.on("job:added", (jobData) => {
      this.handleJobAdded(jobData);
    });
  }

  private async handleChatMessage(data: {
    userId: string;
    sessionId?: string;
    message: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      console.log(
        `🧠 Prism processing message from ${data.userId}: ${data.message}`
      );

      // Get or create conversation session using memory service
      const session = await this.conversationMemoryService.getOrCreateSession(
        data.userId,
        "prism",
        data.sessionId
      );

      // Save user message using memory service
      await this.conversationMemoryService.saveMessage(
        session.id,
        data.userId,
        "prism",
        "user",
        data.message,
        {
          messageType: "chat",
          contextData: { timestamp: data.timestamp.toISOString() },
        }
      );

      // Send typing indicator
      this.webSocketManager.sendToUser(data.userId, "chat:typing", {
        isTyping: true,
        agent: "Prism",
      });

      // Check for follow-up context before processing with Prism
      const followUpContext = this.checkForFollowUpContext(
        data.userId,
        data.message
      );

      if (followUpContext) {
        console.log("🔄 Detected follow-up message, routing to agent directly");
        await this.handleFollowUpMessage(data, session, followUpContext);
        return;
      }

      // Process message with Prism
      console.log("🔍 DEBUG - About to call Prism.processMessage...");
      const intentResult = await this.prism.processMessage(
        data.message,
        data.userId,
        session.id
      );
      console.log("🔍 DEBUG - Prism.processMessage completed, intentResult:", {
        type: intentResult.intent.type,
        hasResponse: !!intentResult.response,
        responseLength: intentResult.response?.length || 0,
      });

      // If intent requires agent action, only send routing message
      if (intentResult.intent.requiredAgent !== "prism") {
        // Generate routing message only
        const routingMessage = this.generateRoutingMessage(intentResult.intent);

        console.log("🔍 DEBUG - Sending routing message:", routingMessage);

        // Save routing message using memory service
        await this.conversationMemoryService.saveMessage(
          session.id,
          data.userId,
          "prism",
          "assistant",
          routingMessage,
          {
            messageType: "system",
            contextData: {
              agentName: "Prism",
              intent: intentResult.intent,
              isRouting: true,
            },
          }
        );

        // Stop typing indicator
        this.webSocketManager.sendToUser(data.userId, "chat:typing", {
          isTyping: false,
          agent: "Prism",
        });

        // Send routing message to user
        this.webSocketManager.sendChatMessage(data.userId, {
          id: uuidv4(),
          userId: data.userId,
          sessionId: session.id,
          role: "assistant",
          content: routingMessage,
          timestamp: new Date(),
          metadata: {
            agentName: "Prism",
            intent: intentResult.intent,
            isRouting: true,
          },
        });

        // Create agent job
        await this.createAgentJob(
          intentResult,
          data.userId,
          session.id,
          data.message
        );
      } else {
        // Handle Prism direct response with conversation context
        const conversationContext =
          await this.conversationMemoryService.formatContextForAgent(
            data.userId,
            "prism",
            session.id
          );

        const response =
          intentResult.response ||
          (await this.prism.generateResponse(intentResult.intent, {
            userId: data.userId,
            sessionId: session.id,
            conversationHistory: conversationContext,
          }));

        console.log("🔍 DEBUG - Final Prism response being sent:", response);

        // Save assistant response using memory service
        await this.conversationMemoryService.saveMessage(
          session.id,
          data.userId,
          "prism",
          "assistant",
          response,
          {
            messageType: "chat",
            contextData: {
              agentName: "Prism",
              intent: intentResult.intent,
            },
          }
        );

        // Stop typing indicator
        this.webSocketManager.sendToUser(data.userId, "chat:typing", {
          isTyping: false,
          agent: "Prism",
        });

        // Send response to user
        this.webSocketManager.sendChatMessage(data.userId, {
          id: uuidv4(),
          userId: data.userId,
          sessionId: session.id,
          role: "assistant",
          content: response,
          timestamp: new Date(),
          metadata: {
            agentName: "Prism",
            intent: intentResult.intent,
          },
        });
      }
    } catch (error) {
      console.error("Error handling chat message:", error);

      this.webSocketManager.sendToUser(data.userId, "chat:error", {
        message:
          "Sorry, I encountered an error processing your message. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private generateRoutingMessage(intent: UserIntent): string {
    const agentDisplayNames = {
      falcon: "Falcon (Lead Generation)",
      sage: "Sage (Lead Research)",
      sentinel: "Sentinel (Auto Reply)",
    };

    const agentName =
      agentDisplayNames[
        intent.requiredAgent as keyof typeof agentDisplayNames
      ] || intent.requiredAgent;

    return `I'm contacting ${agentName} to handle your request, please wait...`;
  }

  private async createAgentJob(
    intentResult: IntentRecognitionResult,
    userId: string,
    sessionId: string,
    originalMessage: string
  ): Promise<void> {
    try {
      // Create agent job from intent
      const agentJob = await this.prism.createAgentJob(
        intentResult.intent,
        userId,
        sessionId
      );

      // Add job to queue with original message for Stage 2 completion
      const jobId = await this.jobQueue.addJob(
        intentResult.intent.requiredAgent,
        {
          userId,
          jobType: intentResult.intent.type,
          inputData: agentJob.inputData,
          sessionId, // Add sessionId for completion message
          originalMessage, // Store original message for OpenAI completion
        }
      );

      // Stage 1: Generate contextual acknowledgment using OpenAI
      const agent = this.getAgentInstance(intentResult.intent.requiredAgent);
      if (agent) {
        try {
          const acknowledgmentMessage =
            await agent.generateAcknowledgmentMessage(
              {
                id: jobId,
                userId,
                agentName: intentResult.intent.requiredAgent,
                jobType: intentResult.intent.type,
                status: "processing",
                progress: 0,
                inputData: agentJob.inputData,
                createdAt: new Date(),
              },
              originalMessage
            );

          // Send contextual acknowledgment via chat
          this.webSocketManager.sendChatMessage(userId, {
            id: uuidv4(),
            userId,
            sessionId,
            role: "assistant",
            content: acknowledgmentMessage,
            timestamp: new Date(),
            metadata: {
              agentName: intentResult.intent.requiredAgent,
              jobId,
              stage: "acknowledgment",
            },
          });

          // Save acknowledgment message using memory service
          const agentType = intentResult.intent.requiredAgent as
            | "falcon"
            | "sage"
            | "sentinel"
            | "prism";
          await this.conversationMemoryService.saveMessage(
            sessionId,
            userId,
            agentType,
            "assistant",
            acknowledgmentMessage,
            {
              messageType: "system",
              contextData: {
                agentName: intentResult.intent.requiredAgent,
                jobId,
                stage: "acknowledgment",
              },
            }
          );
        } catch (error) {
          console.error("Error generating acknowledgment message:", error);
          // Fallback to generic message
          const fallbackMessage = `${this.getAgentDisplayName(
            intentResult.intent.requiredAgent
          )} is working on your request...`;

          this.webSocketManager.sendChatMessage(userId, {
            id: uuidv4(),
            userId,
            sessionId,
            role: "assistant",
            content: fallbackMessage,
            timestamp: new Date(),
            metadata: {
              agentName: intentResult.intent.requiredAgent,
              jobId,
              stage: "acknowledgment_fallback",
            },
          });
        }
      }

      // Note: Removed redundant job:started notification to prevent duplicate messages
      // The Stage 1 acknowledgment message above serves as the job start notification
    } catch (error) {
      console.error("Error creating agent job:", error);

      this.webSocketManager.sendToUser(userId, "job:error", {
        message: "Failed to start agent task. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async handleDirectAgentRequest(data: {
    userId: string;
    sessionId?: string;
    agentName: string;
    jobType: string;
    inputData: any;
    socketId: string;
  }): Promise<void> {
    try {
      const jobId = await this.jobQueue.addJob(data.agentName, {
        userId: data.userId,
        jobType: data.jobType,
        inputData: data.inputData,
      });

      this.webSocketManager.sendToUser(data.userId, "job:started", {
        jobId,
        agentName: data.agentName,
        jobType: data.jobType,
        message: `${this.getAgentDisplayName(
          data.agentName
        )} is processing your request...`,
      });
    } catch (error) {
      console.error("Error handling direct agent request:", error);

      this.webSocketManager.sendToUser(data.userId, "job:error", {
        message: "Failed to start agent task.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async handleAgentStatusRequest(data: {
    userId: string;
    socketId: string;
  }): Promise<void> {
    try {
      const agentStatuses = this.jobQueue.getAllAgentStatuses();
      const queueStats = await this.jobQueue.getAllQueueStats();

      this.webSocketManager.sendToUser(data.userId, "agent:status", {
        agents: agentStatuses,
        queues: queueStats,
      });
    } catch (error) {
      console.error("Error getting agent status:", error);
    }
  }

  private async handleJobStatusRequest(data: {
    userId: string;
    jobId: string;
    queueName: string;
    socketId: string;
  }): Promise<void> {
    try {
      const jobStatus = await this.jobQueue.getJobStatus(
        data.jobId,
        data.queueName
      );

      this.webSocketManager.sendToUser(data.userId, "job:status", {
        jobId: data.jobId,
        status: jobStatus,
      });
    } catch (error) {
      console.error("Error getting job status:", error);
    }
  }

  private handleJobProgress(progressUpdate: any): void {
    // Extract userId from job data if available
    const userId = progressUpdate.userId;

    if (userId) {
      this.webSocketManager.sendJobProgress(userId, progressUpdate);
    }
  }

  private async handleJobCompleted(completionData: any): Promise<void> {
    try {
      console.log("🔍 DEBUG - Job completion data:", {
        jobId: completionData.jobId,
        queueName: completionData.queueName,
        hasResult: !!completionData.result,
      });

      // Try multiple approaches to get job details
      let jobStatus = null;
      let queueName = completionData.queueName;

      // First, try with provided queue name
      if (queueName) {
        jobStatus = await this.jobQueue.getJobStatus(
          completionData.jobId,
          queueName
        );
      }

      // If no job status found, try common queue names (including agent names)
      if (!jobStatus) {
        const commonQueues = [
          "sage", // Agent name used in InMemoryJobQueue
          "falcon", // Agent name used in InMemoryJobQueue
          "sentinel", // Agent name used in InMemoryJobQueue
          "research",
          "linkedin_research",
          "leadgen",
          "lead_generation",
        ];
        for (const queue of commonQueues) {
          try {
            jobStatus = await this.jobQueue.getJobStatus(
              completionData.jobId,
              queue
            );
            if (jobStatus) {
              queueName = queue;
              console.log(`✅ Found job in queue: ${queue}`);
              break;
            }
          } catch (e) {
            // Continue trying other queues
          }
        }
      }

      if (jobStatus?.data?.userId) {
        const userId = jobStatus.data.userId;

        // Map queue name to proper agent name with fallback
        const agentName = this.mapQueueNameToAgent(queueName);
        console.log(`🔍 Mapped queue "${queueName}" to agent "${agentName}"`);

        // Additional debug logging
        console.log("🔍 DEBUG - Job completion details:", {
          originalQueueName: completionData.queueName,
          resolvedQueueName: queueName,
          mappedAgentName: agentName,
          hasWebSocketManager: !!this.webSocketManager,
        });

        // Create persistent notification using NotificationService
        if (
          agentName === "falcon" ||
          agentName === "sage" ||
          agentName === "sentinel"
        ) {
          await this.notificationService.notifyJobCompleted(
            userId,
            agentName,
            completionData.jobId,
            jobStatus.data.jobType || "unknown",
            completionData.result
          );
        }

        // Note: Removed redundant job completion notification to prevent duplicate messages
        // The Stage 2 OpenAI-generated completion message below serves as the completion notification

        // Stage 2: Generate contextual completion message using OpenAI
        if (jobStatus.data.sessionId && jobStatus.data.originalMessage) {
          const agent = this.getAgentInstance(agentName);
          if (agent) {
            try {
              const completionMessage = await agent.generateCompletionMessage(
                {
                  id: completionData.jobId,
                  userId,
                  agentName: agentName,
                  jobType: jobStatus.data.jobType || "unknown",
                  status: "completed",
                  progress: 100,
                  inputData: jobStatus.data.inputData,
                  createdAt: new Date(),
                },
                completionData.result,
                jobStatus.data.originalMessage
              );

              // Send contextual completion message via chat
              this.webSocketManager.sendChatMessage(userId, {
                id: uuidv4(),
                userId,
                sessionId: jobStatus.data.sessionId,
                role: "assistant",
                content: completionMessage,
                timestamp: new Date(),
                metadata: {
                  agentName: agentName,
                  jobId: completionData.jobId,
                  stage: "completion",
                  result: completionData.result,
                },
              });

              // Save completion message using memory service
              const agentType = agentName as
                | "falcon"
                | "sage"
                | "sentinel"
                | "prism";
              await this.conversationMemoryService.saveMessage(
                jobStatus.data.sessionId,
                userId,
                agentType,
                "assistant",
                completionMessage,
                {
                  messageType: "result",
                  contextData: {
                    agentName: agentName,
                    jobId: completionData.jobId,
                    stage: "completion",
                    result: completionData.result,
                  },
                }
              );

              // Check if this result requires follow-up confirmation
              if (
                completionData.result?.data?.needsConfirmation &&
                completionData.result?.data?.confirmationType ===
                  "time_confirmation"
              ) {
                console.log(
                  "🔄 Setting conversation context for time confirmation"
                );
                this.setConversationContext(
                  userId,
                  agentName,
                  "time_confirmation",
                  completionData.result.data.reminderDetails ||
                    jobStatus.data.inputData
                );
              }

              console.log(
                `✅ Sent OpenAI-generated completion message to chat`
              );
            } catch (error) {
              console.error("Error generating completion message:", error);
              // Fallback to generic message
              const fallbackMessage = `✅ ${this.getAgentDisplayName(
                agentName
              )} has completed your request successfully.`;

              this.webSocketManager.sendChatMessage(userId, {
                id: uuidv4(),
                userId,
                sessionId: jobStatus.data.sessionId,
                role: "assistant",
                content: fallbackMessage,
                timestamp: new Date(),
                metadata: {
                  agentName: agentName,
                  jobId: completionData.jobId,
                  stage: "completion_fallback",
                },
              });

              const agentType = agentName as
                | "falcon"
                | "sage"
                | "sentinel"
                | "prism";
              await this.conversationMemoryService.saveMessage(
                jobStatus.data.sessionId,
                userId,
                agentType,
                "assistant",
                fallbackMessage,
                {
                  messageType: "result",
                  contextData: {
                    agentName: agentName,
                    jobId: completionData.jobId,
                    stage: "completion_fallback",
                  },
                }
              );
            }
          }
        }
      } else {
        console.warn("⚠️ Could not find job status or userId for completion:", {
          jobId: completionData.jobId,
          queueName: queueName,
          hasJobStatus: !!jobStatus,
        });
      }
    } catch (error) {
      console.error("Error handling job completion:", error);
    }
  }

  private async handleJobFailed(errorData: any): Promise<void> {
    try {
      // Get job details to find userId
      const jobStatus = await this.jobQueue.getJobStatus(
        errorData.jobId,
        errorData.queueName
      );

      if (jobStatus?.data?.userId) {
        const userId = jobStatus.data.userId;

        // Map queue name to proper agent name
        const agentName = this.mapQueueNameToAgent(errorData.queueName);

        // Create persistent notification for job failure
        if (
          agentName === "falcon" ||
          agentName === "sage" ||
          agentName === "sentinel"
        ) {
          await this.notificationService.notifyJobFailed(
            userId,
            agentName,
            errorData.jobId,
            jobStatus.data.jobType || "unknown",
            errorData.error
          );
        }

        // Note: Removed redundant job error notification to prevent duplicate messages
        // The Stage 2 OpenAI-generated error message below serves as the error notification

        // Stage 2: Generate contextual error message using OpenAI
        if (jobStatus.data.sessionId && jobStatus.data.originalMessage) {
          const agent = this.getAgentInstance(agentName);
          if (agent) {
            try {
              const errorMessage = await agent.generateCompletionMessage(
                {
                  id: errorData.jobId,
                  userId,
                  agentName: agentName,
                  jobType: jobStatus.data.jobType || "unknown",
                  status: "failed",
                  progress: 0,
                  inputData: jobStatus.data.inputData,
                  createdAt: new Date(),
                },
                {
                  success: false,
                  error: errorData.error,
                },
                jobStatus.data.originalMessage
              );

              // Send contextual error message via chat
              this.webSocketManager.sendChatMessage(userId, {
                id: uuidv4(),
                userId,
                sessionId: jobStatus.data.sessionId,
                role: "assistant",
                content: errorMessage,
                timestamp: new Date(),
                metadata: {
                  agentName: agentName,
                  jobId: errorData.jobId,
                  stage: "error",
                  error: errorData.error,
                },
              });

              // Save error message using memory service
              const agentType = agentName as
                | "falcon"
                | "sage"
                | "sentinel"
                | "prism";
              await this.conversationMemoryService.saveMessage(
                jobStatus.data.sessionId,
                userId,
                agentType,
                "assistant",
                errorMessage,
                {
                  messageType: "error",
                  contextData: {
                    agentName: agentName,
                    jobId: errorData.jobId,
                    stage: "error",
                    error: errorData.error,
                  },
                }
              );
              console.log(`✅ Sent OpenAI-generated error message to chat`);
            } catch (error) {
              console.error("Error generating error message:", error);
              // Fallback to generic message
              const fallbackMessage = `❌ ${this.getAgentDisplayName(
                agentName
              )} encountered an error: ${errorData.error}`;

              this.webSocketManager.sendChatMessage(userId, {
                id: uuidv4(),
                userId,
                sessionId: jobStatus.data.sessionId,
                role: "assistant",
                content: fallbackMessage,
                timestamp: new Date(),
                metadata: {
                  agentName: agentName,
                  jobId: errorData.jobId,
                  stage: "error_fallback",
                },
              });

              const agentType = agentName as
                | "falcon"
                | "sage"
                | "sentinel"
                | "prism";
              await this.conversationMemoryService.saveMessage(
                jobStatus.data.sessionId,
                userId,
                agentType,
                "assistant",
                fallbackMessage,
                {
                  messageType: "error",
                  contextData: {
                    agentName: agentName,
                    jobId: errorData.jobId,
                    stage: "error_fallback",
                  },
                }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling job failure:", error);
    }
  }

  private handleJobAdded(jobData: any): void {
    console.log(
      `📋 Job ${jobData.jobId} added to ${jobData.agentName} queue for user ${jobData.userId}`
    );
  }

  private async getOrCreateSession(
    userId: string,
    sessionId?: string
  ): Promise<ChatSession> {
    if (sessionId && this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Create new session
    const newSession: ChatSession = {
      id: sessionId || uuidv4(),
      userId,
      title: `Chat Session - ${new Date().toLocaleDateString()}`,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeSessions.set(newSession.id, newSession);

    // Save to database (if you have a chat_sessions table)
    try {
      await supabase.from("chat_sessions").insert({
        id: newSession.id,
        user_id: newSession.userId,
        title: newSession.title,
        status: newSession.status,
        created_at: newSession.createdAt.toISOString(),
        updated_at: newSession.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Error saving chat session:", error);
    }

    return newSession;
  }

  private mapQueueNameToAgent(queueName: string | undefined | null): string {
    // Handle undefined/null queueName
    if (!queueName || typeof queueName !== "string") {
      console.warn(
        "⚠️ mapQueueNameToAgent received invalid queueName:",
        queueName
      );
      return "unknown";
    }

    const normalizedName = queueName.toLowerCase().trim();

    switch (normalizedName) {
      case "falcon":
      case "leadgen":
      case "lead_generation":
      case "lead-generation":
        return "falcon";
      case "sage":
      case "research":
      case "linkedin_research":
      case "linkedin-research":
        return "sage";
      case "sentinel":
      case "email":
      case "auto_reply":
      case "auto-reply":
      case "calendar_booking":
      case "calendar":
        return "sentinel";
      default:
        console.log(
          `🔍 Unknown queue name: "${queueName}", returning normalized: "${normalizedName}"`
        );
        return normalizedName || "unknown";
    }
  }

  private getAgentDisplayName(agentName: string): string {
    const displayNames = {
      falcon: "Falcon (Lead Generation)",
      sage: "Sage (Lead Research)",
      sentinel: "Sentinel (Auto Reply)",
      prism: "Prism",
    };

    return displayNames[agentName as keyof typeof displayNames] || agentName;
  }

  /**
   * Get agent instance for OpenAI message generation
   * For message generation, we use a basic instance without user-specific config
   */
  private getAgentInstance(agentName: string): BaseAgent | null {
    switch (agentName.toLowerCase()) {
      case "falcon":
        return new FalconAgent();
      case "sage":
        return new SageAgent();
      case "sentinel":
        return new SentinelAgent();
      default:
        console.warn(`Unknown agent name: ${agentName}`);
        return null;
    }
  }

  /**
   * Get user-specific agent instance for job processing
   */
  private async getUserAgentInstance(
    userId: string,
    agentName: string
  ): Promise<BaseAgent | null> {
    // Check if user has access to this agent
    const hasAccess = await AgentFactory.hasAgentAccess(userId, agentName);
    if (!hasAccess) {
      throw new Error(
        `Access denied: User does not have access to ${agentName} agent. Please upgrade your subscription.`
      );
    }

    // Get user-specific agent instance
    return await AgentFactory.getUserAgent(userId, agentName);
  }

  /**
   * Check if a message is a follow-up to a previous conversation
   */
  private checkForFollowUpContext(userId: string, message: string): any {
    const context = this.conversationContext.get(userId);

    if (!context || !context.pendingConfirmation) {
      return null;
    }

    // Check if the context is still valid (within 10 minutes)
    const timeDiff = Date.now() - context.timestamp.getTime();
    if (timeDiff > 10 * 60 * 1000) {
      // 10 minutes
      this.conversationContext.delete(userId);
      return null;
    }

    // Check if this looks like a time confirmation response
    if (context.confirmationType === "time_confirmation") {
      const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/i;
      const simpleTimePattern =
        /^\s*(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?\s*$/i;

      if (timePattern.test(message) || simpleTimePattern.test(message)) {
        return context;
      }
    }

    return null;
  }

  /**
   * Handle follow-up messages that are responses to previous agent interactions
   */
  private async handleFollowUpMessage(
    data: {
      userId: string;
      sessionId?: string;
      message: string;
      timestamp: Date;
    },
    session: any,
    context: any
  ): Promise<void> {
    try {
      // Create a job for the agent to handle the follow-up
      const jobId = await this.jobQueue.addJob(context.lastAgentInteraction, {
        userId: data.userId,
        jobType: "reminder", // Assuming this is for reminder confirmations
        inputData: {
          ...context.originalRequest,
          isFollowUp: true,
          confirmationResponse: data.message,
          originalReminderDetails: context.originalRequest,
          sessionId: session.id,
          originalMessage: data.message,
        },
        sessionId: session.id,
        originalMessage: data.message,
      });

      // Clear the context since we're handling the follow-up
      this.conversationContext.delete(data.userId);

      // Send minimal routing message for follow-up
      const routingMessage = `Processing your confirmation with ${this.getAgentDisplayName(
        context.lastAgentInteraction
      )}...`;

      // Save and send routing message using memory service
      await this.conversationMemoryService.saveMessage(
        session.id,
        data.userId,
        "prism",
        "assistant",
        routingMessage,
        {
          messageType: "system",
          contextData: {
            agentName: "Prism",
            isFollowUpRouting: true,
          },
        }
      );

      this.webSocketManager.sendChatMessage(data.userId, {
        id: uuidv4(),
        userId: data.userId,
        sessionId: session.id,
        role: "assistant",
        content: routingMessage,
        timestamp: new Date(),
        metadata: {
          agentName: "Prism",
          isFollowUpRouting: true,
        },
      });

      console.log(
        `✅ Routed follow-up message to ${context.lastAgentInteraction}`
      );
    } catch (error) {
      console.error("Error handling follow-up message:", error);

      // Send error message to user
      this.webSocketManager.sendToUser(data.userId, "chat:error", {
        message:
          "Sorry, I had trouble processing your response. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Set conversation context for tracking follow-ups
   */
  private setConversationContext(
    userId: string,
    agentName: string,
    confirmationType: string,
    originalRequest: any
  ): void {
    this.conversationContext.set(userId, {
      lastAgentInteraction: agentName,
      pendingConfirmation: true,
      confirmationType,
      originalRequest,
      timestamp: new Date(),
    });
  }

  public async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up Agent Orchestrator...");

    await this.jobQueue.cleanup();
    this.activeSessions.clear();
    this.conversationContext.clear();

    console.log("✅ Agent Orchestrator cleanup completed");
  }
}
