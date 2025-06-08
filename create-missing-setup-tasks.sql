-- =====================================================
-- CREATE MISSING SETUP TASKS FOR SHAJITH4434@GMAIL.COM
-- This user has no setup tasks, which causes the completion message to show
-- =====================================================

-- Step 1: Get user information
SELECT 
    'USER INFORMATION' as step,
    id,
    email,
    subscription_status,
    subscription_plan
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 2: Check current setup tasks (should be empty)
SELECT 
    'CURRENT SETUP TASKS (should be empty)' as step,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 3: Create the missing setup tasks with explicit IDs
-- First, get the next available ID values
WITH next_ids AS (
    SELECT
        COALESCE(MAX(id), 0) + 1 as start_id
    FROM customer_setup_tasks
)
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
)
SELECT
    start_id + (row_number() OVER () - 1) as id,
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
FROM next_ids,
(VALUES
    -- Falcon Agent (Lead Generation)
    (
        (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
        'falcon',
        'pending',
        ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'],
        '{}'::jsonb,
        NOW(),
        NOW()
    ),
    -- Sage Agent (Research)
    (
        (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
        'sage',
        'pending',
        ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'],
        '{}'::jsonb,
        NOW(),
        NOW()
    ),
    -- Sentinel Agent (Email/Calendar)
    (
        (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
        'sentinel',
        'pending',
        ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'],
        '{}'::jsonb,
        NOW(),
        NOW()
    )
) AS task_data(user_id, agent_name, status, api_keys_required, api_keys_configured, created_at, updated_at);

-- Step 4: Verify the setup tasks were created
SELECT 
    'SETUP TASKS AFTER CREATION' as step,
    agent_name,
    status,
    api_keys_configured,
    api_keys_required,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY agent_name;

-- Step 5: Count setup tasks by status
SELECT 
    'SETUP TASKS SUMMARY' as step,
    status,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- Step 6: Verify owner notification exists
SELECT 
    'OWNER NOTIFICATION STATUS' as step,
    id,
    notification_type,
    status,
    created_at
FROM owner_notifications 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- =====================================================
-- EXPECTED RESULTS AFTER RUNNING THIS SCRIPT
-- =====================================================

/*
EXPECTED RESULTS:

1. Setup Tasks: 3 records created (falcon, sage, sentinel)
2. All tasks have status = 'pending'
3. All tasks have empty api_keys_configured = '{}'
4. Owner notification should exist with status = 'pending_setup'

This should result in the owner dashboard showing:
- Individual API key input forms for each agent
- All agents showing "pending" status  
- No "All API Keys Configured!" completion message
- Manual configuration workflow ready for testing

NEXT STEPS:
1. Run this SQL script in Supabase SQL Editor
2. Refresh the owner dashboard in browser
3. Navigate to Pending Setups → shajith4434@gmail.com
4. Should see 3 individual agent setup forms with pending status
5. Manually enter API keys for each agent
6. Verify status changes from pending to completed
*/
