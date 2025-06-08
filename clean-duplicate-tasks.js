#!/usr/bin/env node

/**
 * Clean up duplicate setup tasks and keep only one set
 * Run with: node clean-duplicate-tasks.js
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

async function cleanDuplicateTasks() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🧹 Cleaning duplicate setup tasks for:', testUserEmail);
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

    // 2. Get all setup tasks
    const { data: allTasks, error: tasksError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.log('❌ Error fetching tasks:', tasksError.message);
      return;
    }

    console.log('\n📋 Found tasks:');
    allTasks?.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.agent_name}: ${task.status} (${task.created_at}) - ID: ${task.id}`);
    });

    // 3. Delete ALL existing tasks
    console.log('\n🗑️ Deleting all existing tasks...');
    const { error: deleteError } = await supabase
      .from('customer_setup_tasks')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.log('❌ Error deleting tasks:', deleteError.message);
      return;
    }

    console.log('✅ All existing tasks deleted');

    // 4. Get the notification ID
    const { data: notification, error: notifError } = await supabase
      .from('owner_notifications')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (notifError) {
      console.log('❌ Error getting notification:', notifError.message);
      return;
    }

    // 5. Create fresh set of 3 tasks (one per agent)
    console.log('\n✨ Creating fresh set of setup tasks...');
    const agents = ['falcon', 'sage', 'sentinel'];
    
    for (const agent of agents) {
      const taskId = `task-${agent}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      let requiredApiKeys = [];
      switch (agent) {
        case 'falcon':
          requiredApiKeys = ['OpenAI API Key', 'Apollo.io API Key', 'Apify API Key'];
          break;
        case 'sage':
          requiredApiKeys = ['OpenAI API Key', 'Apify API Key', 'Perplexity API Key'];
          break;
        case 'sentinel':
          requiredApiKeys = ['OpenAI API Key', 'Gmail Client ID', 'Gmail Client Secret', 'Gmail Refresh Token'];
          break;
      }

      const { error: createTaskError } = await supabase
        .from('customer_setup_tasks')
        .insert({
          id: taskId,
          notification_id: notification.id,
          user_id: user.id,
          agent_name: agent,
          task_type: 'api_key_setup',
          status: 'pending',
          api_keys_required: requiredApiKeys,
          api_keys_configured: {},
          notes: null,
          completed_by: null,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createTaskError) {
        console.log(`❌ Error creating task for ${agent}:`, createTaskError.message);
      } else {
        console.log(`✅ Created fresh task for ${agent} (${requiredApiKeys.length} API keys required)`);
      }
    }

    // 6. Verify the final state
    console.log('\n🔍 Verifying final state...');
    const { data: finalTasks, error: verifyError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (verifyError) {
      console.log('❌ Error verifying tasks:', verifyError.message);
    } else {
      console.log('📋 Final setup tasks:');
      finalTasks?.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.agent_name}: ${task.status} (${task.api_keys_required.length} keys required)`);
      });
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 DUPLICATE TASKS CLEANED!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Removed all duplicate tasks');
    console.log('   ✅ Created fresh set of 3 tasks (falcon, sage, sentinel)');
    console.log('   ✅ All tasks set to pending status');
    console.log('   ✅ No API keys configured');
    
    console.log('\n🧪 Ready for manual testing:');
    console.log('   1. Refresh the owner dashboard');
    console.log('   2. Should see exactly 3 pending tasks');
    console.log('   3. Each agent should show individual API key forms');
    console.log('   4. No "All API Keys Configured!" message');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

// Run the cleanup
cleanDuplicateTasks().then(() => {
  console.log('\n🏁 Cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
