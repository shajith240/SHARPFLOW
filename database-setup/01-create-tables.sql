-- ARTIVANCE Database Setup - Script 1: Create Tables
-- Run this script in your Supabase SQL Editor

-- Check if tables exist and create if missing
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY NOT NULL,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    paypal_customer_id VARCHAR,
    subscription_status VARCHAR DEFAULT 'inactive',
    subscription_plan VARCHAR,
    subscription_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_submissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    company VARCHAR,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    paypal_customer_id VARCHAR NOT NULL,
    paypal_plan_id VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR PRIMARY KEY NOT NULL,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    subscription_id VARCHAR REFERENCES subscriptions(id),
    paypal_customer_id VARCHAR NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR NOT NULL DEFAULT 'usd',
    status VARCHAR NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR PRIMARY KEY NOT NULL,
    type VARCHAR NOT NULL,
    processed BOOLEAN DEFAULT false,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts and subscription information';
COMMENT ON TABLE contact_submissions IS 'Contact form submissions from website';
COMMENT ON TABLE subscriptions IS 'PayPal subscription records';
COMMENT ON TABLE payments IS 'PayPal payment transaction records';
COMMENT ON TABLE webhook_events IS 'PayPal webhook events for idempotency';

COMMENT ON COLUMN users.paypal_customer_id IS 'PayPal customer ID for payment processing';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status: inactive, active, canceled, past_due';
COMMENT ON COLUMN users.subscription_plan IS 'Current subscription plan: starter, professional, enterprise';
COMMENT ON COLUMN users.subscription_period_end IS 'When the current subscription period ends';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 'Database tables created successfully!' as status;

-- Show table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'contact_submissions', 'subscriptions', 'payments', 'webhook_events')
ORDER BY table_name, ordinal_position;
