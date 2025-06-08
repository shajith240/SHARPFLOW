// Debug script to check user agent configurations
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUserActivation() {
  const userId = 'test-user-1749310633512';
  
  console.log('🔍 Debugging User Activation Issue\n');
  
  try {
    // 1. Check user details
    console.log('1. Checking user details...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    console.log('User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Plan: ${user.subscription_plan}`);
    console.log(`   Subscription Status: ${user.subscription_status}`);
    console.log(`   Activation Status: ${user.activation_status}\n`);
    
    // 2. Check agent configurations
    console.log('2. Checking agent configurations...');
    const { data: configs, error: configError } = await supabase
      .from('user_agent_configs')
      .select('*')
      .eq('user_id', userId);
    
    if (configError) throw configError;
    
    console.log(`Found ${configs?.length || 0} agent configurations:`);
    configs?.forEach(config => {
      console.log(`   Agent: ${config.agent_name}`);
      console.log(`   Enabled: ${config.is_enabled}`);
      console.log(`   Has API Keys: ${Object.keys(config.api_keys || {}).length > 0}`);
      console.log(`   API Keys: ${Object.keys(config.api_keys || {}).join(', ')}`);
      console.log('   ---');
    });
    
    // 3. Test the activation function
    console.log('\n3. Testing activation function...');
    const { data: activationResult, error: activationError } = await supabase
      .rpc('activate_user_account', { target_user_id: userId });
    
    if (activationError) {
      console.log('❌ Activation Error:', activationError);
    } else {
      console.log('✅ Activation Result:', activationResult);
    }
    
    // 4. Check what the function expects
    console.log('\n4. Checking plan requirements...');
    const planRequirements = {
      'ultra_premium': 3, // Needs all 3 agents
      'professional_combo': 2,
      'falcon_individual': 1,
      'sage_individual': 1,
      'sentinel_individual': 1
    };
    
    const requiredAgents = planRequirements[user.subscription_plan] || 1;
    const enabledAgents = configs?.filter(c => c.is_enabled).length || 0;
    
    console.log(`   Plan: ${user.subscription_plan}`);
    console.log(`   Required Agents: ${requiredAgents}`);
    console.log(`   Enabled Agents: ${enabledAgents}`);
    console.log(`   Meets Requirements: ${enabledAgents >= requiredAgents ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugUserActivation();
