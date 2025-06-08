-- =====================================================
-- SIMPLE APPROACH: CREATE MISSING SETUP TASKS
-- Create setup tasks one by one for shajith4434@gmail.com
-- =====================================================

-- Step 1: Check if user exists
SELECT 
    'USER CHECK' as step,
    id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 2: Check current setup tasks (should be empty)
SELECT 
    'CURRENT SETUP TASKS' as step,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 3: Create Falcon Agent setup task
INSERT INTO customer_setup_tasks (
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'falcon',
    'pending',
    ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 4: Create Sage Agent setup task  
INSERT INTO customer_setup_tasks (
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'sage',
    'pending',
    ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 5: Create Sentinel Agent setup task
INSERT INTO customer_setup_tasks (
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'sentinel',
    'pending',
    ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 6: Verify all setup tasks were created
SELECT 
    'SETUP TASKS CREATED' as step,
    id,
    agent_name,
    status,
    api_keys_configured,
    array_length(api_keys_required, 1) as required_keys_count,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY agent_name;

-- Step 7: Count by status
SELECT 
    'TASKS BY STATUS' as step,
    status,
    COUNT(*) as count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- Step 8: Check owner notification
SELECT 
    'OWNER NOTIFICATION' as step,
    id,
    notification_type,
    status,
    created_at
FROM owner_notifications 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
After running this script, you should see:

1. USER CHECK: Shows the user ID and email
2. CURRENT SETUP TASKS: Should show 0 initially
3. Three INSERT statements execute successfully
4. SETUP TASKS CREATED: Shows 3 tasks (falcon, sage, sentinel) all with status 'pending'
5. TASKS BY STATUS: Shows 3 tasks with status 'pending'
6. OWNER NOTIFICATION: Shows existing notification with status 'pending_setup'

This will fix the empty array issue and allow the owner dashboard to show individual API key forms.
*/
