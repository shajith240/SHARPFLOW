// Manual Test Script for Multi-Tenant Activation Workflow
// Run this to create a test user and verify the workflow

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

async function createTestUser() {
  console.log('🧪 Creating Test User for Activation Workflow\n');

  try {
    // Create a test user with pending activation
    const testUser = {
      id: `test-user-${Date.now()}`,
      email: `testuser${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      subscription_status: 'active',
      subscription_plan: 'ultra_premium',
      activation_status: 'pending', // This is the key - user starts as pending
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    console.log(`✅ Test user created successfully!`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`📋 Plan: ${user.subscription_plan}`);
    console.log(`🔄 Activation Status: ${user.activation_status}`);
    console.log(`💳 Subscription Status: ${user.subscription_status}\n`);

    // Create owner notification
    const notificationId = `notif-${Date.now()}`;
    const notification = {
      id: notificationId,
      notification_type: 'new_subscription',
      user_id: user.id,
      data: {
        userEmail: user.email,
        userName: `${user.first_name} ${user.last_name}`,
        subscriptionPlan: user.subscription_plan,
        subscriptionId: `sub-${Date.now()}`,
        paypalCustomerId: `paypal-${Date.now()}`,
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
        status: 'pending_setup',
        createdAt: new Date()
      },
      status: 'pending_setup',
      created_at: new Date().toISOString()
    };

    const { error: notifError } = await supabase
      .from('owner_notifications')
      .insert(notification);

    if (notifError) {
      throw notifError;
    }

    console.log(`✅ Owner notification created: ${notificationId}\n`);

    // Test the activation status function
    console.log('🔍 Testing activation status function...');
    const { data: statusResult, error: statusError } = await supabase
      .rpc('get_user_activation_status', { target_user_id: user.id });

    if (statusError) {
      throw statusError;
    }

    console.log('📊 Activation Status Result:');
    console.log(`   ⏳ Is Pending Activation: ${statusResult.is_pending_activation}`);
    console.log(`   ✅ Has Active Subscription: ${statusResult.has_active_subscription}`);
    console.log(`   👤 User Plan: ${statusResult.user.subscription_plan}`);
    console.log(`   🤖 Agent Configs: ${statusResult.agent_configs?.length || 0}\n`);

    console.log('🎯 Next Steps:');
    console.log('1. Sign in as owner (shajith240@gmail.com) with encryption key: j538znf5u8');
    console.log('2. Go to Owner Dashboard → Pending Setups');
    console.log('3. Configure API keys for this user');
    console.log('4. Activate the user account');
    console.log(`5. Test login with: ${user.email}\n`);

    console.log('🧹 To clean up this test user later, run:');
    console.log(`DELETE FROM users WHERE id = '${user.id}';`);
    console.log(`DELETE FROM owner_notifications WHERE id = '${notificationId}';\n`);

    return user;

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

// Run the test
createTestUser()
  .then(() => {
    console.log('🎉 Test user creation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
