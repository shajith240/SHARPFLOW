-- Sentinel Agent Email Monitoring Database Setup
-- Run this script in your Supabase SQL Editor to add email monitoring functionality

-- Email Monitoring Configuration Table
CREATE TABLE IF NOT EXISTS email_monitoring_config (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monitoring_enabled BOOLEAN DEFAULT false,
    check_interval INTEGER DEFAULT 1, -- in minutes
    last_check_at TIMESTAMP,
    filter_criteria JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Threads Table (for tracking email conversations)
CREATE TABLE IF NOT EXISTS email_threads (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id VARCHAR NOT NULL, -- Gmail thread ID
    subject VARCHAR,
    participants JSONB DEFAULT '[]', -- Array of email addresses
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    classification VARCHAR CHECK (classification IN ('sales', 'support', 'spam', 'other')),
    is_calendar_request BOOLEAN DEFAULT false,
    requires_response BOOLEAN DEFAULT false,
    escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP
);

-- Email Messages Table (individual emails within threads)
CREATE TABLE IF NOT EXISTS email_messages (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id VARCHAR NOT NULL, -- Gmail message ID
    from_address VARCHAR NOT NULL,
    to_addresses JSONB DEFAULT '[]',
    cc_addresses JSONB DEFAULT '[]',
    subject VARCHAR,
    body_text TEXT,
    body_html TEXT,
    is_from_customer BOOLEAN DEFAULT true,
    processed BOOLEAN DEFAULT false,
    requires_action BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    received_at TIMESTAMP
);

-- Email Responses Table (AI-generated responses)
CREATE TABLE IF NOT EXISTS email_responses (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id VARCHAR REFERENCES email_messages(id) ON DELETE SET NULL,
    job_id VARCHAR REFERENCES agent_jobs(id) ON DELETE SET NULL,
    response_type VARCHAR NOT NULL CHECK (response_type IN ('information', 'calendar', 'escalation')),
    response_content TEXT NOT NULL,
    approval_status VARCHAR DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'sent')),
    approved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    sent_at TIMESTAMP,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Calendar Bookings Table (for calendar-related email requests)
CREATE TABLE IF NOT EXISTS calendar_bookings (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id VARCHAR REFERENCES email_messages(id) ON DELETE SET NULL,
    job_id VARCHAR REFERENCES agent_jobs(id) ON DELETE SET NULL,
    requester_email VARCHAR NOT NULL,
    event_type VARCHAR DEFAULT 'consultation' CHECK (event_type IN ('consultation', 'demo', 'meeting')),
    requested_datetime TIMESTAMP,
    requested_date DATE,
    duration_minutes INTEGER DEFAULT 30,
    event_name VARCHAR,
    event_description TEXT,
    calendar_event_id VARCHAR, -- Google Calendar event ID
    booking_status VARCHAR DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    confirmation_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

-- Email Escalations Table (for human intervention)
CREATE TABLE IF NOT EXISTS email_escalations (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id VARCHAR NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
    message_id VARCHAR REFERENCES email_messages(id) ON DELETE SET NULL,
    escalation_reason VARCHAR NOT NULL,
    escalation_type VARCHAR DEFAULT 'manual_review' CHECK (escalation_type IN ('manual_review', 'complex_query', 'technical_issue', 'policy_violation')),
    priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_monitoring_config_user_id ON email_monitoring_config(user_id);
CREATE INDEX IF NOT EXISTS idx_email_monitoring_config_enabled ON email_monitoring_config(monitoring_enabled);

CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_status ON email_threads(status);
CREATE INDEX IF NOT EXISTS idx_email_threads_classification ON email_threads(classification);
CREATE INDEX IF NOT EXISTS idx_email_threads_requires_response ON email_threads(requires_response);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_activity ON email_threads(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_from_address ON email_messages(from_address);
CREATE INDEX IF NOT EXISTS idx_email_messages_processed ON email_messages(processed);
CREATE INDEX IF NOT EXISTS idx_email_messages_requires_action ON email_messages(requires_action);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_responses_user_id ON email_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_thread_id ON email_responses(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_responses_approval_status ON email_responses(approval_status);
CREATE INDEX IF NOT EXISTS idx_email_responses_response_type ON email_responses(response_type);
CREATE INDEX IF NOT EXISTS idx_email_responses_created_at ON email_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_bookings_user_id ON calendar_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_thread_id ON calendar_bookings(thread_id);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_requester_email ON calendar_bookings(requester_email);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_booking_status ON calendar_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_requested_datetime ON calendar_bookings(requested_datetime);

CREATE INDEX IF NOT EXISTS idx_email_escalations_user_id ON email_escalations(user_id);
CREATE INDEX IF NOT EXISTS idx_email_escalations_thread_id ON email_escalations(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_escalations_status ON email_escalations(status);
CREATE INDEX IF NOT EXISTS idx_email_escalations_priority ON email_escalations(priority);
CREATE INDEX IF NOT EXISTS idx_email_escalations_assigned_to ON email_escalations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_email_escalations_created_at ON email_escalations(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE email_monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_escalations ENABLE ROW LEVEL SECURITY;

-- Email Monitoring Config Policies
CREATE POLICY "Users can view their own email monitoring config" ON email_monitoring_config
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email monitoring config" ON email_monitoring_config
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email monitoring config" ON email_monitoring_config
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Email Threads Policies
CREATE POLICY "Users can view their own email threads" ON email_threads
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email threads" ON email_threads
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email threads" ON email_threads
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Email Messages Policies
CREATE POLICY "Users can view their own email messages" ON email_messages
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email messages" ON email_messages
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email messages" ON email_messages
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Email Responses Policies
CREATE POLICY "Users can view their own email responses" ON email_responses
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email responses" ON email_responses
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email responses" ON email_responses
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Calendar Bookings Policies
CREATE POLICY "Users can view their own calendar bookings" ON calendar_bookings
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own calendar bookings" ON calendar_bookings
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own calendar bookings" ON calendar_bookings
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Email Escalations Policies
CREATE POLICY "Users can view their own email escalations" ON email_escalations
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create their own email escalations" ON email_escalations
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own email escalations" ON email_escalations
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Functions for automatic timestamp updates
CREATE TRIGGER update_email_monitoring_config_updated_at 
    BEFORE UPDATE ON email_monitoring_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_threads_updated_at 
    BEFORE UPDATE ON email_threads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update thread last_activity_at when new message is added
CREATE OR REPLACE FUNCTION update_thread_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE email_threads 
    SET last_activity_at = NEW.received_at,
        updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update thread activity when new message is added
CREATE TRIGGER update_thread_on_new_message
    AFTER INSERT ON email_messages
    FOR EACH ROW EXECUTE FUNCTION update_thread_last_activity();

-- Add comments for documentation
COMMENT ON TABLE email_monitoring_config IS 'Configuration for email monitoring per user';
COMMENT ON TABLE email_threads IS 'Email conversation threads';
COMMENT ON TABLE email_messages IS 'Individual email messages within threads';
COMMENT ON TABLE email_responses IS 'AI-generated email responses awaiting approval';
COMMENT ON TABLE calendar_bookings IS 'Calendar booking requests from emails';
COMMENT ON TABLE email_escalations IS 'Emails escalated for human intervention';

-- Verify the setup
SELECT 'Sentinel email monitoring database tables created successfully!' as status;
