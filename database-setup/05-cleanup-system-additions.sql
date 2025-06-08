-- ============================================================================
-- CONVERSATION CLEANUP SYSTEM - INCREMENTAL ADDITIONS
-- ============================================================================
-- This script adds only the new components for the cleanup system
-- without recreating existing tables or policies

-- Add retention_days column to agent_memory_preferences if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_memory_preferences' 
        AND column_name = 'retention_days'
    ) THEN
        ALTER TABLE agent_memory_preferences 
        ADD COLUMN retention_days INTEGER DEFAULT 30;
        
        RAISE NOTICE 'Added retention_days column to agent_memory_preferences';
    ELSE
        RAISE NOTICE 'retention_days column already exists in agent_memory_preferences';
    END IF;
END $$;

-- Create system_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_stats (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    stat_key VARCHAR UNIQUE NOT NULL,
    stat_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CLEANUP PERFORMANCE INDEXES (Only create if they don't exist)
-- ============================================================================

-- System Stats Indexes
CREATE INDEX IF NOT EXISTS idx_system_stats_key 
ON system_stats(stat_key);

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
-- UPDATE EXISTING MEMORY PREFERENCES WITH RETENTION SETTINGS
-- ============================================================================

-- Update existing memory preferences to include retention_days if not set
UPDATE agent_memory_preferences 
SET retention_days = 30 
WHERE retention_days IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new column was added
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agent_memory_preferences' 
AND column_name = 'retention_days';

-- Verify system_stats table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'system_stats';

-- Show new cleanup indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE '%cleanup%' 
   OR indexname LIKE '%retention%'
   OR indexname LIKE '%soft_delete%'
   OR indexname LIKE '%system_stats%'
ORDER BY tablename, indexname;

-- Show sample data structure
SELECT 
    'agent_memory_preferences' as table_name,
    COUNT(*) as row_count,
    COUNT(CASE WHEN retention_days IS NOT NULL THEN 1 END) as with_retention_days
FROM agent_memory_preferences
UNION ALL
SELECT 
    'system_stats' as table_name,
    COUNT(*) as row_count,
    NULL as with_retention_days
FROM system_stats;

-- Final completion message
DO $$
BEGIN
    RAISE NOTICE 'Cleanup system database additions completed successfully!';
END $$;
