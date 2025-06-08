-- ============================================================================
-- LEAD QUALIFICATION SYSTEM - SAFE INSTALLATION
-- This script safely adds qualification columns and tables without errors
-- ============================================================================

-- Based on the error: users.id is VARCHAR, leads.id is UUID
-- We need to handle mixed data types correctly

-- Add qualification columns to leads table (only if they don't exist)
DO $$
BEGIN
    -- Add qualification_rating column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'qualification_rating') THEN
        ALTER TABLE leads ADD COLUMN qualification_rating VARCHAR CHECK (qualification_rating IN ('high', 'medium', 'low'));
        RAISE NOTICE 'Added qualification_rating column to leads table';
    ELSE
        RAISE NOTICE 'qualification_rating column already exists in leads table';
    END IF;

    -- Add qualification_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'qualification_score') THEN
        ALTER TABLE leads ADD COLUMN qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100);
        RAISE NOTICE 'Added qualification_score column to leads table';
    ELSE
        RAISE NOTICE 'qualification_score column already exists in leads table';
    END IF;

    -- Add qualification_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'qualification_date') THEN
        ALTER TABLE leads ADD COLUMN qualification_date TIMESTAMP;
        RAISE NOTICE 'Added qualification_date column to leads table';
    ELSE
        RAISE NOTICE 'qualification_date column already exists in leads table';
    END IF;

    -- Add qualification_criteria column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'qualification_criteria') THEN
        ALTER TABLE leads ADD COLUMN qualification_criteria JSONB DEFAULT '{}';
        RAISE NOTICE 'Added qualification_criteria column to leads table';
    ELSE
        RAISE NOTICE 'qualification_criteria column already exists in leads table';
    END IF;

    -- Add qualification_reasoning column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'qualification_reasoning') THEN
        ALTER TABLE leads ADD COLUMN qualification_reasoning TEXT;
        RAISE NOTICE 'Added qualification_reasoning column to leads table';
    ELSE
        RAISE NOTICE 'qualification_reasoning column already exists in leads table';
    END IF;

    -- Add auto_qualified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'auto_qualified') THEN
        ALTER TABLE leads ADD COLUMN auto_qualified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added auto_qualified column to leads table';
    ELSE
        RAISE NOTICE 'auto_qualified column already exists in leads table';
    END IF;
END $$;

-- Create lead qualification jobs table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS lead_qualification_jobs (
    id VARCHAR PRIMARY KEY NOT NULL DEFAULT ('job_' || extract(epoch from now()) || '_' || floor(random() * 1000000)::text),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,

    -- Job configuration
    job_type VARCHAR NOT NULL CHECK (job_type IN ('single_lead', 'bulk_qualification', 'auto_qualification')),
    job_status VARCHAR DEFAULT 'queued' CHECK (job_status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- Processing details
    leads_to_process INTEGER DEFAULT 1,
    leads_processed INTEGER DEFAULT 0,
    leads_qualified INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Results
    qualification_results JSONB DEFAULT '{}',
    tokens_used INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for lead qualification performance (only if they don't exist)
DO $$
BEGIN
    -- Index for qualification rating
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_qualification_rating') THEN
        CREATE INDEX idx_leads_qualification_rating ON leads(qualification_rating);
        RAISE NOTICE 'Created index: idx_leads_qualification_rating';
    END IF;

    -- Index for qualification score
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_qualification_score') THEN
        CREATE INDEX idx_leads_qualification_score ON leads(qualification_score DESC);
        RAISE NOTICE 'Created index: idx_leads_qualification_score';
    END IF;

    -- Index for qualification date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_qualification_date') THEN
        CREATE INDEX idx_leads_qualification_date ON leads(qualification_date);
        RAISE NOTICE 'Created index: idx_leads_qualification_date';
    END IF;

    -- Index for auto qualified
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_auto_qualified') THEN
        CREATE INDEX idx_leads_auto_qualified ON leads(auto_qualified);
        RAISE NOTICE 'Created index: idx_leads_auto_qualified';
    END IF;

    -- Index for user qualification
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_user_qualification') THEN
        CREATE INDEX idx_leads_user_qualification ON leads(user_id, qualification_rating);
        RAISE NOTICE 'Created index: idx_leads_user_qualification';
    END IF;

    -- Lead qualification jobs indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_qualification_jobs_user_id') THEN
        CREATE INDEX idx_qualification_jobs_user_id ON lead_qualification_jobs(user_id);
        RAISE NOTICE 'Created index: idx_qualification_jobs_user_id';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_qualification_jobs_lead_id') THEN
        CREATE INDEX idx_qualification_jobs_lead_id ON lead_qualification_jobs(lead_id);
        RAISE NOTICE 'Created index: idx_qualification_jobs_lead_id';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_qualification_jobs_status') THEN
        CREATE INDEX idx_qualification_jobs_status ON lead_qualification_jobs(job_status);
        RAISE NOTICE 'Created index: idx_qualification_jobs_status';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_qualification_jobs_priority') THEN
        CREATE INDEX idx_qualification_jobs_priority ON lead_qualification_jobs(priority, created_at);
        RAISE NOTICE 'Created index: idx_qualification_jobs_priority';
    END IF;
END $$;

-- Enable RLS on lead qualification jobs (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'lead_qualification_jobs' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE lead_qualification_jobs ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on lead_qualification_jobs table';
    ELSE
        RAISE NOTICE 'RLS already enabled on lead_qualification_jobs table';
    END IF;
END $$;

-- Create RLS policies (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own qualification jobs" ON lead_qualification_jobs;
DROP POLICY IF EXISTS "Users can insert their own qualification jobs" ON lead_qualification_jobs;
DROP POLICY IF EXISTS "Users can update their own qualification jobs" ON lead_qualification_jobs;

CREATE POLICY "Users can view their own qualification jobs" ON lead_qualification_jobs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own qualification jobs" ON lead_qualification_jobs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own qualification jobs" ON lead_qualification_jobs
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create or replace qualification helper functions
CREATE OR REPLACE FUNCTION update_lead_qualification(
    p_lead_id UUID,
    p_user_id VARCHAR,
    p_rating VARCHAR,
    p_score INTEGER,
    p_criteria JSONB DEFAULT '{}',
    p_reasoning TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE leads
    SET
        qualification_rating = p_rating,
        qualification_score = p_score,
        qualification_date = NOW(),
        qualification_criteria = p_criteria,
        qualification_reasoning = p_reasoning,
        auto_qualified = true,
        updated_at = NOW()
    WHERE id = p_lead_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create or replace qualification statistics function
CREATE OR REPLACE FUNCTION get_qualification_stats(p_user_id VARCHAR)
RETURNS TABLE(
    total_leads INTEGER,
    qualified_leads INTEGER,
    high_quality_leads INTEGER,
    medium_quality_leads INTEGER,
    low_quality_leads INTEGER,
    unqualified_leads INTEGER,
    avg_qualification_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_leads,
        COUNT(CASE WHEN qualification_rating IS NOT NULL THEN 1 END)::INTEGER as qualified_leads,
        COUNT(CASE WHEN qualification_rating = 'high' THEN 1 END)::INTEGER as high_quality_leads,
        COUNT(CASE WHEN qualification_rating = 'medium' THEN 1 END)::INTEGER as medium_quality_leads,
        COUNT(CASE WHEN qualification_rating = 'low' THEN 1 END)::INTEGER as low_quality_leads,
        COUNT(CASE WHEN qualification_rating IS NULL THEN 1 END)::INTEGER as unqualified_leads,
        COALESCE(AVG(CASE WHEN qualification_score > 0 THEN qualification_score END), 0)::DECIMAL as avg_qualification_score
    FROM leads
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Lead Qualification System installed successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'New columns added to leads table:';
    RAISE NOTICE '  ✓ qualification_rating (high/medium/low)';
    RAISE NOTICE '  ✓ qualification_score (0-100)';
    RAISE NOTICE '  ✓ qualification_date (timestamp)';
    RAISE NOTICE '  ✓ qualification_criteria (JSON)';
    RAISE NOTICE '  ✓ qualification_reasoning (text)';
    RAISE NOTICE '  ✓ auto_qualified (boolean)';
    RAISE NOTICE '';
    RAISE NOTICE 'New table created:';
    RAISE NOTICE '  ✓ lead_qualification_jobs (background processing)';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance indexes created:';
    RAISE NOTICE '  ✓ Qualification rating and score indexes';
    RAISE NOTICE '  ✓ User-specific qualification indexes';
    RAISE NOTICE '  ✓ Job processing indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper functions created:';
    RAISE NOTICE '  ✓ update_lead_qualification()';
    RAISE NOTICE '  ✓ get_qualification_stats()';
    RAISE NOTICE '';
    RAISE NOTICE 'Security policies enabled:';
    RAISE NOTICE '  ✓ Row Level Security (RLS) on qualification jobs';
    RAISE NOTICE '  ✓ User isolation policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for lead qualification implementation!';
    RAISE NOTICE '=================================================================';
END $$;
