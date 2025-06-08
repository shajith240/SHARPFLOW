-- =====================================================
-- FIX TABLE STRUCTURE AND CREATE SETUP TASKS
-- First fix the auto-increment, then create the missing tasks
-- =====================================================

-- Step 1: Check current table structure
SELECT 
    'TABLE STRUCTURE CHECK' as step,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customer_setup_tasks' 
AND column_name = 'id';

-- Step 2: Check if sequence exists for the id column
SELECT 
    'SEQUENCE CHECK' as step,
    sequence_name,
    data_type,
    start_value,
    increment
FROM information_schema.sequences 
WHERE sequence_name LIKE '%customer_setup_tasks%';

-- Step 3: Check current max ID to determine next safe ID
SELECT 
    'CURRENT MAX ID' as step,
    COALESCE(MAX(id), 0) as max_id,
    COALESCE(MAX(id), 0) + 1 as next_safe_id
FROM customer_setup_tasks;

-- Step 4: Create sequence if it doesn't exist (this might fail if it already exists, that's OK)
DO $$
BEGIN
    -- Try to create sequence, ignore error if it already exists
    BEGIN
        CREATE SEQUENCE customer_setup_tasks_id_seq;
        RAISE NOTICE 'Created new sequence customer_setup_tasks_id_seq';
    EXCEPTION WHEN duplicate_table THEN
        RAISE NOTICE 'Sequence customer_setup_tasks_id_seq already exists';
    END;
END $$;

-- Step 5: Set the sequence to start from a safe value
SELECT setval('customer_setup_tasks_id_seq', COALESCE((SELECT MAX(id) FROM customer_setup_tasks), 0) + 1, false);

-- Step 6: Alter table to use the sequence as default (might fail if already set, that's OK)
DO $$
BEGIN
    BEGIN
        ALTER TABLE customer_setup_tasks ALTER COLUMN id SET DEFAULT nextval('customer_setup_tasks_id_seq');
        RAISE NOTICE 'Set default value for id column';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Default value already set or other issue: %', SQLERRM;
    END;
END $$;

-- Step 7: Check user exists
SELECT 
    'USER CHECK' as step,
    id,
    email
FROM users 
WHERE email = 'shajith4434@gmail.com';

-- Step 8: Check current setup tasks (should be empty)
SELECT 
    'CURRENT SETUP TASKS' as step,
    COUNT(*) as task_count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com');

-- Step 9: Get next ID manually and create tasks with explicit IDs
WITH next_id AS (
    SELECT COALESCE(MAX(id), 0) + 1 as start_id
    FROM customer_setup_tasks
),
user_info AS (
    SELECT id as user_id 
    FROM users 
    WHERE email = 'shajith4434@gmail.com'
)
INSERT INTO customer_setup_tasks (
    id,
    user_id,
    agent_name,
    status,
    api_keys_required,
    api_keys_configured,
    created_at,
    updated_at
)
SELECT 
    start_id + (row_number() OVER () - 1),
    user_id,
    agent_name,
    'pending',
    api_keys_required,
    '{}'::jsonb,
    NOW(),
    NOW()
FROM next_id, user_info,
(VALUES 
    ('falcon', ARRAY['openai_api_key', 'apollo_api_key', 'apify_api_key']),
    ('sage', ARRAY['openai_api_key', 'apify_api_key', 'perplexity_api_key']),
    ('sentinel', ARRAY['openai_api_key', 'gmail_client_id', 'gmail_client_secret', 'gmail_refresh_token'])
) AS agents(agent_name, api_keys_required);

-- Step 10: Verify all setup tasks were created
SELECT 
    'SETUP TASKS CREATED' as step,
    id,
    agent_name,
    status,
    api_keys_configured,
    array_length(api_keys_required, 1) as required_keys_count,
    created_at
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
ORDER BY agent_name;

-- Step 11: Count by status
SELECT 
    'TASKS BY STATUS' as step,
    status,
    COUNT(*) as count
FROM customer_setup_tasks 
WHERE user_id = (SELECT id FROM users WHERE email = 'shajith4434@gmail.com')
GROUP BY status;

-- Step 12: Update sequence to current max value
SELECT setval('customer_setup_tasks_id_seq', (SELECT MAX(id) FROM customer_setup_tasks), true);

-- Step 13: Verify sequence is working
SELECT 
    'SEQUENCE STATUS' as step,
    sequence_name,
    last_value,
    is_called
FROM customer_setup_tasks_id_seq;

-- =====================================================
-- EXPECTED RESULTS
-- =====================================================

/*
This script will:

1. Check and fix the table structure
2. Create or update the sequence for auto-increment
3. Create the 3 missing setup tasks with explicit IDs
4. Verify everything was created correctly
5. Set up the sequence for future inserts

After running this script:
- The table will have proper auto-increment
- 3 setup tasks will be created for shajith4434@gmail.com
- All tasks will have status 'pending'
- The owner dashboard will show individual forms instead of completion message
*/
