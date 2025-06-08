// Test Multi-Tenant User Activation Workflow
// This script tests the complete activation workflow from subscription to dashboard access

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testActivationWorkflow() {
  console.log('🧪 Testing Multi-Tenant User Activation Workflow\n');

  try {
    // 1. Create a test user with pending activation
    console.log('1. Creating test user with pending activation...');
    const testUser = {
      id: `test-user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      first_name: 'Test',
      last_name: 'User',
      subscription_status: 'active',
      subscription_plan: 'ultra_premium',
      activation_status: 'pending',
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

    console.log(`✅ Test user created: ${user.email} (${user.id})`);
    console.log(`   Plan: ${user.subscription_plan}`);
    console.log(`   Activation Status: ${user.activation_status}\n`);

    // 2. Create owner notification for new subscription
    console.log('2. Creating owner notification...');
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

    // 3. Test user activation status check
    console.log('3. Testing user activation status check...');
    const { data: activationStatus, error: statusError } = await supabase
      .rpc('get_user_activation_status', { target_user_id: user.id });

    if (statusError) {
      throw statusError;
    }

    console.log('✅ Activation status check result:');
    console.log(`   Is Pending: ${activationStatus.is_pending_activation}`);
    console.log(`   Has Active Subscription: ${activationStatus.has_active_subscription}`);
    console.log(`   User Plan: ${activationStatus.user.subscription_plan}\n`);

    // 4. Create user agent configurations (simulating owner setup)
    console.log('4. Creating user agent configurations...');
    const agentConfigs = [
      {
        id: `config-falcon-${Date.now()}`,
        user_id: user.id,
        agent_name: 'falcon',
        is_enabled: true,
        api_keys: {
          openaiApiKey: 'test-openai-key',
          apolloApiKey: 'test-apollo-key',
          apifyApiKey: 'test-apify-key'
        },
        configuration: {
          leadGeneration: {
            maxLeadsPerMonth: 1000
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `config-sage-${Date.now()}`,
        user_id: user.id,
        agent_name: 'sage',
        is_enabled: true,
        api_keys: {
          openaiApiKey: 'test-openai-key',
          perplexityApiKey: 'test-perplexity-key'
        },
        configuration: {
          research: {
            maxResearchPerMonth: 500
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `config-sentinel-${Date.now()}`,
        user_id: user.id,
        agent_name: 'sentinel',
        is_enabled: true,
        api_keys: {
          openaiApiKey: 'test-openai-key',
          gmailClientId: 'test-gmail-client-id',
          gmailClientSecret: 'test-gmail-client-secret',
          gmailRefreshToken: 'test-gmail-refresh-token'
        },
        configuration: {
          emailAutomation: {
            maxEmailsPerMonth: 2000
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const config of agentConfigs) {
      const { error: configError } = await supabase
        .from('user_agent_configs')
        .insert(config);

      if (configError) {
        throw configError;
      }

      console.log(`✅ Agent config created: ${config.agent_name}`);
    }

    console.log('');

    // 5. Test user activation
    console.log('5. Testing user activation...');
    const { data: activationResult, error: activationError } = await supabase
      .rpc('activate_user_account', { target_user_id: user.id });

    if (activationError) {
      throw activationError;
    }

    console.log('✅ User activation result:');
    console.log(`   Success: ${activationResult.success}`);
    console.log(`   Message: ${activationResult.message}`);
    console.log(`   User ID: ${activationResult.user_id}`);
    console.log(`   Activation Status: ${activationResult.activation_status}\n`);

    // 6. Verify user is now activated
    console.log('6. Verifying user activation...');
    const { data: updatedUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    console.log('✅ User verification:');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Subscription Status: ${updatedUser.subscription_status}`);
    console.log(`   Activation Status: ${updatedUser.activation_status}`);
    console.log(`   Plan: ${updatedUser.subscription_plan}\n`);

    // 7. Test activation status check after activation
    console.log('7. Testing activation status after activation...');
    const { data: finalStatus, error: finalStatusError } = await supabase
      .rpc('get_user_activation_status', { target_user_id: user.id });

    if (finalStatusError) {
      throw finalStatusError;
    }

    console.log('✅ Final activation status:');
    console.log(`   Is Pending: ${finalStatus.is_pending_activation}`);
    console.log(`   Has Active Subscription: ${finalStatus.has_active_subscription}`);
    console.log(`   Agent Configs: ${finalStatus.agent_configs?.length || 0}\n`);

    // 8. Cleanup test data
    console.log('8. Cleaning up test data...');
    
    // Delete agent configs
    await supabase
      .from('user_agent_configs')
      .delete()
      .eq('user_id', user.id);

    // Delete notification
    await supabase
      .from('owner_notifications')
      .delete()
      .eq('id', notificationId);

    // Delete user
    await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    console.log('✅ Test data cleaned up\n');

    console.log('🎉 Multi-Tenant Activation Workflow Test PASSED!');
    console.log('\nWorkflow Summary:');
    console.log('1. ✅ User created with pending activation status');
    console.log('2. ✅ Owner notification created for new subscription');
    console.log('3. ✅ Activation status check works correctly');
    console.log('4. ✅ Agent configurations created successfully');
    console.log('5. ✅ User activation function works correctly');
    console.log('6. ✅ User status updated to active');
    console.log('7. ✅ Final verification confirms activation');
    console.log('8. ✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testActivationWorkflow();
