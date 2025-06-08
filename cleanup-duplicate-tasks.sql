-- =====================================================
-- CLEANUP DUPLICATE SETUP TASKS
-- Remove duplicate entries and keep only one per agent
-- =====================================================

-- Step 1: Check current duplicate tasks
SELECT 
    'CURRENT DUPLICATES' as step,
    agent_name,
    COUNT(*) as duplicate_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY agent_name
ORDER BY agent_name;

-- Step 2: Show all current tasks with details
SELECT 
    'ALL CURRENT TASKS' as step,
    id,
    agent_name,
    task_type,
    status,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY agent_name, created_at;

-- Step 3: Remove duplicates, keeping only the first (oldest) entry for each agent
WITH ranked_tasks AS (
    SELECT 
        id,
        agent_name,
        ROW_NUMBER() OVER (PARTITION BY agent_name ORDER BY created_at ASC) as rn
    FROM customer_setup_tasks 
    WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
)
DELETE FROM customer_setup_tasks 
WHERE id IN (
    SELECT id 
    FROM ranked_tasks 
    WHERE rn > 1
);

-- Step 4: Verify cleanup - should show only 3 tasks (one per agent)
SELECT 
    'AFTER CLEANUP' as step,
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

-- Step 5: Final count verification
SELECT 
    'FINAL COUNT' as step,
    COUNT(*) as total_tasks,
    COUNT(DISTINCT agent_name) as unique_agents
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
After running this cleanup script:

1. CURRENT DUPLICATES: Should show 2 entries for each agent (falcon, sage, sentinel)
2. ALL CURRENT TASKS: Shows all duplicate entries with timestamps
3. DELETE operation: Removes the newer duplicate entries
4. AFTER CLEANUP: Shows exactly 3 tasks (one per agent)
5. FINAL COUNT: total_tasks = 3, unique_agents = 3

This will ensure the owner dashboard shows exactly one pending setup form per agent.
*/
