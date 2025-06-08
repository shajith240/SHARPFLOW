#!/usr/bin/env node

/**
 * Simple Subscription Fix for Owner Account
 * This script fixes the subscription status without assuming database schema
 * Run with: node fix-subscription-simple.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOwnerSubscription() {
  console.log('🔧 FIXING OWNER SUBSCRIPTION');
  console.log('=' .repeat(40));
  
  const OWNER_EMAIL = 'shajith4434@gmail.com';
  
  try {
    // 1. Get current user data
    console.log('\n1. Checking current user status...');
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', OWNER_EMAIL)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      return;
    }

    console.log('✅ User found:', user.id);
    console.log('Current subscription status:', user.subscription_status);
    console.log('Current subscription plan:', user.subscription_plan);

    // 2. Update subscription to active
    console.log('\n2. Updating subscription status...');
    
    const updates = {
      subscription_status: 'active',
      subscription_plan: 'ultra',
      subscription_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError.message);
      return;
    }

    console.log('✅ Subscription updated successfully!');
    console.log('New status:', updatedUser.subscription_status);
    console.log('New plan:', updatedUser.subscription_plan);
    console.log('Valid until:', updatedUser.subscription_period_end);

    // 3. Test subscription validation
    console.log('\n3. Testing subscription validation...');
    
    const hasActiveSubscription = updatedUser.subscription_status === 'active';
    const hasValidPlan = ['starter', 'professional', 'ultra'].includes(updatedUser.subscription_plan);
    const hasValidEndDate = new Date(updatedUser.subscription_period_end) > new Date();

    console.log('✅ Active status:', hasActiveSubscription);
    console.log('✅ Valid plan:', hasValidPlan);
    console.log('✅ Valid end date:', hasValidEndDate);

    if (hasActiveSubscription && hasValidPlan && hasValidEndDate) {
      console.log('\n🎉 SUCCESS! Owner account is ready');
      console.log('✅ You can now access the dashboard');
      console.log('✅ All features should be available');
      console.log('✅ Try logging in again');
    } else {
      console.log('\n❌ Something is still wrong with the subscription');
    }

    // 4. Optional: Set up basic agent configs
    console.log('\n4. Setting up basic agent configurations...');
    
    const agents = ['falcon', 'sage', 'sentinel'];
    
    for (const agent of agents) {
      try {
        const { error: configError } = await supabase
          .from('user_agent_configs')
          .upsert({
            id: `${user.id}_${agent}`,
            user_id: user.id,
            agent_name: agent,
            is_enabled: true,
            api_keys: {
              configured: true
            },
            configuration: {
              development_mode: true
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,agent_name'
          });

        if (configError) {
          console.log(`⚠️  Could not configure ${agent}:`, configError.message);
        } else {
          console.log(`✅ ${agent} agent configured`);
        }
      } catch (err) {
        console.log(`⚠️  Skipping ${agent} configuration:`, err.message);
      }
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Clear your browser cache and cookies');
    console.log('2. Restart your development server (npm run dev)');
    console.log('3. Try logging in with shajith4434@gmail.com');
    console.log('4. You should now have full dashboard access');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Environment check
function checkEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    return false;
  }
  
  console.log('✅ Environment check passed');
  return true;
}

// Main execution
if (checkEnvironment()) {
  fixOwnerSubscription();
}
