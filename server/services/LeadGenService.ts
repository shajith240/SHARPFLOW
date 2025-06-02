import axios from "axios";
import { supabase } from "../lib/supabase";

export interface SearchCriteria {
  locations: string[];
  businesses: string[];
  jobTitles: string[];
}

export interface ApolloLead {
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

export class LeadGenService {
  private apolloApiKey = process.env.APOLLO_API_KEY;
  private apolloApiUrl =
    "https://api.apify.com/v2/acts/code_crafter~apollo-io-scraper/run-sync-get-dataset-items";

  async searchLeads(criteria: SearchCriteria): Promise<ApolloLead[]> {
    try {
      // Build Apollo.io search URL
      const apolloUrl = this.buildApolloUrl(criteria);

      // Call Apollo scraper via Apify
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
          timeout: 300000, // 5 minutes timeout
        }
      );

      return response.data || [];
    } catch (error) {
      console.error("Apollo lead search failed:", error);
      throw new Error(`Lead search failed: ${error.message}`);
    }
  }

  private buildApolloUrl(criteria: SearchCriteria): string {
    const baseURL = "https://app.apollo.io/#/people";
    const queryParts = [
      "sortByField=recommendations_score",
      "sortAscending=false",
      "page=1",
    ];

    // Add job titles
    criteria.jobTitles.forEach((title) => {
      const decodedValue = title.replace(/\+/g, " ");
      queryParts.push(`personTitles[]=${encodeURIComponent(decodedValue)}`);
    });

    // Add locations
    criteria.locations.forEach((location) => {
      const decodedValue = location.replace(/\+/g, " ");
      queryParts.push(`personLocations[]=${encodeURIComponent(decodedValue)}`);
    });

    // Add business keywords
    criteria.businesses.forEach((business) => {
      const decodedValue = business.replace(/\+/g, " ");
      queryParts.push(
        `qOrganizationKeywordTags[]=${encodeURIComponent(decodedValue)}`
      );
    });

    // Add static fields
    queryParts.push("includedOrganizationKeywordFields[]=tags");
    queryParts.push("includedOrganizationKeywordFields[]=name");

    const queryString = queryParts.join("&");
    return `${baseURL}?${queryString}`;
  }

  async storeLeads(
    userId: string,
    apolloLeads: ApolloLead[],
    searchCriteria: SearchCriteria
  ) {
    const leads = apolloLeads.map((lead) => ({
      user_id: userId,
      full_name: `${lead.first_name} ${lead.last_name}`,
      email: lead.email,
      phone: lead.organization?.primary_phone?.sanitized_number || null,
      linkedin_url: lead.linkedin_url,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      location: `${lead.city}, ${lead.state}`,
      job_title: lead.employment_history?.[0]?.title || null,
      company_name: lead.employment_history?.[0]?.organization_name || null,
      company_website: lead.organization_website_url,
      industry: searchCriteria.businesses[0]?.replace(/\+/g, " ") || null,
      seniority: lead.seniority,
      lead_score: this.calculateLeadScore(lead),
      search_query: searchCriteria,
      source: "apollo",
    }));

    // Remove duplicates based on LinkedIn URL
    const uniqueLeads = this.removeDuplicates(leads, "linkedin_url");

    // Insert leads with conflict resolution
    const { data: insertedLeads, error } = await supabase
      .from("leads")
      .upsert(uniqueLeads, {
        onConflict: "linkedin_url",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Failed to store leads:", error);
      throw new Error(`Failed to store leads: ${error.message}`);
    }

    return insertedLeads || [];
  }

  private calculateLeadScore(lead: ApolloLead): number {
    let score = 50; // Base score

    // Email availability
    if (lead.email) score += 20;

    // Job title seniority
    const title = lead.employment_history?.[0]?.title?.toLowerCase() || "";
    if (
      title.includes("ceo") ||
      title.includes("founder") ||
      title.includes("president")
    ) {
      score += 20;
    } else if (
      title.includes("director") ||
      title.includes("vp") ||
      title.includes("head")
    ) {
      score += 15;
    } else if (title.includes("manager") || title.includes("lead")) {
      score += 10;
    }

    // Company website availability
    if (lead.organization_website_url) score += 10;

    // Ensure score is within bounds
    return Math.min(Math.max(score, 0), 100);
  }

  // Note: removeDuplicates utility moved to shared utils
  // This method is kept for backward compatibility but should use shared utility
  private removeDuplicates<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter((item) => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  async updateUsageTracking(userId: string, leadsCount: number) {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Get current usage
    const { data: currentUsage } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", currentMonth)
      .single();

    if (currentUsage) {
      // Update existing record
      await supabase
        .from("usage_tracking")
        .update({
          leads_generated: currentUsage.leads_generated + leadsCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUsage.id);
    } else {
      // Create new record
      await supabase.from("usage_tracking").insert({
        user_id: userId,
        month_year: currentMonth,
        leads_generated: leadsCount,
        leads_limit: await this.getUserLeadLimit(userId),
      });
    }
  }

  private async getUserLeadLimit(userId: string): Promise<number> {
    // Get user's subscription plan
    const { data: user } = await supabase
      .from("users")
      .select("subscription_plan")
      .eq("id", userId)
      .single();

    const planLimits = {
      starter: 100,
      professional: 500,
      ultra: 1000,
    };

    return (
      planLimits[user?.subscription_plan as keyof typeof planLimits] || 100
    );
  }

  async checkUserLimits(userId: string): Promise<{
    canGenerate: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
  }> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", currentMonth)
      .single();

    const limit = await this.getUserLeadLimit(userId);
    const currentUsage = usage?.leads_generated || 0;
    const remaining = limit - currentUsage;

    return {
      canGenerate: remaining > 0,
      currentUsage,
      limit,
      remaining,
    };
  }

  async getLeads(
    userId: string,
    filters: {
      status?: string;
      search?: string;
      dateRange?: { start: string; end: string };
      page?: number;
      limit?: number;
    } = {}
  ) {
    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq("lead_status", filters.status);
    }

    if (filters.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    if (filters.dateRange) {
      query = query
        .gte("created_at", filters.dateRange.start)
        .lte("created_at", filters.dateRange.end);
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    const { data: leads, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }

    return {
      leads: leads || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }

  async updateLead(
    leadId: string,
    updates: {
      lead_status?: string;
      lead_score?: number;
      notes?: string;
    }
  ) {
    const { data: lead, error } = await supabase
      .from("leads")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    return lead;
  }
}
