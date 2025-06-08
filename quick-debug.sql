-- Quick debug to find the user ID mismatch

-- 1. Find the user
SELECT 'USER' as type, id, email FROM users WHERE email = 'shajith4434@gmail.com';

-- 2. Find owner notification
SELECT 'NOTIFICATION' as type, user_id, data->>'userEmail' as email 
FROM owner_notifications 
WHERE data->>'userEmail' = 'shajith4434@gmail.com';

-- 3. Find setup tasks
SELECT 'TASKS' as type, user_id, agent_name, status 
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- 4. Find tasks with notification user_id
SELECT 'TASKS_BY_NOTIF_USER' as type, user_id, agent_name, status 
FROM customer_setup_tasks 
WHERE user_id = (
    SELECT user_id 
    FROM owner_notifications 
    WHERE data->>'userEmail' = 'shajith4434@gmail.com' 
    LIMIT 1
);
