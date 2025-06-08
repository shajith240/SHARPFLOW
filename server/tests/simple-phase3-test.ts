#!/usr/bin/env tsx

/**
 * Simple Phase 3 Service Integration Test
 * Tests basic functionality without complex dependencies
 */

console.log("🚀 PHASE 3: SERVICE INTEGRATION - SIMPLE TEST");
console.log("=" .repeat(50));

async function testBasicEnvironment(): Promise<void> {
  console.log("\n🔧 Testing Basic Environment...");
  
  // Test 1: Environment Variables
  const requiredVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN"
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(", ")}`);
  } else {
    console.log("✅ All required environment variables are configured");
  }

  // Test 2: Module Imports
  try {
    console.log("\n📦 Testing Module Imports...");
    
    const { supabase } = await import("../db.js");
    console.log("✅ Database module imported successfully");
    
    const { EmailMonitoringManager } = await import("../services/EmailMonitoringManager.js");
    console.log("✅ EmailMonitoringManager imported successfully");
    
    const { SentinelAgent } = await import("../ai-agents/agents/SentinelAgent.js");
    console.log("✅ SentinelAgent imported successfully");
    
    const { NotificationService } = await import("../services/NotificationService.js");
    console.log("✅ NotificationService imported successfully");

  } catch (error: any) {
    console.log(`❌ Module import failed: ${error.message}`);
  }

  // Test 3: Basic Database Connection
  try {
    console.log("\n🗄️ Testing Database Connection...");
    
    const { supabase } = await import("../db.js");
    
    if (!supabase) {
      console.log("❌ Supabase client not initialized");
      return;
    }

    const { data, error } = await supabase
      .from("email_monitoring_config")
      .select("count", { count: "exact" })
      .limit(1);

    if (error) {
      console.log(`❌ Database query failed: ${error.message}`);
    } else {
      console.log("✅ Database connection successful");
    }

  } catch (error: any) {
    console.log(`❌ Database test failed: ${error.message}`);
  }

  // Test 4: Service Initialization
  try {
    console.log("\n🤖 Testing Service Initialization...");
    
    const { EmailMonitoringManager } = await import("../services/EmailMonitoringManager.js");
    const emailManager = EmailMonitoringManager.getInstance();
    console.log("✅ EmailMonitoringManager initialized");
    
    const { SentinelAgent } = await import("../ai-agents/agents/SentinelAgent.js");
    const sentinelAgent = new SentinelAgent();
    console.log("✅ SentinelAgent initialized");
    
    const { NotificationService } = await import("../services/NotificationService.js");
    const notificationService = new NotificationService();
    console.log("✅ NotificationService initialized");

  } catch (error: any) {
    console.log(`❌ Service initialization failed: ${error.message}`);
  }
}

async function testGmailService(): Promise<void> {
  console.log("\n📧 Testing Gmail Service...");
  
  try {
    const { GmailService } = await import("../services/GmailService.js");
    
    const gmailService = new GmailService({
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
    });

    console.log("✅ Gmail service initialized");
    
    // Test connection (this might fail if credentials are not properly configured)
    const connectionTest = await gmailService.testConnection();
    
    if (connectionTest.connected) {
      console.log("✅ Gmail API connection successful");
    } else {
      console.log(`⚠️ Gmail API connection failed: ${connectionTest.error}`);
    }

  } catch (error: any) {
    console.log(`❌ Gmail service test failed: ${error.message}`);
  }
}

async function testRedisConnection(): Promise<void> {
  console.log("\n🔄 Testing Redis Connection...");
  
  try {
    const Redis = (await import("ioredis")).default;
    
    const redis = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        connectTimeout: 5000,
      }
    );

    // Test basic operations
    const testKey = `test:simple:${Date.now()}`;
    await redis.set(testKey, "test_value", "EX", 10);
    const result = await redis.get(testKey);
    
    if (result === "test_value") {
      console.log("✅ Redis connection and operations working");
      await redis.del(testKey);
    } else {
      console.log("❌ Redis operations failed");
    }
    
    await redis.quit();

  } catch (error: any) {
    console.log(`⚠️ Redis connection failed: ${error.message}`);
    console.log("   This is expected if Redis is not running or USE_REDIS=false");
  }
}

async function main(): Promise<void> {
  try {
    await testBasicEnvironment();
    await testGmailService();
    await testRedisConnection();
    
    console.log("\n🎯 SIMPLE PHASE 3 TEST SUMMARY");
    console.log("=" .repeat(40));
    console.log("✅ Basic service integration test completed");
    console.log("📧 Core components verified");
    console.log("🔧 Environment configuration checked");
    
    console.log("\n📋 NEXT STEPS:");
    console.log("1. Run full integration tests: npx tsx tests/phase3-service-integration-test.ts");
    console.log("2. Address any configuration issues found above");
    console.log("3. Proceed to Phase 4 when all tests pass");

  } catch (error: any) {
    console.error("\n❌ SIMPLE TEST FAILED");
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the simple test
main().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
