-- Owner Dashboard Access Fix
-- Run these queries in your Supabase SQL Editor to diagnose and fix owner access issues

-- 1. DIAGNOSTIC: Check current owner user status
SELECT 
    '=== CURRENT OWNER STATUS ===' as section,
    id,
    email,
    first_name,
    last_name,
    subscription_status,
    subscription_plan,
    subscription_period_end,
    CASE 
        WHEN subscription_status = 'active' THEN '✅ Active'
        ELSE '❌ ' || COALESCE(subscription_status, 'NULL')
    END as status_check,
    CASE 
        WHEN subscription_period_end > NOW() THEN '✅ Valid'
        WHEN subscription_period_end IS NULL THEN '❌ No End Date'
        ELSE '❌ Expired'
    END as period_check,
    created_at,
    updated_at
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- 2. DIAGNOSTIC: Check if pending activation column exists and its value
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_pending_activation'
    ) THEN
        RAISE NOTICE 'is_pending_activation column exists';
        
        -- Check the value
        PERFORM 1 FROM users 
        WHERE email = 'shajith4434@gmail.com' 
        AND is_pending_activation = true;
        
        IF FOUND THEN
            RAISE NOTICE '❌ User is marked as pending activation';
        ELSE
            RAISE NOTICE '✅ User is not pending activation';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ is_pending_activation column does not exist (this is OK)';
    END IF;
END $$;

-- 3. FIX: Update owner subscription to active ultra plan
UPDATE users 
SET 
    subscription_status = 'active',
    subscription_plan = 'ultra',
    subscription_period_end = (NOW() + INTERVAL '1 year'),
    updated_at = NOW()
WHERE email = 'shajith4434@gmail.com';

-- 4. FIX: Remove pending activation if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_pending_activation'
    ) THEN
        UPDATE users 
        SET is_pending_activation = false,
            updated_at = NOW()
        WHERE email = 'shajith4434@gmail.com';
        
        RAISE NOTICE '✅ Removed pending activation status';
    END IF;
END $$;

-- 5. VERIFICATION: Check subscription validation logic
SELECT 
    '=== SUBSCRIPTION VALIDATION ===' as section,
    email,
    subscription_status,
    subscription_plan,
    subscription_period_end,
    CASE 
        WHEN subscription_status = 'active' 
        AND subscription_plan IN ('starter', 'professional', 'ultra')
        AND subscription_period_end > NOW()
        THEN '✅ SHOULD HAVE DASHBOARD ACCESS'
        ELSE '❌ DASHBOARD ACCESS BLOCKED'
    END as dashboard_access_status,
    CASE 
        WHEN email = 'shajith4434@gmail.com'
        AND subscription_status = 'active'
        THEN '✅ SHOULD HAVE OWNER DASHBOARD ACCESS'
        ELSE '❌ OWNER DASHBOARD ACCESS BLOCKED'
    END as owner_dashboard_status
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- 6. SETUP: Ensure owner notifications table access
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
    'owner_access_' || EXTRACT(EPOCH FROM NOW())::text,
    u.id,
    'owner_access_configured',
    'completed',
    jsonb_build_object(
        'message', 'Owner dashboard access configured',
        'configured_at', NOW(),
        'access_level', 'full_owner',
        'dashboard_access', true,
        'owner_dashboard_access', true
    ),
    NOW(),
    NOW()
FROM users u 
WHERE u.email = 'shajith4434@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW(),
    data = EXCLUDED.data;

-- 7. SETUP: Create user agent configs for owner (if table exists)
DO $$
DECLARE
    owner_user_id TEXT;
    agent_name TEXT;
BEGIN
    -- Get owner user ID
    SELECT id INTO owner_user_id 
    FROM users 
    WHERE email = 'shajith4434@gmail.com';
    
    IF owner_user_id IS NOT NULL THEN
        -- Check if user_agent_configs table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'user_agent_configs'
        ) THEN
            -- Configure each agent
            FOR agent_name IN SELECT unnest(ARRAY['falcon', 'sage', 'sentinel'])
            LOOP
                INSERT INTO user_agent_configs (
                    id,
                    user_id,
                    agent_name,
                    is_enabled,
                    api_keys,
                    configuration,
                    created_at,
                    updated_at
                ) VALUES (
                    owner_user_id || '_' || agent_name,
                    owner_user_id,
                    agent_name,
                    true,
                    jsonb_build_object('configured', true),
                    jsonb_build_object('development_mode', true, 'owner_access', true),
                    NOW(),
                    NOW()
                )
                ON CONFLICT (user_id, agent_name) 
                DO UPDATE SET
                    is_enabled = true,
                    updated_at = NOW();
                    
                RAISE NOTICE '✅ Configured % agent for owner', agent_name;
            END LOOP;
        ELSE
            RAISE NOTICE 'ℹ️ user_agent_configs table not found (skipping agent setup)';
        END IF;
    END IF;
END $$;

-- 8. FINAL VERIFICATION: Complete status check
SELECT 
    '=== FINAL STATUS CHECK ===' as section,
    u.email,
    u.subscription_status,
    u.subscription_plan,
    u.subscription_period_end,
    CASE 
        WHEN u.subscription_status = 'active' 
        AND u.subscription_plan = 'ultra'
        AND u.subscription_period_end > NOW()
        THEN '🎉 READY FOR FULL ACCESS'
        ELSE '❌ STILL HAS ISSUES'
    END as final_status,
    COUNT(on.id) as owner_notifications_count,
    COUNT(uac.id) as agent_configs_count
FROM users u
LEFT JOIN owner_notifications on ON on.user_id = u.id
LEFT JOIN user_agent_configs uac ON uac.user_id = u.id
WHERE u.email = 'shajith4434@gmail.com'
GROUP BY u.id, u.email, u.subscription_status, u.subscription_plan, u.subscription_period_end;

-- 9. TROUBLESHOOTING: Show what might be causing redirects
SELECT 
    '=== TROUBLESHOOTING INFO ===' as section,
    'Check these potential redirect causes:' as info,
    CASE 
        WHEN subscription_status != 'active' THEN 'subscription_status is not active'
        WHEN subscription_plan NOT IN ('starter', 'professional', 'ultra') THEN 'invalid subscription_plan'
        WHEN subscription_period_end <= NOW() THEN 'subscription expired'
        WHEN subscription_period_end IS NULL THEN 'no subscription_period_end set'
        ELSE 'subscription looks good'
    END as potential_issue
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Success message
SELECT '🎉 OWNER ACCESS FIX COMPLETE! 🎉' as message,
       'Try logging in again and accessing both /dashboard and /owner/dashboard' as next_steps;
