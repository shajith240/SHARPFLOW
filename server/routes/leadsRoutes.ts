import { Router } from "express";
import { supabase } from "../db";
import { isAuthenticated } from "../googleAuth";

const router = Router();

// Get user's leads
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || "created_at";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    let query = supabase.from("leads").select("*").eq("user_id", userId);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("lead_status", status);
    }

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,company_name.ilike.%${search}%,email_address.ilike.%${search}%,job_title.ilike.%${search}%`
      );
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: leads, error } = await query;

    if (error) {
      return res.status(500).json({ error: "Failed to fetch leads" });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (status && status !== "all") {
      countQuery = countQuery.eq("lead_status", status);
    }

    if (search) {
      countQuery = countQuery.or(
        `full_name.ilike.%${search}%,company_name.ilike.%${search}%,email_address.ilike.%${search}%,job_title.ilike.%${search}%`
      );
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      return res.status(500).json({ error: "Failed to count leads" });
    }

    res.json({
      leads: leads || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get leads statistics
router.get("/stats", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;

    // Get total leads count
    const { count: totalLeads, error: totalError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (totalError) {
      return res.status(500).json({ error: "Failed to fetch total leads" });
    }

    // Get leads by status
    const { data: statusCounts, error: statusError } = await supabase
      .from("leads")
      .select("lead_status")
      .eq("user_id", userId);

    if (statusError) {
      return res.status(500).json({ error: "Failed to fetch status counts" });
    }

    // Count by status
    const statusMap =
      statusCounts?.reduce((acc, lead) => {
        acc[lead.lead_status] = (acc[lead.lead_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    // Get this week's leads
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { count: thisWeekLeads, error: weekError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneWeekAgo.toISOString());

    if (weekError) {
      return res.status(500).json({ error: "Failed to fetch weekly leads" });
    }

    res.json({
      totalLeads: totalLeads || 0,
      newLeads: statusMap.new || 0,
      contactedLeads: statusMap.contacted || 0,
      qualifiedLeads: statusMap.qualified || 0,
      convertedLeads: statusMap.converted || 0,
      rejectedLeads: statusMap.rejected || 0,
      thisWeekLeads: thisWeekLeads || 0,
    });
  } catch (error) {
    console.error("Error fetching leads stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single lead details
router.get("/:leadId", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const leadId = req.params.leadId;

    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json({ lead });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update lead status
router.patch("/:leadId/status", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const leadId = req.params.leadId;
    const { leadStatus, contactStatus, notes } = req.body;

    const updateData: any = {};

    if (leadStatus) updateData.lead_status = leadStatus;
    if (contactStatus) updateData.contact_status = contactStatus;
    if (notes !== undefined) updateData.notes = notes;

    if (contactStatus === "email_sent" || contactStatus === "responded") {
      updateData.last_contacted_at = new Date().toISOString();
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: "Lead not found or update failed" });
    }

    res.json({ lead, message: "Lead updated successfully" });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update lead score
router.patch("/:leadId/score", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const leadId = req.params.leadId;
    const { leadScore } = req.body;

    if (typeof leadScore !== "number" || leadScore < 0 || leadScore > 100) {
      return res
        .status(400)
        .json({ error: "Lead score must be a number between 0 and 100" });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .update({ lead_score: leadScore })
      .eq("id", leadId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: "Lead not found or update failed" });
    }

    res.json({ lead, message: "Lead score updated successfully" });
  } catch (error) {
    console.error("Error updating lead score:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add tags to lead
router.patch("/:leadId/tags", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const leadId = req.params.leadId;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .update({ tags })
      .eq("id", leadId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(404).json({ error: "Lead not found or update failed" });
    }

    res.json({ lead, message: "Lead tags updated successfully" });
  } catch (error) {
    console.error("Error updating lead tags:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete lead
router.delete("/:leadId", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const leadId = req.params.leadId;

    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", leadId)
      .eq("user_id", userId);

    if (error) {
      return res
        .status(404)
        .json({ error: "Lead not found or deletion failed" });
    }

    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Bulk update leads
router.patch("/bulk/update", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { leadIds, updates } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Lead IDs must be a non-empty array" });
    }

    const { data: leads, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("user_id", userId)
      .in("id", leadIds)
      .select();

    if (error) {
      return res.status(500).json({ error: "Bulk update failed" });
    }

    res.json({
      leads,
      message: `${leads?.length || 0} leads updated successfully`,
    });
  } catch (error) {
    console.error("Error bulk updating leads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Export leads to CSV
router.get("/export/csv", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const status = req.query.status as string;

    let query = supabase.from("leads").select("*").eq("user_id", userId);

    if (status && status !== "all") {
      query = query.eq("lead_status", status);
    }

    const { data: leads, error } = await query;

    if (error) {
      return res
        .status(500)
        .json({ error: "Failed to fetch leads for export" });
    }

    // Generate CSV content matching your requirements (without research report)
    const csvHeaders = [
      "Full Name",
      "Email Address",
      "Phone Number",
      "Country",
      "Location",
      "Industry",
      "Company Name",
      "Job Title",
      "Seniority",
      "Website URL",
      "LinkedIn URL",
      "Lead Status",
      "Lead Score",
      "Source",
      "Notes",
    ];

    const csvRows =
      leads?.map((lead) => [
        lead.full_name || "",
        lead.email_address || "",
        lead.phone_number || "",
        lead.country || "",
        lead.location || "",
        lead.industry || "",
        lead.company_name || "",
        lead.job_title || "",
        lead.seniority || "",
        lead.website_url || "",
        lead.linkedin_url || "",
        lead.lead_status || "",
        lead.lead_score?.toString() || "",
        lead.source || "",
        lead.notes || "",
      ]) || [];

    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sharpflow-leads-${
        new Date().toISOString().split("T")[0]
      }.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting leads:", error);
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
