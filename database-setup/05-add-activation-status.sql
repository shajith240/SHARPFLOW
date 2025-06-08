-- Add activation_status column to users table for multi-tenant onboarding workflow
-- Run this script in your Supabase SQL Editor

-- Add activation_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'activation_status'
    ) THEN
        ALTER TABLE users ADD COLUMN activation_status VARCHAR DEFAULT 'pending' 
        CHECK (activation_status IN ('pending', 'active'));
        
        -- Set existing active subscribers to 'active' status
        UPDATE users 
        SET activation_status = 'active' 
        WHERE subscription_status = 'active';
        
        RAISE NOTICE 'Added activation_status column to users table';
    ELSE
        RAISE NOTICE 'activation_status column already exists';
    END IF;
END $$;

-- Create function to activate user after API keys are configured
CREATE OR REPLACE FUNCTION activate_user_account(target_user_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_record RECORD;
    agent_configs_count INTEGER;
    required_agents_count INTEGER;
BEGIN
    -- Get user information
    SELECT * INTO user_record FROM users WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Check if user has active subscription
    IF user_record.subscription_status != 'active' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User does not have active subscription'
        );
    END IF;
    
    -- Count configured agent configs
    SELECT COUNT(*) INTO agent_configs_count
    FROM user_agent_configs 
    WHERE user_id = target_user_id 
    AND is_enabled = true;
    
    -- Determine required agents based on plan
    CASE user_record.subscription_plan
        WHEN 'falcon_individual' THEN required_agents_count := 1;
        WHEN 'sage_individual' THEN required_agents_count := 1;
        WHEN 'sentinel_individual' THEN required_agents_count := 1;
        WHEN 'professional_combo' THEN required_agents_count := 2;
        WHEN 'ultra_premium' THEN required_agents_count := 3;
        ELSE required_agents_count := 1;
    END CASE;
    
    -- Check if user has required agent configurations
    IF agent_configs_count < required_agents_count THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User does not have required agent configurations',
            'configured_agents', agent_configs_count,
            'required_agents', required_agents_count
        );
    END IF;
    
    -- Activate user account
    UPDATE users 
    SET activation_status = 'active',
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Update owner notification status
    UPDATE owner_notifications 
    SET status = 'completed',
        completed_at = NOW()
    WHERE user_id = target_user_id 
    AND notification_type = 'new_subscription'
    AND status != 'completed';
    
    RETURN json_build_object(
        'success', true,
        'message', 'User account activated successfully',
        'user_id', target_user_id,
        'activation_status', 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get user activation status with plan details
CREATE OR REPLACE FUNCTION get_user_activation_status(target_user_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    result JSON;
    user_record RECORD;
    agent_configs RECORD[];
    pending_notification RECORD;
BEGIN
    -- Get user information
    SELECT 
        id, email, first_name, last_name, 
        subscription_status, subscription_plan, 
        activation_status, created_at
    INTO user_record 
    FROM users 
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Get agent configurations
    SELECT array_agg(
        json_build_object(
            'agent_name', agent_name,
            'is_enabled', is_enabled,
            'has_api_keys', (api_keys != '{}' AND api_keys IS NOT NULL)
        )
    ) INTO agent_configs
    FROM user_agent_configs 
    WHERE user_id = target_user_id;
    
    -- Get pending notification if exists
    SELECT * INTO pending_notification
    FROM owner_notifications 
    WHERE user_id = target_user_id 
    AND notification_type = 'new_subscription'
    AND status != 'completed'
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN json_build_object(
        'success', true,
        'user', row_to_json(user_record),
        'agent_configs', COALESCE(agent_configs, ARRAY[]::JSON[]),
        'pending_notification', row_to_json(pending_notification),
        'is_pending_activation', (user_record.activation_status = 'pending'),
        'has_active_subscription', (user_record.subscription_status = 'active')
    );
END;
$$ LANGUAGE plpgsql;

-- Create index for faster activation status queries
CREATE INDEX IF NOT EXISTS idx_users_activation_status ON users(activation_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_activation ON users(subscription_status, activation_status);

-- Add comments for documentation
COMMENT ON COLUMN users.activation_status IS 'User activation status: pending (waiting for owner to configure API keys) or active (ready to use agents)';
COMMENT ON FUNCTION activate_user_account IS 'Activates user account after owner configures required API keys';
COMMENT ON FUNCTION get_user_activation_status IS 'Gets comprehensive user activation status with plan and agent details';
