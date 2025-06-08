import { Express } from "express";
import { BulkLeadQualificationService } from "../services/BulkLeadQualificationService.js";
import { LeadQualificationService } from "../services/LeadQualificationService.js";
import { AutoLeadQualificationService } from "../services/AutoLeadQualificationService.js";
import { isAuthenticated } from "../googleAuth.js";
import { supabase } from "../db.js";
import OpenAI from "openai";

interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export function setupLeadQualificationRoutes(app: Express) {
  const bulkQualificationService = new BulkLeadQualificationService();
  const qualificationService = new LeadQualificationService();
  const autoQualificationService = new AutoLeadQualificationService();

  // ============================================================================
  // BULK QUALIFICATION ROUTES
  // ============================================================================

  /**
   * Start bulk qualification of all unqualified leads
   * POST /api/lead-qualification/bulk/start
   */
  app.post(
    "/api/lead-qualification/bulk/start",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const jobId = await bulkQualificationService.startBulkQualification(
          req.user.id
        );

        res.json({
          success: true,
          data: {
            jobId,
            message: "Bulk qualification job started successfully",
          },
        });
      } catch (error) {
        console.error("Error starting bulk qualification:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to start bulk qualification",
        });
      }
    }
  );

  /**
   * Get qualification job status
   * GET /api/lead-qualification/job/:jobId/status
   */
  app.get(
    "/api/lead-qualification/job/:jobId/status",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const { jobId } = req.params;
        const jobStatus = await bulkQualificationService.getJobStatus(
          jobId,
          req.user.id
        );

        if (!jobStatus) {
          return res.status(404).json({ error: "Job not found" });
        }

        res.json({
          success: true,
          data: jobStatus,
        });
      } catch (error) {
        console.error("Error fetching job status:", error);
        res.status(500).json({
          error: "Failed to fetch job status",
        });
      }
    }
  );

  /**
   * Get qualification statistics (Direct database approach)
   * GET /api/lead-qualification/stats
   */
  app.get(
    "/api/lead-qualification/stats",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        // Get stats directly from database
        const { data: leads, error } = await supabase
          .from("leads")
          .select("qualification_rating, qualification_score")
          .eq("user_id", req.user.id);

        if (error) {
          throw new Error(`Failed to fetch leads: ${error.message}`);
        }

        // Calculate stats
        const totalLeads = leads?.length || 0;
        const qualifiedLeads =
          leads?.filter((lead) => lead.qualification_rating).length || 0;
        const highQualityLeads =
          leads?.filter((lead) => lead.qualification_rating === "high")
            .length || 0;
        const mediumQualityLeads =
          leads?.filter((lead) => lead.qualification_rating === "medium")
            .length || 0;
        const lowQualityLeads =
          leads?.filter((lead) => lead.qualification_rating === "low").length ||
          0;
        const unqualifiedLeads = totalLeads - qualifiedLeads;

        const scores =
          leads
            ?.filter((lead) => lead.qualification_score)
            .map((lead) => lead.qualification_score) || [];
        const avgQualificationScore =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;

        const qualificationRate =
          totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

        const stats = {
          total_leads: totalLeads,
          qualified_leads: qualifiedLeads,
          high_quality_leads: highQualityLeads,
          medium_quality_leads: mediumQualityLeads,
          low_quality_leads: lowQualityLeads,
          unqualified_leads: unqualifiedLeads,
          avg_qualification_score: avgQualificationScore,
          qualification_rate: qualificationRate,
        };

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("Error fetching qualification stats:", error);
        res.status(500).json({
          error: "Failed to fetch qualification statistics",
        });
      }
    }
  );

  // ============================================================================
  // INDIVIDUAL LEAD QUALIFICATION ROUTES
  // ============================================================================

  /**
   * Qualify a single lead
   * POST /api/lead-qualification/single/:leadId
   */
  app.post(
    "/api/lead-qualification/single/:leadId",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const { leadId } = req.params;
        const qualificationResult = await qualificationService.qualifyLead(
          leadId,
          req.user.id
        );

        res.json({
          success: true,
          data: qualificationResult,
        });
      } catch (error) {
        console.error("Error qualifying lead:", error);
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Failed to qualify lead",
        });
      }
    }
  );

  /**
   * Re-qualify specific leads (Direct OpenAI approach)
   * POST /api/lead-qualification/requalify
   */
  app.post(
    "/api/lead-qualification/requalify",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const { leadIds } = req.body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
          return res
            .status(400)
            .json({ error: "leadIds must be a non-empty array" });
        }

        // Create a simple job ID
        const jobId = `job_${Date.now()}_${Math.floor(
          Math.random() * 1000000
        )}`;

        // Start processing leads asynchronously using our direct approach
        processLeadsDirectly(jobId, req.user.id, leadIds);

        res.json({
          success: true,
          data: {
            jobId,
            message: `Re-qualification job started for ${leadIds.length} leads`,
          },
        });
      } catch (error) {
        console.error("Error starting re-qualification:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to start re-qualification",
        });
      }
    }
  );

  // ============================================================================
  // QUALIFICATION RULES ROUTES
  // ============================================================================

  /**
   * Generate qualification rules for user
   * POST /api/lead-qualification/rules/generate
   */
  app.post(
    "/api/lead-qualification/rules/generate",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const rules = await qualificationService.generateQualificationRules(
          req.user.id
        );

        res.json({
          success: true,
          data: {
            rules,
            message: "Qualification rules generated successfully",
          },
        });
      } catch (error) {
        console.error("Error generating qualification rules:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate qualification rules",
        });
      }
    }
  );

  /**
   * Get user's qualification rules
   * GET /api/lead-qualification/rules
   */
  app.get(
    "/api/lead-qualification/rules",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const rules = await qualificationService.getUserQualificationRules(
          req.user.id
        );

        res.json({
          success: true,
          data: rules,
        });
      } catch (error) {
        console.error("Error fetching qualification rules:", error);
        res.status(500).json({
          error: "Failed to fetch qualification rules",
        });
      }
    }
  );

  // ============================================================================
  // UTILITY ROUTES
  // ============================================================================

  /**
   * Get leads that need qualification
   * GET /api/lead-qualification/unqualified
   */
  app.get(
    "/api/lead-qualification/unqualified",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const { data: leads, error } = await supabase
          .from("leads")
          .select(
            "id, full_name, company_name, job_title, industry, created_at"
          )
          .eq("user_id", req.user.id)
          .is("qualification_rating", null)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          throw new Error(
            `Failed to fetch unqualified leads: ${error.message}`
          );
        }

        res.json({
          success: true,
          data: {
            leads: leads || [],
            count: leads?.length || 0,
          },
        });
      } catch (error) {
        console.error("Error fetching unqualified leads:", error);
        res.status(500).json({
          error: "Failed to fetch unqualified leads",
        });
      }
    }
  );

  /**
   * Get recent qualification jobs
   * GET /api/lead-qualification/jobs/recent
   */
  app.get(
    "/api/lead-qualification/jobs/recent",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const { data: jobs, error } = await supabase
          .from("lead_qualification_jobs")
          .select("*")
          .eq("user_id", req.user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          throw new Error(`Failed to fetch recent jobs: ${error.message}`);
        }

        res.json({
          success: true,
          data: jobs || [],
        });
      } catch (error) {
        console.error("Error fetching recent jobs:", error);
        res.status(500).json({
          error: "Failed to fetch recent qualification jobs",
        });
      }
    }
  );

  // ============================================================================
  // AUTO QUALIFICATION ROUTES
  // ============================================================================

  /**
   * Get qualification summary for dashboard
   * GET /api/lead-qualification/summary
   */
  app.get(
    "/api/lead-qualification/summary",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const summary = await autoQualificationService.getQualificationSummary(
          req.user.id
        );

        res.json({
          success: true,
          data: summary,
        });
      } catch (error) {
        console.error("Error fetching qualification summary:", error);
        res.status(500).json({
          error: "Failed to fetch qualification summary",
        });
      }
    }
  );

  /**
   * Setup qualification rules for user
   * POST /api/lead-qualification/setup
   */
  app.post(
    "/api/lead-qualification/setup",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        await autoQualificationService.setupQualificationRulesForUser(
          req.user.id
        );

        res.json({
          success: true,
          message: "Qualification rules setup completed",
        });
      } catch (error) {
        console.error("Error setting up qualification rules:", error);
        res.status(500).json({
          error: "Failed to setup qualification rules",
        });
      }
    }
  );

  /**
   * Trigger auto qualification for all existing leads
   * POST /api/lead-qualification/auto/all
   */
  app.post(
    "/api/lead-qualification/auto/all",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const jobId = await autoQualificationService.qualifyAllExistingLeads(
          req.user.id
        );

        res.json({
          success: true,
          data: {
            jobId,
            message: "Auto qualification started for all existing leads",
          },
        });
      } catch (error) {
        console.error("Error starting auto qualification:", error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : "Failed to start auto qualification",
        });
      }
    }
  );

  /**
   * Get job progress with enhanced details
   * GET /api/lead-qualification/job/:jobId/progress
   */
  app.get(
    "/api/lead-qualification/job/:jobId/progress",
    isAuthenticated,
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.user?.id) {
          return res.status(401).json({ error: "User not authenticated" });
        }

        const { jobId } = req.params;
        const progress = await autoQualificationService.getJobProgress(
          jobId,
          req.user.id
        );

        if (!progress) {
          return res.status(404).json({ error: "Job not found" });
        }

        res.json({
          success: true,
          data: progress,
        });
      } catch (error) {
        console.error("Error fetching job progress:", error);
        res.status(500).json({
          error: "Failed to fetch job progress",
        });
      }
    }
  );

  console.log("✅ Lead qualification routes registered");
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Lead qualification prompt template
const QUALIFICATION_PROMPT = `
You are an AI lead qualification specialist for SharpFlow, a SaaS company providing business solutions including chatbots, websites, and automation tools.

Analyze the following lead and provide a qualification score and reasoning:

Lead Information:
- Name: {name}
- Title: {title}
- Company: {company}
- Industry: {industry}
- Location: {location}
- Email: {email}
- LinkedIn: {linkedinUrl}

Qualification Criteria for SharpFlow SaaS Solutions:
1. Company Size & Budget (25 points): Prefer mid-market to enterprise companies (50+ employees)
2. Industry Relevance (25 points): Technology, Professional Services, Healthcare, Finance score higher
3. Decision Maker Authority (25 points): C-level, VP, Director roles have higher authority
4. Technology Needs (25 points): Companies likely needing automation, chatbots, or web solutions

Scoring Guidelines:
- 85-100: High Quality (Strong fit, likely to convert)
- 70-84: Medium Quality (Good potential, needs nurturing)
- 50-69: Low Quality (Possible fit with significant effort)
- 0-49: Poor Quality (Not a good fit)

Respond with ONLY a JSON object in this exact format:
{
  "score": 85,
  "rating": "high",
  "reasoning": "Strong technology company with decision maker authority and clear automation needs",
  "criteria": {
    "company_size": 22,
    "industry_relevance": 25,
    "authority_level": 20,
    "technology_needs": 18
  }
}
`;

// Direct lead processing function
async function processLeadsDirectly(
  jobId: string,
  userId: string,
  leadIds: string[]
) {
  try {
    console.log(
      `🎯 Starting direct qualification job ${jobId} for ${leadIds.length} leads`
    );

    // Create job record
    await supabase.from("lead_qualification_jobs").insert({
      id: jobId,
      user_id: userId,
      job_type: "bulk_qualification",
      job_status: "processing",
      priority: 5,
      leads_to_process: leadIds.length,
      leads_processed: 0,
      leads_qualified: 0,
      qualification_results: {},
      tokens_used: 0,
      started_at: new Date().toISOString(),
    });

    // Get leads to process
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .in("id", leadIds);

    if (leadsError || !leads) {
      throw new Error(`Failed to fetch leads: ${leadsError?.message}`);
    }

    let processedCount = 0;
    let qualifiedCount = 0;
    let totalTokens = 0;
    const startTime = Date.now();

    for (const lead of leads) {
      try {
        console.log(
          `🔍 Qualifying lead: ${lead.name || lead.full_name} at ${
            lead.company || lead.company_name
          }`
        );

        // Prepare prompt with lead data
        const prompt = QUALIFICATION_PROMPT.replace(
          "{name}",
          lead.name || lead.full_name || "N/A"
        )
          .replace("{title}", lead.title || lead.job_title || "N/A")
          .replace("{company}", lead.company || lead.company_name || "N/A")
          .replace("{industry}", lead.industry || "N/A")
          .replace("{location}", lead.location || "N/A")
          .replace("{email}", lead.email || "N/A")
          .replace(
            "{linkedinUrl}",
            lead.linkedinUrl || lead.linkedin_url || "N/A"
          );

        // Call OpenAI for qualification
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are an expert lead qualification specialist. Respond only with valid JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });

        const response = completion.choices[0]?.message?.content;
        totalTokens += completion.usage?.total_tokens || 0;

        if (!response) {
          console.error(`❌ No response from OpenAI for lead ${lead.id}`);
          continue;
        }

        // Parse AI response
        let qualificationResult;
        try {
          qualificationResult = JSON.parse(response);
        } catch (parseError) {
          console.error(
            `❌ Failed to parse AI response for lead ${lead.id}:`,
            response
          );
          continue;
        }

        // Validate and normalize the result
        const score = Math.max(
          0,
          Math.min(100, qualificationResult.score || 0)
        );
        let rating = qualificationResult.rating?.toLowerCase();

        // Ensure rating matches score
        if (score >= 85) rating = "high";
        else if (score >= 70) rating = "medium";
        else if (score >= 50) rating = "low";
        else rating = "low";

        // Update lead with qualification results
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            qualification_rating: rating,
            qualification_score: score,
            qualification_criteria: qualificationResult.criteria || {},
            qualification_reasoning:
              qualificationResult.reasoning || "AI qualification completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .eq("user_id", userId);

        if (updateError) {
          console.error(`❌ Failed to update lead ${lead.id}:`, updateError);
          continue;
        }

        qualifiedCount++;
        processedCount++;

        console.log(
          `✅ Qualified lead ${
            lead.name || lead.full_name
          }: ${score}/100 (${rating})`
        );

        // Update job progress
        await supabase
          .from("lead_qualification_jobs")
          .update({
            leads_processed: processedCount,
            leads_qualified: qualifiedCount,
            tokens_used: totalTokens,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (leadError) {
        console.error(`❌ Error processing lead ${lead.id}:`, leadError);
        processedCount++;
        continue;
      }
    }

    // Mark job as completed
    const processingTime = Date.now() - startTime;
    await supabase
      .from("lead_qualification_jobs")
      .update({
        job_status: "completed",
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        leads_processed: processedCount,
        leads_qualified: qualifiedCount,
        tokens_used: totalTokens,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(
      `🎉 Direct qualification job ${jobId} completed: ${qualifiedCount}/${processedCount} leads qualified`
    );
  } catch (error) {
    console.error(`❌ Error in direct qualification job ${jobId}:`, error);

    // Mark job as failed
    await supabase
      .from("lead_qualification_jobs")
      .update({
        job_status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}
