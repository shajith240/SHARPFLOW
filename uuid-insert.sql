-- =====================================================
-- SIMPLE UUID APPROACH - CREATE SETUP TASKS
-- Use UUIDs for IDs to avoid any numbering conflicts
-- =====================================================

-- Step 1: Check user exists
SELECT 
    'USER CHECK' as step,
    id as user_id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 2: Check current setup tasks for this user
SELECT 
    'EXISTING TASKS' as step,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 3: Insert Falcon task with UUID
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'falcon',
    'pending',
    ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 4: Insert Sage task with UUID
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'sage',
    'pending',
    ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 5: Insert Sentinel task with UUID
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'sentinel',
    'pending',
    ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 6: Verify all tasks were created
SELECT 
    'TASKS CREATED' as step,
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
    'STATUS SUMMARY' as step,
    status,
    COUNT(*) as count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
This script will:

1. Check that the user exists
2. Show current task count (should be 0)
3. Create 3 setup tasks with UUID IDs
4. Verify all tasks were created successfully
5. Show status summary (should be 3 pending tasks)

After running this script:
- 3 setup tasks will exist for shajith4434@gmail.com
- All tasks will have status 'pending' and empty api_keys_configured
- The owner dashboard will show individual forms instead of completion message
- You can then manually configure API keys through the web interface

This approach uses UUIDs which should avoid any ID conflicts completely.
*/
