import { BaseAgent } from "../core/BaseAgent.js";
import axios from "axios";
import OpenAI from "openai";
import { supabase } from "../../db.js";
import type {
  AgentJob,
  AgentResult,
  LeadResearchRequest,
} from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

interface LinkedInProfile {
  fullName: string;
  headline: string;
  about: string;
  location: string;
  profilePic: string;
  companyName: string;
  companyWebsite: string;
  companyIndustry: string;
  companySize: string;
  jobTitle: string;
  email: string;
  followers: number;
  connections: number;
  normalizedUrl: string;
  experiences: any[];
  educations: any[];
  updates: any[];
}

interface TrustpilotReview {
  reviewHeadline: string;
  reviewBody: string;
  ratingValue: number;
  datePublished: string;
  replyMessage?: string;
}

export class SageAgent extends BaseAgent {
  private openai: OpenAI | null;
  private apifyApiKey: string;
  private perplexityApiKey: string;

  constructor() {
    super("Sage", "1.0.0");

    // Initialize OpenAI client only if API key is available
    this.openai = process.env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
      : null;

    this.apifyApiKey = process.env.APIFY_API_KEY || "";
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || "";
  }

  protected getCapabilities(): string[] {
    return [
      "LinkedIn profile scraping",
      "Company research via Perplexity",
      "Trustpilot review analysis",
      "AI-powered profile analysis",
      "HTML report generation",
      "Multi-source data aggregation",
    ];
  }

  async process(job: AgentJob): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      this.emitProgress(job.id, 5, "Validating LinkedIn URL...", "validation");

      const request = this.validateAndParseInput(job.inputData);
      const normalizedUrl = this.normalizeLinkedInUrl(request.linkedinUrl);

      this.emitProgress(
        job.id,
        15,
        "Scraping LinkedIn profile...",
        "linkedin_scraping"
      );

      const linkedinData = await this.scrapeLinkedInProfile(normalizedUrl);

      this.emitProgress(
        job.id,
        35,
        "Researching company information...",
        "company_research"
      );

      const companyResearch = await this.researchCompany(
        linkedinData.companyName,
        linkedinData.companyWebsite
      );

      this.emitProgress(
        job.id,
        55,
        "Gathering Trustpilot reviews (may take up to 3 minutes)...",
        "trustpilot_reviews"
      );

      const trustpilotReviews = await this.getTrustpilotReviews(
        linkedinData.companyWebsite
      );

      // Update progress based on Trustpilot results
      if (trustpilotReviews.length > 0) {
        this.emitProgress(
          job.id,
          65,
          `Found ${trustpilotReviews.length} Trustpilot reviews`,
          "trustpilot_complete"
        );
      } else {
        this.emitProgress(
          job.id,
          65,
          "Trustpilot reviews unavailable - continuing with report generation",
          "trustpilot_fallback"
        );
      }

      this.emitProgress(job.id, 70, "Generating AI analysis...", "ai_analysis");

      const aiAnalysis = await this.generateAIAnalysis(
        linkedinData,
        companyResearch
      );

      this.emitProgress(
        job.id,
        85,
        "Creating HTML report...",
        "report_generation"
      );

      const htmlReport = await this.generateHTMLReport({
        linkedinData,
        companyResearch,
        trustpilotReviews,
        aiAnalysis,
      });

      this.emitProgress(
        job.id,
        95,
        "Saving research report...",
        "database_save"
      );

      const savedReport = await this.saveResearchReport({
        userId: job.userId,
        leadId: request.leadId,
        linkedinUrl: normalizedUrl,
        htmlContent: htmlReport,
        linkedinData,
        companyResearch,
        aiAnalysis,
      });

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          reportId: savedReport.id,
          linkedinProfile: linkedinData,
          companyAnalysis: companyResearch,
          aiInsights: aiAnalysis,
          htmlReport: htmlReport,
        },
        metadata: {
          processingTime,
          recordsProcessed: 1,
        },
      };
    } catch (error) {
      console.error("Sage Agent error:", error);
      throw error;
    }
  }

  private validateAndParseInput(inputData: any): LeadResearchRequest {
    if (!inputData || typeof inputData !== "object") {
      throw new Error("Invalid input data provided");
    }

    const linkedinUrl =
      inputData.linkedinURL || inputData.linkedinUrl || inputData.linkedin_url;

    if (!linkedinUrl) {
      throw new Error("LinkedIn URL is required for research");
    }

    return {
      linkedinUrl,
      leadId: inputData.leadId || inputData.lead_id,
      includeCompanyAnalysis: inputData.includeCompanyAnalysis !== false,
      includeContactRecommendations:
        inputData.includeContactRecommendations !== false,
    };
  }

  private normalizeLinkedInUrl(url: string): string {
    // Clean and normalize LinkedIn URL
    let normalized = url.trim();

    if (!normalized.startsWith("http")) {
      normalized = "https://" + normalized;
    }

    // Ensure it's a LinkedIn URL
    if (!normalized.includes("linkedin.com")) {
      throw new Error("Invalid LinkedIn URL provided");
    }

    return normalized;
  }

  private async scrapeLinkedInProfile(
    linkedinUrl: string
  ): Promise<LinkedInProfile> {
    try {
      const response = await axios.post(
        "https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/run-sync-get-dataset-items",
        {
          profileUrls: [linkedinUrl],
          proxyConfiguration: {
            useApifyProxy: true,
          },
          includeUnlistedJobs: false,
          includePosts: true,
        },
        {
          params: {
            token: this.apifyApiKey,
          },
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 120000,
        }
      );

      if (
        !response.data ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        throw new Error("No LinkedIn profile data returned");
      }

      const profileData = response.data[0];

      // Debug log to see all available fields and their values
      console.log(
        "🔍 Available Apify profile fields:",
        Object.keys(profileData)
      );
      console.log("📊 Apify profile data sample:", {
        fullName: profileData.fullName,
        headline: profileData.headline,
        companyName: profileData.companyName,
        location: profileData.addressWithCountry,
        profilePic: profileData.profilePic || profileData.profilePicHighQuality,
        followers: profileData.followers || profileData.followersCount,
        connections: profileData.connections || profileData.connectionsCount,
        about: profileData.about
          ? `${profileData.about.substring(0, 100)}...`
          : "No about section",
      });

      const extractedData = {
        fullName: profileData.fullName || "",
        headline: profileData.headline || "",
        about: profileData.about || "",
        location: profileData.addressWithCountry || "",
        profilePic:
          profileData.profilePic || profileData.profilePicHighQuality || "",
        companyName: profileData.companyName || "",
        companyWebsite: profileData.companyWebsite || "",
        companyIndustry: profileData.companyIndustry || "",
        companySize: profileData.companySize || "",
        jobTitle: profileData.jobTitle || "",
        email: profileData.email || "",
        followers: profileData.followers || profileData.followersCount || 0,
        connections:
          profileData.connections || profileData.connectionsCount || 0,
        normalizedUrl: linkedinUrl,
        experiences: profileData.experiences || [],
        educations: profileData.educations || [],
        updates: profileData.updates || [],
      };

      console.log("✅ LinkedIn data extraction completed:", {
        fullName: extractedData.fullName,
        headline: extractedData.headline,
        companyName: extractedData.companyName,
        hasProfilePic: !!extractedData.profilePic,
        followers: extractedData.followers,
        connections: extractedData.connections,
      });

      return extractedData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`LinkedIn scraping error: ${error.message}`);
      }
      throw error;
    }
  }

  private async researchCompany(
    companyName: string,
    companyWebsite: string
  ): Promise<string> {
    if (!companyName && !companyWebsite) {
      return "No company information available for research.";
    }

    try {
      const response = await axios.post(
        "https://api.perplexity.ai/chat/completions",
        {
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content:
                "You are a researcher in a business development team. Your job is to find as much research as you can about the prospect company. You must ensure your research is for the correct company and is highly accurate. Your research must always include what the prospect company does.",
            },
            {
              role: "user",
              content: `Find comprehensive information about ${
                companyName || "the company"
              }. Website: ${
                companyWebsite || "not provided"
              }. Research: 1) What the company does (products/services), 2) Company size and industry, 3) Recent news and developments, 4) Market position and competitors, 5) Company culture and values, 6) Financial performance if public, 7) Key leadership team, 8) Recent partnerships or acquisitions. Provide detailed, accurate information for business development research.`,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      return (
        response.data.choices?.[0]?.message?.content ||
        "No company research available."
      );
    } catch (error) {
      console.error("Perplexity API error:", error);
      return "Company research temporarily unavailable.";
    }
  }

  private async getTrustpilotReviews(
    companyWebsite: string
  ): Promise<TrustpilotReview[]> {
    if (!companyWebsite) {
      console.log("⚠️ No company website provided for Trustpilot reviews");
      return [];
    }

    const maxRetries = 2;
    const timeoutMs = 180000; // 3 minutes timeout
    const retryDelay = 3000; // 3 seconds between retries

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔍 Attempting Trustpilot scraping (attempt ${attempt}/${maxRetries}) for: ${companyWebsite}`
        );

        const response = await axios.post(
          "https://api.apify.com/v2/acts/nikita-sviridenko~trustpilot-reviews-scraper/run-sync-get-dataset-items",
          {
            companyDomain: companyWebsite.replace(/^https?:\/\//, ""),
            count: 5,
            replies: false,
            sort: "recency",
            stars: ["1", "2", "3"],
            startPage: 1,
            verified: false,
          },
          {
            params: {
              token: this.apifyApiKey,
            },
            headers: {
              "Content-Type": "application/json",
            },
            timeout: timeoutMs,
          }
        );

        console.log(`✅ Trustpilot scraping successful on attempt ${attempt}`);
        return response.data || [];
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;

        if (axios.isAxiosError(error)) {
          if (
            error.code === "ECONNABORTED" ||
            error.message.includes("timeout")
          ) {
            console.warn(
              `⏱️ Trustpilot API timeout on attempt ${attempt}/${maxRetries} (${timeoutMs}ms)`
            );
          } else {
            console.warn(
              `🔄 Trustpilot API error on attempt ${attempt}/${maxRetries}: ${error.message}`
            );
          }
        } else {
          console.warn(
            `❌ Unexpected Trustpilot error on attempt ${attempt}/${maxRetries}:`,
            error
          );
        }

        if (isLastAttempt) {
          console.log(
            "⚠️ All Trustpilot scraping attempts failed - continuing without reviews"
          );
          return [];
        }

        // Wait before retry
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return [];
  }

  private async generateAIAnalysis(
    linkedinData: LinkedInProfile,
    companyResearch: string
  ): Promise<any> {
    if (!this.openai) {
      return "AI analysis unavailable - OpenAI API key not configured.";
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "o1-mini",
        messages: [
          {
            role: "user",
            content: `You are part of the business development team at SharpFlow which is an AI consultancy.

When a new lead books a consultation with SharpFlow, your team researches the lead and provides the research + extracted insights to the consultants so they can read it prior to the consult.

Your job is to create the following sections from the research:

- Personal Profile: The personal profile is a one paragraph summary of the person (lead) extracted from researching their LinkedIn profile.
- Interests: In this section you must identify a few of the lead's interests from their most recent LinkedIn posts + their LinkedIn profile.
- Unique Facts: In this section you must extract at least 2 unique facts about the lead that tells them you've really put time to research who they are. These facts should be things that are unique to the lead and out of the ordinary.
- Company Profile: The company profile is a one paragraph summary of the company the person represents, extracted from researching their company LinkedIn profile and available information on the web.

Your output must be in HTML, following this format:

Person Profile (Heading 2)
[Details]

Company Profile (Heading 2)
[Details]

Interests (Heading 2)
[List of interests in dot point format]

Unique Facts (Heading 2)
[List of unique facts in dot point format]

Don't wrap the output in \`\`\`html\`\`\` since the output will go into the middle of another HTML document. Just make sure its in HTML language.

Create this output for the following research:

LinkedIn Profile Research (in JSON format):
${JSON.stringify(linkedinData)}

Web Research:
${companyResearch}`,
          },
        ],
        // Note: o1-mini model only supports default temperature (1), so we don't specify it
      });

      return (
        completion.choices[0]?.message?.content || "Analysis not available."
      );
    } catch (error) {
      console.error("OpenAI analysis error:", error);
      return "AI analysis temporarily unavailable.";
    }
  }

  private async generateHTMLReport(data: {
    linkedinData: LinkedInProfile;
    companyResearch: string;
    trustpilotReviews: TrustpilotReview[];
    aiAnalysis: any;
  }): Promise<string> {
    const { linkedinData, companyResearch, trustpilotReviews, aiAnalysis } =
      data;

    // Generate experiences table HTML
    const experiencesHTML = linkedinData.experiences
      .map(
        (exp) =>
          `<tr>
        <td>${exp.subtitle || exp.companyName || "N/A"}</td>
        <td>${exp.title || "N/A"}</td>
        <td>${exp.caption || "N/A"}</td>
        <td>${exp.metadata || "N/A"}</td>
      </tr>`
      )
      .join("");

    // Generate education table HTML
    const educationHTML = linkedinData.educations
      .map(
        (edu) =>
          `<tr>
        <td>${edu.title || "N/A"}</td>
        <td>${edu.subtitle || "N/A"}</td>
        <td>${edu.caption || "N/A"}</td>
      </tr>`
      )
      .join("");

    // Generate posts HTML
    const postsHTML = linkedinData.updates
      .map(
        (post) =>
          `<div class="linkedin-post" style="border:1px solid #ddd; padding:10px; margin-bottom:10px;">
        <p>${post.postText || "No content"}</p>
        <p><em>Likes: ${post.numLikes || 0} | Comments: ${
            post.numComments || 0
          }</em></p>
      </div>`
      )
      .join("");

    // Generate reviews HTML with fallback for missing data
    const reviewsHTML =
      trustpilotReviews && trustpilotReviews.length > 0
        ? trustpilotReviews
            .map(
              (review) =>
                `<div class="review-card" style="border:1px solid #ddd; padding:10px; margin-bottom:10px;">
            <h3>${review.reviewHeadline || "Review"}</h3>
            <p><strong>Rating:</strong> ${review.ratingValue || "N/A"}</p>
            <p><strong>Date:</strong> ${
              review.datePublished
                ? new Date(review.datePublished).toLocaleDateString()
                : "N/A"
            }</p>
            <p>${review.reviewBody || "No review content available"}</p>
            ${
              review.replyMessage
                ? `<p><strong>Reply:</strong> ${review.replyMessage}</p>`
                : ""
            }
          </div>`
            )
            .join("")
        : `<div class="review-card" style="border:1px solid #ddd; padding:15px; margin-bottom:10px; background-color: #f8f9fa;">
          <h3>📊 Trustpilot Reviews</h3>
          <p><em>Trustpilot review data is currently unavailable for this company.</em></p>
          <p>This could be due to:</p>
          <ul>
            <li>Company not listed on Trustpilot</li>
            <li>Temporary API service unavailability</li>
            <li>Domain name variations</li>
          </ul>
          <p><strong>Recommendation:</strong> Consider checking the company's reputation through alternative sources such as Google Reviews, LinkedIn company page, or industry-specific review platforms.</p>
        </div>`;

    // Use the Apple-inspired template directly (skip n8n template)
    console.log("🎨 Using Apple-inspired professional template");
    const htmlTemplate = this.getAppleInspiredTemplate();

    // Replace Apple-inspired template variables with actual data
    console.log("🔄 Replacing template variables with LinkedIn data:", {
      fullName: linkedinData.fullName,
      headline: linkedinData.headline,
      companyName: linkedinData.companyName,
      followers: linkedinData.followers,
      connections: linkedinData.connections,
      profilePic: linkedinData.profilePic ? "Available" : "Not available",
    });

    const finalHTML = htmlTemplate
      // Apple-inspired template replacements
      .replace(/\{\{fullName\}\}/g, linkedinData.fullName || "N/A")
      .replace(/\{\{headline\}\}/g, linkedinData.headline || "N/A")
      .replace(/\{\{companyName\}\}/g, linkedinData.companyName || "N/A")
      .replace(/\{\{location\}\}/g, linkedinData.location || "N/A")
      .replace(
        /\{\{companyIndustry\}\}/g,
        linkedinData.companyIndustry || "N/A"
      )
      .replace(/\{\{companySize\}\}/g, linkedinData.companySize || "N/A")
      .replace(/\{\{companyWebsite\}\}/g, linkedinData.companyWebsite || "N/A")
      .replace(/\{\{normalizedUrl\}\}/g, linkedinData.normalizedUrl || "#")
      .replace(/\{\{followers\}\}/g, this.formatNumber(linkedinData.followers))
      .replace(
        /\{\{connections\}\}/g,
        this.formatNumber(linkedinData.connections)
      )
      .replace(/\{\{currentDate\}\}/g, new Date().toLocaleDateString())
      .replace(
        /\{\{profileImageHTML\}\}/g,
        this.generateProfileImageHTML(linkedinData.profilePic)
      )
      .replace(/\{\{aboutHTML\}\}/g, this.generateAboutHTML(linkedinData.about))
      .replace(
        /\{\{experiencesTable\}\}/g,
        experiencesHTML ||
          '<tr><td colspan="4">No experience data available</td></tr>'
      )
      .replace(
        /\{\{educationTable\}\}/g,
        educationHTML ||
          '<tr><td colspan="3">No education data available</td></tr>'
      )
      .replace(
        /\{\{postsHTML\}\}/g,
        this.generatePostsHTML(linkedinData.updates)
      )
      .replace(
        /\{\{aiAnalysis\}\}/g,
        aiAnalysis || "AI analysis temporarily unavailable"
      )
      .replace(
        /\{\{companyResearch\}\}/g,
        companyResearch || "Company research temporarily unavailable"
      )
      .replace(
        /\{\{reviewsHTML\}\}/g,
        this.generateReviewsHTML(trustpilotReviews)
      );

    console.log(
      "✅ Template replacement completed. Final HTML length:",
      finalHTML.length
    );
    console.log("🔍 Template contains placeholders:", {
      hasFullNamePlaceholder: finalHTML.includes("{{fullName}}"),
      hasHeadlinePlaceholder: finalHTML.includes("{{headline}}"),
      hasActualName: finalHTML.includes(linkedinData.fullName || ""),
      hasActualHeadline: finalHTML.includes(linkedinData.headline || ""),
    });
    console.log("📐 Maximum width utilization configuration applied:", {
      containerCSS: "max-width: 98vw, padding: 48px 8px (minimal side padding)",
      desktopBreakpoints:
        "700px+: 16px sides, 600px+: 8px sides, 500px+: 8px sides",
      tableWidth: "width: 100%, min-width: 100%, table-layout: auto",
      dataGridWidth: "width: 100%, min-width: 0",
      zoomSupport: "Optimized for 100%-300% browser zoom levels",
      expectedBehavior:
        "Maximum horizontal space utilization with minimal white space",
    });

    return finalHTML;
  }

  private getBasicHTMLTemplate(): string {
    return this.getAppleInspiredTemplate();
  }

  private getAppleInspiredTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SharpFlow Research Report</title>
  <style>
    /* Apple-inspired Professional Design System */
    :root {
      --primary-bg: #000000;
      --secondary-bg: #1a1a1a;
      --tertiary-bg: #2a2a2a;
      --text-primary: #ffffff;
      --text-secondary: #a1a1aa;
      --text-tertiary: #71717a;
      --accent-lime: #C1FF72;
      --accent-blue: #38B6FF;
      --border-subtle: #27272a;
      --border-default: #3f3f46;
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
      --spacing-2xl: 48px;
      --radius: 8px;
      --radius-lg: 12px;
      --font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-system);
      background: var(--primary-bg);
      color: var(--text-primary);
      line-height: 1.6;
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      /* Improve zoom scaling */
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    .container {
      max-width: 98vw;
      width: 100%;
      margin: 0 auto;
      padding: var(--spacing-2xl) var(--spacing-sm);
      /* Ensure minimum width for zoom levels */
      min-width: min(800px, 90vw);
    }

    /* Typography */
    .report-header {
      text-align: center;
      margin-bottom: var(--spacing-2xl);
      padding-bottom: var(--spacing-xl);
      border-bottom: 1px solid var(--border-subtle);
    }

    .report-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--spacing-sm);
      letter-spacing: -0.025em;
    }

    .report-subtitle {
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .report-meta {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-lg);
      letter-spacing: -0.025em;
    }

    h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: var(--spacing-md);
    }

    /* Layout */
    .section {
      margin-bottom: var(--spacing-2xl);
    }

    .profile-header {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-xl);
      margin-bottom: var(--spacing-xl);
      padding-bottom: var(--spacing-xl);
      border-bottom: 1px solid var(--border-subtle);
    }

    .profile-image {
      width: 120px;
      height: 120px;
      border-radius: var(--radius-lg);
      object-fit: cover;
      border: 2px solid var(--border-default);
    }

    .profile-info {
      flex: 1;
    }

    .profile-name {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .profile-title {
      font-size: 1.125rem;
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .profile-stats {
      display: flex;
      gap: var(--spacing-lg);
      margin-top: var(--spacing-md);
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--accent-lime);
      display: block;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    /* Data Grid - Zoom-aware design */
    .data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
      width: 100%;
      /* Ensure grid adapts to zoom levels */
      min-width: 0;
      overflow: hidden;
    }

    .data-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--secondary-bg);
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
    }

    .data-label {
      font-weight: 500;
      color: var(--text-secondary);
    }

    .data-value {
      color: var(--text-primary);
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }

    /* Tables - Full width utilization */
    .table-container {
      overflow-x: auto;
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      width: 100%;
      max-width: 100%;
      margin: 0;
    }

    table {
      width: 100%;
      min-width: 100%;
      border-collapse: collapse;
      background: var(--secondary-bg);
      table-layout: auto;
    }

    th {
      background: var(--tertiary-bg);
      color: var(--text-primary);
      font-weight: 600;
      padding: var(--spacing-md);
      text-align: left;
      border-bottom: 1px solid var(--border-default);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    td {
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    /* Content Cards */
    .content-card {
      background: var(--secondary-bg);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-md);
    }

    .content-card h4 {
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: var(--spacing-sm);
    }

    .content-card p {
      color: var(--text-secondary);
      margin-bottom: var(--spacing-sm);
    }

    .content-card:last-child {
      margin-bottom: 0;
    }

    /* AI Analysis Special Styling */
    .ai-analysis {
      background: linear-gradient(135deg, var(--secondary-bg) 0%, var(--tertiary-bg) 100%);
      border: 1px solid var(--accent-blue);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
    }

    .ai-analysis h2 {
      color: var(--accent-blue);
    }

    /* About Section */
    .about-text {
      background: var(--secondary-bg);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: var(--spacing-lg);
      color: var(--text-secondary);
      line-height: 1.7;
    }

    /* Links */
    a {
      color: var(--accent-blue);
      text-decoration: none;
      transition: opacity 0.2s ease;
    }

    a:hover {
      opacity: 0.8;
    }

    /* Responsive Design - Zoom-Aware Breakpoints */

    /* Large Desktop - Maximum width utilization */
    @media (min-width: 700px) {
      .container {
        max-width: 98vw;
        padding: var(--spacing-2xl) var(--spacing-md);
      }

      .data-grid {
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: var(--spacing-lg);
      }

      .profile-header {
        gap: var(--spacing-2xl);
      }

      .table-container {
        font-size: 1rem;
      }

      th, td {
        padding: var(--spacing-lg);
      }
    }

    /* Desktop - Maintain desktop layout with minimal padding */
    @media (min-width: 600px) {
      .container {
        max-width: 98vw;
        padding: var(--spacing-2xl) var(--spacing-sm);
      }

      .data-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }

      .profile-header {
        flex-direction: row;
        text-align: left;
      }

      .profile-stats {
        justify-content: flex-start;
      }
    }

    /* Standard Desktop - Minimal side padding */
    @media (min-width: 500px) {
      .container {
        max-width: 98vw;
        padding: var(--spacing-xl) var(--spacing-sm);
      }

      .data-grid {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }
    }

    /* Tablet - Only for very small screens or extreme zoom */
    @media (max-width: 400px) {
      .container {
        max-width: 98vw;
        padding: var(--spacing-lg) var(--spacing-md);
      }

      .data-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      }

      .profile-header {
        gap: var(--spacing-lg);
      }
    }

    /* Mobile Portrait - Only for very narrow screens */
    @media (max-width: 350px) {
      .container {
        max-width: 100%;
        padding: var(--spacing-lg) var(--spacing-md);
      }

      .profile-header {
        flex-direction: column;
        text-align: center;
        gap: var(--spacing-lg);
      }

      .profile-stats {
        justify-content: center;
      }

      .data-grid {
        grid-template-columns: 1fr;
      }

      .report-title {
        font-size: 2rem;
      }

      .profile-name {
        font-size: 1.5rem;
      }
    }

    /* Mobile - Only for extremely narrow screens */
    @media (max-width: 300px) {
      .container {
        max-width: 100%;
        padding: var(--spacing-md) var(--spacing-sm);
      }

      .table-container {
        font-size: 0.875rem;
      }

      th, td {
        padding: var(--spacing-sm);
      }

      .report-title {
        font-size: 1.75rem;
      }

      .profile-name {
        font-size: 1.25rem;
      }

      .data-grid {
        grid-template-columns: 1fr;
        gap: var(--spacing-sm);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Report Header -->
    <header class="report-header">
      <h1 class="report-title">Research Report</h1>
      <div class="report-subtitle">{{fullName}}</div>
      <div class="report-meta">Generated on {{currentDate}}</div>
    </header>

    <!-- Profile Section -->
    <section class="section">
      <div class="profile-header">
        {{profileImageHTML}}
        <div class="profile-info">
          <h2 class="profile-name">{{fullName}}</h2>
          <div class="profile-title">{{headline}}</div>
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{followers}}</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{connections}}</span>
              <span class="stat-label">Connections</span>
            </div>
          </div>
        </div>
      </div>

      <div class="data-grid">
        <div class="data-item">
          <span class="data-label">Company</span>
          <span class="data-value">{{companyName}}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Location</span>
          <span class="data-value">{{location}}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Industry</span>
          <span class="data-value">{{companyIndustry}}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Company Size</span>
          <span class="data-value">{{companySize}}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Website</span>
          <span class="data-value">{{companyWebsite}}</span>
        </div>
        <div class="data-item">
          <span class="data-label">LinkedIn</span>
          <span class="data-value"><a href="{{normalizedUrl}}" target="_blank">View Profile</a></span>
        </div>
      </div>

      {{aboutHTML}}
    </section>

    <!-- Professional Experience -->
    <section class="section">
      <h2>Professional Experience</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Duration</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {{experiencesTable}}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Education -->
    <section class="section">
      <h2>Education</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Degree</th>
              <th>Period</th>
            </tr>
          </thead>
          <tbody>
            {{educationTable}}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Recent Activity -->
    <section class="section">
      <h2>Recent LinkedIn Activity</h2>
      {{postsHTML}}
    </section>

    <!-- AI Analysis -->
    <section class="section ai-analysis">
      <h2>AI Analysis</h2>
      {{aiAnalysis}}
    </section>

    <!-- Company Research -->
    <section class="section">
      <h2>Company Research</h2>
      <div class="content-card">
        {{companyResearch}}
      </div>
    </section>

    <!-- Customer Reviews -->
    <section class="section">
      <h2>Customer Reviews</h2>
      {{reviewsHTML}}
    </section>
  </div>
</body>
</html>`;
  }

  private formatNumber(num: number): string {
    if (num === 0) return "N/A";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }

  private generateProfileImageHTML(profilePic: string): string {
    if (!profilePic) {
      return `<div class="profile-image" style="background: var(--tertiary-bg); display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 2rem;">👤</div>`;
    }
    return `<img src="${profilePic}" alt="Profile Picture" class="profile-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="profile-image" style="background: var(--tertiary-bg); display: none; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 2rem;">👤</div>`;
  }

  private generateAboutHTML(about: string): string {
    if (!about || about.trim() === "") {
      return `<div class="about-text">No description available</div>`;
    }
    return `<div class="about-text">${about}</div>`;
  }

  private generatePostsHTML(updates: any[]): string {
    if (!updates || updates.length === 0) {
      return `<div class="content-card">
        <h4>No Recent Activity</h4>
        <p>No recent LinkedIn posts available for this profile.</p>
      </div>`;
    }

    return updates
      .slice(0, 5) // Limit to 5 most recent posts
      .map(
        (post) => `
        <div class="content-card">
          <h4>LinkedIn Post</h4>
          <p>${post.postText || "No content available"}</p>
          <div style="display: flex; gap: var(--spacing-lg); margin-top: var(--spacing-md); color: var(--text-tertiary); font-size: 0.875rem;">
            <span>👍 ${post.numLikes || 0} likes</span>
            <span>💬 ${post.numComments || 0} comments</span>
          </div>
        </div>`
      )
      .join("");
  }

  private generateReviewsHTML(reviews: TrustpilotReview[]): string {
    if (!reviews || reviews.length === 0) {
      return `<div class="content-card">
        <h4>📊 Customer Reviews</h4>
        <p><em>Trustpilot review data is currently unavailable for this company.</em></p>
        <p>This could be due to:</p>
        <ul style="margin: var(--spacing-md) 0; padding-left: var(--spacing-lg);">
          <li>Company not listed on Trustpilot</li>
          <li>Temporary API service unavailability</li>
          <li>Domain name variations</li>
        </ul>
        <p><strong>Recommendation:</strong> Consider checking the company's reputation through alternative sources such as Google Reviews, LinkedIn company page, or industry-specific review platforms.</p>
      </div>`;
    }

    return reviews
      .map(
        (review) => `
        <div class="content-card">
          <h4>${review.reviewHeadline || "Customer Review"}</h4>
          <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm);">
            <span style="color: var(--accent-lime); font-weight: 600;">⭐ ${
              review.ratingValue || "N/A"
            }</span>
            <span style="color: var(--text-tertiary); font-size: 0.875rem;">
              ${
                review.datePublished
                  ? new Date(review.datePublished).toLocaleDateString()
                  : "Date unknown"
              }
            </span>
          </div>
          <p>${review.reviewBody || "No review content available"}</p>
          ${
            review.replyMessage
              ? `<div style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--tertiary-bg); border-radius: var(--radius); border-left: 3px solid var(--accent-blue);"><strong>Company Reply:</strong><br/>${review.replyMessage}</div>`
              : ""
          }
        </div>`
      )
      .join("");
  }

  private async saveResearchReport(data: {
    userId: string;
    leadId?: string;
    linkedinUrl: string;
    htmlContent: string;
    linkedinData: LinkedInProfile;
    companyResearch: string;
    aiAnalysis: any;
  }): Promise<any> {
    // First, let's check what columns actually exist in the database
    console.log(
      "🔍 Checking actual database schema for research_reports table..."
    );

    // Query the information_schema to see what columns exist
    // Note: Use rpc call since direct information_schema access may not work
    let columnInfo = null;
    let columnError = null;

    try {
      const { data, error } = await supabase.rpc("get_table_schema", {
        table_name: "research_reports",
      });

      if (error) {
        console.warn("⚠️ get_table_schema function error:", error.message);
        throw new Error(`Schema function error: ${error.message}`);
      }

      columnInfo = data;
      columnError = null;
      console.log(
        "✅ Successfully retrieved table schema using get_table_schema function"
      );
    } catch (e) {
      // Fallback: Use information_schema directly
      console.log(
        "🔄 get_table_schema function unavailable, trying information_schema..."
      );

      try {
        // Skip information_schema query since it's not available
        // Go directly to fallback
        throw new Error(
          "Information schema not accessible via Supabase client"
        );
      } catch (fallbackError) {
        // Final fallback: assume standard columns exist
        console.log(
          "⚠️ All schema queries failed, using default column mapping"
        );
        console.log("Fallback error:", fallbackError);

        columnInfo = [
          { column_name: "id", data_type: "varchar" },
          { column_name: "user_id", data_type: "varchar" },
          { column_name: "lead_id", data_type: "varchar" },
          { column_name: "job_id", data_type: "varchar" },
          { column_name: "report_title", data_type: "varchar" },
          { column_name: "report_content", data_type: "text" },
          { column_name: "report_type", data_type: "varchar" },
          { column_name: "research_sources", data_type: "jsonb" },
          { column_name: "confidence_score", data_type: "integer" },
          { column_name: "created_at", data_type: "timestamp" },
          { column_name: "updated_at", data_type: "timestamp" },
        ];
        columnError = null;
      }
    }

    if (columnError) {
      console.error("❌ Error checking table schema:", columnError);
    } else {
      console.log(
        "🔍 Available columns in research_reports table:",
        columnInfo?.map((col) => `${col.column_name} (${col.data_type})`)
      );
    }

    // Try different possible column name variations
    const possibleContentColumns = [
      "report_content",
      "content",
      "html_content",
      "report_html",
    ];
    const possibleTitleColumns = ["report_title", "title", "name"];

    // Determine which columns actually exist
    const availableColumns = columnInfo?.map((col) => col.column_name) || [];
    const contentColumn =
      possibleContentColumns.find((col) => availableColumns.includes(col)) ||
      "report_content";
    const titleColumn =
      possibleTitleColumns.find((col) => availableColumns.includes(col)) ||
      "report_title";

    console.log(
      `🔍 Using content column: ${contentColumn}, title column: ${titleColumn}`
    );

    // Create report data with detected column names
    const reportData: any = {
      id: uuidv4(),
      user_id: data.userId,
      [titleColumn]: `Research Report - ${
        data.linkedinData.fullName || "Unknown"
      }`,
      [contentColumn]: data.htmlContent,
      created_at: new Date().toISOString(),
    };

    // Add optional columns if they exist in the schema
    if (data.leadId && availableColumns.includes("lead_id")) {
      reportData.lead_id = data.leadId;
    }

    if (availableColumns.includes("report_type")) {
      reportData.report_type = "linkedin_research";
    }

    if (availableColumns.includes("job_id")) {
      reportData.job_id = this.currentJobId;
    }

    console.log("🔍 Saving research report with data:", {
      id: reportData.id,
      user_id: reportData.user_id,
      [titleColumn]: reportData[titleColumn],
      [contentColumn]: `${data.htmlContent.length} characters`,
      availableColumns: availableColumns.length,
    });

    // Try to insert the report with comprehensive error handling
    let savedReport;
    let insertError;

    try {
      const { data: insertData, error } = await supabase
        .from("research_reports")
        .insert(reportData)
        .select()
        .single();

      savedReport = insertData;
      insertError = error;
    } catch (e) {
      insertError = e;
    }

    if (insertError) {
      console.error("❌ Database error details:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });

      // If table doesn't exist, try to create it
      if (
        insertError.code === "PGRST106" ||
        insertError.message?.includes("does not exist")
      ) {
        console.log("🔄 Table doesn't exist, attempting to create it...");

        try {
          // Create the table with basic structure
          await supabase.rpc("exec", {
            sql: `
              CREATE TABLE IF NOT EXISTS research_reports (
                id VARCHAR PRIMARY KEY NOT NULL,
                user_id VARCHAR NOT NULL,
                lead_id VARCHAR,
                report_title VARCHAR NOT NULL,
                report_content TEXT NOT NULL,
                report_type VARCHAR DEFAULT 'linkedin_research',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
              );
            `,
          });

          console.log("✅ Table created, retrying insert...");

          // Retry the insert
          const { data: retryData, error: retryError } = await supabase
            .from("research_reports")
            .insert(reportData)
            .select()
            .single();

          if (retryError) {
            throw new Error(`Retry failed: ${retryError.message}`);
          }

          savedReport = retryData;
        } catch (createError) {
          console.error("❌ Failed to create table:", createError);
          throw new Error(`Database setup error: ${createError.message}`);
        }
      }
      // If it's a column error, try with different approaches
      else if (
        insertError.message?.includes("column") ||
        insertError.code === "PGRST204"
      ) {
        console.log(
          "🔄 Schema cache issue detected, trying alternative approaches..."
        );

        // First, try to refresh the schema cache by making a simple query
        try {
          await supabase.from("research_reports").select("id").limit(1);
          console.log("✅ Schema cache refreshed");
        } catch (e) {
          console.log("⚠️ Could not refresh schema cache");
        }

        // Try with exact column names from the created table
        const standardData = {
          id: reportData.id,
          user_id: reportData.user_id,
          report_title: reportData[titleColumn],
          report_content: reportData[contentColumn],
          report_type: "linkedin_research",
          created_at: reportData.created_at,
        };

        console.log("🔄 Retrying with standard schema...");
        const { data: retryData, error: retryError } = await supabase
          .from("research_reports")
          .insert(standardData)
          .select()
          .single();

        if (retryError) {
          console.error("❌ Standard retry failed:", retryError);

          // Final fallback: try with absolute minimal data
          const minimalData = {
            id: reportData.id,
            user_id: reportData.user_id,
            report_title: reportData[titleColumn],
            report_content: reportData[contentColumn],
          };

          console.log("🔄 Final attempt with minimal data...");
          const { data: finalData, error: finalError } = await supabase
            .from("research_reports")
            .insert(minimalData)
            .select()
            .single();

          if (finalError) {
            console.error("❌ All retry attempts failed:", finalError);
            throw new Error(`Database error: ${finalError.message}`);
          }

          savedReport = finalData;
        } else {
          savedReport = retryData;
        }
      } else {
        throw new Error(`Database error: ${insertError.message}`);
      }
    }

    console.log("✅ Research report saved successfully:", savedReport.id);

    // Notify user of completion via WebSocket
    try {
      if (this.webSocketManager && this.webSocketManager.emitJobCompleted) {
        this.webSocketManager.emitJobCompleted(data.userId, {
          jobId: this.currentJobId || "unknown",
          agentName: "sage",
          result: {
            reportId: savedReport.id,
            reportTitle: savedReport.report_title || savedReport.report_title,
            message: "LinkedIn research report generated successfully!",
          },
        });
      } else {
        console.log(
          "⚠️ WebSocket manager not available for completion notification"
        );
      }
    } catch (wsError) {
      console.error("⚠️ WebSocket notification error:", wsError.message);
    }

    return savedReport;
  }
}
