// Debug script to check leads data and qualification fields
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function debugLeadsData() {
  try {
    console.log('🔍 Debugging SharpFlow Leads Data...\n');

    // Test 1: Get leads data
    console.log('📊 Fetching leads data...');
    const leadsResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to get the session cookie from browser dev tools
        'Cookie': 'connect.sid=your-session-cookie-here'
      },
      credentials: 'include'
    });

    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      console.log('✅ Leads API response structure:', {
        totalLeads: leadsData.leads?.length || 0,
        hasLeads: !!leadsData.leads,
        paginationInfo: leadsData.pagination
      });

      // Check first few leads for qualification data
      if (leadsData.leads && leadsData.leads.length > 0) {
        console.log('\n🔍 Checking first 5 leads for qualification data:');
        
        const firstFiveLeads = leadsData.leads.slice(0, 5);
        firstFiveLeads.forEach((lead, index) => {
          console.log(`\nLead ${index + 1}:`);
          console.log(`  Name: ${lead.full_name || lead.name}`);
          console.log(`  Company: ${lead.company_name || lead.company}`);
          console.log(`  Qualification Rating: ${lead.qualification_rating || 'null'}`);
          console.log(`  Qualification Score: ${lead.qualification_score || 'null'}`);
          console.log(`  Auto Qualified: ${lead.auto_qualified || 'null'}`);
          console.log(`  Qualification Date: ${lead.qualification_date || 'null'}`);
          console.log(`  Has qualification_reasoning: ${!!lead.qualification_reasoning}`);
        });

        // Count qualified leads
        const qualifiedLeads = leadsData.leads.filter(lead => lead.qualification_rating);
        const highQuality = leadsData.leads.filter(lead => lead.qualification_rating === 'high');
        const mediumQuality = leadsData.leads.filter(lead => lead.qualification_rating === 'medium');
        const lowQuality = leadsData.leads.filter(lead => lead.qualification_rating === 'low');

        console.log('\n📈 Qualification Summary:');
        console.log(`  Total Leads: ${leadsData.leads.length}`);
        console.log(`  Qualified Leads: ${qualifiedLeads.length}`);
        console.log(`  High Quality: ${highQuality.length}`);
        console.log(`  Medium Quality: ${mediumQuality.length}`);
        console.log(`  Low Quality: ${lowQuality.length}`);
        console.log(`  Unqualified: ${leadsData.leads.length - qualifiedLeads.length}`);

        // Show some qualified leads if they exist
        if (qualifiedLeads.length > 0) {
          console.log('\n✅ Sample qualified leads:');
          qualifiedLeads.slice(0, 3).forEach((lead, index) => {
            console.log(`  ${index + 1}. ${lead.full_name || lead.name} - ${lead.qualification_rating} (${lead.qualification_score}/100)`);
          });
        } else {
          console.log('\n❌ No qualified leads found in API response');
        }
      }
    } else {
      console.log('❌ Leads API failed:', leadsResponse.status, leadsResponse.statusText);
    }

    // Test 2: Get qualification stats
    console.log('\n📊 Fetching qualification stats...');
    const statsResponse = await fetch(`${BASE_URL}/api/lead-qualification/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie-here'
      },
      credentials: 'include'
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Qualification stats:', statsData.data);
    } else {
      console.log('❌ Stats API failed:', statsResponse.status, statsResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Instructions for use
console.log('📝 Instructions:');
console.log('1. Open browser dev tools');
console.log('2. Go to Application/Storage > Cookies');
console.log('3. Copy the connect.sid cookie value');
console.log('4. Replace "your-session-cookie-here" in this script');
console.log('5. Run: node debug-leads-data.js\n');

// Uncomment to run (after setting cookie)
// debugLeadsData();
