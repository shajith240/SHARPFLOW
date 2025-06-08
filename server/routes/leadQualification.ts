import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { supabase } from "../config/database.js";
import OpenAI from "openai";

const router = express.Router();

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

// Get qualification statistics for authenticated user
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get qualification statistics using the database function
    const { data: stats, error } = await supabase.rpc(
      "get_qualification_stats",
      { p_user_id: userId }
    );

    if (error) {
      console.error("Error fetching qualification stats:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch qualification statistics",
      });
    }

    if (!stats || stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalLeads: 0,
          qualifiedLeads: 0,
          highQualityLeads: 0,
          mediumQualityLeads: 0,
          lowQualityLeads: 0,
          unqualifiedLeads: 0,
          avgQualificationScore: 0,
          qualificationRate: 0,
        },
      });
    }

    const result = stats[0];
    const qualificationRate =
      result.total_leads > 0
        ? Math.round((result.qualified_leads / result.total_leads) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        totalLeads: result.total_leads,
        qualifiedLeads: result.qualified_leads,
        highQualityLeads: result.high_quality_leads,
        mediumQualityLeads: result.medium_quality_leads,
        lowQualityLeads: result.low_quality_leads,
        unqualifiedLeads: result.unqualified_leads,
        avgQualificationScore: parseFloat(result.avg_qualification_score) || 0,
        qualificationRate,
      },
    });
  } catch (error) {
    console.error("Error in qualification stats endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Start bulk qualification job
router.post("/bulk/start", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { leadIds, filters, priority = 5 } = req.body;

    // Get leads to qualify
    let query = supabase.from("leads").select("*").eq("user_id", userId);

    if (leadIds && leadIds.length > 0) {
      query = query.in("id", leadIds);
    } else if (filters) {
      if (filters.industry) {
        query = query.eq("industry", filters.industry);
      }
      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }
      if (filters.leadStatus) {
        query = query.eq("lead_status", filters.leadStatus);
      }
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error("Error fetching leads for qualification:", leadsError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch leads for qualification",
      });
    }

    if (!leads || leads.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No leads found matching the criteria",
      });
    }

    // Create qualification job
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

    const { error: jobError } = await supabase
      .from("lead_qualification_jobs")
      .insert({
        id: jobId,
        user_id: userId,
        job_type: leadIds ? "bulk_qualification" : "bulk_qualification",
        job_status: "queued",
        priority,
        leads_to_process: leads.length,
        leads_processed: 0,
        leads_qualified: 0,
        qualification_results: {},
        tokens_used: 0,
      });

    if (jobError) {
      console.error("Error creating qualification job:", jobError);
      return res.status(500).json({
        success: false,
        error: "Failed to create qualification job",
      });
    }

    // Start processing leads asynchronously
    processQualificationJob(jobId, userId, leads);

    res.json({
      success: true,
      data: {
        jobId,
        leadsToProcess: leads.length,
        estimatedTime: Math.ceil(leads.length * 0.5), // 30 seconds per lead estimate
      },
    });
  } catch (error) {
    console.error("Error starting bulk qualification:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Get recent qualification jobs
router.get("/jobs/recent", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: jobs, error } = await supabase
      .from("lead_qualification_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching qualification jobs:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch qualification jobs",
      });
    }

    res.json({
      success: true,
      data: jobs || [],
    });
  } catch (error) {
    console.error("Error in jobs endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Cancel qualification job
router.post("/jobs/:jobId/cancel", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;

    const { error } = await supabase
      .from("lead_qualification_jobs")
      .update({
        job_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", userId)
      .in("job_status", ["queued", "processing"]);

    if (error) {
      console.error("Error cancelling job:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to cancel job",
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in cancel job endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Retry failed qualification job
router.post("/jobs/:jobId/retry", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { jobId } = req.params;

    // Get the failed job
    const { data: job, error: jobError } = await supabase
      .from("lead_qualification_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .eq("job_status", "failed")
      .single();

    if (jobError || !job) {
      return res.status(404).json({
        success: false,
        error: "Job not found or not in failed state",
      });
    }

    // Reset job status
    const { error: updateError } = await supabase
      .from("lead_qualification_jobs")
      .update({
        job_status: "queued",
        retry_count: job.retry_count + 1,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("Error retrying job:", updateError);
      return res.status(500).json({
        success: false,
        error: "Failed to retry job",
      });
    }

    // Get leads that still need qualification
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .is("qualification_rating", null);

    if (!leadsError && leads) {
      // Restart processing
      processQualificationJob(jobId, userId, leads);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error in retry job endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// AI qualification processing function
async function processQualificationJob(
  jobId: string,
  userId: string,
  leads: any[]
) {
  try {
    console.log(
      `🎯 Starting qualification job ${jobId} for ${leads.length} leads`
    );

    // Update job status to processing
    await supabase
      .from("lead_qualification_jobs")
      .update({
        job_status: "processing",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    let processedCount = 0;
    let qualifiedCount = 0;
    let totalTokens = 0;
    const startTime = Date.now();

    for (const lead of leads) {
      try {
        // Skip if already qualified
        if (lead.qualification_rating) {
          processedCount++;
          continue;
        }

        console.log(`🔍 Qualifying lead: ${lead.name} at ${lead.company}`);

        // Prepare prompt with lead data
        const prompt = QUALIFICATION_PROMPT.replace(
          "{name}",
          lead.name || "N/A"
        )
          .replace("{title}", lead.title || "N/A")
          .replace("{company}", lead.company || "N/A")
          .replace("{industry}", lead.industry || "N/A")
          .replace("{location}", lead.location || "N/A")
          .replace("{email}", lead.email || "N/A")
          .replace("{linkedinUrl}", lead.linkedinUrl || "N/A");

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
        const { error: updateError } = await supabase.rpc(
          "update_lead_qualification",
          {
            p_lead_id: lead.id,
            p_user_id: userId,
            p_rating: rating,
            p_score: score,
            p_criteria: qualificationResult.criteria || {},
            p_reasoning:
              qualificationResult.reasoning || "AI qualification completed",
          }
        );

        if (updateError) {
          console.error(`❌ Failed to update lead ${lead.id}:`, updateError);
          continue;
        }

        qualifiedCount++;
        processedCount++;

        console.log(`✅ Qualified lead ${lead.name}: ${score}/100 (${rating})`);

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
      `🎉 Qualification job ${jobId} completed: ${qualifiedCount}/${processedCount} leads qualified`
    );
  } catch (error) {
    console.error(`❌ Error in qualification job ${jobId}:`, error);

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

export default router;
