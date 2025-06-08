import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { EventEmitter } from "events";
import type { AgentJob, AgentResult } from "../types/index.js";
import { AgentFactory } from "./AgentFactory.js";
import { BaseAgent } from "./BaseAgent.js";

export class JobQueue extends EventEmitter {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    super();

    try {
      // Initialize Redis connection with better error handling
      this.redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: 1, // Limit retries to reduce error spam
        lazyConnect: true,
        connectTimeout: 5000,
        retryDelayOnClusterDown: 300,
      });

      // Suppress Redis connection error logs to reduce noise
      this.redis.on("error", (error) => {
        // Only log the first error, then suppress subsequent ones
        if (!this.redis.status || this.redis.status === "connecting") {
          console.warn("⚠️ Redis connection failed, will use fallback system");
        }
      });

      this.setupQueues();
    } catch (error) {
      console.error("❌ Redis JobQueue initialization failed:", error);
      throw error;
    }
  }

  private setupQueues(): void {
    const queueNames = ["falcon", "sage", "sentinel"];

    queueNames.forEach((queueName) => {
      // Create queue
      const queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      this.queues.set(queueName, queue);

      // Create worker
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          return this.processJob(queueName, job);
        },
        {
          connection: this.redis,
          concurrency: 2, // Process 2 jobs concurrently per agent
        }
      );

      // Setup worker event listeners
      worker.on("completed", (job: Job, result: any) => {
        console.log(`✅ Job ${job.id} completed in queue ${queueName}`);
        this.emit("job:completed", {
          jobId: job.id,
          queueName,
          result,
          timestamp: new Date(),
        });
      });

      worker.on("failed", (job: Job | undefined, err: Error) => {
        console.error(
          `❌ Job ${job?.id} failed in queue ${queueName}:`,
          err.message
        );
        this.emit("job:failed", {
          jobId: job?.id,
          queueName,
          error: err.message,
          timestamp: new Date(),
        });
      });

      worker.on("progress", (job: Job, progress: number | object) => {
        this.emit("job:progress", {
          jobId: job.id,
          queueName,
          progress,
          timestamp: new Date(),
        });
      });

      this.workers.set(queueName, worker);
    });
  }

  private async processJob(queueName: string, job: Job): Promise<AgentResult> {
    const userId = job.data.userId;

    if (!userId) {
      throw new Error(`User ID not found in job data for job ${job.id}`);
    }

    // Get user-specific agent instance
    const agent = await AgentFactory.getUserAgent(userId, queueName);

    if (!agent) {
      throw new Error(
        `User-specific agent not found for user ${userId}, agent ${queueName}. Please check your subscription and agent configuration.`
      );
    }

    console.log(
      `🚀 Processing job ${job.id} with user-specific ${queueName} agent for user ${userId}`
    );

    // Convert Bull job to AgentJob format
    const agentJob: AgentJob = {
      id: job.id as string,
      userId: job.data.userId,
      agentName: queueName,
      jobType: job.data.jobType || queueName,
      status: "processing",
      progress: 0,
      inputData: job.data.inputData,
      createdAt: new Date(job.timestamp),
    };

    // Update job progress callback
    const updateProgress = (progress: number) => {
      job.updateProgress(progress);
    };

    // Execute the agent job
    const result = await agent.executeJob(agentJob);

    return result;
  }

  async addJob(
    agentName: string,
    jobData: {
      userId: string;
      jobType: string;
      inputData: any;
      priority?: number;
      delay?: number;
    }
  ): Promise<string> {
    const queue = this.queues.get(agentName);

    if (!queue) {
      throw new Error(`Queue not found for agent: ${agentName}`);
    }

    const job = await queue.add(`${agentName}_job`, jobData, {
      priority: jobData.priority || 0,
      delay: jobData.delay || 0,
    });

    console.log(`📋 Added job ${job.id} to ${agentName} queue`);

    this.emit("job:added", {
      jobId: job.id,
      agentName,
      userId: jobData.userId,
      timestamp: new Date(),
    });

    return job.id as string;
  }

  async getJobStatus(jobId: string, queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      opts: job.opts,
    };
  }

  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  async getAllQueueStats(): Promise<any[]> {
    const stats = [];

    for (const queueName of this.queues.keys()) {
      const queueStats = await this.getQueueStats(queueName);
      stats.push(queueStats);
    }

    return stats;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.pause();
    console.log(`⏸️ Paused queue: ${queueName}`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.resume();
    console.log(`▶️ Resumed queue: ${queueName}`);
  }

  async removeJob(jobId: string, queueName: string): Promise<boolean> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.remove();
    console.log(`🗑️ Removed job ${jobId} from ${queueName} queue`);

    return true;
  }

  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up job queue...");

    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    // Close Redis connection
    await this.redis.quit();

    console.log("✅ Job queue cleanup completed");
  }

  getAgentStatus(agentName: string): any {
    // Since we're using user-specific agents, return queue status instead
    const queue = this.queues.get(agentName);
    if (!queue) {
      return null;
    }

    return {
      name: agentName,
      status: "available", // Agents are created on-demand
      queueName: agentName,
    };
  }

  getAllAgentStatuses(): any[] {
    const statuses = [];

    for (const queueName of this.queues.keys()) {
      statuses.push({
        name: queueName,
        status: "available", // Agents are created on-demand
        queueName: queueName,
      });
    }

    return statuses;
  }
}
