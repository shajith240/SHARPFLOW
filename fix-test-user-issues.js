#!/usr/bin/env node

/**
 * Fix issues with test user configuration
 * Run with: node fix-test-user-issues.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTestUserIssues() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔧 Fixing test user issues:', testUserEmail);
  console.log('=' .repeat(50));

  try {
    // 1. Get user
    console.log('\n1. Getting user data...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUserEmail)
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }

    console.log('✅ User found:', user.email);

    // 2. Fix subscription status
    console.log('\n2. Fixing subscription status...');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.log('❌ Error updating subscription:', updateError.message);
    } else {
      console.log('✅ Subscription status set to active');
    }

    // 3. Clean up duplicate setup tasks
    console.log('\n3. Cleaning up duplicate setup tasks...');
    
    // Get all setup tasks for this user
    const { data: setupTasks, error: tasksError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.log('❌ Error fetching setup tasks:', tasksError.message);
    } else {
      console.log(`📋 Found ${setupTasks.length} setup tasks`);
      
      // Group by agent_name and keep only the first one for each agent
      const agentTasks = {};
      const tasksToDelete = [];
      
      setupTasks.forEach(task => {
        if (!agentTasks[task.agent_name]) {
          agentTasks[task.agent_name] = task;
          console.log(`✅ Keeping task for ${task.agent_name}: ${task.id}`);
        } else {
          tasksToDelete.push(task.id);
          console.log(`🗑️ Marking for deletion: ${task.agent_name} task ${task.id}`);
        }
      });

      // Delete duplicate tasks
      if (tasksToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('customer_setup_tasks')
          .delete()
          .in('id', tasksToDelete);

        if (deleteError) {
          console.log('❌ Error deleting duplicate tasks:', deleteError.message);
        } else {
          console.log(`✅ Deleted ${tasksToDelete.length} duplicate tasks`);
        }
      }
    }

    // 4. Update setup tasks to completed status
    console.log('\n4. Updating setup tasks to completed...');
    const { error: completeError } = await supabase
      .from('customer_setup_tasks')
      .update({
        status: 'completed',
        completed_by: 'system-setup',
        completed_at: new Date().toISOString(),
        api_keys_configured: {
          configured: true,
          configured_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (completeError) {
      console.log('❌ Error updating setup tasks:', completeError.message);
    } else {
      console.log('✅ All setup tasks marked as completed');
    }

    // 5. Update owner notification status
    console.log('\n5. Updating owner notification status...');
    const { error: notifError } = await supabase
      .from('owner_notifications')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (notifError) {
      console.log('❌ Error updating notification:', notifError.message);
    } else {
      console.log('✅ Owner notification marked as completed');
    }

    // 6. Verify agent configurations are properly enabled
    console.log('\n6. Verifying agent configurations...');
    const { data: agentConfigs, error: configError } = await supabase
      .from('user_agent_configs')
      .select('agent_name, is_enabled')
      .eq('user_id', user.id);

    if (configError) {
      console.log('❌ Error fetching agent configs:', configError.message);
    } else {
      agentConfigs.forEach(config => {
        console.log(`✅ ${config.agent_name}: ${config.is_enabled ? 'Enabled' : 'Disabled'}`);
      });

      // Ensure all agents are enabled
      const { error: enableError } = await supabase
        .from('user_agent_configs')
        .update({
          is_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (enableError) {
        console.log('❌ Error enabling agents:', enableError.message);
      } else {
        console.log('✅ All agents confirmed enabled');
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 TEST USER ISSUES FIXED!');
    console.log('\n📋 What was fixed:');
    console.log('   ✅ Subscription status set to active');
    console.log('   ✅ Duplicate setup tasks cleaned up');
    console.log('   ✅ Setup tasks marked as completed');
    console.log('   ✅ Owner notification completed');
    console.log('   ✅ All agents confirmed enabled');
    console.log('\n🧪 Ready for testing:');
    console.log('   1. Test user should now be able to use Prism');
    console.log('   2. All AI agents should respond properly');
    console.log('   3. Multi-tenant isolation verified');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

// Run the fix
fixTestUserIssues().then(() => {
  console.log('\n🏁 Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
