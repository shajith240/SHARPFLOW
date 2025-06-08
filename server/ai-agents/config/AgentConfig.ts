/**
 * Dynamic Configuration System for AI Agents
 * Replaces hardcoded values with configurable parameters
 * Ensures exact n8n workflow parity with flexible configuration
 */

export interface AgentConfiguration {
  // OpenAI Configuration
  openai: {
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
  };

  // Falcon Agent (Lead Generation) Configuration
  falcon: {
    apollo: {
      baseUrl: string;
      timeout: number;
      maxResults: number;
      retryAttempts: number;
      retryDelay: number;
    };
    leadProcessing: {
      batchSize: number;
      deduplicationFields: string[];
      scoreWeights: {
        emailPresent: number;
        phonePresent: number;
        linkedinPresent: number;
        titleMatch: number;
        industryMatch: number;
      };
    };
    validation: {
      minLocations: number;
      minBusinesses: number;
      minJobTitles: number;
      maxResults: number;
    };
  };

  // Sage Agent (Research) Configuration
  sage: {
    apify: {
      timeout: number;
      retryAttempts: number;
      retryDelay: number;
    };
    perplexity: {
      model: string;
      timeout: number;
      maxTokens: number;
    };
    research: {
      maxSources: number;
      confidenceThreshold: number;
      reportTemplate: string;
    };
  };

  // Sentinel Agent (Auto-Reply) Configuration
  sentinel: {
    messageGeneration: {
      maxVariations: number;
      toneOptions: string[];
      lengthOptions: string[];
      channelTypes: string[];
    };
    personalization: {
      useLinkedInData: boolean;
      useCompanyData: boolean;
      useRecentNews: boolean;
      maxPersonalizationPoints: number;
    };
  };

  // Prism Configuration
  prism: {
    fallback: {
      businessKeywords: string[];
      jobTitleKeywords: string[];
      locationPatterns: RegExp[];
    };
    intentRecognition: {
      confidenceThreshold: number;
      maxRetries: number;
      fallbackEnabled: boolean;
    };
  };

  // Job Queue Configuration
  jobQueue: {
    maxConcurrentJobs: number;
    jobTimeout: number;
    retryAttempts: number;
    progressUpdateInterval: number;
  };
}

// Default configuration for AI agents
export const defaultAgentConfig: AgentConfiguration = {
  openai: {
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxTokens: 1500,
    timeout: 60000,
  },

  falcon: {
    apollo: {
      baseUrl: "https://api.apollo.io/v1/mixed_people/search",
      timeout: 30000,
      maxResults: 500,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    leadProcessing: {
      batchSize: 50,
      deduplicationFields: ["linkedin_url", "email_address"],
      scoreWeights: {
        emailPresent: 25,
        phonePresent: 20,
        linkedinPresent: 20,
        titleMatch: 20,
        industryMatch: 15,
      },
    },
    validation: {
      minLocations: 1,
      minBusinesses: 1,
      minJobTitles: 1,
      maxResults: 500,
    },
  },

  sage: {
    apify: {
      timeout: 120000,
      retryAttempts: 2,
      retryDelay: 2000,
    },
    perplexity: {
      model: "llama-3.1-sonar-small-128k-online",
      timeout: 60000,
      maxTokens: 2000,
    },
    research: {
      maxSources: 10,
      confidenceThreshold: 70,
      reportTemplate: "comprehensive",
    },
  },

  sentinel: {
    messageGeneration: {
      maxVariations: 3,
      toneOptions: ["professional", "friendly", "casual", "formal"],
      lengthOptions: ["short", "medium", "long"],
      channelTypes: ["email", "linkedin", "phone", "text"],
    },
    personalization: {
      useLinkedInData: true,
      useCompanyData: true,
      useRecentNews: true,
      maxPersonalizationPoints: 5,
    },
  },

  prism: {
    fallback: {
      businessKeywords: [
        // Food & Beverage
        "coffee shop",
        "cafe",
        "restaurant",
        "bar",
        "pub",
        "bakery",
        "pizzeria",
        "fast food",
        "food truck",
        "catering",
        "brewery",
        "winery",

        // Health & Beauty
        "salon",
        "barbershop",
        "spa",
        "nail salon",
        "beauty salon",
        "hair salon",
        "dental clinic",
        "dental office",
        "dentist",
        "medical clinic",
        "clinic",
        "dental",
        "medical",
        "healthcare",
        "pharmacy",
        "optometry",
        "chiropractic",

        // Fitness & Wellness
        "gym",
        "fitness",
        "yoga studio",
        "pilates",
        "crossfit",
        "martial arts",
        "personal training",
        "wellness center",

        // Professional Services
        "law firm",
        "accounting",
        "consultancy",
        "agency",
        "marketing agency",
        "advertising agency",
        "real estate",
        "insurance",
        "financial services",
        "tech company",
        "software company",
        "startup",
        "consulting",

        // Retail & Commerce
        "retail",
        "store",
        "boutique",
        "shop",
        "clothing store",
        "electronics store",
        "bookstore",
        "jewelry store",
        "furniture store",
        "auto dealership",
        "car dealership",
        "hardware store",
        "grocery store",

        // Hospitality & Travel
        "hotel",
        "motel",
        "bed and breakfast",
        "travel agency",
        "tour operator",
        "event planning",
        "wedding planning",

        // Construction & Home Services
        "construction",
        "contractor",
        "plumbing",
        "electrical",
        "hvac",
        "landscaping",
        "cleaning service",
        "home improvement",

        // Education & Training
        "school",
        "training center",
        "tutoring",
        "education",
        "daycare",
        "preschool",
        "language school",

        // Automotive
        "auto repair",
        "car wash",
        "auto parts",
        "mechanic",
        "automotive",

        // Entertainment & Media
        "photography",
        "videography",
        "entertainment",
        "music",
        "art gallery",
        "theater",
        "event venue",
      ],
      jobTitleKeywords: [
        // Ownership & Leadership
        "owner",
        "co-owner",
        "business owner",
        "shop owner",
        "store owner",
        "practice owner",
        "clinic owner",
        "restaurant owner",

        // C-Level Executives
        "ceo",
        "chief executive officer",
        "cfo",
        "chief financial officer",
        "cto",
        "chief technology officer",
        "coo",
        "chief operating officer",
        "cmo",
        "chief marketing officer",
        "chief",
        "executive",

        // Founders & Partners
        "founder",
        "co-founder",
        "founding partner",
        "partner",
        "managing partner",

        // Management Levels
        "manager",
        "general manager",
        "operations manager",
        "sales manager",
        "marketing manager",
        "store manager",
        "branch manager",
        "regional manager",
        "district manager",
        "area manager",
        "office manager",
        "project manager",

        // Directors
        "director",
        "managing director",
        "executive director",
        "operations director",
        "sales director",
        "marketing director",
        "finance director",
        "hr director",

        // Vice Presidents
        "vp",
        "vice president",
        "svp",
        "senior vice president",
        "evp",
        "executive vice president",

        // Department Heads
        "head of",
        "department head",
        "team lead",
        "team leader",
        "lead",

        // Senior Roles
        "senior",
        "senior manager",
        "senior director",
        "senior executive",
        "senior partner",
        "senior consultant",
        "principal",
        "senior principal",

        // Presidents
        "president",
        "vice president",
        "assistant vice president",

        // Specialized Roles
        "administrator",
        "supervisor",
        "coordinator",
        "specialist",
        "consultant",
        "advisor",
        "principal consultant",
      ],
      locationPatterns: [
        /\bin\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/g,
        /\bfrom\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/g,
        /\blocated\s+in\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/g,
        /\bbased\s+in\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!|\?)/g,
      ],
    },
    intentRecognition: {
      confidenceThreshold: 0.7,
      maxRetries: 2,
      fallbackEnabled: true,
    },
  },

  jobQueue: {
    maxConcurrentJobs: 5,
    jobTimeout: 300000, // 5 minutes
    retryAttempts: 3,
    progressUpdateInterval: 1000,
  },
};

// Configuration manager class
export class AgentConfigManager {
  private static instance: AgentConfigManager;
  private config: AgentConfiguration;

  private constructor() {
    this.config = { ...defaultAgentConfig };
  }

  public static getInstance(): AgentConfigManager {
    if (!AgentConfigManager.instance) {
      AgentConfigManager.instance = new AgentConfigManager();
    }
    return AgentConfigManager.instance;
  }

  public getConfig(): AgentConfiguration {
    return this.config;
  }

  public updateConfig(updates: Partial<AgentConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  public getFalconConfig() {
    return this.config.falcon;
  }

  public getSageConfig() {
    return this.config.sage;
  }

  public getSentinelConfig() {
    return this.config.sentinel;
  }

  public getPrismConfig() {
    return this.config.prism;
  }

  public getOpenAIConfig() {
    return this.config.openai;
  }

  public getJobQueueConfig() {
    return this.config.jobQueue;
  }
}

// Export singleton instance
export const agentConfig = AgentConfigManager.getInstance();
