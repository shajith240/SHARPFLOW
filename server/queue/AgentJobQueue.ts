import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { supabase } from "../lib/supabase";
import { LeadGenService } from "../services/LeadGenService";
import { ResearchService } from "../services/ResearchService";
import { EmailService } from "../services/EmailService";
import { TelegramNotificationService } from "../services/TelegramNotificationService";
import { WebSocketManager } from "../websocket/WebSocketManager";

// Redis connection
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Job types
export interface LeadGenJobData {
  userId: string;
  jobId: string;
  searchCriteria: {
    locations: string[];
    businesses: string[];
    jobTitles: string[];
  };
}

export interface ResearchJobData {
  userId: string;
  jobId: string;
  leadId: string;
  linkedinUrl: string;
}

export interface EmailJobData {
  userId: string;
  jobId: string;
  campaignId: string;
  leadIds: string[];
}

// Queue definitions
export const leadGenQueue = new Queue("leadgen", { connection: redis });
export const researchQueue = new Queue("research", { connection: redis });
export const emailQueue = new Queue("email", { connection: redis });

// Job status updater
async function updateJobStatus(
  jobId: string,
  status: "pending" | "processing" | "completed" | "failed",
  outputData?: any,
  errorMessage?: string
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "processing") {
    updateData.started_at = new Date().toISOString();
  } else if (status === "completed") {
    updateData.completed_at = new Date().toISOString();
    if (outputData) updateData.output_data = outputData;
  } else if (status === "failed") {
    updateData.error_message = errorMessage;
  }

  await supabase.from("agent_jobs").update(updateData).eq("id", jobId);
}

// Lead Generation Worker
const leadGenWorker = new Worker(
  "leadgen",
  async (job: Job<LeadGenJobData>) => {
    const { userId, jobId, searchCriteria } = job.data;

    try {
      await updateJobStatus(jobId, "processing");

      // Send real-time update to dashboard
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 10 },
      });

      // Update progress
      job.updateProgress(10);

      // Execute lead generation
      const leadGenService = new LeadGenService();
      const results = await leadGenService.searchLeads(searchCriteria);

      job.updateProgress(50);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 50 },
      });

      // Store leads directly in SharpFlow database (not Google Sheets)
      const leads = await leadGenService.storeLeads(
        userId,
        results,
        searchCriteria
      );

      job.updateProgress(80);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 80 },
      });

      // Update usage tracking
      await leadGenService.updateUsageTracking(userId, leads.length);

      job.updateProgress(100);

      await updateJobStatus(jobId, "completed", {
        leadsFound: leads.length,
        leadIds: leads.map((l) => l.id),
      });

      // Send completion notification to dashboard
      WebSocketManager.broadcastToUser(userId, {
        type: "job_completed",
        data: {
          jobId,
          agentType: "leadgen",
          status: "completed",
          progress: 100,
          result: { leadsCount: leads.length },
        },
      });

      // Send Telegram notification
      await TelegramNotificationService.notifyLeadGenerationComplete(
        userId,
        leads.length,
        searchCriteria
      );

      return { success: true, leadsCount: leads.length };
    } catch (error) {
      console.error("Lead generation job failed:", error);
      await updateJobStatus(jobId, "failed", null, error.message);

      // Send failure notification to dashboard
      WebSocketManager.broadcastToUser(userId, {
        type: "job_failed",
        data: {
          jobId,
          agentType: "leadgen",
          status: "failed",
          error: error.message,
        },
      });

      // Send Telegram error notification
      await TelegramNotificationService.notifyJobFailed(
        userId,
        "lead generation",
        error.message
      );

      throw error;
    }
  },
  { connection: redis }
);

// Research Worker
const researchWorker = new Worker(
  "research",
  async (job: Job<ResearchJobData>) => {
    const { userId, jobId, leadId, linkedinUrl } = job.data;

    try {
      await updateJobStatus(jobId, "processing");
      job.updateProgress(5);

      // Send real-time update to dashboard
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 5 },
      });

      const researchService = new ResearchService();

      // Step 1: Scrape LinkedIn profile and posts
      job.updateProgress(20);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 20 },
      });
      const linkedinData = await researchService.scrapeLinkedInProfile(
        linkedinUrl
      );

      // Step 2: Research company
      job.updateProgress(40);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 40 },
      });
      const companyResearch = await researchService.researchCompany(
        linkedinData.company,
        linkedinData.companyWebsite
      );

      // Step 3: Get TrustPilot reviews
      job.updateProgress(60);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 60 },
      });
      const reviews = await researchService.getTrustPilotReviews(
        linkedinData.companyDomain
      );

      // Step 4: Generate AI insights
      job.updateProgress(80);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 80 },
      });
      const insights = await researchService.generateInsights(
        linkedinData,
        companyResearch,
        reviews
      );

      // Step 5: Create HTML report
      job.updateProgress(90);
      WebSocketManager.broadcastToUser(userId, {
        type: "job_progress",
        data: { jobId, status: "processing", progress: 90 },
      });
      const htmlReport = await researchService.generateHTMLReport(
        linkedinData,
        companyResearch,
        reviews,
        insights
      );

      // Step 6: Store report directly in SharpFlow database (no email delivery)
      const report = await researchService.storeReport(
        userId,
        leadId,
        htmlReport,
        insights,
        {
          linkedinData,
          companyResearch,
          reviews,
        }
      );

      job.updateProgress(100);

      await updateJobStatus(jobId, "completed", {
        reportId: report.id,
        reportName: report.report_name,
      });

      // Send completion notification to dashboard
      WebSocketManager.broadcastToUser(userId, {
        type: "job_completed",
        data: {
          jobId,
          agentType: "research",
          status: "completed",
          progress: 100,
          result: { reportId: report.id, reportName: report.report_name },
        },
      });

      // Send Telegram notification
      await TelegramNotificationService.notifyResearchReportComplete(
        userId,
        report.report_name,
        linkedinUrl
      );

      return { success: true, reportId: report.id };
    } catch (error) {
      console.error("Research job failed:", error);
      await updateJobStatus(jobId, "failed", null, error.message);

      // Send failure notification to dashboard
      WebSocketManager.broadcastToUser(userId, {
        type: "job_failed",
        data: {
          jobId,
          agentType: "research",
          status: "failed",
          error: error.message,
        },
      });

      // Send Telegram error notification
      await TelegramNotificationService.notifyJobFailed(
        userId,
        "research report",
        error.message
      );

      throw error;
    }
  },
  { connection: redis }
);

// Email Campaign Worker
const emailWorker = new Worker(
  "email",
  async (job: Job<EmailJobData>) => {
    const { userId, jobId, campaignId, leadIds } = job.data;

    try {
      await updateJobStatus(jobId, "processing");

      const emailService = new EmailService();

      // Get campaign details
      const campaign = await emailService.getCampaign(campaignId);
      if (!campaign) throw new Error("Campaign not found");

      job.updateProgress(10);

      // Process each lead
      const totalLeads = leadIds.length;
      let processedLeads = 0;

      for (const leadId of leadIds) {
        try {
          // Get lead and research data
          const lead = await emailService.getLead(leadId);
          const researchReport = await emailService.getLatestResearchReport(
            leadId
          );

          // Generate personalized email
          const personalizedEmail = await emailService.personalizeEmail(
            campaign,
            lead,
            researchReport
          );

          // Send email
          await emailService.sendEmail(campaignId, leadId, personalizedEmail);

          processedLeads++;
          job.updateProgress(10 + (processedLeads / totalLeads) * 80);

          // Rate limiting - wait between emails
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (emailError) {
          console.error(`Failed to send email to lead ${leadId}:`, emailError);
          // Continue with other leads
        }
      }

      // Update campaign metrics
      await emailService.updateCampaignMetrics(campaignId);

      job.updateProgress(100);

      await updateJobStatus(jobId, "completed", {
        campaignId,
        emailsSent: processedLeads,
        totalLeads,
      });

      return { success: true, emailsSent: processedLeads };
    } catch (error) {
      console.error("Email campaign job failed:", error);
      await updateJobStatus(jobId, "failed", null, error.message);
      throw error;
    }
  },
  { connection: redis }
);

// Queue management functions
export class AgentJobQueue {
  static async addLeadGenJob(
    userId: string,
    searchCriteria: LeadGenJobData["searchCriteria"]
  ): Promise<string> {
    // Create job record in database
    const { data: jobRecord } = await supabase
      .from("agent_jobs")
      .insert({
        user_id: userId,
        agent_type: "leadgen",
        job_type: "search_leads",
        status: "pending",
        input_data: { searchCriteria },
      })
      .select()
      .single();

    // Add to queue
    await leadGenQueue.add(
      "search-leads",
      {
        userId,
        jobId: jobRecord.id,
        searchCriteria,
      },
      {
        priority: 1,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    return jobRecord.id;
  }

  static async addResearchJob(
    userId: string,
    leadId: string,
    linkedinUrl: string
  ): Promise<string> {
    const { data: jobRecord } = await supabase
      .from("agent_jobs")
      .insert({
        user_id: userId,
        agent_type: "research",
        job_type: "generate_report",
        status: "pending",
        input_data: { leadId, linkedinUrl },
      })
      .select()
      .single();

    await researchQueue.add(
      "generate-report",
      {
        userId,
        jobId: jobRecord.id,
        leadId,
        linkedinUrl,
      },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    return jobRecord.id;
  }

  static async addEmailJob(
    userId: string,
    campaignId: string,
    leadIds: string[]
  ): Promise<string> {
    const { data: jobRecord } = await supabase
      .from("agent_jobs")
      .insert({
        user_id: userId,
        agent_type: "email",
        job_type: "send_campaign",
        status: "pending",
        input_data: { campaignId, leadIds },
      })
      .select()
      .single();

    await emailQueue.add(
      "send-campaign",
      {
        userId,
        jobId: jobRecord.id,
        campaignId,
        leadIds,
      },
      {
        priority: 3,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    return jobRecord.id;
  }

  static async getJobStatus(jobId: string) {
    const { data: job } = await supabase
      .from("agent_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    return job;
  }

  static async getQueueStats() {
    const [leadGenStats, researchStats, emailStats] = await Promise.all([
      leadGenQueue.getWaiting(),
      researchQueue.getWaiting(),
      emailQueue.getWaiting(),
    ]);

    return {
      leadgen: {
        waiting: leadGenStats.length,
        active: await leadGenQueue.getActive().then((jobs) => jobs.length),
      },
      research: {
        waiting: researchStats.length,
        active: await researchQueue.getActive().then((jobs) => jobs.length),
      },
      email: {
        waiting: emailStats.length,
        active: await emailQueue.getActive().then((jobs) => jobs.length),
      },
    };
  }
}

// Error handling
leadGenWorker.on("failed", (job, err) => {
  console.error(`Lead generation job ${job?.id} failed:`, err);
});

researchWorker.on("failed", (job, err) => {
  console.error(`Research job ${job?.id} failed:`, err);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err);
});

export { leadGenWorker, researchWorker, emailWorker };
