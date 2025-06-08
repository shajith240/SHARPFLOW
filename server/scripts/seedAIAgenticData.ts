import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";

// Mock company profiles for different industries
const mockCompanyProfiles = [
  {
    id: uuidv4(),
    companyName: "TechFlow Solutions",
    industry: "Technology",
    subIndustry: "SaaS",
    businessModel: "B2B",
    companySize: "medium",
    annualRevenue: "10-50M",
    targetMarket: "Mid-market companies looking to streamline their workflow automation and improve operational efficiency through AI-powered solutions.",
    idealCustomerProfile: "Operations managers, IT directors, and business process owners at companies with 50-500 employees who are struggling with manual processes and looking for scalable automation solutions.",
    geographicMarkets: ["US", "Canada", "EU"],
    valueProposition: "We help businesses automate complex workflows and reduce manual work by 70% through our AI-powered process automation platform.",
    keyDifferentiators: ["AI-powered automation", "No-code platform", "Enterprise security", "24/7 support"],
    competitiveAdvantages: "Our platform requires zero coding knowledge and can be deployed 5x faster than traditional automation tools, with built-in AI that learns and optimizes processes automatically.",
    brandVoice: "professional",
    communicationStyle: "consultative",
    industryTerminology: ["workflow automation", "process optimization", "digital transformation", "operational efficiency", "AI-powered"],
    qualificationCriteria: {
      industryFocus: ["technology", "manufacturing", "healthcare", "finance"],
      companySizeRange: "50-500",
      budgetIndicators: ["recent funding", "digital transformation initiatives", "automation projects"]
    },
    disqualificationCriteria: {
      companySize: "under 20 employees",
      industries: ["retail", "hospitality"],
      budgetConstraints: "startup with no funding"
    },
    promptsGenerated: false,
    lastAnalyzed: null,
  },
  {
    id: uuidv4(),
    companyName: "HealthCare Analytics Pro",
    industry: "Healthcare",
    subIndustry: "Health Technology",
    businessModel: "B2B",
    companySize: "large",
    annualRevenue: "50-100M",
    targetMarket: "Healthcare providers, hospitals, and medical practices seeking to improve patient outcomes through data-driven insights and predictive analytics.",
    idealCustomerProfile: "Chief Medical Officers, Healthcare IT Directors, and Practice Managers at hospitals and large medical practices with 100+ beds or providers.",
    geographicMarkets: ["US", "Canada"],
    valueProposition: "We transform healthcare data into actionable insights that improve patient outcomes, reduce costs, and enhance operational efficiency through advanced analytics and AI.",
    keyDifferentiators: ["HIPAA compliant", "Real-time analytics", "Predictive modeling", "Clinical decision support"],
    competitiveAdvantages: "Our platform integrates with 95% of existing EHR systems and provides real-time predictive analytics that have been proven to reduce readmission rates by 25%.",
    brandVoice: "authoritative",
    communicationStyle: "professional",
    industryTerminology: ["EHR integration", "clinical analytics", "patient outcomes", "healthcare data", "HIPAA compliance", "predictive modeling"],
    qualificationCriteria: {
      industryFocus: ["healthcare", "medical"],
      companySizeRange: "100+ beds or providers",
      budgetIndicators: ["EHR modernization", "quality improvement initiatives", "value-based care contracts"]
    },
    disqualificationCriteria: {
      companySize: "small practices under 10 providers",
      industries: ["non-healthcare"],
      compliance: "not HIPAA compliant"
    },
    promptsGenerated: false,
    lastAnalyzed: null,
  },
  {
    id: uuidv4(),
    companyName: "FinanceFlow AI",
    industry: "Financial Services",
    subIndustry: "Fintech",
    businessModel: "B2B",
    companySize: "startup",
    annualRevenue: "1-10M",
    targetMarket: "Small to medium financial institutions, credit unions, and wealth management firms looking to modernize their operations with AI-powered financial analysis and risk assessment tools.",
    idealCustomerProfile: "CFOs, Risk Managers, and IT Directors at regional banks, credit unions, and wealth management firms with $100M-$10B in assets under management.",
    geographicMarkets: ["US"],
    valueProposition: "We democratize enterprise-grade financial AI for smaller institutions, providing risk assessment, fraud detection, and portfolio optimization tools previously only available to large banks.",
    keyDifferentiators: ["Regulatory compliant", "Real-time risk assessment", "Affordable pricing", "Easy integration"],
    competitiveAdvantages: "Our solution costs 80% less than enterprise alternatives while providing the same level of accuracy and compliance, specifically designed for smaller financial institutions.",
    brandVoice: "innovative",
    communicationStyle: "consultative",
    industryTerminology: ["risk assessment", "regulatory compliance", "fraud detection", "portfolio optimization", "AML", "KYC"],
    qualificationCriteria: {
      industryFocus: ["financial services", "banking", "credit unions", "wealth management"],
      companySizeRange: "$100M-$10B AUM",
      budgetIndicators: ["regulatory compliance projects", "digital transformation", "risk management upgrades"]
    },
    disqualificationCriteria: {
      companySize: "under $50M AUM",
      industries: ["non-financial"],
      compliance: "not regulated"
    },
    promptsGenerated: false,
    lastAnalyzed: null,
  }
];

// Mock agent prompts for different agents and prompt types
const mockAgentPrompts = [
  // Falcon (Lead Generation) Prompts
  {
    agentName: "falcon",
    promptType: "system",
    defaultPrompt: "You are Falcon, a lead generation specialist. Help users find and qualify potential customers using Apollo.io data.",
    customPrompt: "You are Falcon, a specialized lead generation expert for TechFlow Solutions. Focus on identifying mid-market companies (50-500 employees) in technology, manufacturing, healthcare, and finance sectors who are actively pursuing workflow automation and digital transformation initiatives. Prioritize prospects with recent funding, automation projects, or operational efficiency goals.",
    generationContext: {
      industry: "Technology",
      businessModel: "B2B",
      targetMarket: "Mid-market workflow automation"
    },
    confidence: 0.92
  },
  {
    agentName: "falcon",
    promptType: "qualification",
    defaultPrompt: "Evaluate leads based on email availability, job title relevance, company size, and industry match.",
    customPrompt: "Qualify leads for TechFlow Solutions by evaluating: 1) Company size (50-500 employees preferred), 2) Industry match (technology, manufacturing, healthcare, finance), 3) Job title relevance (Operations Manager, IT Director, Process Owner), 4) Digital transformation indicators (automation projects, process optimization initiatives), 5) Budget signals (recent funding, technology investments). Score leads 1-10 with detailed reasoning.",
    generationContext: {
      qualificationCriteria: "Mid-market B2B automation focus",
      targetTitles: ["Operations Manager", "IT Director", "Process Owner"]
    },
    confidence: 0.89
  },
  // Sage (Research) Prompts
  {
    agentName: "sage",
    promptType: "system",
    defaultPrompt: "You are Sage, a research specialist. Provide comprehensive analysis of leads and companies using multiple data sources.",
    customPrompt: "You are Sage, a healthcare technology research specialist for HealthCare Analytics Pro. Conduct deep research on healthcare providers, hospitals, and medical practices. Focus on EHR systems, patient outcome initiatives, quality improvement programs, and value-based care contracts. Analyze HIPAA compliance status, technology infrastructure, and clinical decision-making processes.",
    generationContext: {
      industry: "Healthcare",
      researchFocus: "Clinical analytics and EHR integration",
      compliance: "HIPAA requirements"
    },
    confidence: 0.94
  },
  // Sentinel (Email Automation) Prompts
  {
    agentName: "sentinel",
    promptType: "system",
    defaultPrompt: "You are Sentinel, an email automation specialist. Monitor emails and generate appropriate responses.",
    customPrompt: "You are Sentinel, an email automation specialist for FinanceFlow AI. Monitor and respond to inquiries from financial institutions with regulatory-compliant language. Emphasize risk assessment capabilities, fraud detection features, and compliance with banking regulations. Use professional, trustworthy tone appropriate for financial services communications.",
    generationContext: {
      industry: "Financial Services",
      compliance: "Banking regulations",
      tone: "Professional and trustworthy"
    },
    confidence: 0.87
  },
  // Prism (Orchestrator) Prompts
  {
    agentName: "prism",
    promptType: "routing",
    defaultPrompt: "Analyze user intent and determine which agent should handle the request, extracting relevant parameters.",
    customPrompt: "You are Prism, the central orchestrator for TechFlow Solutions. Route requests based on workflow automation context: Lead generation requests → Falcon (focus on automation-seeking companies), Research requests → Sage (emphasize process optimization analysis), Email management → Sentinel (professional B2B tone). Extract automation-specific parameters like company size, industry vertical, and digital transformation stage.",
    generationContext: {
      businessFocus: "Workflow automation",
      routingLogic: "Automation-centric request analysis"
    },
    confidence: 0.91
  }
];

// Mock qualification rules
const mockQualificationRules = [
  {
    ruleName: "Technology Industry Match",
    ruleType: "industry_match",
    criteria: {
      targetIndustries: ["Technology", "Software", "SaaS", "IT Services"],
      relatedIndustries: ["Manufacturing", "Healthcare", "Finance"],
      matchType: "exact_or_related"
    },
    weight: 0.25,
    threshold: 0.7,
    isAiGenerated: true,
    generationReasoning: "Technology companies are primary targets for workflow automation solutions, with related industries showing high adoption potential."
  },
  {
    ruleName: "Mid-Market Company Size",
    ruleType: "company_size",
    criteria: {
      minEmployees: 50,
      maxEmployees: 500,
      optimalRange: "100-300",
      revenueRange: "10M-100M"
    },
    weight: 0.20,
    threshold: 0.6,
    isAiGenerated: true,
    generationReasoning: "Mid-market companies have the budget for automation solutions but aren't too large to have complex legacy systems that prevent adoption."
  },
  {
    ruleName: "Decision Maker Authority",
    ruleType: "title_seniority",
    criteria: {
      targetTitles: ["CTO", "VP Operations", "IT Director", "Operations Manager", "Process Manager"],
      seniorityLevels: ["C-Level", "VP", "Director", "Manager"],
      weights: { "C-Level": 1.0, "VP": 0.9, "Director": 0.8, "Manager": 0.6 }
    },
    weight: 0.30,
    threshold: 0.5,
    isAiGenerated: true,
    generationReasoning: "These roles have direct authority over operational processes and technology decisions, making them ideal prospects for automation solutions."
  },
  {
    ruleName: "Digital Transformation Signals",
    ruleType: "budget_indicators",
    criteria: {
      positiveSignals: ["recent funding", "digital transformation", "automation projects", "process optimization", "efficiency initiatives"],
      technologyAdoption: ["cloud migration", "API integrations", "workflow tools"],
      budgetIndicators: ["technology investments", "operational improvements"]
    },
    weight: 0.15,
    threshold: 0.6,
    isAiGenerated: true,
    generationReasoning: "Companies actively pursuing digital transformation are more likely to invest in automation solutions and have allocated budget for such initiatives."
  },
  {
    ruleName: "Geographic Market Alignment",
    ruleType: "geographic",
    criteria: {
      primaryMarkets: ["United States", "Canada"],
      secondaryMarkets: ["United Kingdom", "Germany", "France"],
      timeZonePreference: ["EST", "CST", "PST"],
      matchType: "country_or_region"
    },
    weight: 0.10,
    threshold: 0.8,
    isAiGenerated: true,
    generationReasoning: "Focus on North American markets where we have established support infrastructure and regulatory compliance."
  }
];

// Mock leads for testing qualification
const mockLeads = [
  {
    id: uuidv4(),
    fullName: "Sarah Johnson",
    emailAddress: "sarah.johnson@techcorp.com",
    phoneNumber: "+1-555-0123",
    country: "United States",
    location: "San Francisco, CA",
    industry: "Technology",
    companyName: "TechCorp Solutions",
    jobTitle: "VP of Operations",
    seniority: "VP",
    websiteUrl: "https://techcorp.com",
    linkedinUrl: "https://linkedin.com/in/sarahjohnson",
    leadStatus: "new",
    contactStatus: "not_contacted",
    leadScore: 75,
    source: "apollo",
    tags: ["technology", "operations", "automation"],
    notes: "Company recently announced $50M Series B funding for digital transformation initiatives"
  },
  {
    id: uuidv4(),
    fullName: "Michael Chen",
    emailAddress: "m.chen@healthsystems.org",
    phoneNumber: "+1-555-0456",
    country: "United States",
    location: "Boston, MA",
    industry: "Healthcare",
    companyName: "Regional Health Systems",
    jobTitle: "Chief Information Officer",
    seniority: "C-Level",
    websiteUrl: "https://regionalhealthsystems.org",
    linkedinUrl: "https://linkedin.com/in/michaelchen",
    leadStatus: "qualified",
    contactStatus: "contacted",
    leadScore: 92,
    source: "linkedin",
    tags: ["healthcare", "CIO", "EHR", "analytics"],
    notes: "Leading EHR modernization project, interested in analytics solutions for patient outcomes"
  },
  {
    id: uuidv4(),
    fullName: "Emily Rodriguez",
    emailAddress: "emily.r@communitybank.com",
    phoneNumber: "+1-555-0789",
    country: "United States",
    location: "Austin, TX",
    industry: "Financial Services",
    companyName: "Community First Bank",
    jobTitle: "Risk Management Director",
    seniority: "Director",
    websiteUrl: "https://communityfirstbank.com",
    linkedinUrl: "https://linkedin.com/in/emilyrodriguez",
    leadStatus: "qualified",
    contactStatus: "in_discussion",
    leadScore: 88,
    source: "referral",
    tags: ["banking", "risk management", "compliance", "fintech"],
    notes: "Bank is upgrading risk assessment systems, has budget allocated for Q2 implementation"
  },
  {
    id: uuidv4(),
    fullName: "David Kim",
    emailAddress: "david@smallstartup.io",
    phoneNumber: "+1-555-0321",
    country: "United States",
    location: "Seattle, WA",
    industry: "Technology",
    companyName: "Small Startup Inc",
    jobTitle: "Founder & CEO",
    seniority: "C-Level",
    websiteUrl: "https://smallstartup.io",
    linkedinUrl: "https://linkedin.com/in/davidkim",
    leadStatus: "unqualified",
    contactStatus: "not_contacted",
    leadScore: 35,
    source: "website",
    tags: ["startup", "early-stage", "technology"],
    notes: "Early-stage startup with 8 employees, limited budget for enterprise solutions"
  }
];

export async function seedAIAgenticData(userId: string) {
  console.log("🌱 Seeding AI Agentic System data...");

  try {
    // 1. Insert company profiles
    console.log("📊 Inserting company profiles...");
    const companyProfilesToInsert = mockCompanyProfiles.map(profile => ({
      ...profile,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: profileError } = await supabase
      .from('company_profiles')
      .upsert(companyProfilesToInsert, { onConflict: 'user_id' });

    if (profileError) {
      console.error("❌ Error inserting company profiles:", profileError);
      throw profileError;
    }

    // 2. Insert agent prompts
    console.log("🤖 Inserting agent prompts...");
    const agentPromptsToInsert = mockAgentPrompts.map(prompt => ({
      id: uuidv4(),
      user_id: userId,
      agent_name: prompt.agentName,
      prompt_type: prompt.promptType,
      custom_prompt: prompt.customPrompt,
      default_prompt: prompt.defaultPrompt,
      is_active: true,
      is_customized: true,
      generated_by: 'ai',
      generation_context: prompt.generationContext,
      confidence: prompt.confidence,
      usage_count: Math.floor(Math.random() * 50),
      success_rate: 85 + Math.random() * 15, // 85-100%
      last_used: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random within last week
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: promptError } = await supabase
      .from('agent_prompts')
      .upsert(agentPromptsToInsert, { onConflict: 'user_id,agent_name,prompt_type' });

    if (promptError) {
      console.error("❌ Error inserting agent prompts:", promptError);
      throw promptError;
    }

    // 3. Insert qualification rules
    console.log("📏 Inserting qualification rules...");
    const qualificationRulesToInsert = mockQualificationRules.map(rule => ({
      id: uuidv4(),
      user_id: userId,
      rule_name: rule.ruleName,
      rule_type: rule.ruleType,
      criteria: rule.criteria,
      weight: rule.weight,
      threshold: rule.threshold,
      is_active: true,
      is_ai_generated: rule.isAiGenerated,
      generation_reasoning: rule.generationReasoning,
      applications_count: Math.floor(Math.random() * 100),
      accuracy_rate: 75 + Math.random() * 25, // 75-100%
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: rulesError } = await supabase
      .from('lead_qualification_rules')
      .upsert(qualificationRulesToInsert, { onConflict: 'user_id,rule_name' });

    if (rulesError) {
      console.error("❌ Error inserting qualification rules:", rulesError);
      throw rulesError;
    }

    // 4. Insert mock leads
    console.log("👥 Inserting mock leads...");
    const leadsToInsert = mockLeads.map(lead => ({
      ...lead,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: leadsError } = await supabase
      .from('leads')
      .upsert(leadsToInsert, { onConflict: 'id' });

    if (leadsError) {
      console.error("❌ Error inserting leads:", leadsError);
      throw leadsError;
    }

    console.log("✅ AI Agentic System data seeded successfully!");
    return {
      success: true,
      data: {
        companyProfiles: companyProfilesToInsert.length,
        agentPrompts: agentPromptsToInsert.length,
        qualificationRules: qualificationRulesToInsert.length,
        leads: leadsToInsert.length,
      }
    };

  } catch (error) {
    console.error("❌ Error seeding AI Agentic System data:", error);
    throw error;
  }
}
