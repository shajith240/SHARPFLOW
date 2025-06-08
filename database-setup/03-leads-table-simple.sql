-- AI Agents Database Setup - Script 3: Leads Table (Simple Version)
-- Run this script in your Supabase SQL Editor to fix Falcon agent errors

-- First, let's create just the leads table to fix the immediate Falcon agent issue
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_contact_status ON leads(contact_status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);
CREATE INDEX IF NOT EXISTS idx_leads_linkedin_url ON leads(linkedin_url);

-- Row Level Security (RLS) Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Leads Policies
CREATE POLICY "Users can view their own leads" ON leads
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own leads" ON leads
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own leads" ON leads
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own leads" ON leads
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at_trigger
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

-- Add comments for documentation
COMMENT ON TABLE leads IS 'Lead generation data from Falcon agent';
COMMENT ON COLUMN leads.lead_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN leads.tags IS 'JSON array of tags for categorization';

-- Verify the setup
SELECT 'Leads table created successfully!' as status;

-- Show table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leads'
ORDER BY ordinal_position;
