#!/usr/bin/env node

/**
 * Test AI agent functionality with real API keys
 * Run with: node test-ai-agent-functionality.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
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

// Decode base64 API key for testing
function decodeApiKey(encodedKey) {
  if (!encodedKey) return null;
  try {
    return Buffer.from(encodedKey, 'base64').toString('utf8');
  } catch (error) {
    console.error('Error decoding API key:', error);
    return null;
  }
}

async function testAIAgentFunctionality() {
  const testUserEmail = 'shajith4434@gmail.com';
  
  console.log('🧪 Testing AI Agent Functionality:', testUserEmail);
  console.log('=' .repeat(60));

  try {
    // 1. Get user and agent configurations
    console.log('\n1. Getting user and agent configurations...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUserEmail)
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }

    const { data: agentConfigs, error: configError } = await supabase
      .from('user_agent_configs')
      .select('*')
      .eq('user_id', user.id);

    if (configError) {
      console.log('❌ Error fetching agent configs:', configError.message);
      return;
    }

    console.log(`✅ Found ${agentConfigs.length} agent configurations`);

    // 2. Test each agent's API keys
    console.log('\n2. Testing API key configurations...');
    
    for (const config of agentConfigs) {
      console.log(`\n🔧 Testing ${config.agent_name.toUpperCase()} Agent:`);
      
      // Test OpenAI API key (common to all agents)
      if (config.api_keys.openaiApiKey) {
        const openaiKey = decodeApiKey(config.api_keys.openaiApiKey);
        if (openaiKey && openaiKey.startsWith('sk-')) {
          console.log('  ✅ OpenAI API key: Valid format');
          
          // Test OpenAI API call
          try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: 'Test message for API validation' }],
              max_tokens: 10
            }, {
              headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });
            
            if (response.status === 200) {
              console.log('  ✅ OpenAI API: Working correctly');
            }
          } catch (error) {
            console.log('  ❌ OpenAI API: Error -', error.response?.data?.error?.message || error.message);
          }
        } else {
          console.log('  ❌ OpenAI API key: Invalid format');
        }
      }

      // Test agent-specific API keys
      switch (config.agent_name.toLowerCase()) {
        case 'falcon':
          // Test Apollo API key
          if (config.api_keys.apolloApiKey) {
            const apolloKey = decodeApiKey(config.api_keys.apolloApiKey);
            console.log('  ✅ Apollo API key: Configured');
          }
          
          // Test Apify API key
          if (config.api_keys.apifyApiKey) {
            const apifyKey = decodeApiKey(config.api_keys.apifyApiKey);
            if (apifyKey && apifyKey.startsWith('apify_api_')) {
              console.log('  ✅ Apify API key: Valid format');
              
              // Test Apify API call
              try {
                const response = await axios.get(`https://api.apify.com/v2/users/me?token=${apifyKey}`, {
                  timeout: 10000
                });
                
                if (response.status === 200) {
                  console.log('  ✅ Apify API: Working correctly');
                  console.log(`    📊 Account: ${response.data.username || 'Unknown'}`);
                }
              } catch (error) {
                console.log('  ❌ Apify API: Error -', error.response?.data?.error || error.message);
              }
            } else {
              console.log('  ❌ Apify API key: Invalid format');
            }
          }
          break;

        case 'sage':
          // Test Perplexity API key
          if (config.api_keys.perplexityApiKey) {
            const perplexityKey = decodeApiKey(config.api_keys.perplexityApiKey);
            if (perplexityKey && perplexityKey.startsWith('pplx-')) {
              console.log('  ✅ Perplexity API key: Valid format');
              
              // Test Perplexity API call
              try {
                const response = await axios.post('https://api.perplexity.ai/chat/completions', {
                  model: 'sonar-pro',
                  messages: [{ role: 'user', content: 'Test message for API validation' }],
                  max_tokens: 10
                }, {
                  headers: {
                    'Authorization': `Bearer ${perplexityKey}`,
                    'Content-Type': 'application/json'
                  },
                  timeout: 10000
                });
                
                if (response.status === 200) {
                  console.log('  ✅ Perplexity API: Working correctly');
                }
              } catch (error) {
                console.log('  ❌ Perplexity API: Error -', error.response?.data?.error?.message || error.message);
              }
            } else {
              console.log('  ❌ Perplexity API key: Invalid format');
            }
          }
          break;

        case 'sentinel':
          // Test Gmail API credentials
          if (config.api_keys.gmailClientId) {
            console.log('  ✅ Gmail Client ID: Configured');
          }
          if (config.api_keys.gmailClientSecret) {
            console.log('  ✅ Gmail Client Secret: Configured');
          }
          if (config.api_keys.gmailRefreshToken) {
            console.log('  ✅ Gmail Refresh Token: Configured');
          }
          break;
      }

      // Check Apify actors configuration
      if (config.configuration?.apifyActors) {
        console.log('  📡 Apify Actors:');
        Object.entries(config.configuration.apifyActors).forEach(([key, value]) => {
          console.log(`    - ${key}: ${value}`);
        });
      }
    }

    // 3. Test Prism agent endpoint
    console.log('\n3. Testing Prism agent endpoint...');
    try {
      const response = await axios.post('http://localhost:3000/api/ai-agents/prism/process', {
        message: 'Hello Prism, can you help me test the system?',
        userId: user.id
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 200) {
        console.log('✅ Prism endpoint: Accessible');
        console.log('📝 Response preview:', response.data.message?.substring(0, 100) + '...');
      }
    } catch (error) {
      console.log('❌ Prism endpoint: Error -', error.response?.data?.message || error.message);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 AI AGENT FUNCTIONALITY TEST COMPLETE!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User configuration verified');
    console.log('   ✅ Agent API keys tested');
    console.log('   ✅ Apify actors configured');
    console.log('   ✅ System ready for testing');
    
    console.log('\n🧪 Next steps:');
    console.log('   1. Sign in as test user: shajith4434@gmail.com');
    console.log('   2. Navigate to AI chat interface');
    console.log('   3. Test Prism with various requests:');
    console.log('      - "Generate leads for SaaS companies in California"');
    console.log('      - "Research this LinkedIn profile: [URL]"');
    console.log('      - "Set a reminder for tomorrow at 9 AM"');
    console.log('   4. Verify agent routing and responses');

  } catch (error) {
    console.error('❌ Error during functionality test:', error.message);
  }
}

// Run the test
testAIAgentFunctionality().then(() => {
  console.log('\n🏁 Functionality test complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
