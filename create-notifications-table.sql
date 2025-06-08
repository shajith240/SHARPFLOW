-- Create notifications table for the notification system
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('job_completed', 'job_failed', 'job_started', 'system_notification', 'maintenance_notification')),
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    agent_name VARCHAR CHECK (agent_name IN ('prism', 'falcon', 'sage', 'sentinel')),
    job_id VARCHAR,
    job_type VARCHAR,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_agent_name ON notifications(agent_name);

-- Add comment for documentation
COMMENT ON TABLE notifications IS 'Real-time notifications for AI agent job completions and system events';

SELECT 'Notifications table created successfully!' as status;
