#!/usr/bin/env node

/**
 * Test the actual API response to see what data is being returned
 * This will help us understand why the frontend is showing completion
 */

import fetch from 'node-fetch';

async function testApiResponse() {
  try {
    console.log('🔍 Testing API Response');
    console.log('=' .repeat(60));

    // Test the pending setups endpoint
    const response = await fetch('http://localhost:3000/api/owner/dashboard/pending-setups', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Cookie': 'connect.sid=test' // This won't work but let's see the response
      }
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log('🔐 Authentication required - this is expected');
      console.log('💡 The API requires owner authentication');
      return;
    }

    const data = await response.json();
    console.log('📋 API Response Data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Test with a simple HTTP request to see if server is responding
async function testServerHealth() {
  try {
    console.log('\n🏥 Testing Server Health');
    console.log('-' .repeat(40));

    const response = await fetch('http://localhost:3000/api/payments/plans');
    console.log('📡 Health Check Status:', response.status);
    
    if (response.ok) {
      console.log('✅ Server is responding');
    } else {
      console.log('❌ Server health check failed');
    }

  } catch (error) {
    console.error('❌ Server not reachable:', error.message);
  }
}

// Run tests
async function runTests() {
  await testServerHealth();
  await testApiResponse();
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 NEXT STEPS:');
  console.log('1. Sign in as owner in browser');
  console.log('2. Open browser developer tools');
  console.log('3. Check console logs for API response data');
  console.log('4. Check Network tab for actual API calls');
  console.log('5. Look for any cached responses');
  
  console.log('\n🔐 Owner Sign-in Details:');
  console.log('   Email: shajith240@gmail.com');
  console.log('   Secret Key: j538znf5u8k2m9x7q4w1e6r3t8y5u2i0');
  console.log('   URL: http://localhost:3000/sign-in');
}

runTests().catch(console.error);
