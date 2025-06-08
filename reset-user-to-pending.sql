-- =====================================================
-- SHARPFLOW USER RESET TO PENDING STATUS
-- Reset user shajith4434@gmail.com to clean pending state
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Step 1: Get user information for verification
SELECT 
    'BEFORE RESET - User Information' as step,
    id,
    email,
    subscription_status,
    subscription_plan,
    created_at
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 2: Show current agent configurations (should be removed)
SELECT 
    'BEFORE RESET - Agent Configurations' as step,
    agent_name,
    is_enabled,
    created_at
FROM user_agent_configs 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 3: Show current setup tasks status (should be reset to pending)
SELECT 
    'BEFORE RESET - Setup Tasks' as step,
    agent_name,
    status,
    api_keys_configured,
    completed_by,
    completed_at,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY created_at;

-- Step 4: Show current owner notifications (should be reset to pending_setup)
SELECT 
    'BEFORE RESET - Owner Notifications' as step,
    id,
    notification_type,
    status,
    created_at
FROM owner_notifications 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- =====================================================
-- RESET OPERATIONS START HERE
-- =====================================================

-- Step 5: Remove ALL agent configurations for this user
DELETE FROM user_agent_configs 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 6: Reset ALL setup tasks to pending status
UPDATE customer_setup_tasks 
SET 
    status = 'pending',
    api_keys_configured = '{}',
    completed_by = NULL,
    completed_at = NULL,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 7: Reset owner notification to pending_setup status
UPDATE owner_notifications 
SET 
    status = 'pending_setup',
    completed_at = NULL,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 8: Ensure user subscription is set to inactive (simulating new subscription)
UPDATE users 
SET 
    subscription_status = 'inactive',
    updated_at = NOW()
WHERE email = 'shajith4434@gmail.com';

-- =====================================================
-- VERIFICATION - CONFIRM RESET WAS SUCCESSFUL
-- =====================================================

-- Step 9: Verify user information after reset
SELECT 
    'AFTER RESET - User Information' as step,
    id,
    email,
    subscription_status,
    subscription_plan,
    updated_at
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 10: Verify agent configurations are removed
SELECT 
    'AFTER RESET - Agent Configurations (should be empty)' as step,
    COUNT(*) as config_count
FROM user_agent_configs 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 11: Verify setup tasks are reset to pending
SELECT 
    'AFTER RESET - Setup Tasks Status' as step,
    agent_name,
    status,
    api_keys_configured,
    completed_by,
    completed_at,
    updated_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY agent_name;

-- Step 12: Verify owner notification is reset
SELECT 
    'AFTER RESET - Owner Notification Status' as step,
    id,
    notification_type,
    status,
    completed_at,
    updated_at
FROM owner_notifications 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 13: Count setup tasks by status (should all be pending)
SELECT 
    'AFTER RESET - Setup Tasks Summary' as step,
    status,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- =====================================================
-- EXPECTED RESULTS AFTER RESET
-- =====================================================

/*
EXPECTED RESULTS:

1. Agent Configurations: 0 records (all deleted)
2. Setup Tasks: 3 records, all with status = 'pending'
3. Owner Notification: 1 record with status = 'pending_setup'
4. User Subscription: status = 'inactive'

This should result in the owner dashboard showing:
- Individual API key input forms for each agent
- All agents showing "pending" status
- No "All API Keys Configured!" completion message
- Manual configuration workflow ready for testing

NEXT STEPS:
1. Run this SQL script in Supabase SQL Editor
2. Refresh the owner dashboard in browser
3. Navigate to Pending Setups → shajith4434@gmail.com
4. Should see 3 individual agent setup forms
5. Manually enter API keys for each agent
6. Verify status changes from pending to completed
*/
