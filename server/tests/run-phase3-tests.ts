#!/usr/bin/env tsx

import { Phase3ServiceIntegrationTest } from "./phase3-service-integration-test.js";
import { EmailMonitoringManager } from "../services/EmailMonitoringManager.js";
import { supabase } from "../db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Phase 3 Test Runner - Service Integration for Sentinel Agent Email Monitoring
 * 
 * This script runs comprehensive tests for:
 * 1. Gmail API integration and email fetching
 * 2. Redis connection and queue system
 * 3. Database persistence and email storage
 * 4. AI agent processing and classification
 * 5. Notification system integration
 * 6. Calendar booking functionality
 * 7. Complete email automation pipeline
 * 8. Error handling and recovery mechanisms
 */

async function runPhase3Tests(): Promise<void> {
  console.log("🚀 PHASE 3: SERVICE INTEGRATION TESTING");
  console.log("=" .repeat(60));
  console.log("Testing Sentinel Agent Email Monitoring Service Integration");
  console.log("=" .repeat(60));

  // Pre-test environment check
  console.log("\n🔍 Pre-test Environment Check:");
  console.log("-" .repeat(40));
  
  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY", 
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN",
    "REDIS_URL"
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(", ")}`);
    console.log("Please configure all required environment variables before running tests.");
    process.exit(1);
  }

  console.log("✅ All required environment variables are configured");
  console.log(`📊 Redis Mode: ${process.env.USE_REDIS !== "false" ? "Enabled" : "Development (In-Memory)"}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);

  // Initialize test runner
  const tester = new Phase3ServiceIntegrationTest();

  try {
    // Run all integration tests
    await tester.runAllTests();
    
    console.log("\n🎯 PHASE 3 INTEGRATION TEST SUMMARY");
    console.log("=" .repeat(60));
    console.log("✅ Service integration testing completed");
    console.log("📧 Email monitoring pipeline tested");
    console.log("🤖 AI agent integration verified");
    console.log("🔔 Notification system validated");
    console.log("📅 Calendar integration checked");
    console.log("🛡️ Error handling mechanisms tested");

    console.log("\n📋 NEXT STEPS:");
    console.log("-" .repeat(20));
    console.log("1. Review test results above");
    console.log("2. Address any failed tests");
    console.log("3. Configure missing external services if needed");
    console.log("4. Proceed to Phase 4: Complete Pipeline Testing");
    console.log("5. Enable production email monitoring");

  } catch (error: any) {
    console.error("\n❌ PHASE 3 TESTING FAILED");
    console.error("=" .repeat(40));
    console.error(`Error: ${error.message}`);
    console.error("\nPlease resolve the issues and run tests again.");
    process.exit(1);
  }
}

/**
 * Test specific email monitoring functionality
 */
async function testEmailMonitoringOnly(): Promise<void> {
  console.log("📧 TESTING EMAIL MONITORING ONLY");
  console.log("=" .repeat(40));

  const testUserId = "test_user_" + uuidv4();
  const emailManager = EmailMonitoringManager.getInstance();

  try {
    // Test monitoring configuration
    console.log("1. Testing monitoring configuration...");
    await emailManager.updateMonitoringConfig(testUserId, {
      monitoring_enabled: true,
      check_interval: 1,
      filter_criteria: { test: true },
    });

    // Test monitoring start/stop
    console.log("2. Testing monitoring start/stop...");
    await emailManager.startUserMonitoring(testUserId);
    
    // Wait for monitoring to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await emailManager.stopUserMonitoring(testUserId);

    // Get monitoring status
    console.log("3. Testing monitoring status...");
    const status = await emailManager.getUserMonitoringStatus(testUserId);
    console.log("Monitoring status:", status);

    // Clean up
    await supabase
      .from("email_monitoring_config")
      .delete()
      .eq("user_id", testUserId);

    console.log("✅ Email monitoring test completed successfully");

  } catch (error: any) {
    console.error("❌ Email monitoring test failed:", error.message);
    
    // Clean up on error
    try {
      await emailManager.stopUserMonitoring(testUserId);
      await supabase
        .from("email_monitoring_config")
        .delete()
        .eq("user_id", testUserId);
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
    
    throw error;
  }
}

/**
 * Test database schema and tables
 */
async function testDatabaseSchema(): Promise<void> {
  console.log("🗄️ TESTING DATABASE SCHEMA");
  console.log("=" .repeat(30));

  const tables = [
    "email_monitoring_config",
    "email_threads", 
    "email_messages",
    "email_responses",
    "calendar_bookings",
    "email_escalations"
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("count", { count: "exact" })
        .limit(1);

      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: Available`);
      }
    } catch (error: any) {
      console.log(`❌ Table ${table}: ${error.message}`);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes("--email-only")) {
    await testEmailMonitoringOnly();
  } else if (args.includes("--db-only")) {
    await testDatabaseSchema();
  } else if (args.includes("--help")) {
    console.log("Phase 3 Service Integration Test Runner");
    console.log("");
    console.log("Usage:");
    console.log("  npx tsx tests/run-phase3-tests.ts           # Run all tests");
    console.log("  npx tsx tests/run-phase3-tests.ts --email-only  # Test email monitoring only");
    console.log("  npx tsx tests/run-phase3-tests.ts --db-only     # Test database schema only");
    console.log("  npx tsx tests/run-phase3-tests.ts --help        # Show this help");
  } else {
    await runPhase3Tests();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
}
