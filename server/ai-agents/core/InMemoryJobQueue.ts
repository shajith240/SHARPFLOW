import { EventEmitter } from "events";
import type { AgentJob, AgentResult } from "../types/index.js";
import { FalconAgent } from "../agents/FalconAgent.js";
import { SageAgent } from "../agents/SageAgent.js";
import { SentinelAgent } from "../agents/SentinelAgent.js";

interface QueueJob {
  id: string;
  name: string;
  data: any;
  progress: number;
  returnvalue?: any;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
  opts: any;
  status: "waiting" | "active" | "completed" | "failed";
}

export class InMemoryJobQueue extends EventEmitter {
  private queues: Map<string, QueueJob[]> = new Map();
  private agents: Map<string, any> = new Map();
  private jobCounter = 0;
  private processingJobs: Map<string, QueueJob> = new Map();
  private completedJobs: Map<string, QueueJob> = new Map(); // Store completed jobs temporarily

  constructor() {
    super();

    console.log("🔄 Using In-Memory Job Queue (Redis not available)");

    this.initializeAgents();
    this.setupQueues();
  }

  private initializeAgents(): void {
    this.agents.set("falcon", new FalconAgent());
    this.agents.set("sage", new SageAgent());
    this.agents.set("sentinel", new SentinelAgent());

    // Setup agent event listeners for progress only
    // Note: We don't listen to completion events here because the queue handles them
    this.agents.forEach((agent, name) => {
      agent.on("progress", (progressUpdate: any) => {
        this.emit("job:progress", progressUpdate);
      });

      // We don't listen to completed/error events here to avoid duplicates
      // The queue itself emits these events after processing
    });
  }

  private setupQueues(): void {
    const queueNames = ["falcon", "sage", "sentinel"];

    queueNames.forEach((queueName) => {
      this.queues.set(queueName, []);
    });

    console.log(
      "✅ In-Memory Job Queue initialized for agents:",
      queueNames.join(", ")
    );
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

    const jobId = `job_${++this.jobCounter}_${Date.now()}`;

    const job: QueueJob = {
      id: jobId,
      name: `${agentName}_job`,
      data: jobData,
      progress: 0,
      opts: {
        priority: jobData.priority || 0,
        delay: jobData.delay || 0,
      },
      status: "waiting",
    };

    queue.push(job);

    console.log(`📋 Added job ${jobId} to ${agentName} queue`);

    this.emit("job:added", {
      jobId,
      agentName,
      userId: jobData.userId,
      timestamp: new Date(),
    });

    // Process job immediately (in a real queue system, this would be handled by workers)
    setTimeout(() => this.processNextJob(agentName), 100);

    return jobId;
  }

  private async processNextJob(agentName: string): Promise<void> {
    const queue = this.queues.get(agentName);
    const agent = this.agents.get(agentName);

    if (!queue || !agent || queue.length === 0) {
      return;
    }

    const job = queue.shift();
    if (!job) return;

    job.status = "active";
    job.processedOn = Date.now();
    this.processingJobs.set(job.id, job);

    console.log(`🚀 Processing job ${job.id} with ${agentName} agent`);

    try {
      // Convert to AgentJob format
      const agentJob: AgentJob = {
        id: job.id,
        userId: job.data.userId,
        agentName: agentName,
        jobType: job.data.jobType || agentName,
        status: "processing",
        progress: 0,
        inputData: job.data.inputData,
        createdAt: new Date(),
      };

      // Execute the agent job
      const result = await agent.executeJob(agentJob);

      // Mark job as completed
      job.status = "completed";
      job.finishedOn = Date.now();
      job.returnvalue = result;
      job.progress = 100;

      this.processingJobs.delete(job.id);

      // Store completed job temporarily for status retrieval
      this.completedJobs.set(job.id, job);

      // Clean up old completed jobs (keep only last 100)
      if (this.completedJobs.size > 100) {
        const oldestKey = this.completedJobs.keys().next().value;
        this.completedJobs.delete(oldestKey);
      }

      this.emit("job:completed", {
        jobId: job.id,
        queueName: agentName,
        result,
        timestamp: new Date(),
      });

      console.log(`✅ Job ${job.id} completed in queue ${agentName}`);
    } catch (error) {
      // Mark job as failed
      job.status = "failed";
      job.finishedOn = Date.now();
      job.failedReason =
        error instanceof Error ? error.message : "Unknown error";

      this.processingJobs.delete(job.id);

      // Store failed job temporarily for status retrieval
      this.completedJobs.set(job.id, job);

      this.emit("job:failed", {
        jobId: job.id,
        queueName: agentName,
        error: job.failedReason,
        timestamp: new Date(),
      });

      console.error(
        `❌ Job ${job.id} failed in queue ${agentName}:`,
        job.failedReason
      );
    }
  }

  async getJobStatus(jobId: string, queueName: string): Promise<any> {
    // Check if job is currently processing
    const processingJob = this.processingJobs.get(jobId);
    if (processingJob) {
      return {
        id: processingJob.id,
        name: processingJob.name,
        data: processingJob.data,
        progress: processingJob.progress,
        returnvalue: processingJob.returnvalue,
        failedReason: processingJob.failedReason,
        processedOn: processingJob.processedOn,
        finishedOn: processingJob.finishedOn,
        opts: processingJob.opts,
        status: processingJob.status,
      };
    }

    // Check completed jobs
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) {
      return {
        id: completedJob.id,
        name: completedJob.name,
        data: completedJob.data,
        progress: completedJob.progress,
        returnvalue: completedJob.returnvalue,
        failedReason: completedJob.failedReason,
        processedOn: completedJob.processedOn,
        finishedOn: completedJob.finishedOn,
        opts: completedJob.opts,
        status: completedJob.status,
      };
    }

    // Check all queues for the job (not just the specified queue)
    for (const [currentQueueName, queue] of this.queues.entries()) {
      const job = queue.find((j) => j.id === jobId);
      if (job) {
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
          status: job.status,
        };
      }
    }

    // Check in queue
    const queue = this.queues.get(queueName);
    if (queue) {
      const job = queue.find((j) => j.id === jobId);
      if (job) {
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
          status: job.status,
        };
      }
    }

    return null;
  }

  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const waiting = queue.filter((j) => j.status === "waiting");
    const active = Array.from(this.processingJobs.values()).filter((j) =>
      j.name.startsWith(queueName)
    );
    const completed = queue.filter((j) => j.status === "completed");
    const failed = queue.filter((j) => j.status === "failed");

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
    console.log(`⏸️ Paused queue: ${queueName} (in-memory implementation)`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    console.log(`▶️ Resumed queue: ${queueName} (in-memory implementation)`);
  }

  async removeJob(jobId: string, queueName: string): Promise<boolean> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobIndex = queue.findIndex((j) => j.id === jobId);

    if (jobIndex !== -1) {
      queue.splice(jobIndex, 1);
      console.log(`🗑️ Removed job ${jobId} from ${queueName} queue`);
      return true;
    }

    // Check if job is currently processing
    if (this.processingJobs.has(jobId)) {
      this.processingJobs.delete(jobId);
      console.log(
        `🗑️ Cancelled processing job ${jobId} from ${queueName} queue`
      );
      return true;
    }

    return false;
  }

  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up in-memory job queue...");

    this.queues.clear();
    this.processingJobs.clear();
    this.completedJobs.clear();
    this.agents.clear();

    console.log("✅ In-memory job queue cleanup completed");
  }

  getAgentStatus(agentName: string): any {
    const agent = this.agents.get(agentName);

    if (!agent) {
      return null;
    }

    return agent.getStatus();
  }

  getAllAgentStatuses(): any[] {
    const statuses = [];

    for (const [name, agent] of this.agents.entries()) {
      statuses.push({
        name,
        ...agent.getStatus(),
      });
    }

    return statuses;
  }
}
