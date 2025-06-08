// Mock Data for SharpFlow Lead Generation Dashboard

import {
  Lead,
  ResearchReport,
  EmailCampaign,
  AgentStatus,
  LeadGenerationMetrics,
  SubscriptionPlan,
} from "../types/lead-generation";

export const mockLeads: Lead[] = [
  {
    id: "lead-001",
    user_id: "user-123",
    full_name: "Sarah Johnson",
    company_name: "TechFlow Solutions",
    job_title: "VP of Marketing",
    location: "San Francisco, CA",
    industry: "Technology",
    source: "Falcon",
    created_at: "2024-01-15T10:00:00Z",
    lead_status: "qualified",
    email_address: "sarah.johnson@techflow.com",
    phone_number: "+1 (555) 123-4567",
    linkedin_url: "https://linkedin.com/in/sarahjohnson",
    lead_score: 92,
    tags: ["High Priority", "Enterprise", "Marketing Decision Maker"],
    // Legacy compatibility fields
    name: "Sarah Johnson",
    company: "TechFlow Solutions",
    title: "VP of Marketing",
    status: "qualified",
    dateAdded: "2024-01-15",
    email: "sarah.johnson@techflow.com",
    phone: "+1 (555) 123-4567",
    linkedinUrl: "https://linkedin.com/in/sarahjohnson",
    score: 92,
  },
  {
    id: "lead-002",
    user_id: "user-123",
    full_name: "Michael Chen",
    company_name: "Growth Capital",
    job_title: "CEO",
    location: "New York, NY",
    industry: "Finance",
    source: "Falcon",
    created_at: "2024-01-14T10:00:00Z",
    lead_status: "new",
    email_address: "m.chen@growthcapital.com",
    linkedin_url: "https://linkedin.com/in/michaelchen",
    lead_score: 88,
    tags: ["C-Level", "Finance", "High Value"],
    // Legacy compatibility fields
    name: "Michael Chen",
    company: "Growth Capital",
    title: "CEO",
    status: "new",
    dateAdded: "2024-01-14",
    email: "m.chen@growthcapital.com",
    linkedinUrl: "https://linkedin.com/in/michaelchen",
    score: 88,
  },
  {
    id: "lead-003",
    user_id: "user-123",
    full_name: "Emily Rodriguez",
    company_name: "Innovate Labs",
    job_title: "Head of Sales",
    location: "Austin, TX",
    industry: "Software",
    source: "Falcon",
    created_at: "2024-01-13T10:00:00Z",
    lead_status: "contacted",
    email_address: "emily.r@innovatelabs.com",
    phone_number: "+1 (555) 987-6543",
    linkedin_url: "https://linkedin.com/in/emilyrodriguez",
    lead_score: 85,
    tags: ["Sales Leader", "Software", "Mid-Market"],
    // Legacy compatibility fields
    name: "Emily Rodriguez",
    company: "Innovate Labs",
    title: "Head of Sales",
    status: "contacted",
    dateAdded: "2024-01-13",
    email: "emily.r@innovatelabs.com",
    phone: "+1 (555) 987-6543",
    linkedinUrl: "https://linkedin.com/in/emilyrodriguez",
    score: 85,
  },
  {
    id: "lead-004",
    user_id: "user-123",
    full_name: "David Kim",
    company_name: "Scale Dynamics",
    job_title: "VP Operations",
    location: "Seattle, WA",
    industry: "E-commerce",
    source: "Falcon",
    created_at: "2024-01-12T10:00:00Z",
    lead_status: "converted",
    email_address: "david.kim@scaledynamics.com",
    linkedin_url: "https://linkedin.com/in/davidkim",
    lead_score: 95,
    tags: ["Converted", "Operations", "Success Story"],
    // Legacy compatibility fields
    name: "David Kim",
    company: "Scale Dynamics",
    title: "VP Operations",
    status: "converted",
    dateAdded: "2024-01-12",
    email: "david.kim@scaledynamics.com",
    linkedinUrl: "https://linkedin.com/in/davidkim",
    score: 95,
  },
  {
    id: "lead-005",
    user_id: "user-123",
    full_name: "Lisa Thompson",
    company_name: "Future Systems",
    job_title: "Marketing Director",
    location: "Chicago, IL",
    industry: "Manufacturing",
    source: "Falcon",
    created_at: "2024-01-11T10:00:00Z",
    lead_status: "qualified",
    email_address: "lisa.thompson@futuresystems.com",
    phone_number: "+1 (555) 456-7890",
    linkedin_url: "https://linkedin.com/in/lisathompson",
    lead_score: 78,
    tags: ["Manufacturing", "Marketing", "Qualified"],
    // Legacy compatibility fields
    name: "Lisa Thompson",
    company: "Future Systems",
    title: "Marketing Director",
    status: "qualified",
    dateAdded: "2024-01-11",
    email: "lisa.thompson@futuresystems.com",
    phone: "+1 (555) 456-7890",
    linkedinUrl: "https://linkedin.com/in/lisathompson",
    score: 78,
  },
];

export const mockResearchReports: ResearchReport[] = [
  {
    id: "report-001",
    leadId: "lead-001",
    leadName: "Sarah Johnson",
    reportName: "TechFlow Solutions - Complete Analysis",
    generatedDate: "2024-01-15",
    status: "completed",
    htmlContent: generateMockReportHTML("Sarah Johnson", "TechFlow Solutions", {
      companySize: "500-1000 employees",
      recentNews: 3,
      socialActivity: "High",
      contactInfo: true,
      linkedinProfile: "https://linkedin.com/in/sarahjohnson",
      companyWebsite: "https://techflow.com",
      industry: "Technology",
      location: "San Francisco, CA",
    }),
    emailDelivered: true,
    insights: {
      companySize: "500-1000 employees",
      recentNews: 3,
      socialActivity: "High",
      contactInfo: true,
      linkedinProfile: "https://linkedin.com/in/sarahjohnson",
      companyWebsite: "https://techflow.com",
      industry: "Technology",
      location: "San Francisco, CA",
    },
  },
  {
    id: "report-002",
    leadId: "lead-003",
    leadName: "Emily Rodriguez",
    reportName: "Innovate Labs - Market Research",
    generatedDate: "2024-01-13",
    status: "completed",
    htmlContent: generateMockReportHTML("Emily Rodriguez", "Innovate Labs", {
      companySize: "100-500 employees",
      recentNews: 1,
      socialActivity: "Medium",
      contactInfo: true,
      linkedinProfile: "https://linkedin.com/in/emilyrodriguez",
      companyWebsite: "https://innovatelabs.com",
      industry: "Software",
      location: "Austin, TX",
    }),
    emailDelivered: true,
    insights: {
      companySize: "100-500 employees",
      recentNews: 1,
      socialActivity: "Medium",
      contactInfo: true,
      linkedinProfile: "https://linkedin.com/in/emilyrodriguez",
      companyWebsite: "https://innovatelabs.com",
      industry: "Software",
      location: "Austin, TX",
    },
  },
  {
    id: "report-003",
    leadId: "lead-002",
    leadName: "Michael Chen",
    reportName: "Growth Capital - Executive Profile",
    generatedDate: "2024-01-14",
    status: "pending",
    emailDelivered: false,
    insights: {
      companySize: "1000+ employees",
      recentNews: 5,
      socialActivity: "Very High",
      contactInfo: false,
      linkedinProfile: "https://linkedin.com/in/michaelchen",
      companyWebsite: "https://growthcapital.com",
      industry: "Finance",
      location: "New York, NY",
    },
  },
];

// Helper function to generate mock HTML report content
function generateMockReportHTML(
  leadName: string,
  companyName: string,
  insights: ResearchReport["insights"]
): string {
  return `
    <div class="research-report">
      <div class="report-header">
        <h1>LinkedIn Research Report</h1>
        <h2>${leadName} - ${companyName}</h2>
        <p class="report-date">Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="report-section">
        <h3>Executive Summary</h3>
        <p>${leadName} is a key decision-maker at ${companyName}, a ${
    insights.companySize
  } company in the ${insights.industry} industry based in ${
    insights.location
  }.</p>
      </div>

      <div class="report-section">
        <h3>Company Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>Company:</strong> ${companyName}
          </div>
          <div class="info-item">
            <strong>Industry:</strong> ${insights.industry}
          </div>
          <div class="info-item">
            <strong>Size:</strong> ${insights.companySize}
          </div>
          <div class="info-item">
            <strong>Location:</strong> ${insights.location}
          </div>
          <div class="info-item">
            <strong>Website:</strong> <a href="${
              insights.companyWebsite
            }" target="_blank">${insights.companyWebsite}</a>
          </div>
        </div>
      </div>

      <div class="report-section">
        <h3>Contact Information</h3>
        <div class="contact-info">
          <p><strong>LinkedIn Profile:</strong> <a href="${
            insights.linkedinProfile
          }" target="_blank">${insights.linkedinProfile}</a></p>
          <p><strong>Contact Info Available:</strong> ${
            insights.contactInfo ? "Yes" : "No"
          }</p>
        </div>
      </div>

      <div class="report-section">
        <h3>Recent Activity</h3>
        <p><strong>Recent News Articles:</strong> ${
          insights.recentNews
        } articles found</p>
        <p><strong>Social Media Activity:</strong> ${
          insights.socialActivity
        }</p>
        <ul class="activity-list">
          <li>Posted about industry trends in the last 30 days</li>
          <li>Engaged with thought leadership content</li>
          <li>Active in professional networking</li>
        </ul>
      </div>

      <div class="report-section">
        <h3>Engagement Recommendations</h3>
        <ul class="recommendations">
          <li>Reference recent company news in your outreach</li>
          <li>Connect on LinkedIn before sending direct messages</li>
          <li>Mention mutual connections or shared interests</li>
          <li>Focus on ${insights.industry} industry challenges</li>
        </ul>
      </div>
    </div>
  `;
}

export const mockEmailCampaigns: EmailCampaign[] = [
  {
    id: "campaign-001",
    name: "Q1 Outreach - Tech Companies",
    recipients: 150,
    openRate: 34.5,
    responseRate: 12.3,
    status: "active",
    createdDate: "2024-01-10",
    lastSent: "2024-01-15",
    template: "Tech Industry Personalized",
    followUpSequence: true,
    conversions: 8,
  },
  {
    id: "campaign-002",
    name: "Finance Sector - Decision Makers",
    recipients: 89,
    openRate: 42.1,
    responseRate: 18.7,
    status: "completed",
    createdDate: "2024-01-05",
    lastSent: "2024-01-12",
    template: "Executive Outreach",
    followUpSequence: true,
    conversions: 12,
  },
  {
    id: "campaign-003",
    name: "Manufacturing Follow-up",
    recipients: 67,
    openRate: 28.9,
    responseRate: 9.2,
    status: "paused",
    createdDate: "2024-01-08",
    lastSent: "2024-01-14",
    template: "Industry Specific",
    followUpSequence: false,
    conversions: 3,
  },
];

export const mockAgentStatus: AgentStatus[] = [
  {
    name: "Falcon",
    status: "active",
    lastActivity: "2024-01-15T10:30:00Z",
    tasksCompleted: 1247,
    tasksInQueue: 23,
    uptime: "99.8%",
  },
  {
    name: "Sage",
    status: "processing",
    lastActivity: "2024-01-15T10:25:00Z",
    tasksCompleted: 456,
    tasksInQueue: 8,
    uptime: "99.5%",
  },
  {
    name: "Sentinel",
    status: "idle",
    lastActivity: "2024-01-15T09:45:00Z",
    tasksCompleted: 892,
    tasksInQueue: 0,
    uptime: "99.9%",
  },
];

export const mockMetrics: Record<SubscriptionPlan, LeadGenerationMetrics> = {
  starter: {
    totalLeads: 234,
    leadsThisMonth: 67,
    conversionRate: 8.5,
    avgLeadScore: 76,
    researchReportsGenerated: 0,
    emailsSent: 0,
    responseRate: 0,
    roi: 245,
  },
  professional: {
    totalLeads: 1456,
    leadsThisMonth: 342,
    conversionRate: 12.3,
    avgLeadScore: 82,
    researchReportsGenerated: 89,
    emailsSent: 0,
    responseRate: 0,
    roi: 387,
  },
  ultra: {
    totalLeads: 3247,
    leadsThisMonth: 789,
    conversionRate: 18.7,
    avgLeadScore: 88,
    researchReportsGenerated: 234,
    emailsSent: 1567,
    responseRate: 24.3,
    roi: 542,
  },
};
