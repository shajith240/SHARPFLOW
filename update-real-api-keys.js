#!/usr/bin/env node

/**
 * Update test user with real working API keys
 * Run with: node update-real-api-keys.js
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

// Real API keys from your environment
const REAL_API_KEYS = {
  // OpenAI API Key (same for all agents)
  openaiApiKey: process.env.OPENAI_API_KEY,
  
  // Apify API Key (same key, different actors)
  apifyApiKey: process.env.APIFY_API_KEY,
  
  // Apollo API Key (for Falcon agent)
  apolloApiKey: process.env.APOLLO_API_KEY,
  
  // Perplexity API Key (for Sage agent)
  perplexityApiKey: process.env.PERPLEXITY_API_KEY,
  
  // Gmail API credentials (for Sentinel agent)
  gmailClientId: process.env.GMAIL_CLIENT_ID,
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN,
  
  // Google Calendar credentials
  calendarClientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  calendarClientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  calendarRefreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
};

// Simple base64 encoding for API keys (matching the test format)
function encodeApiKey(key) {
  if (!key) return null;
  return Buffer.from(key).toString('base64');
}

// Agent-specific API key configurations
function getAgentApiKeys(agentName) {
  const baseKeys = {
    openaiApiKey: encodeApiKey(REAL_API_KEYS.openaiApiKey)
  };

  switch (agentName.toLowerCase()) {
    case 'falcon':
      return {
        ...baseKeys,
        // Falcon uses Apollo for lead generation and Apify for LinkedIn scraping
        apolloApiKey: encodeApiKey(REAL_API_KEYS.apolloApiKey),
        apifyApiKey: encodeApiKey(REAL_API_KEYS.apifyApiKey)
      };
    
    case 'sage':
      return {
        ...baseKeys,
        // Sage uses Apify for LinkedIn research and Perplexity for company research
        apifyApiKey: encodeApiKey(REAL_API_KEYS.apifyApiKey),
        perplexityApiKey: encodeApiKey(REAL_API_KEYS.perplexityApiKey)
      };
    
    case 'sentinel':
      return {
        ...baseKeys,
        // Sentinel uses Gmail API for email monitoring and calendar integration
        gmailClientId: encodeApiKey(REAL_API_KEYS.gmailClientId),
        gmailClientSecret: encodeApiKey(REAL_API_KEYS.gmailClientSecret),
        gmailRefreshToken: encodeApiKey(REAL_API_KEYS.gmailRefreshToken),
        calendarClientId: encodeApiKey(REAL_API_KEYS.calendarClientId),
        calendarClientSecret: encodeApiKey(REAL_API_KEYS.calendarClientSecret),
        calendarRefreshToken: encodeApiKey(REAL_API_KEYS.calendarRefreshToken)
      };
    
    default:
      return baseKeys;
  }
}

// Agent-specific Apify actor configurations
function getAgentApifyActors(agentName) {
  switch (agentName.toLowerCase()) {
    case 'falcon':
      return {
        // Falcon uses Apollo.io scraper for lead generation
        apolloScraper: 'code_crafter~apollo-io-scraper',
        linkedinScraper: 'apify/linkedin-company-scraper'
      };
    
    case 'sage':
      return {
        // Sage uses LinkedIn profile scraper for research
        linkedinProfileScraper: 'apify/linkedin-profile-scraper',
        companyScraper: 'apify/website-content-crawler',
        trustpilotScraper: 'apify/trustpilot-scraper'
      };
    
    case 'sentinel':
      return {
        // Sentinel doesn't use Apify actors directly
        // It uses Gmail API for email monitoring
      };
    
    default:
      return {};
  }
}

async function updateRealApiKeys() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🔑 Updating test user with real API keys:', testUserEmail);
  console.log('=' .repeat(60));

  try {
    // 1. Verify all required API keys are available
    console.log('\n1. Verifying API keys availability...');
    const missingKeys = [];
    
    if (!REAL_API_KEYS.openaiApiKey) missingKeys.push('OPENAI_API_KEY');
    if (!REAL_API_KEYS.apifyApiKey) missingKeys.push('APIFY_API_KEY');
    if (!REAL_API_KEYS.apolloApiKey) missingKeys.push('APOLLO_API_KEY');
    if (!REAL_API_KEYS.perplexityApiKey) missingKeys.push('PERPLEXITY_API_KEY');
    if (!REAL_API_KEYS.gmailClientId) missingKeys.push('GMAIL_CLIENT_ID');
    if (!REAL_API_KEYS.gmailClientSecret) missingKeys.push('GMAIL_CLIENT_SECRET');
    if (!REAL_API_KEYS.gmailRefreshToken) missingKeys.push('GMAIL_REFRESH_TOKEN');

    if (missingKeys.length > 0) {
      console.log('❌ Missing required API keys:', missingKeys.join(', '));
      console.log('💡 Please ensure all API keys are set in your .env file');
      return;
    }

    console.log('✅ All required API keys found');

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

    console.log('✅ User found:', user.email);

    // 3. Get agent configurations
    const { data: agentConfigs, error: configError } = await supabase
      .from('user_agent_configs')
      .select('*')
      .eq('user_id', user.id);

    if (configError) {
      console.log('❌ Error fetching agent configs:', configError.message);
      return;
    }

    console.log(`📋 Found ${agentConfigs.length} agent configurations`);

    // 4. Update each agent with real API keys
    for (const config of agentConfigs) {
      console.log(`\n🔧 Updating ${config.agent_name} agent...`);
      
      // Get agent-specific API keys
      const agentApiKeys = getAgentApiKeys(config.agent_name);
      const apifyActors = getAgentApifyActors(config.agent_name);
      
      // Update configuration with Apify actors
      const updatedConfiguration = {
        ...config.configuration,
        apifyActors: apifyActors
      };

      // Update the agent configuration
      const { error: updateError } = await supabase
        .from('user_agent_configs')
        .update({
          api_keys: agentApiKeys,
          configuration: updatedConfiguration,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (updateError) {
        console.log(`❌ Error updating ${config.agent_name}:`, updateError.message);
      } else {
        const keyCount = Object.keys(agentApiKeys).filter(k => agentApiKeys[k]).length;
        console.log(`✅ Updated ${config.agent_name} with ${keyCount} real API keys`);
        
        if (Object.keys(apifyActors).length > 0) {
          console.log(`   📡 Apify actors: ${Object.values(apifyActors).join(', ')}`);
        }
      }
    }

    // 5. Update subscription status to active
    console.log('\n5. Ensuring subscription is active...');
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

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 REAL API KEYS UPDATED SUCCESSFULLY!');
    console.log('\n📋 What was updated:');
    console.log('   ✅ OpenAI API key for all agents');
    console.log('   ✅ Falcon: Apollo.io + Apify (Apollo scraper)');
    console.log('   ✅ Sage: Apify (LinkedIn/Company scrapers) + Perplexity');
    console.log('   ✅ Sentinel: Gmail API + Calendar API');
    console.log('   ✅ Agent-specific Apify actors configured');
    console.log('   ✅ Subscription status confirmed active');
    
    console.log('\n🧪 Ready for AI agent testing:');
    console.log('   1. Sign in as: shajith4434@gmail.com');
    console.log('   2. Test Prism AI agent functionality');
    console.log('   3. Verify agent responses with real APIs');
    console.log('   4. Test lead generation, research, and email monitoring');

  } catch (error) {
    console.error('❌ Error during API key update:', error.message);
  }
}

// Run the update
updateRealApiKeys().then(() => {
  console.log('\n🏁 API key update complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
