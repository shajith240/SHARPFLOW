-- AI Agentic System Database Setup - Fixed Version
-- Run this script in your Supabase SQL Editor
-- This version uses VARCHAR consistently to match SharpFlow's existing schema

-- ============================================================================
-- COMPANY PROFILES TABLE
-- Extended business details for AI prompt customization
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_profiles (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core business information
    company_name VARCHAR NOT NULL,
    industry VARCHAR NOT NULL,
    sub_industry VARCHAR,
    business_model VARCHAR, -- B2B, B2C, B2B2C, marketplace, etc.
    company_size VARCHAR, -- startup, small, medium, large, enterprise
    annual_revenue VARCHAR, -- <1M, 1-10M, 10-50M, 50-100M, 100M+
    
    -- Target market details
    target_market TEXT,
    ideal_customer_profile TEXT,
    geographic_markets JSONB DEFAULT '[]', -- ["US", "EU", "APAC"]
    
    -- Value proposition
    value_proposition TEXT,
    key_differentiators JSONB DEFAULT '[]',
    competitive_advantages TEXT,
    
    -- Communication preferences
    brand_voice VARCHAR, -- professional, friendly, authoritative, innovative
    communication_style VARCHAR, -- formal, casual, consultative
    industry_terminology JSONB DEFAULT '[]',
    
    -- Lead qualification criteria
    qualification_criteria JSONB DEFAULT '{}',
    disqualification_criteria JSONB DEFAULT '{}',
    
    -- Metadata
    last_analyzed TIMESTAMP,
    prompts_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- AGENT PROMPTS TABLE
-- Store customized prompts per user per agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_prompts (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel', 'prism')),
    prompt_type VARCHAR NOT NULL CHECK (prompt_type IN ('system', 'task_specific', 'qualification', 'completion', 'routing')),
    
    -- Prompt content
    custom_prompt TEXT NOT NULL,
    default_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_customized BOOLEAN DEFAULT false,
    
    -- Generation metadata
    generated_by VARCHAR DEFAULT 'ai' CHECK (generated_by IN ('ai', 'manual', 'hybrid')),
    generation_context JSONB DEFAULT '{}',
    confidence DECIMAL(3,2) CHECK (confidence >= 0.00 AND confidence <= 1.00),
    
    -- Performance tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_used TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, agent_name, prompt_type)
);

-- ============================================================================
-- LEAD QUALIFICATION RULES TABLE
-- Store AI-generated qualification criteria
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_qualification_rules (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rule configuration
    rule_name VARCHAR NOT NULL,
    rule_type VARCHAR NOT NULL CHECK (rule_type IN ('industry_match', 'company_size', 'geographic', 'title_seniority', 'budget_indicators', 'technology_stack', 'employee_count', 'decision_maker_level')),
    criteria JSONB NOT NULL, -- Flexible criteria object
    weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0.00 AND weight <= 1.00),
    threshold DECIMAL(3,2) CHECK (threshold >= 0.00 AND threshold <= 1.00),
    
    -- Rule logic
    is_active BOOLEAN DEFAULT true,
    is_ai_generated BOOLEAN DEFAULT true,
    generation_reasoning TEXT,
    
    -- Performance tracking
    applications_count INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, rule_name)
);

-- ============================================================================
-- LEAD QUALIFICATION RESULTS TABLE
-- Store qualification scores and reasoning
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_qualification_results (
    id VARCHAR PRIMARY KEY NOT NULL,
    lead_id VARCHAR NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Qualification results
    overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0.00 AND overall_score <= 100.00),
    qualification_status VARCHAR NOT NULL CHECK (qualification_status IN ('qualified', 'unqualified', 'pending_review', 'requires_manual_review')),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
    
    -- Detailed scoring
    criteria_scores JSONB NOT NULL, -- Individual criteria scores
    qualification_reasoning TEXT NOT NULL,
    disqualification_reasons JSONB DEFAULT '[]',
    
    -- AI analysis
    ai_analysis JSONB DEFAULT '{}',
    recommended_actions JSONB DEFAULT '[]',
    
    -- Performance tracking
    manual_review BOOLEAN DEFAULT false,
    manual_override BOOLEAN DEFAULT false,
    actual_outcome VARCHAR CHECK (actual_outcome IN ('converted', 'lost', 'in_progress', 'not_contacted')),
    
    -- Metadata
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(lead_id)
);

-- ============================================================================
-- PROMPT GENERATION HISTORY TABLE
-- Track prompt generation attempts and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_generation_history (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Generation details
    generation_type VARCHAR NOT NULL CHECK (generation_type IN ('initial', 'update', 'manual_trigger', 'scheduled')),
    company_profile_snapshot JSONB NOT NULL,
    generated_prompts JSONB NOT NULL, -- All prompts generated in this session
    
    -- Results
    success BOOLEAN NOT NULL,
    error_message TEXT,
    prompts_applied INTEGER DEFAULT 0,
    
    -- Performance metrics
    generation_time_ms INTEGER,
    openai_tokens_used INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Company profiles indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_industry ON company_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_size ON company_profiles(company_size);

-- Agent prompts indexes
CREATE INDEX IF NOT EXISTS idx_agent_prompts_user_agent ON agent_prompts(user_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_prompts_active ON agent_prompts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_prompts_customized ON agent_prompts(is_customized) WHERE is_customized = true;

-- Lead qualification rules indexes
CREATE INDEX IF NOT EXISTS idx_qualification_rules_user_id ON lead_qualification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_qualification_rules_active ON lead_qualification_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_qualification_rules_type ON lead_qualification_rules(rule_type);

-- Lead qualification results indexes
CREATE INDEX IF NOT EXISTS idx_qualification_results_lead_id ON lead_qualification_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_qualification_results_user_id ON lead_qualification_results(user_id);
CREATE INDEX IF NOT EXISTS idx_qualification_results_status ON lead_qualification_results(qualification_status);
CREATE INDEX IF NOT EXISTS idx_qualification_results_score ON lead_qualification_results(overall_score);

-- Prompt generation history indexes
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON prompt_generation_history(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_qualification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_generation_history ENABLE ROW LEVEL SECURITY;

-- Company profiles policies
CREATE POLICY "Users can view their own company profile" ON company_profiles
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own company profile" ON company_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own company profile" ON company_profiles
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own company profile" ON company_profiles
    FOR DELETE USING (auth.uid()::text = user_id);

-- Agent prompts policies
CREATE POLICY "Users can view their own agent prompts" ON agent_prompts
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own agent prompts" ON agent_prompts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own agent prompts" ON agent_prompts
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own agent prompts" ON agent_prompts
    FOR DELETE USING (auth.uid()::text = user_id);

-- Lead qualification rules policies
CREATE POLICY "Users can view their own qualification rules" ON lead_qualification_rules
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own qualification rules" ON lead_qualification_rules
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own qualification rules" ON lead_qualification_rules
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own qualification rules" ON lead_qualification_rules
    FOR DELETE USING (auth.uid()::text = user_id);

-- Lead qualification results policies
CREATE POLICY "Users can view their own qualification results" ON lead_qualification_results
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own qualification results" ON lead_qualification_results
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own qualification results" ON lead_qualification_results
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Prompt generation history policies
CREATE POLICY "Users can view their own prompt history" ON prompt_generation_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own prompt history" ON prompt_generation_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AI Agentic System tables created successfully!';
    RAISE NOTICE 'Tables created: company_profiles, agent_prompts, lead_qualification_rules, lead_qualification_results, prompt_generation_history';
    RAISE NOTICE 'Indexes and RLS policies applied for multi-tenant security';
    RAISE NOTICE 'Ready for AI-powered prompt customization and lead qualification!';
END $$;
