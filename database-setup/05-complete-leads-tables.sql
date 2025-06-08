-- Complete Leads and Research Tables - Script 5
-- Run this script in your Supabase SQL Editor after running the previous scripts

-- Leads Table (for Falcon agent outputs) - Enhanced version
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

-- Research Reports Table (for Sage agent outputs)
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

-- Email Templates Table (for Sentinel agent)
CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Template details
    template_name VARCHAR NOT NULL,
    template_type VARCHAR NOT NULL CHECK (template_type IN ('initial_outreach', 'follow_up', 'response', 'reminder')),
    subject_line VARCHAR NOT NULL,
    email_body TEXT NOT NULL,
    
    -- Personalization
    variables JSONB DEFAULT '[]', -- Available variables for personalization
    tone VARCHAR DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly', 'formal')),
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00, -- Response rate percentage
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Campaigns Table (for Sentinel agent tracking)
CREATE TABLE IF NOT EXISTS email_campaigns (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR REFERENCES email_templates(id) ON DELETE SET NULL,
    
    -- Campaign details
    campaign_name VARCHAR NOT NULL,
    campaign_type VARCHAR NOT NULL CHECK (campaign_type IN ('outreach', 'follow_up', 'nurture')),
    target_audience JSONB DEFAULT '{}', -- Criteria for lead selection
    
    -- Scheduling
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_replied INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_research_reports_user_id ON research_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_lead_id ON research_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_job_id ON research_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_research_reports_report_type ON research_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_research_reports_created_at ON research_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_template_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON email_campaigns(scheduled_at);

-- Row Level Security (RLS) Policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Leads Policies
CREATE POLICY "Users can view their own leads" ON leads
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own leads" ON leads
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own leads" ON leads
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own leads" ON leads
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Research Reports Policies
CREATE POLICY "Users can view their own research reports" ON research_reports
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own research reports" ON research_reports
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own research reports" ON research_reports
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own research reports" ON research_reports
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Email Templates Policies
CREATE POLICY "Users can view their own email templates" ON email_templates
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email templates" ON email_templates
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email templates" ON email_templates
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own email templates" ON email_templates
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Email Campaigns Policies
CREATE POLICY "Users can view their own email campaigns" ON email_campaigns
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email campaigns" ON email_campaigns
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email campaigns" ON email_campaigns
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own email campaigns" ON email_campaigns
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_reports_updated_at 
    BEFORE UPDATE ON research_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at 
    BEFORE UPDATE ON email_campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE leads IS 'Lead generation data from Falcon agent';
COMMENT ON TABLE research_reports IS 'Research reports generated by Sage agent';
COMMENT ON TABLE email_templates IS 'Email templates for Sentinel agent campaigns';
COMMENT ON TABLE email_campaigns IS 'Email campaign tracking for Sentinel agent';

COMMENT ON COLUMN leads.lead_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN leads.tags IS 'JSON array of tags for categorization';
COMMENT ON COLUMN research_reports.report_content IS 'HTML content of the research report';
COMMENT ON COLUMN research_reports.research_sources IS 'JSON array of sources used for research';

-- Insert default email templates for new users
INSERT INTO email_templates (id, user_id, template_name, template_type, subject_line, email_body, variables, is_default) VALUES
('default-outreach-template', 'system', 'Professional Outreach', 'initial_outreach', 
 'Quick question about {{company_name}}', 
 'Hi {{first_name}},

I noticed {{company_name}} is doing great work in {{industry}}. I''d love to connect and share some insights that might be valuable for your {{job_title}} role.

Would you be open to a brief 15-minute conversation this week?

Best regards,
{{sender_name}}', 
 '["first_name", "company_name", "industry", "job_title", "sender_name"]', true),

('default-followup-template', 'system', 'Friendly Follow-up', 'follow_up',
 'Following up on {{company_name}}',
 'Hi {{first_name}},

I wanted to follow up on my previous message about {{company_name}}. I understand you''re busy, but I believe this could be valuable for your team.

Would you prefer a quick call or email exchange?

Best,
{{sender_name}}',
 '["first_name", "company_name", "sender_name"]', true)

ON CONFLICT (id) DO NOTHING;

-- Verify the setup
SELECT 'Complete leads and research tables created successfully!' as status;

-- Show table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('leads', 'research_reports', 'email_templates', 'email_campaigns')
ORDER BY table_name, ordinal_position;
