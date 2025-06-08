// Fix the test user's agent configurations by enabling them
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTestUser() {
  const userId = 'test-user-1749310633512';
  
  console.log('🔧 Fixing Test User Agent Configurations\n');
  
  try {
    // 1. Enable all agent configurations for the test user
    console.log('1. Enabling all agent configurations...');
    const { data: updatedConfigs, error: updateError } = await supabase
      .from('user_agent_configs')
      .update({ 
        is_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();
    
    if (updateError) throw updateError;
    
    console.log(`✅ Updated ${updatedConfigs?.length || 0} agent configurations:`);
    updatedConfigs?.forEach(config => {
      console.log(`   - ${config.agent_name}: enabled = ${config.is_enabled}`);
    });
    
    // 2. Test activation again
    console.log('\n2. Testing activation function...');
    const { data: activationResult, error: activationError } = await supabase
      .rpc('activate_user_account', { target_user_id: userId });
    
    if (activationError) {
      console.log('❌ Activation Error:', activationError);
    } else {
      console.log('✅ Activation Result:', activationResult);
    }
    
    // 3. Check final status
    console.log('\n3. Checking final user status...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, subscription_plan, subscription_status, activation_status')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    console.log('Final User Status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Plan: ${user.subscription_plan}`);
    console.log(`   Subscription Status: ${user.subscription_status}`);
    console.log(`   Activation Status: ${user.activation_status}`);
    
    if (user.activation_status === 'active') {
      console.log('\n🎉 SUCCESS! User is now activated and can access the dashboard!');
    } else {
      console.log('\n⚠️  User is still pending activation. Check the activation function.');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixTestUser();
