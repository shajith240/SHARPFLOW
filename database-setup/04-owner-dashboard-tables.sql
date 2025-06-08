-- Owner Dashboard Database Setup - Script 4: Owner Management Tables
-- Run this script in your Supabase SQL Editor after running the previous scripts

-- Owner Notifications Table
-- Stores notifications for the owner when users subscribe
CREATE TABLE IF NOT EXISTS owner_notifications (
    id VARCHAR PRIMARY KEY NOT NULL,
    notification_type VARCHAR NOT NULL, -- new_subscription, payment_failed, user_feedback, etc.
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}', -- Flexible data storage for different notification types
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'pending_setup', 'api_keys_configured', 'agents_activated', 'completed', 'dismissed')),
    priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_owner_notifications_type_status ON owner_notifications(notification_type, status);
CREATE INDEX IF NOT EXISTS idx_owner_notifications_created_at ON owner_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_notifications_user_id ON owner_notifications(user_id);

-- Customer Setup Tasks Table
-- Tracks the manual setup process for each customer
CREATE TABLE IF NOT EXISTS customer_setup_tasks (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id VARCHAR NOT NULL REFERENCES owner_notifications(id) ON DELETE CASCADE,
    agent_name VARCHAR NOT NULL,
    task_type VARCHAR NOT NULL, -- api_key_setup, agent_configuration, testing, activation
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    api_keys_required TEXT[], -- List of required API keys for this agent
    api_keys_configured JSONB DEFAULT '{}', -- Track which keys are configured
    notes TEXT, -- Owner notes about the setup
    completed_by VARCHAR, -- Owner/admin who completed the task
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for setup tasks
CREATE INDEX IF NOT EXISTS idx_customer_setup_tasks_user_id ON customer_setup_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_setup_tasks_status ON customer_setup_tasks(status);
CREATE INDEX IF NOT EXISTS idx_customer_setup_tasks_notification ON customer_setup_tasks(notification_id);

-- Owner Dashboard Settings Table
-- Store owner preferences and dashboard configuration
CREATE TABLE IF NOT EXISTS owner_dashboard_settings (
    id VARCHAR PRIMARY KEY NOT NULL,
    owner_id VARCHAR NOT NULL, -- Could be admin user ID
    setting_key VARCHAR NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, setting_key)
);

-- Customer Communication Log Table
-- Track all communications with customers during setup
CREATE TABLE IF NOT EXISTS customer_communications (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id VARCHAR REFERENCES owner_notifications(id) ON DELETE SET NULL,
    communication_type VARCHAR NOT NULL, -- email, phone, chat, internal_note
    direction VARCHAR NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
    subject VARCHAR,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Store email headers, phone duration, etc.
    created_by VARCHAR, -- Owner/admin who created the communication
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for communications
CREATE INDEX IF NOT EXISTS idx_customer_communications_user_id ON customer_communications(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_communications_created_at ON customer_communications(created_at DESC);

-- Function to automatically create setup tasks when user subscribes
CREATE OR REPLACE FUNCTION create_customer_setup_tasks()
RETURNS TRIGGER AS $$
DECLARE
    agent_record RECORD;
    task_id VARCHAR;
    api_keys_for_agent TEXT[];
BEGIN
    -- Only create tasks for new subscription notifications
    IF NEW.notification_type = 'new_subscription' AND NEW.status = 'pending_setup' THEN
        
        -- Get the required agents from the notification data
        FOR agent_record IN 
            SELECT jsonb_array_elements_text((NEW.data->>'requiredAgents')::jsonb) as agent_name
        LOOP
            -- Determine required API keys for each agent
            CASE agent_record.agent_name
                WHEN 'falcon' THEN 
                    api_keys_for_agent := ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'];
                WHEN 'sage' THEN 
                    api_keys_for_agent := ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'];
                WHEN 'sentinel' THEN 
                    api_keys_for_agent := ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'];
                ELSE 
                    api_keys_for_agent := ARRAY['openai_api_key'];
            END CASE;
            
            -- Create setup task for this agent
            task_id := gen_random_uuid()::text;
            
            INSERT INTO customer_setup_tasks (
                id,
                user_id,
                notification_id,
                agent_name,
                task_type,
                status,
                api_keys_required,
                api_keys_configured
            ) VALUES (
                task_id,
                NEW.user_id,
                NEW.id,
                agent_record.agent_name,
                'api_key_setup',
                'pending',
                api_keys_for_agent,
                '{}'::jsonb
            );
        END LOOP;
        
        -- Log the task creation
        INSERT INTO customer_communications (
            id,
            user_id,
            notification_id,
            communication_type,
            direction,
            subject,
            content,
            created_by
        ) VALUES (
            gen_random_uuid()::text,
            NEW.user_id,
            NEW.id,
            'internal_note',
            'internal',
            'Setup Tasks Created',
            'Automatic setup tasks created for new subscription: ' || (NEW.data->>'subscriptionPlan'),
            'system'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic task creation
DROP TRIGGER IF EXISTS trigger_create_customer_setup_tasks ON owner_notifications;
CREATE TRIGGER trigger_create_customer_setup_tasks
    AFTER INSERT ON owner_notifications
    FOR EACH ROW
    EXECUTE FUNCTION create_customer_setup_tasks();

-- Function to update notification status based on task completion
CREATE OR REPLACE FUNCTION update_notification_status_from_tasks()
RETURNS TRIGGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    notification_status VARCHAR;
BEGIN
    -- Count total and completed tasks for this notification
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'completed' THEN 1 END)
    INTO total_tasks, completed_tasks
    FROM customer_setup_tasks
    WHERE notification_id = COALESCE(NEW.notification_id, OLD.notification_id);
    
    -- Determine new notification status
    IF completed_tasks = 0 THEN
        notification_status := 'pending_setup';
    ELSIF completed_tasks < total_tasks THEN
        notification_status := 'api_keys_configured';
    ELSE
        notification_status := 'agents_activated';
    END IF;
    
    -- Update the notification status
    UPDATE owner_notifications 
    SET 
        status = notification_status,
        updated_at = NOW(),
        completed_at = CASE WHEN notification_status = 'agents_activated' THEN NOW() ELSE completed_at END
    WHERE id = COALESCE(NEW.notification_id, OLD.notification_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic notification status updates
DROP TRIGGER IF EXISTS trigger_update_notification_status ON customer_setup_tasks;
CREATE TRIGGER trigger_update_notification_status
    AFTER UPDATE OF status ON customer_setup_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_status_from_tasks();

-- Insert default owner dashboard settings
INSERT INTO owner_dashboard_settings (id, owner_id, setting_key, setting_value) VALUES
('default-notifications', 'owner', 'notification_preferences', '{
    "email_notifications": true,
    "browser_notifications": true,
    "slack_notifications": false,
    "notification_sound": true,
    "auto_refresh_interval": 30
}'),
('default-setup-workflow', 'owner', 'setup_workflow', '{
    "require_customer_call": true,
    "auto_send_welcome_email": true,
    "setup_timeout_days": 7,
    "follow_up_intervals": [1, 3, 7]
}'),
('default-dashboard-layout', 'owner', 'dashboard_layout', '{
    "show_pending_setups": true,
    "show_recent_subscriptions": true,
    "show_revenue_metrics": true,
    "show_customer_communications": true,
    "default_view": "pending_setups"
}')
ON CONFLICT (owner_id, setting_key) DO NOTHING;

-- Create view for owner dashboard summary
CREATE OR REPLACE VIEW owner_dashboard_summary AS
SELECT 
    -- Pending setups count
    (SELECT COUNT(*) FROM owner_notifications WHERE status IN ('pending_setup', 'api_keys_configured')) as pending_setups,
    
    -- Today's new subscriptions
    (SELECT COUNT(*) FROM owner_notifications WHERE notification_type = 'new_subscription' AND DATE(created_at) = CURRENT_DATE) as todays_subscriptions,
    
    -- This week's completed setups
    (SELECT COUNT(*) FROM owner_notifications WHERE status = 'completed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)) as weekly_completions,
    
    -- Average setup time (in hours)
    (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FROM owner_notifications WHERE status = 'completed' AND completed_at IS NOT NULL) as avg_setup_time_hours,
    
    -- Overdue setups (more than 24 hours old and not completed)
    (SELECT COUNT(*) FROM owner_notifications WHERE status IN ('pending_setup', 'api_keys_configured') AND created_at < NOW() - INTERVAL '24 hours') as overdue_setups;

-- Add comments for documentation
COMMENT ON TABLE owner_notifications IS 'Stores notifications for the owner when users subscribe or need attention';
COMMENT ON TABLE customer_setup_tasks IS 'Tracks the manual setup process for each customer agent';
COMMENT ON TABLE owner_dashboard_settings IS 'Store owner preferences and dashboard configuration';
COMMENT ON TABLE customer_communications IS 'Track all communications with customers during setup';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON owner_notifications TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON customer_setup_tasks TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON owner_dashboard_settings TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON customer_communications TO authenticated;
