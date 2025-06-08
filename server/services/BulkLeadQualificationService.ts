import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { LeadQualificationService } from "./LeadQualificationService.js";

export interface QualificationJob {
  id: string;
  userId: string;
  leadId?: string;
  jobType: "single_lead" | "bulk_qualification" | "auto_qualification";
  jobStatus: "queued" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  leadsToProcess: number;
  leadsProcessed: number;
  leadsQualified: number;
  startedAt?: Date;
  completedAt?: Date;
  processingTimeMs?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  qualificationResults: Record<string, any>;
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkQualificationResult {
  jobId: string;
  totalLeads: number;
  processedLeads: number;
  qualifiedLeads: number;
  highQualityLeads: number;
  mediumQualityLeads: number;
  lowQualityLeads: number;
  failedLeads: number;
  processingTimeMs: number;
  tokensUsed: number;
  errors: string[];
}

export class BulkLeadQualificationService {
  private qualificationService: LeadQualificationService;

  constructor() {
    this.qualificationService = new LeadQualificationService();
  }

  /**
   * Start bulk qualification of all unqualified leads for a user
   */
  async startBulkQualification(userId: string): Promise<string> {
    try {
      // Get count of unqualified leads
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", userId)
        .is("qualification_rating", null);

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      if (!leads || leads.length === 0) {
        throw new Error("No unqualified leads found");
      }

      // Create qualification job with correct database column names
      const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const job = {
        id: jobId,
        user_id: userId,
        job_type: "bulk_qualification",
        job_status: "queued",
        priority: 5,
        leads_to_process: leads.length,
        leads_processed: 0,
        leads_qualified: 0,
        retry_count: 0,
        max_retries: 3,
        qualification_results: {},
        tokens_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: jobError } = await supabase
        .from("lead_qualification_jobs")
        .insert([job]);

      if (jobError) {
        throw new Error(
          `Failed to create qualification job: ${jobError.message}`
        );
      }

      // Start processing in background
      this.processBulkQualification(jobId).catch((error) => {
        console.error(`Background qualification job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, "failed", error.message);
      });

      return jobId;
    } catch (error) {
      console.error("Error starting bulk qualification:", error);
      throw error;
    }
  }

  /**
   * Process bulk qualification job
   */
  private async processBulkQualification(jobId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status to processing
      await this.updateJobStatus(jobId, "processing");

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from("lead_qualification_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error("Job not found");
      }

      // Get unqualified leads for this user
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", job.user_id)
        .is("qualification_rating", null)
        .order("created_at", { ascending: false });

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      if (!leads || leads.length === 0) {
        await this.updateJobStatus(jobId, "completed", null, {
          processingTimeMs: Date.now() - startTime,
          leadsProcessed: 0,
          leadsQualified: 0,
        });
        return;
      }

      let processedCount = 0;
      let qualifiedCount = 0;
      let totalTokens = 0;
      const results: Record<string, any> = {};
      const errors: string[] = [];

      // Process leads in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);

        for (const lead of batch) {
          try {
            // Qualify individual lead
            const qualificationResult =
              await this.qualificationService.qualifyLead(lead.id, job.user_id);

            // Update lead with qualification results
            await this.updateLeadQualification(
              lead.id,
              job.user_id,
              qualificationResult
            );

            processedCount++;
            qualifiedCount++;
            totalTokens += qualificationResult.tokensUsed || 0;

            results[lead.id] = {
              rating: qualificationResult.qualificationStatus,
              score: qualificationResult.overallScore,
              reasoning: qualificationResult.qualificationReasoning,
            };

            // Update job progress
            await this.updateJobProgress(
              jobId,
              processedCount,
              qualifiedCount,
              totalTokens
            );
          } catch (error) {
            console.error(`Failed to qualify lead ${lead.id}:`, error);
            errors.push(
              `Lead ${lead.full_name}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            processedCount++;
          }
        }

        // Small delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Complete the job
      const processingTime = Date.now() - startTime;
      await this.updateJobStatus(jobId, "completed", null, {
        processingTimeMs: processingTime,
        leadsProcessed: processedCount,
        leadsQualified: qualifiedCount,
        qualificationResults: { results, errors },
        tokensUsed: totalTokens,
      });
    } catch (error) {
      console.error(`Bulk qualification job ${jobId} failed:`, error);
      await this.updateJobStatus(
        jobId,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * Update lead with qualification results
   */
  private async updateLeadQualification(
    leadId: string,
    userId: string,
    qualificationResult: any
  ): Promise<void> {
    // Map qualification status to rating
    let rating: string;
    if (qualificationResult.overallScore >= 80) {
      rating = "high";
    } else if (qualificationResult.overallScore >= 60) {
      rating = "medium";
    } else {
      rating = "low";
    }

    const { error } = await supabase
      .from("leads")
      .update({
        qualification_rating: rating,
        qualification_score: qualificationResult.overallScore,
        qualification_date: new Date().toISOString(),
        qualification_criteria: qualificationResult.criteriaScores || {},
        qualification_reasoning: qualificationResult.qualificationReasoning,
        auto_qualified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to update lead qualification: ${error.message}`);
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string | null,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const updateData: Record<string, any> = {
      job_status: status,
      updated_at: new Date().toISOString(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (status === "processing") {
      updateData.started_at = new Date().toISOString();
    }

    if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const { error } = await supabase
      .from("lead_qualification_jobs")
      .update(updateData)
      .eq("id", jobId);

    if (error) {
      console.error(`Failed to update job status: ${error.message}`);
    }
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    processed: number,
    qualified: number,
    tokens: number
  ): Promise<void> {
    const { error } = await supabase
      .from("lead_qualification_jobs")
      .update({
        leads_processed: processed,
        leads_qualified: qualified,
        tokens_used: tokens,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) {
      console.error(`Failed to update job progress: ${error.message}`);
    }
  }

  /**
   * Get qualification job status
   */
  async getJobStatus(
    jobId: string,
    userId: string
  ): Promise<QualificationJob | null> {
    const { data, error } = await supabase
      .from("lead_qualification_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching job status:", error);
      return null;
    }

    return data as QualificationJob;
  }

  /**
   * Get qualification statistics for a user
   */
  async getQualificationStats(userId: string): Promise<any> {
    const { data, error } = await supabase.rpc("get_qualification_stats", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching qualification stats:", error);
      return null;
    }

    return (
      data[0] || {
        total_leads: 0,
        qualified_leads: 0,
        high_quality_leads: 0,
        medium_quality_leads: 0,
        low_quality_leads: 0,
        unqualified_leads: 0,
        avg_qualification_score: 0,
      }
    );
  }

  /**
   * Re-qualify specific leads
   */
  async requalifyLeads(leadIds: string[], userId: string): Promise<string> {
    try {
      // Create qualification job with correct database column names
      const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const job = {
        id: jobId,
        user_id: userId,
        job_type: "bulk_qualification",
        job_status: "queued",
        priority: 3, // Higher priority for manual re-qualification
        leads_to_process: leadIds.length,
        leads_processed: 0,
        leads_qualified: 0,
        retry_count: 0,
        max_retries: 3,
        qualification_results: { leadIds },
        tokens_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: jobError } = await supabase
        .from("lead_qualification_jobs")
        .insert([job]);

      if (jobError) {
        throw new Error(
          `Failed to create re-qualification job: ${jobError.message}`
        );
      }

      // Start processing specific leads
      this.processSpecificLeads(jobId, leadIds).catch((error) => {
        console.error(`Re-qualification job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, "failed", error.message);
      });

      return jobId;
    } catch (error) {
      console.error("Error starting re-qualification:", error);
      throw error;
    }
  }

  /**
   * Process specific leads for re-qualification
   */
  private async processSpecificLeads(
    jobId: string,
    leadIds: string[]
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await this.updateJobStatus(jobId, "processing");

      const { data: job, error: jobError } = await supabase
        .from("lead_qualification_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error("Job not found");
      }

      // Get specific leads
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", job.user_id)
        .in("id", leadIds);

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      if (!leads || leads.length === 0) {
        await this.updateJobStatus(jobId, "completed", null, {
          processingTimeMs: Date.now() - startTime,
          leadsProcessed: 0,
          leadsQualified: 0,
        });
        return;
      }

      let processedCount = 0;
      let qualifiedCount = 0;
      let totalTokens = 0;
      const results: Record<string, any> = {};

      for (const lead of leads) {
        try {
          const qualificationResult =
            await this.qualificationService.qualifyLead(lead.id, job.user_id);

          await this.updateLeadQualification(
            lead.id,
            job.user_id,
            qualificationResult
          );

          processedCount++;
          qualifiedCount++;
          totalTokens += qualificationResult.tokensUsed || 0;

          results[lead.id] = {
            rating: qualificationResult.qualificationStatus,
            score: qualificationResult.overallScore,
            reasoning: qualificationResult.qualificationReasoning,
          };

          await this.updateJobProgress(
            jobId,
            processedCount,
            qualifiedCount,
            totalTokens
          );
        } catch (error) {
          console.error(`Failed to re-qualify lead ${lead.id}:`, error);
          processedCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      await this.updateJobStatus(jobId, "completed", null, {
        processingTimeMs: processingTime,
        leadsProcessed: processedCount,
        leadsQualified: qualifiedCount,
        qualificationResults: { results },
        tokensUsed: totalTokens,
      });
    } catch (error) {
      console.error(`Re-qualification job ${jobId} failed:`, error);
      await this.updateJobStatus(
        jobId,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
