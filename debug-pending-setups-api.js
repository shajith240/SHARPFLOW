#!/usr/bin/env node

/**
 * Debug the pending setups API to see what data is being returned
 * Run with: node debug-pending-setups-api.js
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

async function debugPendingSetupsAPI() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔍 Debugging Pending Setups API Response');
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

    // 2. Get owner notifications (what the API uses)
    console.log('\n📢 Owner Notifications:');
    const { data: notifications, error: notifError } = await supabase
      .from('owner_notifications')
      .select('*')
      .eq('user_id', user.id);

    if (notifError) {
      console.log('❌ Error fetching notifications:', notifError.message);
    } else {
      notifications?.forEach(notif => {
        console.log(`   ID: ${notif.id}`);
        console.log(`   Status: ${notif.status}`);
        console.log(`   User: ${notif.data?.userEmail || 'N/A'}`);
        console.log(`   Created: ${notif.created_at}`);
        console.log('   ---');
      });
    }

    // 3. Get setup tasks directly
    console.log('\n📋 Setup Tasks (Direct Query):');
    const { data: tasks, error: tasksError } = await supabase
      .from('customer_setup_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.log('❌ Error fetching tasks:', tasksError.message);
    } else {
      tasks?.forEach((task, index) => {
        console.log(`   ${index + 1}. Agent: ${task.agent_name}`);
        console.log(`      Status: ${task.status}`);
        console.log(`      API Keys Configured: ${JSON.stringify(task.api_keys_configured)}`);
        console.log(`      Required Keys: ${task.api_keys_required?.join(', ')}`);
        console.log(`      Completed At: ${task.completed_at || 'null'}`);
        console.log(`      ID: ${task.id}`);
        console.log('      ---');
      });
    }

    // 4. Simulate the API logic (what the frontend receives)
    console.log('\n🔄 Simulating API Logic:');
    
    if (notifications && notifications.length > 0) {
      for (const notification of notifications) {
        console.log(`\n📦 Processing notification: ${notification.id}`);
        
        // Get tasks for this notification (like the API does)
        const { data: notificationTasks } = await supabase
          .from('customer_setup_tasks')
          .select('*')
          .eq('user_id', notification.user_id)
          .order('created_at', { ascending: true });

        console.log(`   Found ${notificationTasks?.length || 0} tasks`);
        
        if (notificationTasks) {
          const allCompleted = notificationTasks.every(task => task.status === 'completed');
          console.log(`   All tasks completed: ${allCompleted}`);
          
          notificationTasks.forEach(task => {
            console.log(`     - ${task.agent_name}: ${task.status}`);
          });

          // This is what gets sent to frontend
          const frontendData = {
            id: notification.id,
            userId: notification.user_id,
            userEmail: notification.data?.userEmail,
            userName: notification.data?.userName,
            status: notification.status,
            setupTasks: notificationTasks,
            // ... other fields
          };

          console.log('\n📤 Frontend would receive:');
          console.log(`   Setup Tasks Count: ${frontendData.setupTasks.length}`);
          console.log(`   Tasks Status Check: ${frontendData.setupTasks.every(task => task.status === 'completed')}`);
        }
      }
    }

    // 5. Check for any agent configurations
    console.log('\n🔧 Agent Configurations:');
    const { data: configs, error: configError } = await supabase
      .from('user_agent_configs')
      .select('*')
      .eq('user_id', user.id);

    if (configError) {
      console.log('❌ Error fetching configs:', configError.message);
    } else {
      console.log(`   Found ${configs?.length || 0} agent configurations`);
      configs?.forEach(config => {
        console.log(`     - ${config.agent_name}: enabled=${config.is_enabled}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 DIAGNOSIS:');
    
    if (tasks && tasks.length > 0) {
      const pendingTasks = tasks.filter(task => task.status === 'pending');
      const completedTasks = tasks.filter(task => task.status === 'completed');
      
      console.log(`   ✅ Total Tasks: ${tasks.length}`);
      console.log(`   ⏳ Pending Tasks: ${pendingTasks.length}`);
      console.log(`   ✅ Completed Tasks: ${completedTasks.length}`);
      
      if (completedTasks.length === 0) {
        console.log('   🎉 All tasks are pending - frontend should show input forms');
      } else {
        console.log('   ⚠️ Some tasks are completed - this might cause the completion message');
      }
    }

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  }
}

// Run the debug
debugPendingSetupsAPI().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
