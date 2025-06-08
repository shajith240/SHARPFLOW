-- =====================================================
-- MANUAL ID APPROACH - CREATE SETUP TASKS
-- Manually specify IDs to avoid auto-increment issues
-- =====================================================

-- Step 1: Check current max ID in the table (ID is text type)
SELECT
    'CURRENT STATE' as step,
    MAX(id) as current_max_id,
    COALESCE(MAX(id::integer), 0) + 1 as next_id_falcon,
    COALESCE(MAX(id::integer), 0) + 2 as next_id_sage,
    COALESCE(MAX(id::integer), 0) + 3 as next_id_sentinel
FROM customer_setup_tasks;

-- Step 2: Check user exists
SELECT 
    'USER INFO' as step,
    id as user_id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 3: Check current setup tasks for this user
SELECT 
    'EXISTING TASKS' as step,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 4: Insert Falcon task with manual ID (convert to text)
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
    (SELECT (COALESCE(MAX(id::integer), 0) + 1)::text FROM customer_setup_tasks),
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'falcon',
    'pending',
    ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 5: Insert Sage task with manual ID (convert to text)
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
    (SELECT (COALESCE(MAX(id::integer), 0) + 1)::text FROM customer_setup_tasks),
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'sage',
    'pending',
    ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 6: Insert Sentinel task with manual ID (convert to text)
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
    (SELECT (COALESCE(MAX(id::integer), 0) + 1)::text FROM customer_setup_tasks),
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'sentinel',
    'pending',
    ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 7: Verify all tasks were created
SELECT 
    'FINAL VERIFICATION' as step,
    id,
    agent_name,
    status,
    api_keys_configured,
    array_length(api_keys_required, 1) as required_keys_count,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY id;

-- Step 8: Count by status
SELECT 
    'STATUS SUMMARY' as step,
    status,
    COUNT(*) as count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- =====================================================
-- ALTERNATIVE: If the above still fails, try this simpler approach
-- =====================================================

/*
If you're still getting ID constraint errors, you can try this manual approach:

1. First, run this query to see the current max ID:
   SELECT MAX(id) FROM customer_setup_tasks;

2. Then manually insert with specific IDs (replace XXX with max_id + 1, max_id + 2, max_id + 3):

INSERT INTO customer_setup_tasks (id, user_id, agent_name, status, api_keys_required, api_keys_configured, created_at, updated_at) 
VALUES (XXX, (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'), 'falcon', 'pending', ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'], '{}'::jsonb, NOW(), NOW());

INSERT INTO customer_setup_tasks (id, user_id, agent_name, status, api_keys_required, api_keys_configured, created_at, updated_at) 
VALUES (XXX+1, (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'), 'sage', 'pending', ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'], '{}'::jsonb, NOW(), NOW());

INSERT INTO customer_setup_tasks (id, user_id, agent_name, status, api_keys_required, api_keys_configured, created_at, updated_at) 
VALUES (XXX+2, (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'), 'sentinel', 'pending', ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'], '{}'::jsonb, NOW(), NOW());
*/
