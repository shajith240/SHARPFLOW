-- SharpFlow Conversation Memory System
-- Multi-Tenant AI Agent Conversation Storage
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- CONVERSATION MEMORY TABLES
-- ============================================================================

-- Enhanced Chat Sessions Table with Agent-Specific Support
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR NOT NULL CHECK (agent_type IN ('falcon', 'sage', 'sentinel', 'prism')),
    session_title VARCHAR NOT NULL DEFAULT 'New Conversation',
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'paused')),
    context_summary TEXT, -- AI-generated summary of conversation context
    last_activity_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Messages Table with Enhanced Context Storage
CREATE TABLE IF NOT EXISTS conversation_messages (
    id VARCHAR PRIMARY KEY NOT NULL,
    session_id VARCHAR NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR NOT NULL CHECK (agent_type IN ('falcon', 'sage', 'sentinel', 'prism')),
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR DEFAULT 'chat' CHECK (message_type IN ('chat', 'command', 'result', 'error', 'system')),
    context_data JSONB DEFAULT '{}', -- Store additional context like job IDs, parameters, etc.
    parent_message_id VARCHAR, -- For threading/reply chains
    is_context_relevant BOOLEAN DEFAULT true, -- Whether this message should be included in context
    token_count INTEGER DEFAULT 0, -- For context window management
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Context Cache Table (for performance optimization)
CREATE TABLE IF NOT EXISTS conversation_context_cache (
    id VARCHAR PRIMARY KEY NOT NULL,
    session_id VARCHAR NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR NOT NULL,
    context_window TEXT NOT NULL, -- Cached conversation context for AI
    context_summary TEXT, -- Brief summary of the context
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'), -- Cache expiration
    UNIQUE(session_id, agent_type)
);

-- Agent Memory Preferences Table (per-user agent settings)
CREATE TABLE IF NOT EXISTS agent_memory_preferences (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR NOT NULL CHECK (agent_type IN ('falcon', 'sage', 'sentinel', 'prism')),
    max_context_messages INTEGER DEFAULT 20, -- Max messages to include in context
    max_context_tokens INTEGER DEFAULT 4000, -- Max tokens for context window
    auto_summarize_threshold INTEGER DEFAULT 50, -- Auto-summarize after N messages
    retain_system_messages BOOLEAN DEFAULT true,
    retain_error_messages BOOLEAN DEFAULT false,
    context_relevance_threshold DECIMAL(3,2) DEFAULT 0.7, -- Relevance score threshold
    retention_days INTEGER DEFAULT 30, -- Message retention period in days
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, agent_type)
);

-- System Statistics Table (for cleanup tracking and system monitoring)
CREATE TABLE IF NOT EXISTS system_stats (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    stat_key VARCHAR UNIQUE NOT NULL,
    stat_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Conversation Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_agent 
ON conversation_sessions(user_id, agent_type);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status 
ON conversation_sessions(status);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity 
ON conversation_sessions(last_activity_at DESC);

-- Conversation Messages Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_created 
ON conversation_messages(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_agent 
ON conversation_messages(user_id, agent_type);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_context_relevant 
ON conversation_messages(session_id, is_context_relevant, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_parent 
ON conversation_messages(parent_message_id);

-- Context Cache Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_context_cache_user_agent 
ON conversation_context_cache(user_id, agent_type);

CREATE INDEX IF NOT EXISTS idx_conversation_context_cache_expires 
ON conversation_context_cache(expires_at);

-- Memory Preferences Indexes
CREATE INDEX IF NOT EXISTS idx_agent_memory_preferences_user
ON agent_memory_preferences(user_id);

-- System Stats Indexes
CREATE INDEX IF NOT EXISTS idx_system_stats_key
ON system_stats(stat_key);

-- ============================================================================
-- CLEANUP PERFORMANCE INDEXES
-- ============================================================================

-- Indexes for efficient cleanup operations
CREATE INDEX IF NOT EXISTS idx_conversation_messages_cleanup
ON conversation_messages(created_at, is_context_relevant, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_soft_delete
ON conversation_messages(is_context_relevant, created_at)
WHERE is_context_relevant = false;

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_cleanup
ON conversation_sessions(last_activity_at, status, user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_retention
ON conversation_messages(user_id, agent_type, created_at, message_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all conversation tables
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory_preferences ENABLE ROW LEVEL SECURITY;

-- Conversation Sessions RLS Policies
CREATE POLICY "Users can view their own conversation sessions" 
ON conversation_sessions FOR SELECT 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own conversation sessions" 
ON conversation_sessions FOR INSERT 
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own conversation sessions" 
ON conversation_sessions FOR UPDATE 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own conversation sessions" 
ON conversation_sessions FOR DELETE 
USING (user_id = auth.uid()::text);

-- Conversation Messages RLS Policies
CREATE POLICY "Users can view their own conversation messages" 
ON conversation_messages FOR SELECT 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own conversation messages" 
ON conversation_messages FOR INSERT 
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own conversation messages" 
ON conversation_messages FOR UPDATE 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own conversation messages" 
ON conversation_messages FOR DELETE 
USING (user_id = auth.uid()::text);

-- Context Cache RLS Policies
CREATE POLICY "Users can view their own context cache" 
ON conversation_context_cache FOR SELECT 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own context cache" 
ON conversation_context_cache FOR ALL 
USING (user_id = auth.uid()::text);

-- Memory Preferences RLS Policies
CREATE POLICY "Users can view their own memory preferences"
ON agent_memory_preferences FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage their own memory preferences"
ON agent_memory_preferences FOR ALL
USING (user_id = auth.uid()::text);

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to clean up expired context cache
CREATE OR REPLACE FUNCTION cleanup_expired_context_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM conversation_context_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-archive old inactive sessions
CREATE OR REPLACE FUNCTION archive_inactive_sessions(days_threshold INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE conversation_sessions
    SET status = 'archived', updated_at = NOW()
    WHERE status = 'active'
    AND last_activity_at < (NOW() - INTERVAL '1 day' * days_threshold);

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation context for an agent
CREATE OR REPLACE FUNCTION get_conversation_context(
    p_user_id VARCHAR,
    p_agent_type VARCHAR,
    p_session_id VARCHAR DEFAULT NULL,
    p_max_messages INTEGER DEFAULT 20
)
RETURNS TABLE(
    message_id VARCHAR,
    role VARCHAR,
    content TEXT,
    message_type VARCHAR,
    context_data JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.role,
        cm.content,
        cm.message_type,
        cm.context_data,
        cm.created_at
    FROM conversation_messages cm
    JOIN conversation_sessions cs ON cm.session_id = cs.id
    WHERE cm.user_id = p_user_id
    AND cm.agent_type = p_agent_type
    AND cm.is_context_relevant = true
    AND (p_session_id IS NULL OR cm.session_id = p_session_id)
    AND cs.status IN ('active', 'paused')
    ORDER BY cm.created_at DESC
    LIMIT p_max_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEFAULT MEMORY PREFERENCES
-- ============================================================================

-- Insert default memory preferences for existing users
INSERT INTO agent_memory_preferences (id, user_id, agent_type, max_context_messages, max_context_tokens)
SELECT
    gen_random_uuid()::text,
    u.id,
    agent.agent_type,
    CASE
        WHEN agent.agent_type = 'prism' THEN 30
        WHEN agent.agent_type = 'falcon' THEN 15
        WHEN agent.agent_type = 'sage' THEN 20
        WHEN agent.agent_type = 'sentinel' THEN 25
    END,
    CASE
        WHEN agent.agent_type = 'prism' THEN 6000
        WHEN agent.agent_type = 'falcon' THEN 3000
        WHEN agent.agent_type = 'sage' THEN 4000
        WHEN agent.agent_type = 'sentinel' THEN 5000
    END
FROM users u
CROSS JOIN (
    SELECT 'falcon' as agent_type
    UNION SELECT 'sage'
    UNION SELECT 'sentinel'
    UNION SELECT 'prism'
) agent
WHERE NOT EXISTS (
    SELECT 1 FROM agent_memory_preferences amp
    WHERE amp.user_id = u.id AND amp.agent_type = agent.agent_type
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
SELECT
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE tablename IN (
    'conversation_sessions',
    'conversation_messages',
    'conversation_context_cache',
    'agent_memory_preferences'
)
ORDER BY tablename;

-- Verify RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN (
    'conversation_sessions',
    'conversation_messages',
    'conversation_context_cache',
    'agent_memory_preferences'
)
ORDER BY tablename, policyname;

-- Show indexes created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'conversation_sessions',
    'conversation_messages',
    'conversation_context_cache',
    'agent_memory_preferences'
)
ORDER BY tablename, indexname;
