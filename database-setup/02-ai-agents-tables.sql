-- AI Agents Database Setup - Script 2: AI Agents Tables
-- Run this script in your Supabase SQL Editor after running 01-create-tables.sql

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

-- Agent Jobs Table (for tracking job history)
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

-- Generated Messages Table (for Sentinel agent outputs)
CREATE TABLE IF NOT EXISTS generated_messages (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id VARCHAR, -- Will reference leads(id) but without foreign key constraint for now
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

-- Agent Performance Metrics Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_user_id ON agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent_name ON agent_jobs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created_at ON agent_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_session_id ON agent_jobs(session_id);

CREATE INDEX IF NOT EXISTS idx_generated_messages_user_id ON generated_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_lead_id ON generated_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_job_id ON generated_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_status ON generated_messages(status);
CREATE INDEX IF NOT EXISTS idx_generated_messages_generated_at ON generated_messages(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_user_id ON agent_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_name ON agent_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_metric_date ON agent_metrics(metric_date DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

-- Chat Sessions Policies (with IF NOT EXISTS handling)
DO $$
BEGIN
    -- Drop existing policies if they exist, then recreate
    DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
    DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
    DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
    DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON chat_sessions;

    -- Create new policies
    CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own chat sessions" ON chat_sessions
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can delete their own chat sessions" ON chat_sessions
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
END $$;

-- Chat Messages Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;

    CREATE POLICY "Users can view their own chat messages" ON chat_messages
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own chat messages" ON chat_messages
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
END $$;

-- Agent Jobs Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own agent jobs" ON agent_jobs;
    DROP POLICY IF EXISTS "Users can create their own agent jobs" ON agent_jobs;
    DROP POLICY IF EXISTS "Users can update their own agent jobs" ON agent_jobs;

    CREATE POLICY "Users can view their own agent jobs" ON agent_jobs
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own agent jobs" ON agent_jobs
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can update their own agent jobs" ON agent_jobs
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
END $$;

-- Generated Messages Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own generated messages" ON generated_messages;
    DROP POLICY IF EXISTS "Users can create their own generated messages" ON generated_messages;
    DROP POLICY IF EXISTS "Users can update their own generated messages" ON generated_messages;

    CREATE POLICY "Users can view their own generated messages" ON generated_messages
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own generated messages" ON generated_messages
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can update their own generated messages" ON generated_messages
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
END $$;

-- Agent Metrics Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own agent metrics" ON agent_metrics;
    DROP POLICY IF EXISTS "Users can create their own agent metrics" ON agent_metrics;

    CREATE POLICY "Users can view their own agent metrics" ON agent_metrics
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own agent metrics" ON agent_metrics
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
END $$;

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_message_at in chat_sessions
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update session timestamp when new message is added
CREATE TRIGGER update_session_on_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_last_message();

-- Function to update agent job timestamps
CREATE OR REPLACE FUNCTION update_agent_job_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'processing' AND OLD.status = 'pending' THEN
        NEW.started_at = NOW();
    ELSIF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status = 'processing' THEN
        NEW.completed_at = NOW();
        IF NEW.started_at IS NOT NULL THEN
            NEW.processing_time_ms = EXTRACT(EPOCH FROM (NOW() - NEW.started_at)) * 1000;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for agent job timestamp updates
CREATE TRIGGER update_agent_job_timestamps_trigger
    BEFORE UPDATE ON agent_jobs
    FOR EACH ROW EXECUTE FUNCTION update_agent_job_timestamps();

-- Add comments for documentation
COMMENT ON TABLE chat_sessions IS 'Chat sessions between users and AI agents';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat sessions';
COMMENT ON TABLE agent_jobs IS 'Job tracking for AI agent tasks';
COMMENT ON TABLE generated_messages IS 'Messages generated by Sentinel agent';
COMMENT ON TABLE agent_metrics IS 'Performance metrics for AI agents';

-- Verify the setup
SELECT 'AI Agents database tables created successfully!' as status;

-- Show table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('chat_sessions', 'chat_messages', 'agent_jobs', 'generated_messages', 'agent_metrics')
ORDER BY table_name, ordinal_position;
