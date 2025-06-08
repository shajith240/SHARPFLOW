// Lead Generation System Types for SharpFlow Dashboard

export type SubscriptionPlan = "starter" | "professional" | "ultra";

export interface Lead {
  id: string;
  user_id: string;
  // Core lead information (matching database schema)
  full_name: string;
  email_address?: string;
  phone_number?: string;
  country?: string;
  location: string;
  industry: string;
  company_name: string;
  job_title: string;
  seniority?: string;
  website_url?: string;
  linkedin_url?: string;

  // Status and scoring
  lead_status: "new" | "contacted" | "qualified" | "converted" | "rejected";
  contact_status?: "not_contacted" | "email_sent" | "responded" | "bounced";
  lead_score: number; // 0-100 lead quality score

  // Qualification fields
  qualification_rating?: "high" | "medium" | "low";
  qualification_score?: number; // 0-100 AI qualification score
  qualification_date?: string;
  qualification_criteria?: Record<string, any>;
  qualification_reasoning?: string;
  auto_qualified?: boolean;

  // Metadata
  source?: string;
  tags?: string[];
  notes?: string;

  // External tracking
  n8n_execution_id?: string;
  apollo_person_id?: string;
  apollo_organization_id?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
  last_contacted_at?: string;

  // Research report (optional)
  research_report?: string; // HTML content of research report

  // Legacy compatibility (computed properties)
  name?: string; // computed from full_name
  company?: string; // computed from company_name
  title?: string; // computed from job_title
  status?: "new" | "contacted" | "qualified" | "converted" | "rejected"; // computed from lead_status
  dateAdded?: string; // computed from created_at
  email?: string; // computed from email_address
  phone?: string; // computed from phone_number
  linkedinUrl?: string; // computed from linkedin_url
  score?: number; // computed from lead_score
}

export interface ResearchReport {
  id: string;
  leadId: string;
  leadName: string;
  reportName: string;
  generatedDate: string;
  status: "pending" | "completed" | "failed" | "delivered";
  htmlContent?: string; // HTML content for in-app viewing
  emailDelivered: boolean;
  insights: {
    companySize: string;
    recentNews: number;
    socialActivity: string;
    contactInfo: boolean;
    linkedinProfile: string;
    companyWebsite: string;
    industry: string;
    location: string;
  };
}

export interface EmailCampaign {
  id: string;
  name: string;
  recipients: number;
  openRate: number;
  responseRate: number;
  status: "draft" | "active" | "paused" | "completed";
  createdDate: string;
  lastSent?: string;
  template: string;
  followUpSequence: boolean;
  conversions: number;
}

export interface AgentStatus {
  name: "Falcon" | "Sage" | "Sentinel";
  status: "active" | "processing" | "idle" | "error";
  lastActivity: string;
  tasksCompleted: number;
  tasksInQueue: number;
  uptime: string;
}

export interface PlanLimits {
  maxLeadsPerMonth: number;
  currentLeadsThisMonth: number;
  researchReportsIncluded: boolean;
  emailAutomationIncluded: boolean;
  advancedFiltering: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
}

export interface LeadGenerationMetrics {
  totalLeads: number;
  leadsThisMonth: number;
  conversionRate: number;
  avgLeadScore: number;
  researchReportsGenerated: number;
  emailsSent: number;
  responseRate: number;
  roi: number;
}

// Qualification System Types
export interface QualificationStats {
  totalLeads: number;
  qualifiedLeads: number;
  highQualityLeads: number;
  mediumQualityLeads: number;
  lowQualityLeads: number;
  unqualifiedLeads: number;
  avgQualificationScore: number;
  qualificationRate: number; // percentage of leads qualified
}

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
  startedAt?: string;
  completedAt?: string;
  processingTimeMs?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  qualificationResults: Record<string, any>;
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkQualificationRequest {
  leadIds?: string[];
  filters?: {
    industry?: string;
    location?: string;
    leadStatus?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  priority?: number;
}

export interface QualificationFilter {
  rating?: "high" | "medium" | "low" | "unqualified";
  scoreRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  autoQualified?: boolean;
}

// Plan-specific feature access
export const PLAN_FEATURES = {
  starter: {
    agents: ["Falcon"],
    maxLeadsPerMonth: 100,
    researchReports: false,
    emailAutomation: false,
    advancedFiltering: false,
    exportFormats: ["CSV"],
    support: "Email",
  },
  professional: {
    agents: ["Falcon", "Sage"],
    maxLeadsPerMonth: 500,
    researchReports: true,
    emailAutomation: false,
    advancedFiltering: true,
    exportFormats: ["CSV", "Excel", "PDF"],
    support: "Priority Email",
  },
  ultra: {
    agents: ["Falcon", "Sage", "Sentinel"],
    maxLeadsPerMonth: 1000,
    researchReports: true,
    emailAutomation: true,
    advancedFiltering: true,
    exportFormats: ["CSV", "Excel", "PDF", "API"],
    support: "Phone + Dedicated Manager",
  },
} as const;
