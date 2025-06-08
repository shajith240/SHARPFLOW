#!/usr/bin/env node

/**
 * Reset test user to pending status for owner dashboard testing
 * Run with: node reset-user-to-pending.js
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

async function resetUserToPending() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔄 Resetting test user to pending status:', testUserEmail);
  console.log('=' .repeat(60));

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

    // 2. Delete existing agent configurations
    console.log('\n1. Removing existing agent configurations...');
    const { error: deleteConfigError } = await supabase
      .from('user_agent_configs')
      .delete()
      .eq('user_id', user.id);

    if (deleteConfigError) {
      console.log('❌ Error deleting agent configs:', deleteConfigError.message);
    } else {
      console.log('✅ Agent configurations removed');
    }

    // 3. Delete existing setup tasks
    console.log('\n2. Removing existing setup tasks...');
    const { error: deleteTasksError } = await supabase
      .from('customer_setup_tasks')
      .delete()
      .eq('user_id', user.id);

    if (deleteTasksError) {
      console.log('❌ Error deleting setup tasks:', deleteTasksError.message);
    } else {
      console.log('✅ Setup tasks removed');
    }

    // 4. Delete existing owner notifications
    console.log('\n3. Removing existing owner notifications...');
    const { error: deleteNotifError } = await supabase
      .from('owner_notifications')
      .delete()
      .eq('user_id', user.id);

    if (deleteNotifError) {
      console.log('❌ Error deleting notifications:', deleteNotifError.message);
    } else {
      console.log('✅ Owner notifications removed');
    }

    // 5. Reset subscription status to inactive (simulating new subscription)
    console.log('\n4. Resetting subscription status...');
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        subscription_status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateUserError) {
      console.log('❌ Error updating user:', updateUserError.message);
    } else {
      console.log('✅ Subscription status reset to inactive');
    }

    // 6. Create fresh owner notification for new subscription
    console.log('\n5. Creating fresh owner notification...');
    const notificationId = `owner-notif-${Date.now()}`;
    const { error: createNotifError } = await supabase
      .from('owner_notifications')
      .insert({
        id: notificationId,
        notification_type: 'new_subscription',
        user_id: user.id,
        data: {
          userEmail: user.email,
          userName: user.first_name || 'Test User',
          subscriptionPlan: user.subscription_plan,
          subscriptionId: `sub-${Date.now()}`,
          paypalCustomerId: user.paypal_customer_id || `paypal-${Date.now()}`,
          requiredAgents: ['falcon', 'sage', 'sentinel'],
          requiredApiKeys: [
            'OpenAI API Key',
            'Apollo.io API Key',
            'Apify API Key',
            'Perplexity API Key',
            'Gmail Client ID',
            'Gmail Client Secret',
            'Gmail Refresh Token'
          ],
          customerInfo: {
            companyName: 'Test Company',
            industry: 'Technology',
            targetMarket: 'B2B SaaS',
            businessSize: 'startup'
          }
        },
        status: 'pending_setup',
        priority: 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (createNotifError) {
      console.log('❌ Error creating notification:', createNotifError.message);
    } else {
      console.log('✅ Fresh owner notification created');
    }

    // 7. Create fresh setup tasks for each agent
    console.log('\n6. Creating fresh setup tasks...');
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
          notification_id: notificationId,
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
        console.log(`✅ Setup task created for ${agent} (${requiredApiKeys.length} API keys required)`);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 USER RESET TO PENDING STATUS COMPLETE!');
    console.log('\n📋 What was reset:');
    console.log('   ✅ Removed all existing agent configurations');
    console.log('   ✅ Removed all existing setup tasks');
    console.log('   ✅ Removed all existing owner notifications');
    console.log('   ✅ Reset subscription status to inactive');
    console.log('   ✅ Created fresh owner notification (pending_setup)');
    console.log('   ✅ Created fresh setup tasks for all 3 agents');
    
    console.log('\n🧪 Ready for owner dashboard testing:');
    console.log('   1. Sign in as owner: shajith240@gmail.com');
    console.log('   2. Use secret key: j538znf5u8k2m9x7q4w1e6r3t8y5u2i0');
    console.log('   3. Navigate to owner dashboard');
    console.log('   4. Should see pending setup for: shajith4434@gmail.com');
    console.log('   5. Configure API keys manually through the interface');
    console.log('   6. Mark tasks as completed');
    console.log('   7. Test AI agent functionality');

    console.log('\n📊 Current Status:');
    console.log(`   User: ${user.email}`);
    console.log(`   Subscription: ${user.subscription_plan} (inactive)`);
    console.log(`   Owner Notification: pending_setup`);
    console.log(`   Setup Tasks: 3 pending (falcon, sage, sentinel)`);
    console.log(`   Agent Configs: 0 (ready for manual configuration)`);

  } catch (error) {
    console.error('❌ Error during reset:', error.message);
  }
}

// Run the reset
resetUserToPending().then(() => {
  console.log('\n🏁 Reset complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
