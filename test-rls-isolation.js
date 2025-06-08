// Test RLS Data Isolation with Proper User Context
// This script tests RLS policies by simulating actual user authentication

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function testRLSIsolation() {
  console.log('🔒 TESTING RLS DATA ISOLATION\n');

  // Create admin client for setup
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Create regular client for user testing
  const userClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // 1. Create test users with admin client
    console.log('1. 👥 Creating test users...');
    
    const user1Email = `testuser1-${Date.now()}@test.com`;
    const user2Email = `testuser2-${Date.now()}@test.com`;
    const password = 'TestPassword123!';

    // Create user accounts
    const { data: user1Auth, error: user1Error } = await userClient.auth.signUp({
      email: user1Email,
      password: password
    });

    const { data: user2Auth, error: user2Error } = await userClient.auth.signUp({
      email: user2Email,
      password: password
    });

    if (user1Error || user2Error) {
      console.log('⚠️  Auth signup failed, using direct user creation...');
      
      // Fallback: Create users directly in database
      const user1 = {
        id: `user1-${Date.now()}`,
        email: user1Email,
        first_name: 'Test',
        last_name: 'User1',
        subscription_status: 'active',
        activation_status: 'active'
      };

      const user2 = {
        id: `user2-${Date.now()}`,
        email: user2Email,
        first_name: 'Test',
        last_name: 'User2',
        subscription_status: 'active',
        activation_status: 'active'
      };

      await adminClient.from('users').insert([user1, user2]);
      console.log('✅ Created test users directly');

      // Test data isolation using database function
      await testDataIsolationWithFunction(adminClient, user1.id, user2.id);
      
      // Cleanup
      await adminClient.from('users').delete().in('id', [user1.id, user2.id]);
      
      return;
    }

    const user1Id = user1Auth.user?.id;
    const user2Id = user2Auth.user?.id;

    if (!user1Id || !user2Id) {
      throw new Error('Failed to create test users');
    }

    console.log(`✅ Created users: ${user1Id}, ${user2Id}`);

    // 2. Test RLS isolation by signing in as each user
    console.log('\n2. 🔐 Testing RLS with user authentication...');

    // Sign in as user1
    await userClient.auth.signInWithPassword({
      email: user1Email,
      password: password
    });

    // Create test data as user1
    const { data: user1Lead, error: leadError1 } = await userClient
      .from('leads')
      .insert({
        id: `lead1-${Date.now()}`,
        user_id: user1Id,
        company_name: 'User1 Company',
        contact_name: 'User1 Contact',
        email: 'contact@user1.com',
        status: 'new'
      })
      .select()
      .single();

    if (leadError1) {
      console.log('⚠️  Lead creation failed:', leadError1.message);
    } else {
      console.log('✅ User1 created lead successfully');
    }

    // Try to query all leads as user1 (should only see own leads)
    const { data: user1Leads, error: queryError1 } = await userClient
      .from('leads')
      .select('*');

    console.log(`📊 User1 can see ${user1Leads?.length || 0} leads`);

    // Sign out user1 and sign in as user2
    await userClient.auth.signOut();
    await userClient.auth.signInWithPassword({
      email: user2Email,
      password: password
    });

    // Create test data as user2
    const { data: user2Lead, error: leadError2 } = await userClient
      .from('leads')
      .insert({
        id: `lead2-${Date.now()}`,
        user_id: user2Id,
        company_name: 'User2 Company',
        contact_name: 'User2 Contact',
        email: 'contact@user2.com',
        status: 'new'
      })
      .select()
      .single();

    if (leadError2) {
      console.log('⚠️  Lead creation failed:', leadError2.message);
    } else {
      console.log('✅ User2 created lead successfully');
    }

    // Try to query all leads as user2 (should only see own leads)
    const { data: user2Leads, error: queryError2 } = await userClient
      .from('leads')
      .select('*');

    console.log(`📊 User2 can see ${user2Leads?.length || 0} leads`);

    // 3. Verify isolation
    console.log('\n3. 🔍 Verifying data isolation...');

    const user1CanSeeOwnData = user1Leads?.some(lead => lead.user_id === user1Id);
    const user1CanSeeOtherData = user1Leads?.some(lead => lead.user_id === user2Id);
    const user2CanSeeOwnData = user2Leads?.some(lead => lead.user_id === user2Id);
    const user2CanSeeOtherData = user2Leads?.some(lead => lead.user_id === user1Id);

    console.log(`User1 can see own data: ${user1CanSeeOwnData ? '✅' : '❌'}`);
    console.log(`User1 can see other user data: ${user1CanSeeOtherData ? '❌ SECURITY ISSUE' : '✅'}`);
    console.log(`User2 can see own data: ${user2CanSeeOwnData ? '✅' : '❌'}`);
    console.log(`User2 can see other user data: ${user2CanSeeOtherData ? '❌ SECURITY ISSUE' : '✅'}`);

    const isolationWorking = user1CanSeeOwnData && user2CanSeeOwnData && 
                            !user1CanSeeOtherData && !user2CanSeeOtherData;

    // 4. Cleanup
    console.log('\n4. 🧹 Cleaning up...');
    await userClient.auth.signOut();
    
    // Use admin client to cleanup
    await adminClient.from('leads').delete().in('user_id', [user1Id, user2Id]);
    
    // Delete auth users (if possible)
    try {
      await adminClient.auth.admin.deleteUser(user1Id);
      await adminClient.auth.admin.deleteUser(user2Id);
    } catch (error) {
      console.log('⚠️  Could not delete auth users (this is normal in some setups)');
    }

    // 5. Results
    console.log('\n📊 RLS ISOLATION TEST RESULTS:');
    console.log('================================');
    
    if (isolationWorking) {
      console.log('🎉 ✅ RLS DATA ISOLATION IS WORKING PERFECTLY!');
      console.log('✅ Users can only see their own data');
      console.log('✅ Users cannot access other users\' data');
      console.log('✅ Multi-tenant isolation is COMPLETE');
    } else {
      console.log('❌ RLS isolation has issues - review policies');
    }

    return isolationWorking;

  } catch (error) {
    console.error('❌ RLS isolation test failed:', error);
    return false;
  }
}

async function testDataIsolationWithFunction(adminClient, user1Id, user2Id) {
  console.log('\n🔍 Testing data isolation with database function...');
  
  // Create test leads for both users
  const testLeads = [
    {
      id: `lead1-${Date.now()}`,
      user_id: user1Id,
      company_name: 'User1 Company',
      contact_name: 'User1 Contact',
      email: 'contact1@test.com',
      status: 'new'
    },
    {
      id: `lead2-${Date.now()}`,
      user_id: user2Id,
      company_name: 'User2 Company',
      contact_name: 'User2 Contact',
      email: 'contact2@test.com',
      status: 'new'
    }
  ];

  await adminClient.from('leads').insert(testLeads);

  // Test isolation function
  const { data: isolationTest, error } = await adminClient
    .rpc('test_user_data_isolation', { test_user_id: user1Id });

  if (error) {
    console.log('⚠️  Isolation test function failed:', error.message);
  } else {
    console.log('✅ Isolation test function results:', isolationTest);
  }

  // Cleanup test leads
  await adminClient.from('leads').delete().in('user_id', [user1Id, user2Id]);
}

// Run the test
testRLSIsolation()
  .then((success) => {
    if (success) {
      console.log('\n🔒 RLS isolation test PASSED!');
    } else {
      console.log('\n⚠️  RLS isolation test had issues');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
