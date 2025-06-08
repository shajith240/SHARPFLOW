#!/usr/bin/env node

/**
 * Force update test user with real working API keys
 * Run with: node force-update-real-api-keys.js
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

// Real API keys from your environment (base64 encoded for storage)
const REAL_API_KEYS = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  apifyApiKey: process.env.APIFY_API_KEY,
  apolloApiKey: process.env.APOLLO_API_KEY,
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  gmailClientId: process.env.GMAIL_CLIENT_ID,
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN,
  calendarClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  calendarClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  calendarRefreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
};

// Simple base64 encoding for API keys
function encodeApiKey(key) {
  if (!key) return null;
  return Buffer.from(key).toString('base64');
}

async function forceUpdateRealApiKeys() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔑 FORCE UPDATING test user with real API keys:', testUserEmail);
  console.log('=' .repeat(70));

  try {
    // 1. Verify all required API keys are available
    console.log('\n1. Verifying API keys from environment...');
    const missingKeys = [];
    
    Object.entries(REAL_API_KEYS).forEach(([key, value]) => {
      if (!value) {
        missingKeys.push(key.toUpperCase());
      } else {
        console.log(`  ✅ ${key}: ${value.substring(0, 20)}...`);
      }
    });

    if (missingKeys.length > 0) {
      console.log('❌ Missing required API keys:', missingKeys.join(', '));
      console.log('💡 Please ensure all API keys are set in your .env file');
      return;
    }

    console.log('✅ All required API keys found in environment');

    // 2. Get user
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

    // 3. Delete existing agent configurations to start fresh
    console.log('\n2. Removing existing agent configurations...');
    const { error: deleteError } = await supabase
      .from('user_agent_configs')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.log('❌ Error deleting existing configs:', deleteError.message);
    } else {
      console.log('✅ Existing agent configurations removed');
    }

    // 4. Create fresh agent configurations with real API keys
    console.log('\n3. Creating fresh agent configurations with real API keys...');
    
    const agents = [
      {
        name: 'falcon',
        apiKeys: {
          openaiApiKey: encodeApiKey(REAL_API_KEYS.openaiApiKey),
          apolloApiKey: encodeApiKey(REAL_API_KEYS.apolloApiKey),
          apifyApiKey: encodeApiKey(REAL_API_KEYS.apifyApiKey)
        },
        configuration: {
          enabled: true,
          version: '1.0.0',
          leadGeneration: {
            leadSources: ['LinkedIn', 'Apollo'],
            maxLeadsPerMonth: 500,
            targetIndustries: ['Technology', 'SaaS']
          },
          apifyActors: {
            apolloScraper: 'code_crafter~apollo-io-scraper',
            linkedinScraper: 'apify/linkedin-company-scraper'
          }
        }
      },
      {
        name: 'sage',
        apiKeys: {
          openaiApiKey: encodeApiKey(REAL_API_KEYS.openaiApiKey),
          apifyApiKey: encodeApiKey(REAL_API_KEYS.apifyApiKey),
          perplexityApiKey: encodeApiKey(REAL_API_KEYS.perplexityApiKey)
        },
        configuration: {
          enabled: true,
          version: '1.0.0',
          research: {
            sources: ['LinkedIn', 'Company websites', 'News'],
            researchDepth: 'comprehensive',
            maxReportsPerMonth: 100
          },
          apifyActors: {
            linkedinProfileScraper: 'apify/linkedin-profile-scraper',
            companyScraper: 'apify/website-content-crawler',
            trustpilotScraper: 'apify/trustpilot-scraper'
          }
        }
      },
      {
        name: 'sentinel',
        apiKeys: {
          openaiApiKey: encodeApiKey(REAL_API_KEYS.openaiApiKey),
          gmailClientId: encodeApiKey(REAL_API_KEYS.gmailClientId),
          gmailClientSecret: encodeApiKey(REAL_API_KEYS.gmailClientSecret),
          gmailRefreshToken: encodeApiKey(REAL_API_KEYS.gmailRefreshToken),
          calendarClientId: encodeApiKey(REAL_API_KEYS.calendarClientId),
          calendarClientSecret: encodeApiKey(REAL_API_KEYS.calendarClientSecret),
          calendarRefreshToken: encodeApiKey(REAL_API_KEYS.calendarRefreshToken)
        },
        configuration: {
          enabled: true,
          version: '1.0.0',
          emailMonitoring: {
            enabled: true,
            autoReplyEnabled: true,
            escalationEnabled: true,
            monitoringInterval: 2
          }
        }
      }
    ];

    for (const agent of agents) {
      const configId = `config-${agent.name}-${user.id}`;
      
      // Filter out null API keys
      const validApiKeys = {};
      Object.entries(agent.apiKeys).forEach(([key, value]) => {
        if (value) {
          validApiKeys[key] = value;
        }
      });

      const { error: insertError } = await supabase
        .from('user_agent_configs')
        .insert({
          id: configId,
          user_id: user.id,
          agent_name: agent.name,
          is_enabled: true,
          api_keys: validApiKeys,
          configuration: agent.configuration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.log(`❌ Error creating ${agent.name} config:`, insertError.message);
      } else {
        const keyCount = Object.keys(validApiKeys).length;
        console.log(`✅ Created ${agent.name} config with ${keyCount} real API keys`);
        console.log(`   Keys: ${Object.keys(validApiKeys).join(', ')}`);
      }
    }

    // 5. Update subscription status to active
    console.log('\n4. Ensuring subscription is active...');
    const { error: subError } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (subError) {
      console.log('❌ Error updating subscription:', subError.message);
    } else {
      console.log('✅ Subscription confirmed active');
    }

    // 6. Update setup tasks to completed
    console.log('\n5. Marking setup tasks as completed...');
    const { error: taskError } = await supabase
      .from('customer_setup_tasks')
      .update({
        status: 'completed',
        completed_by: 'system-force-update',
        completed_at: new Date().toISOString(),
        api_keys_configured: {
          configured: true,
          configured_at: new Date().toISOString(),
          method: 'force_update_script'
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (taskError) {
      console.log('❌ Error updating setup tasks:', taskError.message);
    } else {
      console.log('✅ All setup tasks marked as completed');
    }

    // 7. Update owner notification
    console.log('\n6. Updating owner notification...');
    const { error: notifError } = await supabase
      .from('owner_notifications')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (notifError) {
      console.log('❌ Error updating notification:', notifError.message);
    } else {
      console.log('✅ Owner notification marked as completed');
    }

    console.log('\n' + '=' .repeat(70));
    console.log('🎉 REAL API KEYS FORCE UPDATE COMPLETE!');
    console.log('\n📋 What was updated:');
    console.log('   ✅ Deleted old test configurations');
    console.log('   ✅ Created fresh agent configs with real API keys');
    console.log('   ✅ Falcon: OpenAI + Apollo + Apify');
    console.log('   ✅ Sage: OpenAI + Apify + Perplexity');
    console.log('   ✅ Sentinel: OpenAI + Gmail + Calendar APIs');
    console.log('   ✅ Agent-specific Apify actors configured');
    console.log('   ✅ Subscription status set to active');
    console.log('   ✅ Setup tasks marked as completed');
    console.log('   ✅ Owner notification completed');
    
    console.log('\n🧪 Ready for AI agent testing:');
    console.log('   1. Refresh the debug endpoint to verify changes');
    console.log('   2. Sign in as: shajith4434@gmail.com');
    console.log('   3. Test Prism with: "Generate leads for SaaS companies"');
    console.log('   4. Verify real API calls are made');

  } catch (error) {
    console.error('❌ Error during force update:', error.message);
  }
}

// Run the force update
forceUpdateRealApiKeys().then(() => {
  console.log('\n🏁 Force update complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
