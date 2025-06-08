#!/usr/bin/env node

/**
 * Deploy Database Schema Function to Supabase
 * This script creates the get_table_schema function in Supabase
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

async function deploySchemaFunction() {
  try {
    console.log('🔧 Deploying get_table_schema function to Supabase...');

    // Read the SQL file
    const sqlFilePath = join(__dirname, '..', 'database-setup', '07-create-schema-function.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: sqlContent
    });

    if (error) {
      console.error('❌ Error executing SQL:', error);
      return false;
    }

    console.log('✅ SQL executed successfully');

    // Test the function
    console.log('🔍 Testing get_table_schema function...');
    const { data: testData, error: testError } = await supabase.rpc('get_table_schema', {
      table_name: 'research_reports'
    });

    if (testError) {
      console.error('❌ Function test failed:', testError);
      return false;
    }

    console.log('✅ Function test successful!');
    console.log(`📊 Found ${testData?.length || 0} columns in research_reports table`);
    
    if (testData && testData.length > 0) {
      console.log('📋 Table columns:');
      testData.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    return false;
  }
}

// Run the deployment
deploySchemaFunction()
  .then(success => {
    if (success) {
      console.log('🎉 Database schema function deployed successfully!');
      process.exit(0);
    } else {
      console.log('💥 Deployment failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
