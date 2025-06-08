-- Multi-Tenant SaaS Database Setup - Script 3: Multi-Tenant Tables
-- Run this script in your Supabase SQL Editor after running 01-create-tables.sql and 02-ai-agents-tables.sql

-- User Agent Configurations Table
-- Stores per-user API keys and agent configurations
CREATE TABLE IF NOT EXISTS user_agent_configs (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel')),
    is_enabled BOOLEAN DEFAULT false,
    api_keys JSONB NOT NULL DEFAULT '{}', -- Encrypted API keys
    configuration JSONB NOT NULL DEFAULT '{}', -- Agent-specific settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, agent_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_agent_configs_user_agent ON user_agent_configs(user_id, agent_name);

-- Subscription Plan Features Table
-- Define what each plan includes
CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id VARCHAR PRIMARY KEY NOT NULL,
    plan_name VARCHAR NOT NULL, -- falcon_individual, sage_individual, sentinel_individual, professional_combo, ultra_premium
    agent_name VARCHAR NOT NULL CHECK (agent_name IN ('falcon', 'sage', 'sentinel', 'prism')),
    is_included BOOLEAN DEFAULT false,
    monthly_limits JSONB DEFAULT '{}', -- Usage limits per agent
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster plan feature lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plan_features_plan_agent ON subscription_plan_features(plan_name, agent_name);

-- User Onboarding Data Table
-- Store user-specific business information for agent personalization
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

-- Create index for faster onboarding lookups
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- Usage Tracking Table (for monitoring monthly limits)
CREATE TABLE IF NOT EXISTS usage_tracking (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL,
    usage_type VARCHAR NOT NULL, -- leads_generated, research_reports, emails_sent
    usage_count INTEGER DEFAULT 0,
    month_year VARCHAR NOT NULL, -- YYYY-MM format
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, agent_name, usage_type, month_year)
);

-- Create index for faster usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);

-- Insert default subscription plan features
INSERT INTO subscription_plan_features (id, plan_name, agent_name, is_included, monthly_limits) VALUES
-- Individual Agent Plans
('falcon-individual-falcon', 'falcon_individual', 'falcon', true, '{"maxLeadsPerMonth": 200}'),
('sage-individual-sage', 'sage_individual', 'sage', true, '{"maxResearchPerMonth": 100}'),
('sentinel-individual-sentinel', 'sentinel_individual', 'sentinel', true, '{"maxEmailsPerMonth": 500}'),

-- Professional Combo Plan
('professional-combo-falcon', 'professional_combo', 'falcon', true, '{"maxLeadsPerMonth": 500}'),
('professional-combo-sage', 'professional_combo', 'sage', true, '{"maxResearchPerMonth": 200}'),

-- Ultra Premium Plan (includes Prism orchestrator)
('ultra-premium-falcon', 'ultra_premium', 'falcon', true, '{"maxLeadsPerMonth": 1000}'),
('ultra-premium-sage', 'ultra_premium', 'sage', true, '{"maxResearchPerMonth": 500}'),
('ultra-premium-sentinel', 'ultra_premium', 'sentinel', true, '{"maxEmailsPerMonth": 2000}'),
('ultra-premium-prism', 'ultra_premium', 'prism', true, '{}')

ON CONFLICT (id) DO NOTHING;

-- Update existing subscription plans to match new structure
UPDATE users SET subscription_plan = 'ultra_premium' WHERE subscription_plan = 'enterprise';
UPDATE users SET subscription_plan = 'professional_combo' WHERE subscription_plan = 'professional';
UPDATE users SET subscription_plan = 'falcon_individual' WHERE subscription_plan = 'starter';

-- Function to automatically provision user agents on subscription activation
CREATE OR REPLACE FUNCTION provision_user_agents()
RETURNS TRIGGER AS $$
BEGIN
    -- Only provision if subscription status changed to active
    IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
        -- Get plan features
        INSERT INTO user_agent_configs (id, user_id, agent_name, is_enabled, api_keys, configuration)
        SELECT 
            gen_random_uuid()::text,
            NEW.id,
            spf.agent_name,
            false, -- Initially disabled until user configures API keys
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

-- Create trigger for automatic agent provisioning
DROP TRIGGER IF EXISTS trigger_provision_user_agents ON users;
CREATE TRIGGER trigger_provision_user_agents
    AFTER UPDATE OF subscription_status, subscription_plan ON users
    FOR EACH ROW
    EXECUTE FUNCTION provision_user_agents();

-- Function to check monthly usage limits
CREATE OR REPLACE FUNCTION check_monthly_limit(
    p_user_id VARCHAR,
    p_agent_name VARCHAR,
    p_usage_type VARCHAR,
    p_increment INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    current_month VARCHAR;
    current_usage INTEGER;
    monthly_limit INTEGER;
    user_plan VARCHAR;
BEGIN
    -- Get current month in YYYY-MM format
    current_month := to_char(NOW(), 'YYYY-MM');
    
    -- Get user's subscription plan
    SELECT subscription_plan INTO user_plan FROM users WHERE id = p_user_id;
    
    -- Get monthly limit for this agent and usage type
    SELECT COALESCE((monthly_limits->>('max' || initcap(p_usage_type) || 'PerMonth'))::INTEGER, 0)
    INTO monthly_limit
    FROM subscription_plan_features
    WHERE plan_name = user_plan AND agent_name = p_agent_name AND is_included = true;
    
    -- Get current usage
    SELECT COALESCE(usage_count, 0) INTO current_usage
    FROM usage_tracking
    WHERE user_id = p_user_id 
    AND agent_name = p_agent_name 
    AND usage_type = p_usage_type 
    AND month_year = current_month;
    
    -- Check if adding increment would exceed limit
    IF (current_usage + p_increment) > monthly_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Update usage count
    INSERT INTO usage_tracking (id, user_id, agent_name, usage_type, usage_count, month_year)
    VALUES (gen_random_uuid()::text, p_user_id, p_agent_name, p_usage_type, p_increment, current_month)
    ON CONFLICT (user_id, agent_name, usage_type, month_year)
    DO UPDATE SET 
        usage_count = usage_tracking.usage_count + p_increment,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_agent_configs IS 'Stores per-user AI agent configurations and encrypted API keys';
COMMENT ON TABLE subscription_plan_features IS 'Defines which agents and features are included in each subscription plan';
COMMENT ON TABLE user_onboarding IS 'Stores user business information for personalizing AI agent behavior';
COMMENT ON TABLE usage_tracking IS 'Tracks monthly usage for enforcing subscription limits';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_agent_configs TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_plan_features TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_onboarding TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON usage_tracking TO authenticated;
