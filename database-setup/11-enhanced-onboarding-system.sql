-- Enhanced Onboarding System Database Setup
-- Document Upload and AI Analysis for Company Profiles
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: EXTEND COMPANY PROFILES TABLE
-- ============================================================================

-- Add new columns to company_profiles for document-derived insights
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS document_analysis_status VARCHAR DEFAULT 'pending' CHECK (document_analysis_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS documents_uploaded INTEGER DEFAULT 0;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS ai_extracted_insights JSONB DEFAULT '{}';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS document_derived_terminology JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS extracted_products_services JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS extracted_target_customers JSONB DEFAULT '[]';
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS document_analysis_completed_at TIMESTAMP;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR DEFAULT 'profile_form' CHECK (onboarding_step IN ('profile_form', 'document_upload', 'ai_analysis', 'prompt_generation', 'completed'));
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- ============================================================================
-- STEP 2: CREATE COMPANY DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_documents (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_profile_id VARCHAR NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    
    -- File information
    original_filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL, -- Supabase Storage path
    file_size INTEGER NOT NULL, -- Size in bytes
    file_type VARCHAR NOT NULL DEFAULT 'application/pdf',
    mime_type VARCHAR NOT NULL,
    
    -- Document metadata
    document_type VARCHAR CHECK (document_type IN ('company_brochure', 'product_documentation', 'case_study', 'marketing_material', 'business_plan', 'other')),
    description TEXT,
    
    -- Processing status
    upload_status VARCHAR DEFAULT 'uploaded' CHECK (upload_status IN ('uploading', 'uploaded', 'processing', 'processed', 'failed')),
    analysis_status VARCHAR DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- AI analysis results
    extracted_content TEXT, -- Full text content from PDF
    ai_analysis JSONB DEFAULT '{}', -- Structured analysis results
    key_insights JSONB DEFAULT '[]', -- Key business insights extracted
    terminology_found JSONB DEFAULT '[]', -- Industry/company specific terms
    products_services JSONB DEFAULT '[]', -- Products/services mentioned
    target_market_info JSONB DEFAULT '[]', -- Target market information
    
    -- Processing metadata
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_error TEXT,
    openai_tokens_used INTEGER DEFAULT 0,
    
    -- Security and validation
    virus_scan_status VARCHAR DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'failed')),
    file_hash VARCHAR, -- SHA-256 hash for integrity
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, file_path)
);

-- ============================================================================
-- STEP 3: CREATE DOCUMENT PROCESSING JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id VARCHAR NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
    
    -- Job configuration
    job_type VARCHAR NOT NULL CHECK (job_type IN ('text_extraction', 'ai_analysis', 'batch_analysis')),
    job_status VARCHAR DEFAULT 'queued' CHECK (job_status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1 = highest priority
    
    -- Processing details
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time_ms INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Results
    job_results JSONB DEFAULT '{}',
    tokens_used INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: CREATE ONBOARDING PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Progress tracking
    current_step VARCHAR DEFAULT 'payment_completed' CHECK (current_step IN ('payment_completed', 'profile_form', 'document_upload', 'ai_analysis', 'prompt_generation', 'setup_complete')),
    steps_completed JSONB DEFAULT '[]', -- Array of completed step names
    total_steps INTEGER DEFAULT 5,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Step timestamps
    payment_completed_at TIMESTAMP,
    profile_form_completed_at TIMESTAMP,
    document_upload_completed_at TIMESTAMP,
    ai_analysis_completed_at TIMESTAMP,
    prompt_generation_completed_at TIMESTAMP,
    setup_completed_at TIMESTAMP,
    
    -- User preferences
    skip_document_upload BOOLEAN DEFAULT false,
    auto_generate_prompts BOOLEAN DEFAULT true,
    
    -- Metadata
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Company documents indexes
CREATE INDEX IF NOT EXISTS idx_company_documents_user_id ON company_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_profile_id ON company_documents(company_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_upload_status ON company_documents(upload_status);
CREATE INDEX IF NOT EXISTS idx_company_documents_analysis_status ON company_documents(analysis_status);
CREATE INDEX IF NOT EXISTS idx_company_documents_created_at ON company_documents(created_at);

-- Document processing jobs indexes
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON document_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON document_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON document_processing_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_priority ON document_processing_jobs(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON document_processing_jobs(created_at);

-- Onboarding progress indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_current_step ON onboarding_progress(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completion ON onboarding_progress(completion_percentage);

-- Company profiles additional indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_onboarding_step ON company_profiles(onboarding_step);
CREATE INDEX IF NOT EXISTS idx_company_profiles_analysis_status ON company_profiles(document_analysis_status);

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Company documents policies
CREATE POLICY "Users can view their own documents" ON company_documents
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own documents" ON company_documents
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own documents" ON company_documents
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own documents" ON company_documents
    FOR DELETE USING (auth.uid()::text = user_id);

-- Document processing jobs policies
CREATE POLICY "Users can view their own processing jobs" ON document_processing_jobs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own processing jobs" ON document_processing_jobs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own processing jobs" ON document_processing_jobs
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Onboarding progress policies
CREATE POLICY "Users can view their own onboarding progress" ON onboarding_progress
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own onboarding progress" ON onboarding_progress
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own onboarding progress" ON onboarding_progress
    FOR UPDATE USING (auth.uid()::text = user_id);

-- ============================================================================
-- STEP 7: CREATE STORAGE BUCKET FOR DOCUMENTS
-- ============================================================================

-- Create storage bucket for company documents (run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'company-documents',
--   'company-documents',
--   false,
--   52428800, -- 50MB limit
--   ARRAY['application/pdf']
-- );

-- Storage policies for company documents bucket
-- CREATE POLICY "Users can upload their own documents" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'company-documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can view their own documents" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'company-documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can update their own documents" ON storage.objects
--   FOR UPDATE USING (
--     bucket_id = 'company-documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete their own documents" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'company-documents' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ============================================================================
-- STEP 8: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
    p_user_id VARCHAR,
    p_step VARCHAR,
    p_completed BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
DECLARE
    current_steps JSONB;
    new_percentage INTEGER;
BEGIN
    -- Get current steps
    SELECT steps_completed INTO current_steps
    FROM onboarding_progress
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one
    IF current_steps IS NULL THEN
        INSERT INTO onboarding_progress (id, user_id, current_step, steps_completed)
        VALUES (gen_random_uuid()::text, p_user_id, p_step, CASE WHEN p_completed THEN jsonb_build_array(p_step) ELSE '[]'::jsonb END);
        RETURN;
    END IF;
    
    -- Add step to completed if not already there
    IF p_completed AND NOT (current_steps ? p_step) THEN
        current_steps := current_steps || jsonb_build_array(p_step);
    END IF;
    
    -- Calculate completion percentage
    new_percentage := (jsonb_array_length(current_steps) * 100) / 5; -- 5 total steps
    
    -- Update progress
    UPDATE onboarding_progress
    SET 
        current_step = p_step,
        steps_completed = current_steps,
        completion_percentage = new_percentage,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Update specific step timestamp
    CASE p_step
        WHEN 'profile_form' THEN
            UPDATE onboarding_progress SET profile_form_completed_at = NOW() WHERE user_id = p_user_id AND p_completed;
        WHEN 'document_upload' THEN
            UPDATE onboarding_progress SET document_upload_completed_at = NOW() WHERE user_id = p_user_id AND p_completed;
        WHEN 'ai_analysis' THEN
            UPDATE onboarding_progress SET ai_analysis_completed_at = NOW() WHERE user_id = p_user_id AND p_completed;
        WHEN 'prompt_generation' THEN
            UPDATE onboarding_progress SET prompt_generation_completed_at = NOW() WHERE user_id = p_user_id AND p_completed;
        WHEN 'setup_complete' THEN
            UPDATE onboarding_progress SET setup_completed_at = NOW() WHERE user_id = p_user_id AND p_completed;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: LEAD QUALIFICATION SYSTEM ENHANCEMENT
-- ============================================================================

-- Add qualification columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_rating VARCHAR CHECK (qualification_rating IN ('high', 'medium', 'low'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_criteria JSONB DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_reasoning TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS auto_qualified BOOLEAN DEFAULT false;

-- Create lead qualification jobs table for background processing
CREATE TABLE IF NOT EXISTS lead_qualification_jobs (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE,

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

-- Create indexes for lead qualification performance
CREATE INDEX IF NOT EXISTS idx_leads_qualification_rating ON leads(qualification_rating);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_score ON leads(qualification_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_date ON leads(qualification_date);
CREATE INDEX IF NOT EXISTS idx_leads_auto_qualified ON leads(auto_qualified);
CREATE INDEX IF NOT EXISTS idx_leads_user_qualification ON leads(user_id, qualification_rating);

-- Lead qualification jobs indexes
CREATE INDEX IF NOT EXISTS idx_qualification_jobs_user_id ON lead_qualification_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_qualification_jobs_lead_id ON lead_qualification_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_qualification_jobs_status ON lead_qualification_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_qualification_jobs_priority ON lead_qualification_jobs(priority, created_at);

-- Enable RLS on lead qualification jobs
ALTER TABLE lead_qualification_jobs ENABLE ROW LEVEL SECURITY;

-- Lead qualification jobs policies
CREATE POLICY "Users can view their own qualification jobs" ON lead_qualification_jobs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own qualification jobs" ON lead_qualification_jobs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own qualification jobs" ON lead_qualification_jobs
    FOR UPDATE USING (auth.uid()::text = user_id);

-- ============================================================================
-- STEP 10: QUALIFICATION HELPER FUNCTIONS
-- ============================================================================

-- Function to update lead qualification
CREATE OR REPLACE FUNCTION update_lead_qualification(
    p_lead_id VARCHAR,
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

-- Function to get qualification statistics
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

-- ============================================================================
-- STEP 11: SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Enhanced Onboarding + Lead Qualification System setup completed!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'New tables created:';
    RAISE NOTICE '  - company_documents (PDF upload and analysis tracking)';
    RAISE NOTICE '  - document_processing_jobs (background job processing)';
    RAISE NOTICE '  - onboarding_progress (step-by-step progress tracking)';
    RAISE NOTICE '  - lead_qualification_jobs (automated qualification processing)';
    RAISE NOTICE '';
    RAISE NOTICE 'Enhanced features:';
    RAISE NOTICE '  ✓ Company profile extended with document insights';
    RAISE NOTICE '  ✓ Multi-file PDF upload with secure storage';
    RAISE NOTICE '  ✓ AI-powered document analysis and extraction';
    RAISE NOTICE '  ✓ Progressive onboarding with step tracking';
    RAISE NOTICE '  ✓ Background job processing for large documents';
    RAISE NOTICE '  ✓ Multi-tenant security with RLS policies';
    RAISE NOTICE '  ✓ Automated lead qualification system';
    RAISE NOTICE '  ✓ Lead scoring and rating (High/Medium/Low)';
    RAISE NOTICE '  ✓ Bulk qualification processing';
    RAISE NOTICE '  ✓ Qualification statistics and analytics';
    RAISE NOTICE '';
    RAISE NOTICE 'Lead qualification columns added:';
    RAISE NOTICE '  - qualification_rating (high/medium/low)';
    RAISE NOTICE '  - qualification_score (0-100)';
    RAISE NOTICE '  - qualification_date (timestamp)';
    RAISE NOTICE '  - qualification_criteria (JSON)';
    RAISE NOTICE '  - qualification_reasoning (text)';
    RAISE NOTICE '  - auto_qualified (boolean)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Create Supabase Storage bucket: company-documents';
    RAISE NOTICE '  2. Configure storage policies for user isolation';
    RAISE NOTICE '  3. Test document upload and AI analysis workflow';
    RAISE NOTICE '  4. Run lead qualification on existing leads';
    RAISE NOTICE '  5. Update frontend UI with qualification display';
    RAISE NOTICE '=================================================================';
END $$;
