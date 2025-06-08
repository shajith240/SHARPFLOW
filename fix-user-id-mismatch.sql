-- =====================================================
-- FIX USER ID MISMATCH FOR SETUP TASKS
-- Ensure setup tasks use the same user_id as owner_notifications
-- =====================================================

-- Step 1: Show current state
SELECT 
    'BEFORE FIX - USER' as step,
    id as user_id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com';

SELECT 
    'BEFORE FIX - NOTIFICATION' as step,
    user_id,
    data->>'userEmail' as email
FROM owner_notifications 
WHERE data->>'userEmail' = 'shajith4434@gmail.com';

SELECT 
    'BEFORE FIX - TASKS' as step,
    user_id,
    agent_name,
    status
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 2: Get the correct user_id from owner_notifications
WITH correct_user_id AS (
    SELECT user_id 
    FROM owner_notifications 
    WHERE data->>'userEmail' = 'shajith4434@gmail.com'
    LIMIT 1
),
current_user_id AS (
    SELECT id as user_id
    FROM users 
    WHERE email = 'shajith4434@gmail.com'
)
SELECT 
    'USER ID COMPARISON' as step,
    n.user_id as notification_user_id,
    u.user_id as users_table_user_id,
    CASE 
        WHEN n.user_id = u.user_id THEN 'MATCH' 
        ELSE 'MISMATCH' 
    END as status
FROM correct_user_id n, current_user_id u;

-- Step 3: Update setup tasks to use the correct user_id from owner_notifications
UPDATE customer_setup_tasks 
SET user_id = (
    SELECT user_id 
    FROM owner_notifications 
    WHERE data->>'userEmail' = 'shajith4434@gmail.com'
    LIMIT 1
)
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 4: Verify the fix
SELECT 
    'AFTER FIX - TASKS' as step,
    user_id,
    agent_name,
    status,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (
    SELECT user_id 
    FROM owner_notifications 
    WHERE data->>'userEmail' = 'shajith4434@gmail.com'
    LIMIT 1
);

-- Step 5: Test the API query logic
WITH pending_notifications AS (
    SELECT *
    FROM owner_notifications
    WHERE notification_type = 'new_subscription'
    AND status IN ('pending_setup', 'api_keys_configured')
    AND data->>'userEmail' = 'shajith4434@gmail.com'
)
SELECT 
    'API TEST' as step,
    n.data->>'userEmail' as user_email,
    n.user_id,
    COUNT(t.id) as task_count,
    array_agg(t.agent_name) as agents
FROM pending_notifications n
LEFT JOIN customer_setup_tasks t ON t.user_id = n.user_id
GROUP BY n.data->>'userEmail', n.user_id;

-- Step 6: Clean up any duplicate tasks (keep only one per agent)
WITH ranked_tasks AS (
    SELECT 
        id,
        agent_name,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, agent_name 
            ORDER BY created_at ASC
        ) as rn
    FROM customer_setup_tasks 
    WHERE user_id = (
        SELECT user_id 
        FROM owner_notifications 
        WHERE data->>'userEmail' = 'shajith4434@gmail.com'
        LIMIT 1
    )
)
DELETE FROM customer_setup_tasks 
WHERE id IN (
    SELECT id 
    FROM ranked_tasks 
    WHERE rn > 1
);

-- Step 7: Final verification
SELECT 
    'FINAL STATE' as step,
    user_id,
    agent_name,
    status,
    task_type,
    array_length(api_keys_required, 1) as required_keys_count,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (
    SELECT user_id 
    FROM owner_notifications 
    WHERE data->>'userEmail' = 'shajith4434@gmail.com'
    LIMIT 1
)
ORDER BY agent_name;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
After running this script:

1. Setup tasks will use the same user_id as the owner_notifications
2. The API query will find the tasks correctly
3. Duplicates will be removed
4. The owner dashboard will show individual API key forms

The key insight is that the API joins:
owner_notifications.user_id = customer_setup_tasks.user_id

So both tables must have the same user_id value for the join to work.
*/
