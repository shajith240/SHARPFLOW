-- Fix Data Type Compatibility Issues - Script 6
-- Run this script to fix foreign key constraint issues

-- First, let's check if the leads table exists and what type its ID column is
DO $$
DECLARE
    leads_id_type TEXT;
BEGIN
    -- Get the data type of leads.id column
    SELECT data_type INTO leads_id_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'leads' 
      AND column_name = 'id';
    
    IF leads_id_type IS NULL THEN
        RAISE NOTICE 'Leads table does not exist yet. Will create with VARCHAR type.';
    ELSE
        RAISE NOTICE 'Leads table exists with ID type: %', leads_id_type;
    END IF;
END $$;

-- Ensure leads table exists with correct VARCHAR type
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core lead information
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
    
    -- Status and scoring
    lead_status VARCHAR DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
    contact_status VARCHAR DEFAULT 'not_contacted' CHECK (contact_status IN ('not_contacted', 'email_sent', 'responded', 'bounced')),
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    
    -- Metadata
    source VARCHAR DEFAULT 'Falcon',
    tags JSONB DEFAULT '[]',
    notes TEXT,
    
    -- External tracking
    n8n_execution_id VARCHAR,
    apollo_person_id VARCHAR,
    apollo_organization_id VARCHAR,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_contacted_at TIMESTAMP
);

-- Now we can safely add the foreign key constraint to generated_messages
-- First, check if the constraint already exists and drop it if it does
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'generated_messages_lead_id_fkey'
        AND table_name = 'generated_messages'
    ) THEN
        ALTER TABLE generated_messages DROP CONSTRAINT generated_messages_lead_id_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint generated_messages_lead_id_fkey';
    END IF;
END $$;

-- Add the foreign key constraint with proper type matching
ALTER TABLE generated_messages 
ADD CONSTRAINT generated_messages_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- Ensure research_reports table also has proper foreign key
CREATE TABLE IF NOT EXISTS research_reports (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE,
    job_id VARCHAR, -- References agent_jobs but without foreign key constraint for flexibility

    -- Report content
    report_title VARCHAR NOT NULL,
    report_content TEXT NOT NULL, -- HTML content
    report_type VARCHAR DEFAULT 'linkedin_research' CHECK (report_type IN ('linkedin_research', 'company_research', 'market_research')),

    -- Metadata
    research_sources JSONB DEFAULT '[]', -- Array of sources used
    confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for the leads table if they don't exist
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_contact_status ON leads(contact_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);

-- Add indexes for research_reports
CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_lead_id ON research_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_job_id ON research_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_report_type ON research_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC);

-- Enable RLS for leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own leads" ON leads;
    DROP POLICY IF EXISTS "Users can create their own leads" ON leads;
    DROP POLICY IF EXISTS "Users can update their own leads" ON leads;
    DROP POLICY IF EXISTS "Users can delete their own leads" ON leads;
    
    -- Create new policies
    CREATE POLICY "Users can view their own leads" ON leads
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own leads" ON leads
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can update their own leads" ON leads
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can delete their own leads" ON leads
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
        
    RAISE NOTICE 'Created RLS policies for leads table';
END $$;

-- Create RLS policies for research_reports
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own research reports" ON research_reports;
    DROP POLICY IF EXISTS "Users can create their own research reports" ON research_reports;
    DROP POLICY IF EXISTS "Users can update their own research reports" ON research_reports;
    DROP POLICY IF EXISTS "Users can delete their own research reports" ON research_reports;
    
    -- Create new policies
    CREATE POLICY "Users can view their own research reports" ON research_reports
        FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can create their own research reports" ON research_reports
        FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can update their own research reports" ON research_reports
        FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

    CREATE POLICY "Users can delete their own research reports" ON research_reports
        FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
        
    RAISE NOTICE 'Created RLS policies for research_reports table';
END $$;

-- Add triggers for automatic timestamp updates if the function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        -- Drop existing triggers if they exist
        DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
        DROP TRIGGER IF EXISTS update_research_reports_updated_at ON research_reports;
        
        -- Create new triggers
        CREATE TRIGGER update_leads_updated_at 
            BEFORE UPDATE ON leads 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        CREATE TRIGGER update_research_reports_updated_at 
            BEFORE UPDATE ON research_reports 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'Created update triggers for leads and research_reports tables';
    ELSE
        RAISE NOTICE 'update_updated_at_column function not found, skipping triggers';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE leads IS 'Lead generation data from Falcon agent with VARCHAR ID type';
COMMENT ON TABLE research_reports IS 'Research reports generated by Sage agent';
COMMENT ON COLUMN leads.lead_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN leads.tags IS 'JSON array of tags for categorization';

-- Verify the setup
SELECT 'Data type compatibility issues fixed successfully!' as status;

-- Show the corrected table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('leads', 'generated_messages', 'research_reports')
  AND column_name IN ('id', 'lead_id')
ORDER BY table_name, column_name;
