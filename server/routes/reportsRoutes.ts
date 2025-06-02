import { Router } from "express";
import { isAuthenticated } from "../googleAuth";
import { supabase } from "../db";

const router = Router();

// Get user's research reports
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { page = 1, limit = 10, status, leadId } = req.query;

    let query = supabase
      .from("research_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply filters (simplified schema doesn't have status field)

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: reports, error } = await query;

    // Get total count separately
    let countQuery = supabase
      .from("research_reports")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (leadId) {
      countQuery = countQuery.eq("lead_id", leadId);
    }

    const { count, error: countError } = await countQuery;

    if (error) {
      console.error("Error fetching reports:", error);
      return res.status(500).json({ error: "Failed to fetch reports" });
    }

    if (countError) {
      console.error("Error fetching reports count:", countError);
      return res.status(500).json({ error: "Failed to fetch reports count" });
    }

    // Get LinkedIn URLs for each report by fetching lead data
    const reportsWithLinkedIn = await Promise.all(
      (reports || []).map(async (report) => {
        try {
          const { data: lead, error: leadError } = await supabase
            .from("leads")
            .select("linkedin_url")
            .eq("id", report.lead_id)
            .single();

          if (leadError) {
            console.warn(`Lead not found for report ${report.id}:`, leadError);
          }

          return {
            id: report.id,
            lead_id: report.lead_id,
            lead_name: report.lead_name,
            linkedin_url: lead?.linkedin_url || "",
            report_content: report.report_html, // Map report_html to report_content for frontend
            relevance_score: report.relevance_score,
            created_at: report.created_at,
            updated_at: report.updated_at,
            user_id: userId, // Add user_id for frontend compatibility
          };
        } catch (error) {
          console.error(`Error fetching lead for report ${report.id}:`, error);
          return {
            id: report.id,
            lead_id: report.lead_id,
            lead_name: report.lead_name,
            linkedin_url: "",
            report_content: report.report_html,
            relevance_score: report.relevance_score,
            created_at: report.created_at,
            updated_at: report.updated_at,
            user_id: userId,
          };
        }
      })
    );

    res.json({
      reports: reportsWithLinkedIn,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific research report
router.get("/:reportId", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { reportId } = req.params;

    const { data: report, error } = await supabase
      .from("research_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching report:", error);
      return res.status(500).json({ error: "Failed to fetch report" });
    }

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Get lead data for this report
    const { data: lead } = await supabase
      .from("leads")
      .select(
        "linkedin_url, full_name, company_name, email_address, phone_number"
      )
      .eq("id", report.lead_id)
      .single();

    res.json({
      ...report,
      report_content: report.report_html, // Map report_html to report_content for frontend
      linkedin_url: lead?.linkedin_url || "",
      company_name: lead?.company_name || "",
      email_address: lead?.email_address || "",
      phone_number: lead?.phone_number || "",
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete research report
router.delete("/:reportId", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { reportId } = req.params;

    // Verify ownership before deletion
    const { data: report } = await supabase
      .from("research_reports")
      .select("id")
      .eq("id", reportId)
      .eq("user_id", userId)
      .single();

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const { error } = await supabase
      .from("research_reports")
      .delete()
      .eq("id", reportId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting report:", error);
      return res.status(500).json({ error: "Failed to delete report" });
    }

    res.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Email research report
router.post("/:reportId/email", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { reportId } = req.params;
    const { recipientEmail } = req.body;

    // Get report data
    const { data: report, error } = await supabase
      .from("research_reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", userId)
      .single();

    if (error || !report) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Get lead data for this report
    const { data: lead } = await supabase
      .from("leads")
      .select("full_name, company_name")
      .eq("id", report.lead_id)
      .single();

    // Get user email if no recipient specified
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    const emailTo = recipientEmail || user?.email;

    if (!emailTo) {
      return res.status(400).json({ error: "No email address provided" });
    }

    // TODO: Implement email sending logic here
    // For now, just return success
    console.log(`Would send report ${reportId} to ${emailTo}`);

    res.json({
      success: true,
      message: `Report sent to ${emailTo}`,
      reportId,
      recipientEmail: emailTo,
    });
  } catch (error) {
    console.error("Error emailing report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
