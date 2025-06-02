// Lead data transformation utilities for SharpFlow
// Handles conversion between database schema and frontend display format

import { Lead } from "@/types/lead-generation";
import { validateEmail } from "@/lib/utils";

/**
 * Transform database lead to frontend format with legacy compatibility
 */
export function transformDatabaseLead(dbLead: any): Lead {
  return {
    // Database fields (primary)
    id: dbLead.id,
    user_id: dbLead.user_id,
    full_name: dbLead.full_name || "",
    email_address: dbLead.email_address,
    phone_number: dbLead.phone_number,
    country: dbLead.country,
    location: dbLead.location || "",
    industry: dbLead.industry || "",
    company_name: dbLead.company_name || "",
    job_title: dbLead.job_title || "",
    seniority: dbLead.seniority,
    website_url: dbLead.website_url,
    linkedin_url: dbLead.linkedin_url,
    research_report: dbLead.research_report,

    // Status and scoring
    lead_status: dbLead.lead_status || "new",
    contact_status: dbLead.contact_status || "not_contacted",
    lead_score: dbLead.lead_score || 0,

    // Metadata
    source: dbLead.source || "telegram",
    tags: dbLead.tags || [],
    notes: dbLead.notes,

    // External tracking
    n8n_execution_id: dbLead.n8n_execution_id,
    apollo_person_id: dbLead.apollo_person_id,
    apollo_organization_id: dbLead.apollo_organization_id,

    // Timestamps
    created_at: dbLead.created_at,
    updated_at: dbLead.updated_at,
    last_contacted_at: dbLead.last_contacted_at,

    // Legacy compatibility (computed properties for existing components)
    name: dbLead.full_name || "",
    company: dbLead.company_name || "",
    title: dbLead.job_title || "",
    status: dbLead.lead_status || "new",
    dateAdded: dbLead.created_at,
    email: dbLead.email_address,
    phone: dbLead.phone_number,
    linkedinUrl: dbLead.linkedin_url,
    score: dbLead.lead_score || 0,
  };
}

/**
 * Transform frontend lead to database format for API calls
 */
export function transformFrontendLead(frontendLead: Partial<Lead>): any {
  return {
    // Core fields
    full_name: frontendLead.full_name || frontendLead.name,
    email_address: frontendLead.email_address || frontendLead.email,
    phone_number: frontendLead.phone_number || frontendLead.phone,
    country: frontendLead.country,
    location: frontendLead.location,
    industry: frontendLead.industry,
    company_name: frontendLead.company_name || frontendLead.company,
    job_title: frontendLead.job_title || frontendLead.title,
    seniority: frontendLead.seniority,
    website_url: frontendLead.website_url,
    linkedin_url: frontendLead.linkedin_url || frontendLead.linkedinUrl,
    research_report: frontendLead.research_report,

    // Status and scoring
    lead_status: frontendLead.lead_status || frontendLead.status,
    contact_status: frontendLead.contact_status,
    lead_score: frontendLead.lead_score || frontendLead.score,

    // Metadata
    source: frontendLead.source,
    tags: frontendLead.tags,
    notes: frontendLead.notes,

    // External tracking
    n8n_execution_id: frontendLead.n8n_execution_id,
    apollo_person_id: frontendLead.apollo_person_id,
    apollo_organization_id: frontendLead.apollo_organization_id,
  };
}

/**
 * Transform array of database leads to frontend format
 */
export function transformDatabaseLeads(dbLeads: any[]): Lead[] {
  return dbLeads.map(transformDatabaseLead);
}

/**
 * Create CSV export data with correct column headers
 */
export function createCSVExportData(leads: Lead[]): string {
  const headers = [
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
    "Research Report",
  ];

  const rows = leads.map((lead) => [
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
    lead.research_report || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  return csvContent;
}

/**
 * Validate lead data before saving
 */
export function validateLead(lead: Partial<Lead>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!lead.full_name && !lead.name) {
    errors.push("Full name is required");
  }

  if (!lead.company_name && !lead.company) {
    errors.push("Company name is required");
  }

  // Email validation
  const email = lead.email_address || lead.email;
  if (email && !validateEmail(email)) {
    errors.push("Invalid email format");
  }

  // Score validation
  const score = lead.lead_score || lead.score || 0;
  if (score < 0 || score > 100) {
    errors.push("Lead score must be between 0 and 100");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get display name for lead status
 */
export function getStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    converted: "Converted",
    rejected: "Rejected",
  };

  return statusMap[status] || status;
}

/**
 * Get display name for contact status
 */
export function getContactStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    not_contacted: "Not Contacted",
    email_sent: "Email Sent",
    responded: "Responded",
    bounced: "Bounced",
  };

  return statusMap[status] || status;
}
