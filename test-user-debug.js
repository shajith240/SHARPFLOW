#!/usr/bin/env node

/**
 * Debug script to check test user configuration
 * Run with: node test-user-debug.js
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

async function debugTestUser() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔍 Debugging test user:', testUserEmail);
  console.log('=' .repeat(50));

  try {
    // 1. Check if user exists
    console.log('\n1. Checking if user exists...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUserEmail)
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      console.log('\n💡 You need to create this user first by:');
      console.log('   1. Going to http://localhost:3000/sign-up');
      console.log('   2. Creating account with email: shajith4434@gmail.com');
      console.log('   3. Or using Google OAuth with this email');
      return;
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Subscription:', user.subscription_plan || 'None');
    console.log('   Status:', user.subscription_status);

    // 2. Check agent configurations
    console.log('\n2. Checking agent configurations...');
    const { data: agentConfigs, error: configError } = await supabase
      .from('user_agent_configs')
      .select('*')
      .eq('user_id', user.id);

    if (configError) {
      console.log('❌ Error fetching agent configs:', configError.message);
    } else if (!agentConfigs || agentConfigs.length === 0) {
      console.log('❌ No agent configurations found');
      console.log('💡 User needs to complete onboarding or have API keys configured by owner');
    } else {
      console.log('✅ Agent configurations found:');
      agentConfigs.forEach(config => {
        console.log(`   ${config.agent_name}:`);
        console.log(`     Enabled: ${config.is_enabled}`);
        console.log(`     API Keys: ${Object.keys(config.api_keys || {}).length} configured`);
        console.log(`     API Key Names: ${Object.keys(config.api_keys || {}).join(', ')}`);
      });
    }

    // 3. Check setup tasks
    console.log('\n3. Checking setup tasks...');
    const { data: setupTasks, error: tasksError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id);

    if (tasksError) {
      console.log('❌ Error fetching setup tasks:', tasksError.message);
    } else if (!setupTasks || setupTasks.length === 0) {
      console.log('ℹ️ No setup tasks found');
    } else {
      console.log('✅ Setup tasks found:');
      setupTasks.forEach(task => {
        console.log(`   ${task.agent_name}: ${task.status}`);
      });
    }

    // 4. Check owner notifications
    console.log('\n4. Checking owner notifications...');
    const { data: notifications, error: notifError } = await supabase
      .from('owner_notifications')
      .select('*')
      .eq('user_id', user.id);

    if (notifError) {
      console.log('❌ Error fetching notifications:', notifError.message);
    } else if (!notifications || notifications.length === 0) {
      console.log('ℹ️ No owner notifications found');
    } else {
      console.log('✅ Owner notifications found:');
      notifications.forEach(notif => {
        console.log(`   Status: ${notif.status}`);
        console.log(`   Plan: ${notif.subscription_plan}`);
        console.log(`   Created: ${notif.created_at}`);
      });
    }

    // 5. Summary and recommendations
    console.log('\n' + '=' .repeat(50));
    console.log('📋 SUMMARY & RECOMMENDATIONS:');
    
    if (!agentConfigs || agentConfigs.length === 0) {
      console.log('❌ User has no agent configurations');
      console.log('💡 Next steps:');
      console.log('   1. Sign in as owner (shajith240@gmail.com)');
      console.log('   2. Go to owner dashboard');
      console.log('   3. Create setup tasks for this user');
      console.log('   4. Configure API keys for required agents');
    } else {
      const enabledAgents = agentConfigs.filter(c => c.is_enabled);
      const agentsWithKeys = agentConfigs.filter(c => Object.keys(c.api_keys || {}).length > 0);
      
      console.log(`✅ User has ${agentConfigs.length} agent configurations`);
      console.log(`✅ ${enabledAgents.length} agents are enabled`);
      console.log(`✅ ${agentsWithKeys.length} agents have API keys`);
      
      if (agentsWithKeys.length === 0) {
        console.log('❌ No agents have API keys configured');
        console.log('💡 Configure API keys through owner dashboard');
      } else {
        console.log('✅ User should be able to use AI agents');
        console.log('💡 Test Prism functionality in user dashboard');
      }
    }

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  }
}

// Run the debug
debugTestUser().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
