#!/usr/bin/env tsx

import dotenv from "dotenv";

/**
 * Phase 4 Test Runner - Complete Pipeline Testing for SharpFlow AI Agent System
 *
 * This script runs comprehensive end-to-end testing for:
 * 1. End-to-end workflow validation
 * 2. Production environment configuration
 * 3. User interface integration
 * 4. Performance optimization
 * 5. Security hardening
 * 6. Cross-service integration testing
 *
 * Usage:
 *   npm run test:phase4
 *   or
 *   tsx server/tests/run-phase4-tests.ts
 */

async function main() {
  console.log(
    "🚀 Phase 4: Complete Pipeline Testing for SharpFlow AI Agent System"
  );
  console.log("=".repeat(80));
  console.log("This comprehensive test validates the entire AI agent pipeline");
  console.log("from user requests to AI agent responses and notifications.\n");

  // Load environment variables
  dotenv.config();

  // Check if this is a production environment
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    console.log("⚠️ WARNING: Running tests in production environment!");
    console.log("   Tests will use real API keys and production database.");
    console.log("   Ensure you have proper backups and monitoring in place.\n");
  }

  try {
    // Import Phase4CompletePipelineTest after environment variables are loaded
    const { Phase4CompletePipelineTest } = await import(
      "./phase4-complete-pipeline-test.js"
    );

    // Initialize and run Phase 4 tests
    const phase4Test = new Phase4CompletePipelineTest();
    await phase4Test.runCompleteTests();

    console.log("\n" + "=".repeat(80));
    console.log("🎉 PHASE 4 COMPLETE PIPELINE TESTING SUCCESSFUL!");
    console.log("=".repeat(80));
    console.log(
      "\n✅ All critical systems validated and ready for production:"
    );
    console.log("   • Environment configuration validated");
    console.log("   • Database schema and connectivity verified");
    console.log("   • Service integration tested");
    console.log("   • AI agent system operational");
    console.log("   • WebSocket communication ready");
    console.log("   • End-to-end workflows validated");
    console.log("   • Performance benchmarks completed");
    console.log("   • Security measures verified");
    console.log("   • Error handling tested");
    console.log("   • Multi-tenant architecture validated");

    console.log("\n🚀 READY FOR PRODUCTION DEPLOYMENT!");
    console.log("\nNext Steps:");
    console.log("1. Deploy to production environment");
    console.log("2. Configure monitoring and alerting");
    console.log("3. Set up automated backups");
    console.log("4. Enable real-time monitoring");
    console.log("5. Train users on the new AI agent system");

    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(80));
    console.error("❌ PHASE 4 TESTING FAILED!");
    console.error("=".repeat(80));
    console.error("\nError Details:", error);

    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      if (error.stack) {
        console.error("Stack Trace:", error.stack);
      }
    }

    console.error("\n🔧 Troubleshooting Steps:");
    console.error("1. Check environment variables are properly configured");
    console.error("2. Verify database connection and schema");
    console.error("3. Ensure all required API keys are valid");
    console.error("4. Check network connectivity to external services");
    console.error("5. Review logs for specific error details");
    console.error("6. Run individual test components to isolate issues");

    console.error("\n📋 For detailed debugging:");
    console.error("   • Check Phase 3 completion status");
    console.error("   • Verify all dependencies are installed");
    console.error("   • Ensure Redis is running (if configured)");
    console.error("   • Test database connectivity separately");
    console.error("   • Validate API key permissions");

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error("Fatal error in main function:", error);
  process.exit(1);
});
