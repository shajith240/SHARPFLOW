import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { ConversationMemoryService } from "../../services/ConversationMemoryService.js";
import type {
  AgentJob,
  AgentResult,
  ProgressUpdate,
  AgentStatus,
} from "../types/index.js";

export abstract class BaseAgent extends EventEmitter {
  protected name: string;
  protected version: string;
  protected status: AgentStatus["status"] = "idle";
  protected tasksCompleted: number = 0;
  protected tasksInQueue: number = 0;
  protected startTime: Date = new Date();
  protected openai: OpenAI | null;
  protected conversationMemoryService: ConversationMemoryService;

  constructor(name: string, version: string = "1.0.0") {
    super();
    this.name = name;
    this.version = version;

    // Initialize OpenAI client if API key is available
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      : null;

    // Initialize conversation memory service
    this.conversationMemoryService = new ConversationMemoryService();
  }

  abstract process(job: AgentJob): Promise<AgentResult>;

  protected abstract getCapabilities(): string[];

  protected emitProgress(
    jobId: string,
    progress: number,
    message: string,
    stage: string
  ): void {
    const progressUpdate: ProgressUpdate = {
      jobId,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      stage,
      agentName: this.name,
      estimatedTimeRemaining: this.calculateEstimatedTime(progress),
    };

    this.emit("progress", progressUpdate);
  }

  protected emitError(jobId: string, error: Error): void {
    this.emit("error", {
      jobId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }

  protected emitCompleted(jobId: string, result: AgentResult): void {
    this.tasksCompleted++;
    this.emit("completed", {
      jobId,
      result,
      timestamp: new Date(),
    });
  }

  protected calculateEstimatedTime(progress: number): number {
    if (progress <= 0) return 0;

    const elapsed = Date.now() - this.startTime.getTime();
    const totalEstimated = (elapsed / progress) * 100;
    return Math.max(0, totalEstimated - elapsed);
  }

  public getStatus(): AgentStatus {
    return {
      name: this.name,
      status: this.status,
      lastActivity: new Date(),
      tasksCompleted: this.tasksCompleted,
      tasksInQueue: this.tasksInQueue,
      uptime: Date.now() - this.startTime.getTime(),
      version: this.version,
    };
  }

  public async executeJob(job: AgentJob): Promise<AgentResult> {
    this.status = "processing";
    this.tasksInQueue++;

    try {
      this.emitProgress(
        job.id,
        0,
        `Starting ${this.name} agent...`,
        "initialization"
      );

      const result = await this.process(job);

      this.emitProgress(
        job.id,
        100,
        "Task completed successfully",
        "completed"
      );
      // Note: Don't emit completed event here - the queue handles job completion events

      this.status = "idle";
      this.tasksInQueue--;

      return result;
    } catch (error) {
      this.status = "error";
      this.tasksInQueue--;

      const errorResult: AgentResult = {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };

      // Note: Don't emit error event here - the queue handles job error events

      return errorResult;
    }
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected validateInput(input: any, schema: any): boolean {
    // Basic validation - can be enhanced with Zod or similar
    return input && typeof input === "object";
  }

  protected sanitizeOutput(output: any): any {
    // Remove sensitive information from output
    if (typeof output === "object" && output !== null) {
      const sanitized = { ...output };
      delete sanitized.apiKey;
      delete sanitized.password;
      delete sanitized.secret;
      return sanitized;
    }
    return output;
  }

  public getName(): string {
    return this.name;
  }

  public getVersion(): string {
    return this.version;
  }

  public isIdle(): boolean {
    return this.status === "idle";
  }

  public isProcessing(): boolean {
    return this.status === "processing";
  }

  /**
   * Get conversation context for this agent
   */
  protected async getConversationContext(
    userId: string,
    sessionId?: string
  ): Promise<string> {
    try {
      const agentType = this.name.toLowerCase() as
        | "falcon"
        | "sage"
        | "sentinel"
        | "prism";
      return await this.conversationMemoryService.formatContextForAgent(
        userId,
        agentType,
        sessionId
      );
    } catch (error) {
      console.error(
        `Error getting conversation context for ${this.name}:`,
        error
      );
      return "";
    }
  }

  /**
   * Save a message to conversation memory
   */
  protected async saveConversationMessage(
    sessionId: string,
    userId: string,
    role: "user" | "assistant" | "system",
    content: string,
    options: {
      messageType?: "chat" | "command" | "result" | "error" | "system";
      contextData?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const agentType = this.name.toLowerCase() as
        | "falcon"
        | "sage"
        | "sentinel"
        | "prism";
      await this.conversationMemoryService.saveMessage(
        sessionId,
        userId,
        agentType,
        role,
        content,
        options
      );
    } catch (error) {
      console.error(
        `Error saving conversation message for ${this.name}:`,
        error
      );
    }
  }

  /**
   * Generate contextual acknowledgment message using OpenAI with conversation context
   * Called when job starts processing
   */
  public async generateAcknowledgmentMessage(
    job: AgentJob,
    originalMessage: string
  ): Promise<string> {
    if (!this.openai) {
      return this.getFallbackAcknowledgmentMessage(job);
    }

    try {
      // Get conversation context
      const conversationContext = await this.getConversationContext(
        job.userId,
        job.sessionId
      );

      const systemPrompt = `You are ${this.name}, an AI agent in the SharpFlow platform. Generate a brief, contextual acknowledgment message that indicates you are starting to process the user's request. The message should:
- Be conversational and professional
- Reference the specific task being performed
- Be encouraging and set expectations
- Be 1-2 sentences maximum
- Use "I'm" or "I'll" to make it personal
- Don't use generic phrases like "working on your request"
- Consider previous conversation context if available`;

      let userPrompt = `Agent: ${this.name}
Job Type: ${job.jobType}
User's Original Message: "${originalMessage}"
Job Parameters: ${JSON.stringify(job.inputData)}`;

      if (conversationContext) {
        userPrompt += `\n\nPrevious conversation context:\n${conversationContext}`;
      }

      userPrompt += `\n\nGenerate a contextual acknowledgment message that shows you understand the specific request and are starting to process it.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      const message = completion.choices[0]?.message?.content;
      return message?.trim() || this.getFallbackAcknowledgmentMessage(job);
    } catch (error) {
      console.error(
        `Error generating acknowledgment message for ${this.name}:`,
        error
      );
      return this.getFallbackAcknowledgmentMessage(job);
    }
  }

  /**
   * Generate contextual completion message using OpenAI with conversation context
   * Called when job completes (success or failure)
   */
  public async generateCompletionMessage(
    job: AgentJob,
    result: AgentResult,
    originalMessage: string
  ): Promise<string> {
    if (!this.openai) {
      return this.getFallbackCompletionMessage(job, result);
    }

    try {
      // Get conversation context
      const conversationContext = await this.getConversationContext(
        job.userId,
        job.sessionId
      );

      const systemPrompt = `You are ${this.name}, an AI agent in the SharpFlow platform. Generate a contextual completion message based on the job result. The message should:
- Be conversational and professional
- Reference specific results or outcomes
- Be encouraging if successful, helpful if failed
- Be 1-2 sentences maximum
- Include specific numbers/details when available
- Use "I've" or "I" to make it personal
- Consider previous conversation context if available`;

      let userPrompt = `Agent: ${this.name}
Job Type: ${job.jobType}
User's Original Message: "${originalMessage}"
Job Success: ${result.success}
Job Result: ${JSON.stringify(result.data || result.error)}
${result.error ? `Error: ${result.error}` : ""}`;

      if (conversationContext) {
        userPrompt += `\n\nPrevious conversation context:\n${conversationContext}`;
      }

      userPrompt += `\n\nGenerate a contextual completion message that reflects the specific outcome of this task.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const message = completion.choices[0]?.message?.content;
      return message?.trim() || this.getFallbackCompletionMessage(job, result);
    } catch (error) {
      console.error(
        `Error generating completion message for ${this.name}:`,
        error
      );
      return this.getFallbackCompletionMessage(job, result);
    }
  }

  /**
   * Fallback acknowledgment messages when OpenAI is not available
   */
  private getFallbackAcknowledgmentMessage(job: AgentJob): string {
    const agentMessages = {
      Falcon: "I'm starting your lead generation search now...",
      Sage: "I'm beginning the research analysis for your LinkedIn profile...",
      Sentinel: "I'm processing your email automation request...",
    };

    return (
      agentMessages[this.name as keyof typeof agentMessages] ||
      `${this.name} is processing your request...`
    );
  }

  /**
   * Fallback completion messages when OpenAI is not available
   */
  private getFallbackCompletionMessage(
    job: AgentJob,
    result: AgentResult
  ): string {
    if (result.success) {
      const agentMessages = {
        Falcon: "Lead generation completed successfully!",
        Sage: "Research analysis completed successfully!",
        Sentinel: "Email automation task completed successfully!",
      };
      return (
        agentMessages[this.name as keyof typeof agentMessages] ||
        `${this.name} completed your request successfully!`
      );
    } else {
      return `${this.name} encountered an issue while processing your request.`;
    }
  }
}
