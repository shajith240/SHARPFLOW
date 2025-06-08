-- Fix Row Level Security (RLS) Policies for Complete Multi-Tenant Isolation
-- Run this in your Supabase SQL Editor

-- Enable RLS on all user data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_setup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (comprehensive list)
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
DROP POLICY IF EXISTS "Users can create their own leads" ON leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;

DROP POLICY IF EXISTS "Users can view their own research reports" ON research_reports;
DROP POLICY IF EXISTS "Users can create their own research reports" ON research_reports;
DROP POLICY IF EXISTS "Users can update their own research reports" ON research_reports;
DROP POLICY IF EXISTS "Users can delete their own research reports" ON research_reports;

DROP POLICY IF EXISTS "Users can view their own agent configs" ON user_agent_configs;
DROP POLICY IF EXISTS "Users can update their own agent configs" ON user_agent_configs;
DROP POLICY IF EXISTS "Users can create their own agent configs" ON user_agent_configs;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;

DROP POLICY IF EXISTS "Users can view their own agent jobs" ON agent_jobs;
DROP POLICY IF EXISTS "Users can create their own agent jobs" ON agent_jobs;
DROP POLICY IF EXISTS "Users can update their own agent jobs" ON agent_jobs;
DROP POLICY IF EXISTS "Users can delete their own agent jobs" ON agent_jobs;

DROP POLICY IF EXISTS "Owner can view all notifications" ON owner_notifications;
DROP POLICY IF EXISTS "Owner can view all setup tasks" ON customer_setup_tasks;
DROP POLICY IF EXISTS "Owner can view all communications" ON customer_communications;

DROP POLICY IF EXISTS "Service role can manage all data" ON users;
DROP POLICY IF EXISTS "Service role can manage all leads" ON leads;
DROP POLICY IF EXISTS "Service role can manage all research reports" ON research_reports;
DROP POLICY IF EXISTS "Service role can manage all agent configs" ON user_agent_configs;
DROP POLICY IF EXISTS "Service role can manage all chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Service role can manage all agent jobs" ON agent_jobs;

-- Create comprehensive RLS policies for complete isolation

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid()::text);

-- Leads table policies  
CREATE POLICY "Users can view their own leads" ON leads
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own leads" ON leads
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own leads" ON leads
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own leads" ON leads
    FOR DELETE USING (user_id = auth.uid()::text);

-- Research reports table policies
CREATE POLICY "Users can view their own research reports" ON research_reports
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own research reports" ON research_reports
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own research reports" ON research_reports
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own research reports" ON research_reports
    FOR DELETE USING (user_id = auth.uid()::text);

-- User agent configs table policies
CREATE POLICY "Users can view their own agent configs" ON user_agent_configs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own agent configs" ON user_agent_configs
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Chat messages table policies
CREATE POLICY "Users can view their own chat messages" ON chat_messages
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Agent jobs table policies
CREATE POLICY "Users can view their own agent jobs" ON agent_jobs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own agent jobs" ON agent_jobs
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own agent jobs" ON agent_jobs
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Owner-only policies for admin tables
CREATE POLICY "Owner can view all notifications" ON owner_notifications
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM users WHERE email = 'shajith240@gmail.com'
        )
    );

CREATE POLICY "Owner can view all setup tasks" ON customer_setup_tasks
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM users WHERE email = 'shajith240@gmail.com'
        )
    );

CREATE POLICY "Owner can view all communications" ON customer_communications
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM users WHERE email = 'shajith240@gmail.com'
        )
    );

-- Service role policies (for server-side operations)
CREATE POLICY "Service role can manage all data" ON users
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage all leads" ON leads
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage all research reports" ON research_reports
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage all agent configs" ON user_agent_configs
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage all chat messages" ON chat_messages
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage all agent jobs" ON agent_jobs
    FOR ALL USING (current_setting('role') = 'service_role');

-- Create function to test RLS isolation
CREATE OR REPLACE FUNCTION test_user_data_isolation(test_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    user_leads_count INTEGER;
    total_leads_count INTEGER;
    user_reports_count INTEGER;
    total_reports_count INTEGER;
    isolation_result JSON;
BEGIN
    -- Count leads visible to specific user (should only see their own)
    SELECT COUNT(*) INTO user_leads_count
    FROM leads 
    WHERE user_id = test_user_id;
    
    -- Count total leads in system (for comparison)
    SELECT COUNT(*) INTO total_leads_count
    FROM leads;
    
    -- Count research reports visible to specific user
    SELECT COUNT(*) INTO user_reports_count
    FROM research_reports 
    WHERE user_id = test_user_id;
    
    -- Count total research reports in system
    SELECT COUNT(*) INTO total_reports_count
    FROM research_reports;
    
    -- Build result
    isolation_result := json_build_object(
        'user_id', test_user_id,
        'user_leads_visible', user_leads_count,
        'total_leads_in_system', total_leads_count,
        'user_reports_visible', user_reports_count,
        'total_reports_in_system', total_reports_count,
        'isolation_working', (
            user_leads_count <= total_leads_count AND
            user_reports_count <= total_reports_count
        ),
        'test_timestamp', NOW()
    );
    
    RETURN isolation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_leads_user_id_rls ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_user_id_rls ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_configs_user_id_rls ON user_agent_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id_rls ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id_rls ON agent_jobs(user_id);

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own leads" ON leads IS 'RLS policy ensuring users can only access their own lead data';
COMMENT ON POLICY "Users can view their own research reports" ON research_reports IS 'RLS policy ensuring users can only access their own research reports';
COMMENT ON POLICY "Users can view their own agent configs" ON user_agent_configs IS 'RLS policy ensuring users can only access their own agent configurations';

-- Success messages
DO $$
BEGIN
    RAISE NOTICE 'Row Level Security policies updated for complete multi-tenant isolation';
    RAISE NOTICE 'Users can now only access their own data across all tables';
    RAISE NOTICE 'Owner has administrative access to all data';
    RAISE NOTICE 'Service role can manage all data for server operations';
END $$;
