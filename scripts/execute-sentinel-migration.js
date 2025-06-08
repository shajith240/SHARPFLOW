#!/usr/bin/env node

/**
 * Execute Sentinel Agent Database Migration - Phase 2
 * This script executes the complete database schema migration for Sentinel email monitoring
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeMigration() {
  try {
    console.log('🚀 Starting Sentinel Agent Database Migration - Phase 2');
    console.log('📊 This will create all required tables for email monitoring functionality\n');

    // Step 1: Execute notifications table creation
    console.log('📋 Step 1: Creating notifications table...');
    
    try {
      const notificationsSQL = readFileSync(
        join(__dirname, '..', 'create-notifications-table.sql'), 
        'utf8'
      );
      
      const { error: notificationsError } = await supabase.rpc('exec_sql', {
        sql: notificationsSQL
      });

      if (notificationsError) {
        console.error('❌ Error creating notifications table:', notificationsError);
        throw notificationsError;
      }
      
      console.log('✅ Notifications table created successfully');
    } catch (error) {
      console.log('⚠️  Notifications table may already exist, continuing...');
    }

    // Step 2: Execute email monitoring tables creation
    console.log('\n📧 Step 2: Creating email monitoring tables...');
    
    try {
      const emailMonitoringSQL = readFileSync(
        join(__dirname, '..', 'database-setup', '08-sentinel-email-monitoring.sql'), 
        'utf8'
      );
      
      const { error: emailError } = await supabase.rpc('exec_sql', {
        sql: emailMonitoringSQL
      });

      if (emailError) {
        console.error('❌ Error creating email monitoring tables:', emailError);
        throw emailError;
      }
      
      console.log('✅ Email monitoring tables created successfully');
    } catch (error) {
      console.error('❌ Failed to create email monitoring tables:', error);
      throw error;
    }

    // Step 3: Verify schema integrity
    console.log('\n🔍 Step 3: Verifying database schema integrity...');
    
    const requiredTables = [
      'users',
      'notifications', 
      'email_monitoring_config',
      'email_threads',
      'email_messages',
      'email_responses',
      'calendar_bookings',
      'email_escalations'
    ];

    const verificationResults = [];
    
    for (const tableName of requiredTables) {
      try {
        const { data: tableInfo, error: tableError } = await supabase.rpc(
          'get_table_schema',
          { table_name: tableName }
        );

        if (tableError) {
          verificationResults.push({
            table: tableName,
            exists: false,
            error: tableError.message
          });
        } else {
          verificationResults.push({
            table: tableName,
            exists: true,
            columns: tableInfo?.length || 0
          });
        }
      } catch (error) {
        verificationResults.push({
          table: tableName,
          exists: false,
          error: error.message
        });
      }
    }

    const missingTables = verificationResults.filter(table => !table.exists);
    const existingTables = verificationResults.filter(table => table.exists);

    console.log(`📊 Schema verification results:`);
    console.log(`   ✅ Existing tables: ${existingTables.length}/${requiredTables.length}`);
    console.log(`   ❌ Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:');
      missingTables.forEach(table => {
        console.log(`   - ${table.table}: ${table.error}`);
      });
      throw new Error(`Migration incomplete: ${missingTables.length} tables missing`);
    }

    // Step 4: Test database operations
    console.log('\n🧪 Step 4: Testing database operations...');
    
    const testOperations = [];

    // Test notifications table
    try {
      const { error: notificationTestError } = await supabase
        .from('notifications')
        .select('count')
        .limit(1);
      
      testOperations.push({
        operation: 'notifications_select',
        success: !notificationTestError,
        error: notificationTestError?.message
      });
    } catch (error) {
      testOperations.push({
        operation: 'notifications_select',
        success: false,
        error: error.message
      });
    }

    // Test email monitoring config table
    try {
      const { error: configTestError } = await supabase
        .from('email_monitoring_config')
        .select('count')
        .limit(1);
      
      testOperations.push({
        operation: 'email_monitoring_config_select',
        success: !configTestError,
        error: configTestError?.message
      });
    } catch (error) {
      testOperations.push({
        operation: 'email_monitoring_config_select',
        success: false,
        error: error.message
      });
    }

    const failedOperations = testOperations.filter(op => !op.success);
    
    console.log(`🧪 Database operation tests:`);
    console.log(`   ✅ Successful operations: ${testOperations.length - failedOperations.length}/${testOperations.length}`);
    console.log(`   ❌ Failed operations: ${failedOperations.length}`);

    if (failedOperations.length > 0) {
      console.log('\n❌ Failed operations:');
      failedOperations.forEach(op => {
        console.log(`   - ${op.operation}: ${op.error}`);
      });
      throw new Error(`Database tests failed: ${failedOperations.length} operations failed`);
    }

    // Success summary
    console.log('\n🎉 Sentinel Agent Database Migration - Phase 2 COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Migration Summary:');
    console.log(`   ✅ Tables created: ${existingTables.length}`);
    console.log(`   ✅ Database operations tested: ${testOperations.length}`);
    console.log(`   ✅ Schema integrity verified`);
    console.log(`   ✅ Ready for email monitoring functionality`);
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Proceed to Phase 3: Service Integration');
    console.log('   2. Configure Gmail API credentials');
    console.log('   3. Set up Redis for job queue system');
    console.log('   4. Test email monitoring workflow');

    return true;

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check Supabase connection and credentials');
    console.log('   2. Verify database permissions');
    console.log('   3. Check for existing table conflicts');
    console.log('   4. Review error messages above');
    
    return false;
  }
}

// Execute migration if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  executeMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export { executeMigration };
