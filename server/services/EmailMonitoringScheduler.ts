import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { EventEmitter } from "events";
import { supabase } from "../db.js";
import { SentinelAgent } from "../ai-agents/agents/SentinelAgent.js";
import { NotificationService } from "./NotificationService.js";
import { v4 as uuidv4 } from "uuid";

interface EmailMonitoringJob {
  userId: string;
  configId: string;
  checkInterval: number;
  lastCheckAt?: string;
}

interface MonitoringConfig {
  id: string;
  user_id: string;
  monitoring_enabled: boolean;
  check_interval: number;
  last_check_at?: string;
  filter_criteria: any;
}

export class EmailMonitoringScheduler extends EventEmitter {
  private redis: Redis;
  private monitoringQueue: Queue;
  private monitoringWorker: Worker;
  private sentinelAgent: SentinelAgent;
  private notificationService: NotificationService;
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();

    // Temporarily disable Redis for development to avoid connection errors
    console.log(
      "⚠️ Email Monitoring Scheduler disabled (Redis not available in development)"
    );

    // Initialize services without Redis
    this.sentinelAgent = new SentinelAgent();
    this.notificationService = new NotificationService();

    console.log("📧 Email Monitoring Scheduler initialized (Redis disabled)");
  }

  private initializeQueue(): void {
    this.monitoringQueue = new Queue("email-monitoring", {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    console.log("📋 Email monitoring queue initialized");
  }

  private initializeWorker(): void {
    this.monitoringWorker = new Worker(
      "email-monitoring",
      async (job: Job<EmailMonitoringJob>) => {
        return this.processEmailMonitoringJob(job);
      },
      {
        connection: this.redis,
        concurrency: 5, // Process up to 5 monitoring jobs concurrently
      }
    );

    // Setup worker event listeners
    this.monitoringWorker.on("completed", (job: Job, result: any) => {
      console.log(
        `✅ Email monitoring job ${job.id} completed for user ${job.data.userId}`
      );
      this.emit("monitoring:completed", {
        jobId: job.id,
        userId: job.data.userId,
        result,
        timestamp: new Date(),
      });
    });

    this.monitoringWorker.on("failed", (job: Job | undefined, error: Error) => {
      console.error(`❌ Email monitoring job ${job?.id} failed:`, error);
      this.emit("monitoring:failed", {
        jobId: job?.id,
        userId: job?.data?.userId,
        error: error.message,
        timestamp: new Date(),
      });
    });

    console.log("👷 Email monitoring worker initialized");
  }

  /**
   * Start email monitoring for a user
   */
  async startMonitoring(userId: string): Promise<void> {
    console.log(
      `⚠️ Email monitoring disabled for development (user ${userId})`
    );
    return;
  }

  /**
   * Stop email monitoring for a user
   */
  async stopMonitoring(userId: string): Promise<void> {
    console.log(
      `⚠️ Email monitoring disabled for development (user ${userId})`
    );
    return;
  }

  /**
   * Process a single email monitoring job
   */
  private async processEmailMonitoringJob(
    job: Job<EmailMonitoringJob>
  ): Promise<any> {
    const { userId, configId, checkInterval } = job.data;
    const startTime = Date.now();

    try {
      console.log(`📧 Processing email monitoring job for user ${userId}`);

      // Update last check timestamp
      await this.updateLastCheckTime(configId);

      // Create agent job for email monitoring
      const agentJobId = uuidv4();
      const agentJob = {
        id: agentJobId,
        userId,
        jobType: "email_monitoring",
        inputData: {
          checkInterval,
          automated: true,
        },
        createdAt: new Date().toISOString(),
      };

      // Process emails using Sentinel agent
      const result = await this.sentinelAgent.processJob(agentJob);

      const processingTime = Date.now() - startTime;

      // Send notification if new emails were processed
      if (result.success && result.data?.emailsProcessed > 0) {
        await this.notificationService.createNotification({
          userId,
          type: "job_completed",
          title: "New Emails Processed",
          message: `Sentinel processed ${result.data.emailsProcessed} new email(s)`,
          agentName: "sentinel",
          jobId: agentJobId,
          jobType: "email_monitoring",
          metadata: {
            emailsProcessed: result.data.emailsProcessed,
            processingTime,
          },
        });
      }

      return {
        success: true,
        emailsProcessed: result.data?.emailsProcessed || 0,
        processingTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error(
        `❌ Error in email monitoring job for user ${userId}:`,
        error
      );

      // Send error notification
      await this.notificationService.createNotification({
        userId,
        type: "job_failed",
        title: "Email Monitoring Error",
        message: `Email monitoring failed: ${error.message}`,
        agentName: "sentinel",
        metadata: {
          error: error.message,
          processingTime: Date.now() - startTime,
        },
      });

      throw error;
    }
  }

  /**
   * Get monitoring configuration for a user
   */
  private async getMonitoringConfig(
    userId: string
  ): Promise<MonitoringConfig | null> {
    if (!supabase) {
      console.warn("⚠️ Supabase not configured");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("email_monitoring_config")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No config found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error(
        `❌ Error fetching monitoring config for user ${userId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Update last check timestamp
   */
  private async updateLastCheckTime(configId: string): Promise<void> {
    if (!supabase) {
      return;
    }

    try {
      await supabase
        .from("email_monitoring_config")
        .update({
          last_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", configId);
    } catch (error: any) {
      console.error(`❌ Error updating last check time:`, error);
    }
  }

  /**
   * Get monitoring status for all users
   */
  async getMonitoringStatus(): Promise<any[]> {
    const jobs = await this.monitoringQueue.getJobs([
      "waiting",
      "delayed",
      "active",
    ]);

    return jobs.map((job) => ({
      jobId: job.id,
      userId: job.data.userId,
      status: job.opts?.repeat ? "recurring" : "one-time",
      nextRun: job.opts?.delay ? new Date(Date.now() + job.opts.delay) : null,
      interval: job.data.checkInterval,
    }));
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log("🔄 Shutting down Email Monitoring Scheduler...");

    // Clear all active timers
    for (const [userId, timerId] of this.activeMonitors) {
      clearTimeout(timerId);
    }
    this.activeMonitors.clear();

    // Close worker and queue
    await this.monitoringWorker.close();
    await this.monitoringQueue.close();
    await this.redis.quit();

    console.log("✅ Email Monitoring Scheduler shutdown complete");
  }
}
