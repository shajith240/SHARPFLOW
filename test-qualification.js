// Test script for lead qualification system
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testQualificationSystem() {
  try {
    console.log('🧪 Testing SharpFlow Lead Qualification System...\n');

    // Test 1: Get qualification stats
    console.log('📊 Testing qualification stats endpoint...');
    const statsResponse = await fetch(`${BASE_URL}/api/lead-qualification/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie-here' // You'll need to get this from browser
      },
      credentials: 'include'
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Stats endpoint working:', statsData);
    } else {
      console.log('❌ Stats endpoint failed:', statsResponse.status, statsResponse.statusText);
    }

    // Test 2: Get recent jobs
    console.log('\n📋 Testing recent jobs endpoint...');
    const jobsResponse = await fetch(`${BASE_URL}/api/lead-qualification/jobs/recent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie-here'
      },
      credentials: 'include'
    });

    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json();
      console.log('✅ Jobs endpoint working:', jobsData);
    } else {
      console.log('❌ Jobs endpoint failed:', jobsResponse.status, jobsResponse.statusText);
    }

    // Test 3: Start bulk qualification (commented out to avoid actual API calls)
    /*
    console.log('\n🎯 Testing bulk qualification start...');
    const bulkResponse = await fetch(`${BASE_URL}/api/lead-qualification/bulk/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie-here'
      },
      credentials: 'include',
      body: JSON.stringify({
        leadIds: [], // Empty array for testing
        priority: 5
      })
    });

    if (bulkResponse.ok) {
      const bulkData = await bulkResponse.json();
      console.log('✅ Bulk qualification endpoint working:', bulkData);
    } else {
      console.log('❌ Bulk qualification endpoint failed:', bulkResponse.status, bulkResponse.statusText);
    }
    */

    console.log('\n🎉 Qualification system test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Navigate to http://localhost:3000/dashboard');
    console.log('2. Click on the "Qualification" tab');
    console.log('3. Click "Start AI Qualification (Test 5 Leads)" button');
    console.log('4. Monitor the console and server logs for progress');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testQualificationSystem();
