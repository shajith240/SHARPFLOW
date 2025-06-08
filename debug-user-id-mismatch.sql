-- =====================================================
-- DEBUG USER ID MISMATCH ISSUE
-- Check why setup tasks are not being found for shajith4434@gmail.com
-- =====================================================

-- Step 1: Check user in users table
SELECT 
    'USERS TABLE' as step,
    id,
    email,
    created_at
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 2: Check owner notifications for this user
SELECT 
    'OWNER NOTIFICATIONS' as step,
    id as notification_id,
    user_id,
    notification_type,
    status,
    data->>'userEmail' as email_from_data,
    created_at
FROM owner_notifications 
WHERE data->>'userEmail' = 'shajith4434@gmail.com'
   OR user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 3: Check setup tasks directly
SELECT 
    'SETUP TASKS' as step,
    id,
    user_id,
    agent_name,
    status,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 4: Check if there are setup tasks with different user_id format
SELECT 
    'ALL SETUP TASKS FOR SIMILAR EMAILS' as step,
    id,
    user_id,
    agent_name,
    status,
    created_at
FROM customer_setup_tasks 
WHERE user_id LIKE '%shajith%' OR user_id LIKE '%4434%';

-- Step 5: Check the exact user_id from owner_notifications
WITH notification_user AS (
    SELECT user_id 
    FROM owner_notifications 
    WHERE data->>'userEmail' = 'shajith4434@gmail.com'
    LIMIT 1
)
SELECT 
    'TASKS FOR NOTIFICATION USER_ID' as step,
    t.id,
    t.user_id,
    t.agent_name,
    t.status,
    t.created_at
FROM customer_setup_tasks t, notification_user n
WHERE t.user_id = n.user_id;

-- Step 6: Show the exact user_id values for comparison
SELECT 
    'USER ID COMPARISON' as step,
    'users_table' as source,
    id as user_id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com'

UNION ALL

SELECT 
    'USER ID COMPARISON' as step,
    'owner_notifications' as source,
    user_id,
    data->>'userEmail' as email
FROM owner_notifications 
WHERE data->>'userEmail' = 'shajith4434@gmail.com';

-- Step 7: Check if the issue is with the API query logic
-- This simulates what the API does
WITH pending_notifications AS (
    SELECT *
    FROM owner_notifications
    WHERE notification_type = 'new_subscription'
    AND status IN ('pending_setup', 'api_keys_configured')
)
SELECT 
    'API SIMULATION' as step,
    n.data->>'userEmail' as user_email,
    n.user_id as notification_user_id,
    COUNT(t.id) as task_count
FROM pending_notifications n
LEFT JOIN customer_setup_tasks t ON t.user_id = n.user_id
WHERE n.data->>'userEmail' = 'shajith4434@gmail.com'
GROUP BY n.data->>'userEmail', n.user_id;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
This script will help identify:

1. The exact user_id in the users table
2. The user_id stored in owner_notifications
3. The user_id used in customer_setup_tasks
4. Whether there's a mismatch causing the API to not find tasks

Common issues:
- Different user_id formats (UUID vs google-xxx)
- Case sensitivity differences
- Encoding issues
- Missing foreign key relationships

Once we identify the mismatch, we can fix it with an UPDATE statement.
*/
