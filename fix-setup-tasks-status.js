#!/usr/bin/env node

/**
 * Fix setup tasks status to ensure they show as pending for manual testing
 * Run with: node fix-setup-tasks-status.js
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

async function fixSetupTasksStatus() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔧 Fixing setup tasks status for:', testUserEmail);
  console.log('=' .repeat(50));

  try {
    // 1. Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUserEmail)
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }

    console.log('✅ User found:', user.email, 'ID:', user.id);

    // 2. Check current setup tasks
    const { data: currentTasks, error: tasksError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.log('❌ Error fetching tasks:', tasksError.message);
      return;
    }

    console.log('\n📋 Current setup tasks:');
    currentTasks?.forEach(task => {
      console.log(`   ${task.agent_name}: ${task.status} (ID: ${task.id})`);
    });

    // 3. Update all tasks to pending status
    console.log('\n🔄 Updating all tasks to pending status...');
    
    if (currentTasks && currentTasks.length > 0) {
      for (const task of currentTasks) {
        const { error: updateError } = await supabase
          .from('customer_setup_tasks')
          .update({
            status: 'pending',
            api_keys_configured: {},
            completed_by: null,
            completed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        if (updateError) {
          console.log(`❌ Error updating ${task.agent_name}:`, updateError.message);
        } else {
          console.log(`✅ Updated ${task.agent_name} to pending status`);
        }
      }
    }

    // 4. Also ensure user agent configs are removed
    console.log('\n🧹 Ensuring no agent configurations exist...');
    const { error: deleteConfigError } = await supabase
      .from('user_agent_configs')
      .delete()
      .eq('user_id', user.id);

    if (deleteConfigError) {
      console.log('❌ Error deleting agent configs:', deleteConfigError.message);
    } else {
      console.log('✅ Agent configurations cleared');
    }

    // 5. Update owner notification status
    console.log('\n📢 Updating owner notification status...');
    const { error: notifError } = await supabase
      .from('owner_notifications')
      .update({
        status: 'pending_setup',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (notifError) {
      console.log('❌ Error updating notification:', notifError.message);
    } else {
      console.log('✅ Owner notification set to pending_setup');
    }

    // 6. Verify the changes
    console.log('\n🔍 Verifying changes...');
    const { data: updatedTasks, error: verifyError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (verifyError) {
      console.log('❌ Error verifying tasks:', verifyError.message);
    } else {
      console.log('📋 Updated setup tasks:');
      updatedTasks?.forEach(task => {
        console.log(`   ${task.agent_name}: ${task.status} (API keys: ${Object.keys(task.api_keys_configured || {}).length})`);
      });
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 SETUP TASKS STATUS FIXED!');
    console.log('\n📊 Summary:');
    console.log('   ✅ All setup tasks reset to pending status');
    console.log('   ✅ API keys configurations cleared');
    console.log('   ✅ Agent configurations removed');
    console.log('   ✅ Owner notification set to pending_setup');
    
    console.log('\n🧪 Ready for manual testing:');
    console.log('   1. Sign in as owner: shajith240@gmail.com');
    console.log('   2. Navigate to Pending Setups');
    console.log('   3. Should see individual API key forms for each agent');
    console.log('   4. All agents should show "pending" status');
    console.log('   5. No "All API Keys Configured!" message should appear');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

// Run the fix
fixSetupTasksStatus().then(() => {
  console.log('\n🏁 Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
