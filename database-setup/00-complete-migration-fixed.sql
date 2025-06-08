-- Complete SharpFlow Multi-Tenant Database Migration (FIXED VERSION)
-- Run this single script in your Supabase SQL Editor
-- This version handles existing tables and data type conflicts

-- ============================================================================
-- PART 1: CHECK EXISTING STRUCTURE AND ADAPT
-- ============================================================================

-- Check if leads table exists and get its ID column type
DO $$
DECLARE
    leads_id_type TEXT;
    leads_exists BOOLEAN := FALSE;
BEGIN
    -- Check if leads table exists and get ID type
    SELECT data_type INTO leads_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'leads' 
      AND column_name = 'id';
    
    IF leads_id_type IS NOT NULL THEN
        leads_exists := TRUE;
        RAISE NOTICE 'Leads table exists with ID type: %', leads_id_type;
    ELSE
        RAISE NOTICE 'Leads table does not exist, will create with UUID type';
    END IF;
    
    -- Store the result for later use
    IF leads_exists THEN
        -- Create a temporary table to store the ID type info
        CREATE TEMP TABLE IF NOT EXISTS migration_info (
            table_name TEXT,
            id_type TEXT
        );
        INSERT INTO migration_info VALUES ('leads', leads_id_type);
    END IF;
END $$;

-- ============================================================================
-- PART 2: CORE TABLES (SAFE CREATION)
-- ============================================================================

-- Users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY NOT NULL,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    paypal_customer_id VARCHAR,
    subscription_status VARCHAR DEFAULT 'inactive',
    subscription_plan VARCHAR,
    subscription_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    company VARCHAR,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_customer_id VARCHAR NOT NULL,
    paypal_plan_id VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 3: AI AGENTS TABLES (ADAPTED FOR EXISTING STRUCTURE)
-- ============================================================================

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Jobs Table
CREATE TABLE IF NOT EXISTS agent_jobs (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR REFERENCES chat_sessions(id) ON DELETE SET NULL,
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel', 'prism')),
    job_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    input_data JSONB NOT NULL,
    result_data JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Leads Table (handle existing structure)
DO $$
DECLARE
    leads_id_type TEXT;
BEGIN
    -- Get existing leads table ID type if it exists
    SELECT data_type INTO leads_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'leads' 
      AND column_name = 'id';
    
    -- If leads table doesn't exist, create it with UUID type (matching your existing structure)
    IF leads_id_type IS NULL THEN
        CREATE TABLE leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            full_name VARCHAR NOT NULL,
            email_address VARCHAR,
            phone_number VARCHAR,
            country VARCHAR,
            location VARCHAR NOT NULL,
            industry VARCHAR NOT NULL,
            company_name VARCHAR NOT NULL,
            job_title VARCHAR NOT NULL,
            seniority VARCHAR,
            website_url VARCHAR,
            linkedin_url VARCHAR,
            lead_status VARCHAR DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
            contact_status VARCHAR DEFAULT 'not_contacted' CHECK (contact_status IN ('not_contacted', 'email_sent', 'responded', 'bounced')),
            lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
            source VARCHAR DEFAULT 'Falcon',
            tags JSONB DEFAULT '[]',
            notes TEXT,
            n8n_execution_id VARCHAR,
            apollo_person_id VARCHAR,
            apollo_organization_id VARCHAR,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            last_contacted_at TIMESTAMP
        );
        RAISE NOTICE 'Created leads table with UUID primary key';
    ELSE
        RAISE NOTICE 'Leads table already exists with % ID type', leads_id_type;
    END IF;
END $$;

-- Generated Messages Table (adapted for existing leads table)
DO $$
DECLARE
    leads_id_type TEXT;
BEGIN
    -- Get the actual ID type of leads table
    SELECT data_type INTO leads_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'leads' 
      AND column_name = 'id';
    
    -- Drop existing generated_messages table if it has wrong foreign key type
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_messages') THEN
        DROP TABLE generated_messages CASCADE;
        RAISE NOTICE 'Dropped existing generated_messages table to recreate with correct types';
    END IF;
    
    -- Create generated_messages table with matching lead_id type
    IF leads_id_type = 'uuid' THEN
        CREATE TABLE generated_messages (
            id VARCHAR PRIMARY KEY NOT NULL,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
            job_id VARCHAR REFERENCES agent_jobs(id) ON DELETE SET NULL,
            message_type VARCHAR NOT NULL CHECK (message_type IN ('initial_outreach', 'follow_up', 'response')),
            message_content TEXT NOT NULL,
            tone VARCHAR DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly')),
            is_primary BOOLEAN DEFAULT false,
            status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled', 'archived')),
            generated_at TIMESTAMP DEFAULT NOW(),
            sent_at TIMESTAMP,
            response_received_at TIMESTAMP
        );
    ELSE
        CREATE TABLE generated_messages (
            id VARCHAR PRIMARY KEY NOT NULL,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE,
            job_id VARCHAR REFERENCES agent_jobs(id) ON DELETE SET NULL,
            message_type VARCHAR NOT NULL CHECK (message_type IN ('initial_outreach', 'follow_up', 'response')),
            message_content TEXT NOT NULL,
            tone VARCHAR DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly')),
            is_primary BOOLEAN DEFAULT false,
            status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled', 'archived')),
            generated_at TIMESTAMP DEFAULT NOW(),
            sent_at TIMESTAMP,
            response_received_at TIMESTAMP
        );
    END IF;
    
    RAISE NOTICE 'Created generated_messages table with % lead_id type', leads_id_type;
END $$;

-- Research Reports Table (adapted for existing leads table)
DO $$
DECLARE
    leads_id_type TEXT;
BEGIN
    -- Get the actual ID type of leads table
    SELECT data_type INTO leads_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'leads' 
      AND column_name = 'id';
    
    -- Create research_reports table with matching lead_id type
    IF leads_id_type = 'uuid' THEN
        CREATE TABLE IF NOT EXISTS research_reports (
            id VARCHAR PRIMARY KEY NOT NULL,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
            job_id VARCHAR,
            report_title VARCHAR NOT NULL,
            report_content TEXT NOT NULL,
            report_type VARCHAR DEFAULT 'linkedin_research' CHECK (report_type IN ('linkedin_research', 'company_research', 'market_research')),
            research_sources JSONB DEFAULT '[]',
            confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    ELSE
        CREATE TABLE IF NOT EXISTS research_reports (
            id VARCHAR PRIMARY KEY NOT NULL,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE,
            job_id VARCHAR,
            report_title VARCHAR NOT NULL,
            report_content TEXT NOT NULL,
            report_type VARCHAR DEFAULT 'linkedin_research' CHECK (report_type IN ('linkedin_research', 'company_research', 'market_research')),
            research_sources JSONB DEFAULT '[]',
            confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    END IF;
    
    RAISE NOTICE 'Created research_reports table with % lead_id type', leads_id_type;
END $$;

-- Agent Metrics Table
CREATE TABLE IF NOT EXISTS agent_metrics (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL,
    metric_type VARCHAR NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_date DATE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 4: MULTI-TENANT TABLES
-- ============================================================================

-- User Agent Configurations Table
CREATE TABLE IF NOT EXISTS user_agent_configs (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel')),
    is_enabled BOOLEAN DEFAULT false,
    api_keys JSONB NOT NULL DEFAULT '{}',
    configuration JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, agent_name)
);

-- Subscription Plan Features Table
CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id VARCHAR PRIMARY KEY NOT NULL,
    plan_name VARCHAR NOT NULL,
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel', 'prism')),
    is_included BOOLEAN DEFAULT false,
    monthly_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Onboarding Data Table
CREATE TABLE IF NOT EXISTS user_onboarding (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR,
    industry VARCHAR,
    target_market VARCHAR,
    business_size VARCHAR CHECK (business_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    primary_goals TEXT[],
    preferred_communication_style VARCHAR CHECK (preferred_communication_style IN ('formal', 'casual', 'friendly', 'professional')),
    timezone VARCHAR DEFAULT 'UTC',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Usage Tracking Table
CREATE TABLE IF NOT EXISTS usage_tracking (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL,
    usage_type VARCHAR NOT NULL,
    usage_count INTEGER DEFAULT 0,
    month_year VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, agent_name, usage_type, month_year)
);

-- ============================================================================
-- PART 5: OWNER DASHBOARD TABLES
-- ============================================================================

-- Owner Notifications Table
CREATE TABLE IF NOT EXISTS owner_notifications (
    id VARCHAR PRIMARY KEY NOT NULL,
    notification_type VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'pending_setup', 'api_keys_configured', 'agents_activated', 'completed', 'dismissed')),
    priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customer Setup Tasks Table
CREATE TABLE IF NOT EXISTS customer_setup_tasks (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id VARCHAR NOT NULL REFERENCES owner_notifications(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL,
    task_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    api_keys_required TEXT[],
    api_keys_configured JSONB DEFAULT '{}',
    notes TEXT,
    completed_by VARCHAR,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Owner Dashboard Settings Table
CREATE TABLE IF NOT EXISTS owner_dashboard_settings (
    id VARCHAR PRIMARY KEY NOT NULL,
    owner_id VARCHAR NOT NULL,
    setting_key VARCHAR NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, setting_key)
);

-- Customer Communications Table
CREATE TABLE IF NOT EXISTS customer_communications (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id VARCHAR REFERENCES owner_notifications(id) ON DELETE SET NULL,
    communication_type VARCHAR NOT NULL,
    direction VARCHAR NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
    subject VARCHAR,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_by VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 6: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Agent job indexes
CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id ON agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_name ON agent_jobs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);

-- Generated messages indexes
CREATE INDEX IF NOT EXISTS idx_generated_messages_user_id ON generated_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_lead_id ON generated_messages(lead_id);

-- Research reports indexes
CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_lead_id ON research_reports(lead_id);

-- Multi-tenant indexes
CREATE INDEX IF NOT EXISTS idx_user_agent_configs_user_agent ON user_agent_configs(user_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_features_plan_agent ON subscription_plan_features(plan_name, agent_name);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);

-- Owner dashboard indexes
CREATE INDEX IF NOT EXISTS idx_owner_notifications_type_status ON owner_notifications(notification_type, status);
CREATE INDEX IF NOT EXISTS idx_customer_setup_tasks_user_id ON customer_setup_tasks(user_id);

-- ============================================================================
-- PART 7: ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on user tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('chat_sessions', 'chat_messages', 'agent_jobs', 'leads', 'generated_messages', 'research_reports', 'agent_metrics', 'user_agent_configs', 'user_onboarding', 'usage_tracking')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
    RAISE NOTICE 'Dropped existing RLS policies for user tables';
END $$;

-- Create RLS policies
DO $$
BEGIN
    -- Chat Sessions Policies
    CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own chat sessions" ON chat_sessions
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can delete their own chat sessions" ON chat_sessions
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Chat Messages Policies
    CREATE POLICY "Users can view their own chat messages" ON chat_messages
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own chat messages" ON chat_messages
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Agent Jobs Policies
    CREATE POLICY "Users can view their own agent jobs" ON agent_jobs
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own agent jobs" ON agent_jobs
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own agent jobs" ON agent_jobs
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Leads Policies
    CREATE POLICY "Users can view their own leads" ON leads
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own leads" ON leads
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own leads" ON leads
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can delete their own leads" ON leads
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Generated Messages Policies
    CREATE POLICY "Users can view their own generated messages" ON generated_messages
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own generated messages" ON generated_messages
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own generated messages" ON generated_messages
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Research Reports Policies
    CREATE POLICY "Users can view their own research reports" ON research_reports
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own research reports" ON research_reports
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own research reports" ON research_reports
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can delete their own research reports" ON research_reports
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Agent Metrics Policies
    CREATE POLICY "Users can view their own agent metrics" ON agent_metrics
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own agent metrics" ON agent_metrics
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- User Agent Configs Policies
    CREATE POLICY "Users can view their own agent configs" ON user_agent_configs
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own agent configs" ON user_agent_configs
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- User Onboarding Policies
    CREATE POLICY "Users can view their own onboarding" ON user_onboarding
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can create their own onboarding" ON user_onboarding
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
    CREATE POLICY "Users can update their own onboarding" ON user_onboarding
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    -- Usage Tracking Policies
    CREATE POLICY "Users can view their own usage tracking" ON usage_tracking
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    RAISE NOTICE 'Created all RLS policies successfully';
END $$;

-- ============================================================================
-- PART 8: FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically provision user agents on subscription activation
CREATE OR REPLACE FUNCTION provision_user_agents()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
        INSERT INTO user_agent_configs (id, user_id, agent_name, is_enabled, api_keys, configuration)
        SELECT
            gen_random_uuid()::text,
            NEW.id,
            spf.agent_name,
            false,
            '{}',
            spf.monthly_limits
        FROM subscription_plan_features spf
        WHERE spf.plan_name = NEW.subscription_plan
        AND spf.is_included = true
        ON CONFLICT (user_id, agent_name) DO UPDATE SET
            is_enabled = false,
            configuration = EXCLUDED.configuration,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create customer setup tasks
CREATE OR REPLACE FUNCTION create_customer_setup_tasks()
RETURNS TRIGGER AS $$
DECLARE
    agent_record RECORD;
    task_id VARCHAR;
    api_keys_for_agent TEXT[];
BEGIN
    IF NEW.notification_type = 'new_subscription' AND NEW.status = 'pending_setup' THEN
        FOR agent_record IN
            SELECT jsonb_array_elements_text((NEW.data->>'requiredAgents')::jsonb) as agent_name
        LOOP
            CASE agent_record.agent_name
                WHEN 'falcon' THEN
                    api_keys_for_agent := ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'];
                WHEN 'sage' THEN
                    api_keys_for_agent := ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'];
                WHEN 'sentinel' THEN
                    api_keys_for_agent := ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'];
                ELSE
                    api_keys_for_agent := ARRAY['openai_api_key'];
            END CASE;

            task_id := gen_random_uuid()::text;

            INSERT INTO customer_setup_tasks (
                id, user_id, notification_id, agent_name, task_type, status, api_keys_required, api_keys_configured
            ) VALUES (
                task_id, NEW.user_id, NEW.id, agent_record.agent_name, 'api_key_setup', 'pending', api_keys_for_agent, '{}'::jsonb
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_provision_user_agents ON users;
DROP TRIGGER IF EXISTS trigger_create_customer_setup_tasks ON owner_notifications;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
DROP TRIGGER IF EXISTS update_research_reports_updated_at ON research_reports;

-- Create triggers
CREATE TRIGGER trigger_provision_user_agents
    AFTER UPDATE OF subscription_status, subscription_plan ON users
    FOR EACH ROW
    EXECUTE FUNCTION provision_user_agents();

CREATE TRIGGER trigger_create_customer_setup_tasks
    AFTER INSERT ON owner_notifications
    FOR EACH ROW
    EXECUTE FUNCTION create_customer_setup_tasks();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_reports_updated_at
    BEFORE UPDATE ON research_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 9: DEFAULT DATA
-- ============================================================================

-- Insert subscription plan features
INSERT INTO subscription_plan_features (id, plan_name, agent_name, is_included, monthly_limits) VALUES
('falcon-individual-falcon', 'falcon_individual', 'falcon', true, '{"maxLeadsPerMonth": 200}'),
('sage-individual-sage', 'sage_individual', 'sage', true, '{"maxResearchPerMonth": 100}'),
('sentinel-individual-sentinel', 'sentinel_individual', 'sentinel', true, '{"maxEmailsPerMonth": 500}'),
('professional-combo-falcon', 'professional_combo', 'falcon', true, '{"maxLeadsPerMonth": 500}'),
('professional-combo-sage', 'professional_combo', 'sage', true, '{"maxResearchPerMonth": 200}'),
('ultra-premium-falcon', 'ultra_premium', 'falcon', true, '{"maxLeadsPerMonth": 1000}'),
('ultra-premium-sage', 'ultra_premium', 'sage', true, '{"maxResearchPerMonth": 500}'),
('ultra-premium-sentinel', 'ultra_premium', 'sentinel', true, '{"maxEmailsPerMonth": 2000}'),
('ultra-premium-prism', 'ultra_premium', 'prism', true, '{}')
ON CONFLICT (id) DO NOTHING;

-- Insert default owner dashboard settings
INSERT INTO owner_dashboard_settings (id, owner_id, setting_key, setting_value) VALUES
('default-notifications', 'owner', 'notification_preferences', '{"email_notifications": true, "browser_notifications": true, "auto_refresh_interval": 30}'),
('default-setup-workflow', 'owner', 'setup_workflow', '{"require_customer_call": true, "auto_send_welcome_email": true, "setup_timeout_days": 7}'),
('default-dashboard-layout', 'owner', 'dashboard_layout', '{"show_pending_setups": true, "show_recent_subscriptions": true, "default_view": "pending_setups"}')
ON CONFLICT (owner_id, setting_key) DO NOTHING;

-- Create dashboard summary view
CREATE OR REPLACE VIEW owner_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM owner_notifications WHERE status IN ('pending_setup', 'api_keys_configured')) as pending_setups,
    (SELECT COUNT(*) FROM owner_notifications WHERE notification_type = 'new_subscription' AND DATE(created_at) = CURRENT_DATE) as todays_subscriptions,
    (SELECT COUNT(*) FROM owner_notifications WHERE status = 'completed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)) as weekly_completions,
    (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FROM owner_notifications WHERE status = 'completed' AND completed_at IS NOT NULL) as avg_setup_time_hours,
    (SELECT COUNT(*) FROM owner_notifications WHERE status IN ('pending_setup', 'api_keys_configured') AND created_at < NOW() - INTERVAL '24 hours') as overdue_setups;

-- Update existing subscription plans to match new structure
UPDATE users SET subscription_plan = 'ultra_premium' WHERE subscription_plan = 'enterprise';
UPDATE users SET subscription_plan = 'professional_combo' WHERE subscription_plan = 'professional';
UPDATE users SET subscription_plan = 'falcon_individual' WHERE subscription_plan = 'starter';

-- ============================================================================
-- VERIFICATION AND COMPLETION
-- ============================================================================

-- Add table comments
COMMENT ON TABLE leads IS 'Lead generation data from Falcon agent';
COMMENT ON TABLE research_reports IS 'Research reports generated by Sage agent';
COMMENT ON TABLE user_agent_configs IS 'Per-user AI agent configurations and encrypted API keys';
COMMENT ON TABLE owner_notifications IS 'Owner notifications for manual customer setup workflow';

-- Final verification
SELECT 'SharpFlow Multi-Tenant Database Migration Completed Successfully!' as status;

-- Show created tables with their ID column types
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as total_columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.column_name = 'id' AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'pg_%'
  AND t.table_name IN ('users', 'leads', 'generated_messages', 'research_reports', 'chat_sessions', 'agent_jobs', 'user_agent_configs', 'owner_notifications')
ORDER BY t.table_name;
