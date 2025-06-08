import { BulkLeadQualificationService } from "./BulkLeadQualificationService.js";
import { LeadQualificationService } from "./LeadQualificationService.js";
import { supabase } from "../db.js";

/**
 * Service for automatically qualifying new leads as they are created
 */
export class AutoLeadQualificationService {
  private bulkService: BulkLeadQualificationService;
  private qualificationService: LeadQualificationService;

  constructor() {
    this.bulkService = new BulkLeadQualificationService();
    this.qualificationService = new LeadQualificationService();
  }

  /**
   * Automatically qualify a single lead when it's created
   */
  async autoQualifyNewLead(leadId: string, userId: string): Promise<void> {
    try {
      console.log(`🎯 Auto-qualifying new lead: ${leadId}`);

      // Check if lead already has qualification
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("qualification_rating")
        .eq("id", leadId)
        .eq("user_id", userId)
        .single();

      if (leadError) {
        console.error("Error checking lead qualification status:", leadError);
        return;
      }

      if (lead?.qualification_rating) {
        console.log(`Lead ${leadId} already qualified with rating: ${lead.qualification_rating}`);
        return;
      }

      // Qualify the lead
      const qualificationResult = await this.qualificationService.qualifyLead(leadId, userId);

      // Update lead with qualification results
      const rating = this.mapScoreToRating(qualificationResult.overallScore);

      const { error: updateError } = await supabase
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

      if (updateError) {
        console.error("Error updating lead qualification:", updateError);
        return;
      }

      console.log(`✅ Lead ${leadId} auto-qualified with rating: ${rating} (score: ${qualificationResult.overallScore})`);

    } catch (error) {
      console.error(`Error auto-qualifying lead ${leadId}:`, error);
      // Don't throw error to avoid breaking lead creation process
    }
  }

  /**
   * Qualify all existing unqualified leads for a user
   */
  async qualifyAllExistingLeads(userId: string): Promise<string> {
    try {
      console.log(`🎯 Starting bulk qualification for user: ${userId}`);
      
      const jobId = await this.bulkService.startBulkQualification(userId);
      
      console.log(`✅ Bulk qualification job started: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error("Error starting bulk qualification:", error);
      throw error;
    }
  }

  /**
   * Check if user has qualification rules configured
   */
  async hasQualificationRules(userId: string): Promise<boolean> {
    try {
      const rules = await this.qualificationService.getUserQualificationRules(userId);
      return rules && rules.length > 0;
    } catch (error) {
      console.error("Error checking qualification rules:", error);
      return false;
    }
  }

  /**
   * Setup qualification rules for new user
   */
  async setupQualificationRulesForUser(userId: string): Promise<void> {
    try {
      console.log(`🎯 Setting up qualification rules for user: ${userId}`);
      
      const hasRules = await this.hasQualificationRules(userId);
      if (hasRules) {
        console.log(`User ${userId} already has qualification rules`);
        return;
      }

      // Generate qualification rules based on user's company profile
      const rules = await this.qualificationService.generateQualificationRules(userId);
      
      console.log(`✅ Generated ${rules.length} qualification rules for user: ${userId}`);
    } catch (error) {
      console.error("Error setting up qualification rules:", error);
      // Don't throw error to avoid breaking user setup process
    }
  }

  /**
   * Get qualification summary for user
   */
  async getQualificationSummary(userId: string): Promise<any> {
    try {
      const stats = await this.bulkService.getQualificationStats(userId);
      
      // Get recent qualification jobs
      const { data: recentJobs, error: jobsError } = await supabase
        .from("lead_qualification_jobs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (jobsError) {
        console.error("Error fetching recent jobs:", jobsError);
      }

      return {
        stats,
        recentJobs: recentJobs || [],
        hasQualificationRules: await this.hasQualificationRules(userId),
      };
    } catch (error) {
      console.error("Error getting qualification summary:", error);
      return {
        stats: {
          total_leads: 0,
          qualified_leads: 0,
          high_quality_leads: 0,
          medium_quality_leads: 0,
          low_quality_leads: 0,
          unqualified_leads: 0,
          avg_qualification_score: 0,
        },
        recentJobs: [],
        hasQualificationRules: false,
      };
    }
  }

  /**
   * Map qualification score to rating
   */
  private mapScoreToRating(score: number): string {
    if (score >= 80) return "high";
    if (score >= 60) return "medium";
    return "low";
  }

  /**
   * Schedule automatic qualification for user's leads
   */
  async scheduleAutoQualification(userId: string): Promise<void> {
    try {
      // Check if user has unqualified leads
      const { data: unqualifiedLeads, error } = await supabase
        .from("leads")
        .select("id")
        .eq("user_id", userId)
        .is("qualification_rating", null)
        .limit(1);

      if (error) {
        console.error("Error checking unqualified leads:", error);
        return;
      }

      if (!unqualifiedLeads || unqualifiedLeads.length === 0) {
        console.log(`No unqualified leads found for user: ${userId}`);
        return;
      }

      // Start bulk qualification
      await this.qualifyAllExistingLeads(userId);
    } catch (error) {
      console.error("Error scheduling auto qualification:", error);
    }
  }

  /**
   * Process qualification webhook/trigger
   */
  async processQualificationTrigger(leadId: string, userId: string, triggerType: "new_lead" | "manual" = "new_lead"): Promise<void> {
    try {
      console.log(`🎯 Processing qualification trigger for lead: ${leadId}, type: ${triggerType}`);

      // Ensure user has qualification rules
      const hasRules = await this.hasQualificationRules(userId);
      if (!hasRules) {
        console.log(`Setting up qualification rules for user: ${userId}`);
        await this.setupQualificationRulesForUser(userId);
      }

      // Qualify the lead
      await this.autoQualifyNewLead(leadId, userId);

    } catch (error) {
      console.error("Error processing qualification trigger:", error);
    }
  }

  /**
   * Batch process multiple leads for qualification
   */
  async batchProcessLeads(leadIds: string[], userId: string): Promise<string> {
    try {
      console.log(`🎯 Batch processing ${leadIds.length} leads for qualification`);
      
      const jobId = await this.bulkService.requalifyLeads(leadIds, userId);
      
      console.log(`✅ Batch qualification job started: ${jobId}`);
      return jobId;
    } catch (error) {
      console.error("Error batch processing leads:", error);
      throw error;
    }
  }

  /**
   * Get qualification job progress
   */
  async getJobProgress(jobId: string, userId: string): Promise<any> {
    try {
      const job = await this.bulkService.getJobStatus(jobId, userId);
      
      if (!job) {
        return null;
      }

      // Calculate progress percentage
      const progressPercentage = job.leadsToProcess > 0 
        ? Math.round((job.leadsProcessed / job.leadsToProcess) * 100)
        : 0;

      return {
        ...job,
        progressPercentage,
        isCompleted: job.jobStatus === "completed",
        isFailed: job.jobStatus === "failed",
        isProcessing: job.jobStatus === "processing",
      };
    } catch (error) {
      console.error("Error getting job progress:", error);
      return null;
    }
  }
}
