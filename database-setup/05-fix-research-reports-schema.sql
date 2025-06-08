-- Fix Research Reports Table Schema
-- This script adds missing columns to the research_reports table

-- First, check if the table exists and what columns it has
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'research_reports'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add confidence_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'research_reports' 
        AND column_name = 'confidence_score'
    ) THEN
        ALTER TABLE research_reports 
        ADD COLUMN confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100);
        RAISE NOTICE 'Added confidence_score column to research_reports table';
    END IF;

    -- Add research_sources column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'research_reports' 
        AND column_name = 'research_sources'
    ) THEN
        ALTER TABLE research_reports 
        ADD COLUMN research_sources JSONB DEFAULT '[]';
        RAISE NOTICE 'Added research_sources column to research_reports table';
    END IF;

    -- Add job_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'research_reports' 
        AND column_name = 'job_id'
    ) THEN
        ALTER TABLE research_reports 
        ADD COLUMN job_id VARCHAR;
        RAISE NOTICE 'Added job_id column to research_reports table';
    END IF;

    -- Ensure report_type column exists with proper default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'research_reports' 
        AND column_name = 'report_type'
    ) THEN
        ALTER TABLE research_reports 
        ADD COLUMN report_type VARCHAR DEFAULT 'linkedin_research' CHECK (report_type IN ('linkedin_research', 'company_research', 'market_research'));
        RAISE NOTICE 'Added report_type column to research_reports table';
    END IF;

    RAISE NOTICE 'Research reports table schema update completed';
END $$;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_lead_id ON research_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_job_id ON research_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_report_type ON research_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC);

-- Verify the final schema
SELECT 'Research Reports table schema fixed successfully!' as status;

-- Show updated table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'research_reports'
ORDER BY ordinal_position;
