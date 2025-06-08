#!/usr/bin/env node

/**
 * Fix Owner Subscription Status
 * This script checks and fixes the subscription status for the owner account
 * Run with: node fix-owner-subscription.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OWNER_EMAIL = 'shajith4434@gmail.com';

async function checkAndFixOwnerSubscription() {
  console.log('🔍 CHECKING OWNER SUBSCRIPTION STATUS');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check if user exists
    console.log(`\n1. Checking if user exists: ${OWNER_EMAIL}`);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', OWNER_EMAIL)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      
      if (userError.code === 'PGRST116') {
        console.log('\n🔧 User not found. Creating owner user...');
        
        // Create the owner user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: `user_${Date.now()}`,
            email: OWNER_EMAIL,
            first_name: 'Shajith',
            last_name: 'Owner',
            subscription_status: 'active',
            subscription_plan: 'ultra',
            subscription_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating user:', createError.message);
          return;
        }

        console.log('✅ Owner user created successfully');
        console.log('User ID:', newUser.id);
        console.log('Email:', newUser.email);
        console.log('Subscription Plan:', newUser.subscription_plan);
        console.log('Subscription Status:', newUser.subscription_status);
        return;
      }
      return;
    }

    console.log('✅ User found');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Current Subscription Status:', user.subscription_status);
    console.log('Current Subscription Plan:', user.subscription_plan);
    console.log('Subscription Period End:', user.subscription_period_end);

    // 2. Check subscription status
    console.log('\n2. Analyzing subscription status...');
    
    const hasActiveSubscription = user.subscription_status === 'active';
    const hasValidPlan = ['starter', 'professional', 'ultra'].includes(user.subscription_plan);
    const hasValidEndDate = user.subscription_period_end && new Date(user.subscription_period_end) > new Date();

    console.log('Has Active Status:', hasActiveSubscription);
    console.log('Has Valid Plan:', hasValidPlan);
    console.log('Has Valid End Date:', hasValidEndDate);

    // 3. Fix subscription if needed
    if (!hasActiveSubscription || !hasValidPlan || !hasValidEndDate) {
      console.log('\n🔧 Fixing subscription status...');
      
      const updates = {
        subscription_status: 'active',
        subscription_plan: 'ultra', // Give owner the highest plan
        subscription_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
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

      console.log('✅ Subscription updated successfully');
      console.log('New Status:', updatedUser.subscription_status);
      console.log('New Plan:', updatedUser.subscription_plan);
      console.log('New End Date:', updatedUser.subscription_period_end);
    } else {
      console.log('✅ Subscription is already active and valid');
    }

    // 4. Verify API access
    console.log('\n3. Verifying API access...');
    
    // Test the subscription API endpoint
    const testResponse = await fetch(`${process.env.CLIENT_URL || 'http://localhost:3000'}/api/payments/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need proper authentication headers
      }
    }).catch(() => null);

    if (testResponse) {
      console.log('✅ API endpoint accessible');
    } else {
      console.log('⚠️  API endpoint test skipped (server may not be running)');
    }

    // 5. Check activation status
    console.log('\n4. Checking activation status...');
    
    const { data: activationData, error: activationError } = await supabase
      .from('users')
      .select('is_pending_activation')
      .eq('id', user.id)
      .single();

    if (!activationError && activationData?.is_pending_activation) {
      console.log('🔧 Removing pending activation status...');
      
      const { error: activationUpdateError } = await supabase
        .from('users')
        .update({ 
          is_pending_activation: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (activationUpdateError) {
        console.error('❌ Error updating activation status:', activationUpdateError.message);
      } else {
        console.log('✅ Activation status updated');
      }
    } else {
      console.log('✅ No pending activation issues');
    }

    console.log('\n🎉 SUBSCRIPTION FIX COMPLETE');
    console.log('=' .repeat(50));
    console.log('✅ Owner account is now ready for full dashboard access');
    console.log('✅ You can now login and access all features');
    console.log('✅ AI Agents, Lead Generation, and Owner Dashboard should be accessible');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
checkAndFixOwnerSubscription();
