import { BaseAgent } from "../core/BaseAgent.js";
import axios from "axios";
import { supabase } from "../../db.js";
import type {
  AgentJob,
  AgentResult,
  LeadGenerationRequest,
} from "../types/index.js";
import type { UserAgentConfig } from "../core/AgentFactory.js";
import { v4 as uuidv4 } from "uuid";

interface ApolloLead {
  first_name: string;
  last_name: string;
  email: string;
  linkedin_url: string;
  city: string;
  state: string;
  country: string;
  employment_history: Array<{
    title: string;
    organization_name: string;
  }>;
  organization: {
    primary_phone?: {
      sanitized_number: string;
    };
  };
  organization_website_url: string;
  seniority: string;
}

export class FalconAgent extends BaseAgent {
  private apolloApiKey: string;
  private apolloApiUrl: string;
  private userConfig?: UserAgentConfig;
  private monthlyLimits: {
    maxLeadsPerMonth: number;
  };

  constructor(userConfig?: UserAgentConfig) {
    super("Falcon", "1.0.0");

    this.userConfig = userConfig;

    // Use user-specific API keys if available, otherwise fall back to environment
    this.apolloApiKey =
      userConfig?.apiKeys?.apolloApiKey ||
      userConfig?.apiKeys?.apifyApiKey ||
      process.env.APIFY_API_KEY ||
      "";

    this.apolloApiUrl =
      "https://api.apify.com/v2/acts/code_crafter~apollo-io-scraper/run-sync-get-dataset-items";

    // Set monthly limits from user configuration
    this.monthlyLimits = {
      maxLeadsPerMonth:
        userConfig?.configuration?.leadGeneration?.maxLeadsPerMonth || 100,
    };
  }

  protected getCapabilities(): string[] {
    return [
      "Lead generation from Apollo.io",
      "Location-based prospect search",
      "Business type filtering",
      "Job title targeting",
      "Duplicate detection",
      "Direct database storage",
    ];
  }

  async process(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      this.emitProgress(job.id, 5, "Checking monthly limits...", "validation");

      // Check monthly limits for user
      await this.checkMonthlyLimits(job.userId);

      this.emitProgress(
        job.id,
        10,
        "Validating input parameters...",
        "validation"
      );

      const request = this.validateAndParseInput(job.inputData);

      this.emitProgress(
        job.id,
        20,
        "Building Apollo.io search URL...",
        "url_generation"
      );

      const apolloUrl = this.buildApolloUrl(request);

      this.emitProgress(
        job.id,
        30,
        "Executing Apollo.io search...",
        "api_call"
      );

      const rawLeads = await this.fetchLeadsFromApollo(apolloUrl);

      this.emitProgress(
        job.id,
        60,
        `Processing ${rawLeads.length} leads...`,
        "data_processing"
      );

      const processedLeads = this.processLeadData(
        rawLeads,
        request,
        job.userId
      );

      this.emitProgress(job.id, 80, "Removing duplicates...", "deduplication");

      const uniqueLeads = await this.removeDuplicates(
        processedLeads,
        job.userId
      );

      this.emitProgress(
        job.id,
        90,
        "Saving leads to database...",
        "database_save"
      );

      const savedLeads = await this.saveLeadsToDatabase(uniqueLeads);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          leadsGenerated: savedLeads.length,
          leadsProcessed: rawLeads.length,
          duplicatesRemoved: processedLeads.length - uniqueLeads.length,
          searchCriteria: request,
          leads: savedLeads,
        },
        metadata: {
          processingTime,
          recordsProcessed: rawLeads.length,
        },
      };
    } catch (error) {
      console.error("Falcon Agent error:", error);
      throw error;
    }
  }

  private validateAndParseInput(inputData: any): LeadGenerationRequest {
    if (!inputData || typeof inputData !== "object") {
      throw new Error(
        "Invalid input data provided. Please provide search criteria including locations, business types, and job titles."
      );
    }

    // Handle both direct parameters and nested query structure (from n8n migration)
    const query = inputData.query?.[0] || inputData;

    const request: LeadGenerationRequest = {
      locations: this.ensureArray(query.location || query.locations || []),
      businesses: this.ensureArray(query.business || query.businesses || []),
      jobTitles: this.ensureArray(query.job_title || query.jobTitles || []),
      maxResults: query.maxResults || 500,
    };

    // Provide user-friendly error messages with suggestions
    if (request.locations.length === 0) {
      throw new Error(
        "Please specify at least one location (e.g., 'New York', 'California', 'London'). Try rephrasing your request to include a geographic location."
      );
    }

    if (request.businesses.length === 0) {
      throw new Error(
        "Please specify at least one business type or industry (e.g., 'dental clinic', 'restaurant', 'coffee shop'). Try rephrasing your request to include the type of business you're targeting."
      );
    }

    if (request.jobTitles.length === 0) {
      throw new Error(
        "Please specify at least one job title or role (e.g., 'owner', 'CEO', 'manager'). Try rephrasing your request to include the type of person you want to find."
      );
    }

    console.log("✅ Falcon Agent validated parameters:", {
      locations: request.locations,
      businesses: request.businesses,
      jobTitles: request.jobTitles,
      maxResults: request.maxResults,
    });

    return request;
  }

  private ensureArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
    }
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  private buildApolloUrl(request: LeadGenerationRequest): string {
    const baseURL = "https://app.apollo.io/#/people";
    const queryParts: string[] = [];

    // Add static parameters
    queryParts.push("sortByField=recommendations_score");
    queryParts.push("sortAscending=false");
    queryParts.push("page=1");

    // Process job titles (maps to personTitles[])
    request.jobTitles.forEach((title) => {
      const decodedValue = title.replace(/\+/g, " ");
      queryParts.push(`personTitles[]=${encodeURIComponent(decodedValue)}`);
    });

    // Process locations (maps to personLocations[])
    request.locations.forEach((location) => {
      const decodedValue = location.replace(/\+/g, " ");
      queryParts.push(`personLocations[]=${encodeURIComponent(decodedValue)}`);
    });

    // Process business keywords (maps to qOrganizationKeywordTags[])
    request.businesses.forEach((business) => {
      const decodedValue = business.replace(/\+/g, " ");
      queryParts.push(
        `qOrganizationKeywordTags[]=${encodeURIComponent(decodedValue)}`
      );
    });

    // Add static included organization keyword fields
    queryParts.push("includedOrganizationKeywordFields[]=tags");
    queryParts.push("includedOrganizationKeywordFields[]=name");

    const queryString = queryParts.join("&");
    return `${baseURL}?${queryString}`;
  }

  private async fetchLeadsFromApollo(apolloUrl: string): Promise<ApolloLead[]> {
    try {
      const response = await axios.post(
        this.apolloApiUrl,
        {
          getPersonalEmails: true,
          getWorkEmails: true,
          totalRecords: 500,
          url: apolloUrl,
        },
        {
          params: {
            token: this.apolloApiKey,
          },
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 120000, // 2 minutes timeout
        }
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format from Apollo API");
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Apollo API error: ${error.message}`);
      }
      throw error;
    }
  }

  private processLeadData(
    rawLeads: ApolloLead[],
    request: LeadGenerationRequest,
    userId: string
  ): any[] {
    return rawLeads.map((lead) => ({
      id: uuidv4(),
      user_id: userId,
      full_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
      email_address: lead.email || "",
      phone_number: lead.organization?.primary_phone?.sanitized_number || "",
      country: lead.country || "",
      location: `${lead.city || ""}, ${lead.state || ""}`.replace(
        /^,\s*|,\s*$/g,
        ""
      ),
      industry: request.businesses[0]?.replace(/\+/g, " ") || "",
      company_name: lead.employment_history?.[0]?.organization_name || "",
      job_title: lead.employment_history?.[0]?.title || "",
      seniority: lead.seniority || "",
      website_url: lead.organization_website_url || "",
      linkedin_url: lead.linkedin_url || "",
      lead_score: this.calculateLeadScore(lead),
      lead_status: "new",
      contact_status: "not_contacted",
      source: "apollo_falcon_agent",
      tags: [],
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  private calculateLeadScore(lead: ApolloLead): number {
    let score = 50; // Base score

    // Email availability
    if (lead.email) score += 20;

    // LinkedIn profile
    if (lead.linkedin_url) score += 15;

    // Phone number
    if (lead.organization?.primary_phone?.sanitized_number) score += 10;

    // Complete profile
    if (lead.first_name && lead.last_name) score += 5;

    return Math.min(100, score);
  }

  private async removeDuplicates(leads: any[], userId: string): Promise<any[]> {
    if (leads.length === 0) return leads;

    if (!supabase) {
      throw new Error("Database connection not configured");
    }

    // Get existing LinkedIn URLs for this user
    const linkedinUrls = leads
      .map((lead) => lead.linkedin_url)
      .filter((url) => url && url.trim());

    if (linkedinUrls.length === 0) return leads;

    const { data: existingLeads } = await supabase
      .from("leads")
      .select("linkedin_url")
      .eq("user_id", userId)
      .in("linkedin_url", linkedinUrls);

    const existingUrls = new Set(
      existingLeads?.map((lead) => lead.linkedin_url) || []
    );

    return leads.filter(
      (lead) => !lead.linkedin_url || !existingUrls.has(lead.linkedin_url)
    );
  }

  private async saveLeadsToDatabase(leads: any[]): Promise<any[]> {
    if (leads.length === 0) return [];

    if (!supabase) {
      throw new Error("Database connection not configured");
    }

    const { data, error } = await supabase.from("leads").insert(leads).select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Trigger automatic qualification for new leads
    if (data && data.length > 0) {
      this.triggerAutoQualification(data).catch((error) => {
        console.error("Error triggering auto qualification:", error);
        // Don't throw error to avoid breaking lead creation
      });
    }

    return data || [];
  }

  /**
   * Trigger automatic qualification for newly created leads
   */
  private async triggerAutoQualification(savedLeads: any[]): Promise<void> {
    try {
      // Import the auto qualification service dynamically to avoid circular dependencies
      const { AutoLeadQualificationService } = await import(
        "../../services/AutoLeadQualificationService.js"
      );
      const autoQualificationService = new AutoLeadQualificationService();

      // Process each lead for auto qualification
      for (const lead of savedLeads) {
        // Trigger qualification in background (don't await to avoid blocking)
        autoQualificationService
          .processQualificationTrigger(lead.id, lead.user_id, "new_lead")
          .catch((error) => {
            console.error(`Error auto-qualifying lead ${lead.id}:`, error);
          });
      }

      console.log(
        `🎯 Triggered auto qualification for ${savedLeads.length} new leads`
      );
    } catch (error) {
      console.error("Error setting up auto qualification:", error);
    }
  }

  /**
   * Check if user has exceeded monthly lead generation limits
   */
  private async checkMonthlyLimits(userId: string): Promise<void> {
    if (!this.userConfig) {
      // If no user config, use default limits
      return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Get current month's lead count for this user
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", `${currentMonth}-01`)
      .lt("created_at", `${currentMonth}-32`); // Next month

    if (error) {
      console.warn("Error checking monthly limits:", error);
      return; // Don't block on limit check errors
    }

    const currentCount = leads?.length || 0;
    const limit = this.monthlyLimits.maxLeadsPerMonth;

    if (currentCount >= limit) {
      throw new Error(
        `Monthly lead generation limit reached (${currentCount}/${limit}). ` +
          `Please upgrade your plan or wait until next month to generate more leads.`
      );
    }

    console.log(
      `✅ Monthly limit check passed: ${currentCount}/${limit} leads used`
    );
  }
}
