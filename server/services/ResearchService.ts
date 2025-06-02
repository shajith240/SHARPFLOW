import axios from 'axios';
import { supabase } from '../lib/supabase';

export interface LinkedInData {
  full_name: string;
  headline: string;
  location: string;
  about: string;
  job_title: string;
  company: string;
  company_description: string;
  company_website: string;
  company_domain: string;
  company_industry: string;
  linkedin_url: string;
  profile_image_url: string;
  company_logo_url: string;
  experiences: Array<{
    company: string;
    title: string;
    date_range: string;
    location: string;
  }>;
  educations: Array<{
    school: string;
    degree: string;
    field_of_study: string;
  }>;
  posts: Array<{
    user_post: string;
    posted: string;
    post_id: string;
  }>;
}

export interface CompanyResearch {
  content: string;
  citations: string[];
}

export interface TrustPilotReview {
  reviewHeadline: string;
  ratingValue: number;
  datePublished: string;
  reviewBody: string;
  replyMessage?: string;
}

export class ResearchService {
  private relevanceApiKey = process.env.RELEVANCE_API_KEY;
  private relevanceApiUrl = process.env.RELEVANCE_API_URL;
  private perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  private trustpilotApiKey = process.env.TRUSTPILOT_API_KEY;
  private openaiApiKey = process.env.OPENAI_API_KEY;

  async scrapeLinkedInProfile(linkedinUrl: string): Promise<LinkedInData> {
    try {
      const response = await axios.post(this.relevanceApiUrl, {
        linkedin_url: linkedinUrl,
        last_x_days: 30
      }, {
        headers: {
          'Authorization': this.relevanceApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes
      });

      const data = response.data;
      
      return {
        full_name: data.linkedin_profile_details_data.full_name,
        headline: data.linkedin_profile_details_data.headline,
        location: data.linkedin_profile_details_data.location,
        about: data.linkedin_profile_details_data.about,
        job_title: data.linkedin_profile_details_data.job_title,
        company: data.linkedin_profile_details_data.company,
        company_description: data.linkedin_profile_details_data.company_description,
        company_website: data.linkedin_profile_details_data.company_website,
        company_domain: data.linkedin_profile_details_data.company_domain,
        company_industry: data.linkedin_profile_details_data.company_industry,
        linkedin_url: data.linkedin_profile_details_data.linkedin_url,
        profile_image_url: data.linkedin_profile_details_data.profile_image_url,
        company_logo_url: data.linkedin_profile_details_data.company_logo_url,
        experiences: data.linkedin_profile_details_data.experiences || [],
        educations: data.linkedin_profile_details_data.educations || [],
        posts: data.last_30_days_posts_transformed || []
      };
    } catch (error) {
      console.error('LinkedIn scraping failed:', error);
      throw new Error(`LinkedIn scraping failed: ${error.message}`);
    }
  }

  async researchCompany(companyName: string, companyWebsite: string): Promise<CompanyResearch> {
    try {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a researcher in a business development team. Your job is to find as much research as you can about the prospect company. You must ensure your research is for the correct company and is highly accurate. Your research must always include what the prospect company does.'
          },
          {
            role: 'user',
            content: `Find as much info as you can about ${companyName}. This is their website URL: ${companyWebsite}`
          }
        ]
      }, {
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      return {
        content: response.data.choices[0].message.content,
        citations: response.data.citations || []
      };
    } catch (error) {
      console.error('Company research failed:', error);
      throw new Error(`Company research failed: ${error.message}`);
    }
  }

  async getTrustPilotReviews(companyDomain: string): Promise<TrustPilotReview[]> {
    try {
      const response = await axios.post(
        `https://api.apify.com/v2/acts/nikita-sviridenko~trustpilot-reviews-scraper/run-sync-get-dataset-items?token=${this.trustpilotApiKey}`,
        {
          companyDomain,
          count: 5,
          replies: false,
          sort: 'recency',
          stars: ['1', '2', '3'],
          startPage: 1,
          verified: false
        },
        { timeout: 60000 }
      );

      return response.data || [];
    } catch (error) {
      console.error('TrustPilot scraping failed:', error);
      // Return empty array if TrustPilot fails (not critical)
      return [];
    }
  }

  async generateInsights(
    linkedinData: LinkedInData,
    companyResearch: CompanyResearch,
    reviews: TrustPilotReview[]
  ) {
    try {
      // Generate person and company profile
      const profileResponse = await this.callOpenAI([
        {
          role: 'user',
          content: `You are part of the business development team at SharpFlow which is an AI automation consultancy. 

When a new lead books a consultation with SharpFlow, your team researches the leads and provides the research + extracted insights to the consultants so they can read it prior to the consult. 

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

Most Recent LinkedIn Posts: 
${JSON.stringify(linkedinData.posts)}

Web Research: 
${companyResearch.content}`
        }
      ]);

      // Generate pain points and solutions
      const painPointsResponse = await this.callOpenAI([
        {
          role: 'user',
          content: `You are part of the business development team at SharpFlow. SharpFlow is an AI Automation agency that provides the following services: 

- AI Consulting: SharpFlow provides consultations to businesses looking to implement AI. 
- Process Automation: SharpFlow automates processes that are repetitive, time consuming, high volume or error prone. These repetitive processes are automated with traditional rule based automations. 
- AI SaaS Development: For businesses that can automate their entire service, SharpFlow creates a SaaS platform so that they can provide their services over the cloud in a one to many fashion. 
- AI Agent Development: SharpFlow develops custom AI agents that can handle less repetitive tasks autonomously. Considering the current capabilities of AI agents, the tasks that they can complete have to be simple in scope. 

Your job is to analyse the research and extract following information: 

- Pain Points: By looking through the company's negative reviews and also considering their line of business and the lead's position in the company, you must identify the biggest pain points the lead's company could be facing. 
- Solutions to Pain Points: In this section you must come up with solutions SharpFlow can offer to solve each of the pain points completely. 
- Highest ROI Automation Opportunities: Considering the info you have about the lead and his company, you must come up with the 5 highest ROI automation opportunities that SharpFlow can offer them. These automations have to be realistic, yet extremely high ROI. Sort them in order of best opportunity at the top of the list.  

The insights you extract must be in HTML format as they will be going in the middle of a HTML document. 

Please use the following output format: 

Opportunities (Heading 1)

Pain Points and Solutions: (Heading 2)
[Table with 3 columns: 
1. Pain Point: Explains the pain point they're facing. 
2. Evidence: Explains why we think this is the case. 
3. Solution: Explains the solution to the pain point by SharpFlow.
Each row is a new pain point.]

Automation Opportunities: (Heading 2)
[5 Highest ROI automation opportunities for the lead's company sorted with the best solution at the top. This must be in dotpoint format:
- Opportunity#1 Name: Details
- Opportunity#2 Name: Details
...

Don't wrap the output in \`\`\`html\`\`\` since the output will go into the middle of another HTML document.

LinkedIn Profile Scraped Summary in HTML format: 
${profileResponse}

Web Research Results for Lead's Company: 
${companyResearch.content} 

Recent Bad Reviews on TrustPilot for Lead's Company in HTML format: 
${this.formatReviewsAsHTML(reviews)}
(if there are no reviews then just create the pain points by considering the lead's company and job title)`
        }
      ]);

      return {
        profile: profileResponse,
        painPoints: painPointsResponse
      };
    } catch (error) {
      console.error('Insight generation failed:', error);
      throw new Error(`Insight generation failed: ${error.message}`);
    }
  }

  private async callOpenAI(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages
    }, {
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    return response.data.choices[0].message.content;
  }

  private formatReviewsAsHTML(reviews: TrustPilotReview[]): string {
    if (!reviews.length) return '<p>No recent reviews found.</p>';

    return reviews.map(review => `
      <div class="review-card" style="border:1px solid #ddd; padding:10px; margin-bottom:10px;">
        <h3>${review.reviewHeadline}</h3>
        <p><strong>Rating:</strong> ${review.ratingValue}</p>
        <p><strong>Date:</strong> ${new Date(review.datePublished).toLocaleDateString()}</p>
        <p>${review.reviewBody}</p>
        ${review.replyMessage ? `<p><strong>Reply:</strong> ${review.replyMessage}</p>` : ''}
      </div>
    `).join('');
  }

  async generateHTMLReport(
    linkedinData: LinkedInData,
    companyResearch: CompanyResearch,
    reviews: TrustPilotReview[],
    insights: { profile: string; painPoints: string }
  ): Promise<string> {
    const experiencesTable = linkedinData.experiences.map(exp => `
      <tr>
        <td>${exp.company}</td>
        <td>${exp.title}</td>
        <td>${exp.date_range}</td>
        <td>${exp.location}</td>
      </tr>
    `).join('');

    const educationTable = linkedinData.educations.map(edu => `
      <tr>
        <td>${edu.school}</td>
        <td>${edu.degree}</td>
        <td>${edu.field_of_study}</td>
      </tr>
    `).join('');

    const postsHTML = linkedinData.posts.map(post => `
      <div class="linkedin-post" style="border:1px solid #ddd; padding:10px; margin-bottom:10px;">
        <p>${post.user_post}</p>
        <p><em>Posted on: ${post.posted}</em></p>
      </div>
    `).join('');

    const reviewsHTML = this.formatReviewsAsHTML(reviews);
    const citationsHTML = companyResearch.citations.map(citation => 
      `<li><a href="${citation}" target="_blank">${citation}</a></li>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>SharpFlow Research Report - ${linkedinData.full_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            h1, h2, h3 { color: #222; }
            .section { margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
            th { background-color: #f2f2f2; }
            .header-images { display: flex; margin-bottom: 20px; }
            .header-images img { width: 50%; height: auto; max-width: 300px; }
            a { color: #1a0dab; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="header-images">
            <img src="${linkedinData.profile_image_url}" alt="Profile Picture">
            <img src="${linkedinData.company_logo_url}" alt="Company Logo">
          </div>

          <div class="section">
            <h1>Analysis & Key Facts</h1>
            ${insights.profile}
            ${insights.painPoints}
          </div>

          <div class="section">
            <h1>Research Report</h1>
            
            <div class="profile-details">
              <h2>LinkedIn Profile Details</h2>
              <p><strong>Name:</strong> ${linkedinData.full_name}</p>
              <p><strong>Headline:</strong> ${linkedinData.headline}</p>
              <p><strong>Location:</strong> ${linkedinData.location}</p>
              <p><strong>About:</strong> ${linkedinData.about}</p>
              <p><strong>Job Title:</strong> ${linkedinData.job_title}</p>
              <p><strong>Company:</strong> ${linkedinData.company}</p>
              <p><strong>Company Description:</strong> ${linkedinData.company_description}</p>
              <p><strong>Company Website:</strong> <a href="${linkedinData.company_website}" target="_blank">${linkedinData.company_website}</a></p>
              <p><strong>Industry:</strong> ${linkedinData.company_industry}</p>
              <p><strong>LinkedIn URL:</strong> <a href="${linkedinData.linkedin_url}" target="_blank">${linkedinData.linkedin_url}</a></p>
            </div>
            
            <div>
              <h2>Education</h2>
              <table>
                <thead>
                  <tr><th>School</th><th>Degree</th><th>Field of Study</th></tr>
                </thead>
                <tbody>${educationTable}</tbody>
              </table>
            </div>
            
            <div>
              <h2>Experience</h2>
              <table>
                <thead>
                  <tr><th>Company</th><th>Title</th><th>Date Range</th><th>Location</th></tr>
                </thead>
                <tbody>${experiencesTable}</tbody>
              </table>
            </div>
            
            <div>
              <h2>Recent LinkedIn Posts</h2>
              ${postsHTML}
            </div>
            
            <div>
              <h2>Company Research Analysis</h2>
              <p>${companyResearch.content}</p>
            </div>
            
            <div>
              <h2>Customer Reviews</h2>
              ${reviewsHTML}
            </div>
            
            <div>
              <h2>Citations</h2>
              <ul>${citationsHTML}</ul>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async storeReport(
    userId: string,
    leadId: string,
    htmlContent: string,
    insights: any,
    rawData: {
      linkedinData: LinkedInData;
      companyResearch: CompanyResearch;
      reviews: TrustPilotReview[];
    }
  ) {
    const { data: lead } = await supabase
      .from('leads')
      .select('full_name, company_name')
      .eq('id', leadId)
      .single();

    const reportName = `${lead?.full_name} - ${lead?.company_name} Research Report`;

    const { data: report, error } = await supabase
      .from('research_reports')
      .insert({
        user_id: userId,
        lead_id: leadId,
        report_name: reportName,
        status: 'completed',
        html_content: htmlContent,
        insights: {
          companySize: rawData.linkedinData.company_description?.length > 100 ? 'Large' : 'Medium',
          recentNews: rawData.companyResearch.citations.length,
          socialActivity: rawData.linkedinData.posts.length > 5 ? 'High' : 'Medium',
          contactInfo: true,
          linkedinProfile: rawData.linkedinData.linkedin_url,
          companyWebsite: rawData.linkedinData.company_website,
          industry: rawData.linkedinData.company_industry,
          location: rawData.linkedinData.location
        },
        linkedin_data: rawData.linkedinData,
        company_research: rawData.companyResearch,
        trustpilot_reviews: rawData.reviews
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store research report: ${error.message}`);
    }

    return report;
  }
}
