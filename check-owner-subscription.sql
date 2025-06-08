-- Owner Subscription Status Check and Fix
-- Run these queries in your Supabase SQL Editor

-- 1. Check if owner user exists and current subscription status
SELECT 
    id,
    email,
    first_name,
    last_name,
    subscription_status,
    subscription_plan,
    subscription_period_end,
    is_pending_activation,
    created_at,
    updated_at
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- 2. If user doesn't exist, create the owner user
-- (Only run this if the above query returns no results)
INSERT INTO users (
    id,
    email,
    first_name,
    last_name,
    subscription_status,
    subscription_plan,
    subscription_period_end,
    is_pending_activation,
    created_at,
    updated_at
) VALUES (
    'owner_' || extract(epoch from now())::text,
    'shajith4434@gmail.com',
    'Shajith',
    'Owner',
    'active',
    'ultra',
    (now() + interval '1 year')::timestamp,
    false,
    now(),
    now()
) 
ON CONFLICT (email) DO NOTHING;

-- 3. Update existing user to have active subscription
-- (Run this if user exists but has subscription issues)
UPDATE users 
SET 
    subscription_status = 'active',
    subscription_plan = 'ultra',
    subscription_period_end = (now() + interval '1 year')::timestamp,
    is_pending_activation = false,
    updated_at = now()
WHERE email = 'shajith4434@gmail.com';

-- 4. Verify the fix
SELECT 
    id,
    email,
    subscription_status,
    subscription_plan,
    subscription_period_end,
    is_pending_activation,
    CASE 
        WHEN subscription_status = 'active' THEN '✅ Active'
        ELSE '❌ Inactive'
    END as status_check,
    CASE 
        WHEN subscription_period_end > now() THEN '✅ Valid'
        ELSE '❌ Expired'
    END as period_check,
    CASE 
        WHEN is_pending_activation = false THEN '✅ Activated'
        ELSE '❌ Pending'
    END as activation_check
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- 5. Check for any related records that might need updating
SELECT 
    'owner_notifications' as table_name,
    count(*) as record_count
FROM owner_notifications 
WHERE user_id IN (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')

UNION ALL

SELECT 
    'customer_setup_tasks' as table_name,
    count(*) as record_count
FROM customer_setup_tasks 
WHERE customer_user_id IN (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')

UNION ALL

SELECT 
    'user_agent_configs' as table_name,
    count(*) as record_count
FROM user_agent_configs 
WHERE user_id IN (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- 6. Create owner notification if needed
INSERT INTO owner_notifications (
    id,
    user_id,
    notification_type,
    status,
    data,
    created_at,
    updated_at
)
SELECT 
    'owner_access_' || extract(epoch from now())::text,
    u.id,
    'owner_access_granted',
    'completed',
    jsonb_build_object(
        'message', 'Owner account configured for full access',
        'subscription_plan', 'ultra',
        'access_level', 'full'
    ),
    now(),
    now()
FROM users u 
WHERE u.email = 'shajith4434@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM owner_notifications 
    WHERE user_id = u.id 
    AND notification_type = 'owner_access_granted'
);

-- 7. Final verification query
SELECT 
    '🎉 OWNER ACCOUNT STATUS' as status,
    u.email,
    u.subscription_status,
    u.subscription_plan,
    u.subscription_period_end,
    CASE 
        WHEN u.subscription_status = 'active' 
        AND u.subscription_period_end > now() 
        AND u.is_pending_activation = false 
        THEN '✅ READY FOR DASHBOARD ACCESS'
        ELSE '❌ NEEDS ATTENTION'
    END as dashboard_access_status
FROM users u 
WHERE u.email = 'shajith4434@gmail.com';
