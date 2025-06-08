-- =====================================================
-- COMPLETE INSERT WITH NOTIFICATION_ID
-- Include the required notification_id field
-- =====================================================

-- Step 1: Check user exists
SELECT 
    'USER CHECK' as step,
    id as user_id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 2: Check existing owner notification for this user
SELECT 
    'OWNER NOTIFICATION' as step,
    id as notification_id,
    notification_type,
    status,
    created_at
FROM owner_notifications 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 3: Check current setup tasks for this user
SELECT 
    'EXISTING TASKS' as step,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 4: Insert Falcon task with notification_id and task_type
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    notification_id,
    agent_name,
    task_type,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    (SELECT id FROM owner_notifications WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')),
    'falcon',
    'api_key_setup',
    'pending',
    ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 5: Insert Sage task with notification_id and task_type
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    notification_id,
    agent_name,
    task_type,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    (SELECT id FROM owner_notifications WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')),
    'sage',
    'api_key_setup',
    'pending',
    ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 6: Insert Sentinel task with notification_id and task_type
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    notification_id,
    agent_name,
    task_type,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    (SELECT id FROM owner_notifications WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')),
    'sentinel',
    'api_key_setup',
    'pending',
    ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'],
    '{}'::jsonb,
    NOW(),
    NOW()
);

-- Step 7: Verify all tasks were created
SELECT
    'TASKS CREATED' as step,
    id,
    agent_name,
    task_type,
    status,
    notification_id,
    api_keys_configured,
    array_length(api_keys_required, 1) as required_keys_count,
    created_at
FROM customer_setup_tasks
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY agent_name;

-- Step 8: Count by status
SELECT 
    'STATUS SUMMARY' as step,
    status,
    COUNT(*) as count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- Step 9: Verify the notification relationship
SELECT
    'NOTIFICATION RELATIONSHIP' as step,
    t.agent_name,
    t.task_type,
    t.status as task_status,
    n.status as notification_status,
    n.notification_type
FROM customer_setup_tasks t
JOIN owner_notifications n ON t.notification_id = n.id
WHERE t.user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY t.agent_name;

-- =====================================================
-- ALTERNATIVE: If no notification exists, create one first
-- =====================================================

/*
If the above fails because no owner_notification exists, run this first:

INSERT INTO owner_notifications (
    id,
    user_id,
    notification_type,
    status,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'shajith4434@gmail.com'),
    'customer_subscription',
    'pending_setup',
    NOW(),
    NOW()
);

Then run the main script above.
*/

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
This script will:

1. Check that the user exists
2. Find the existing owner notification for this user
3. Create 3 setup tasks with proper notification_id references
4. Verify all tasks were created successfully
5. Show the relationship between tasks and notification

After running this script:
- 3 setup tasks will exist for shajith4434@gmail.com
- All tasks will have proper notification_id references
- All tasks will have status 'pending' and empty api_keys_configured
- The owner dashboard will show individual forms instead of completion message
*/
