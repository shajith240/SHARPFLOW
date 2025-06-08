#!/usr/bin/env tsx

/**
 * Phase 4 Environment Validation Script
 *
 * This script validates all environment variables required for Phase 4 production testing
 * and provides specific instructions for obtaining missing values.
 */

import { config } from "dotenv";
import chalk from "chalk";

// Load environment variables
config();

interface ValidationResult {
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
  message: string;
  instructions?: string;
}

class Phase4EnvironmentValidator {
  private results: ValidationResult[] = [];

  async validate(): Promise<void> {
    console.log(chalk.blue.bold("\n🔍 Phase 4 Environment Validation"));
    console.log(chalk.blue("=".repeat(50)));

    await this.validateCriticalVariables();
    await this.validateDatabaseConfiguration();
    await this.validateAIAgentConfiguration();
    await this.validateGmailConfiguration();
    await this.validateRedisConfiguration();
    await this.validateProductionConfiguration();

    this.printResults();
    this.printNextSteps();
  }

  private async validateCriticalVariables(): Promise<void> {
    console.log(chalk.yellow("\n📋 Critical Environment Variables"));
    console.log("-".repeat(40));

    const criticalVars = [
      {
        name: "SUPABASE_URL",
        required: true,
        instructions: "Already configured ✅",
      },
      {
        name: "SUPABASE_ANON_KEY",
        required: true,
        instructions:
          "Get from Supabase Dashboard > Settings > API > Project API keys > anon/public",
      },
      {
        name: "DATABASE_URL",
        required: true,
        instructions:
          "Format: postgresql://postgres:YOUR_PASSWORD@db.ltmwapridldsxphvduer.supabase.co:5432/postgres",
      },
      {
        name: "FRONTEND_URL",
        required: true,
        instructions:
          "Set to http://localhost:3000 for development, https://your-domain.com for production",
      },
    ];

    for (const variable of criticalVars) {
      const value = process.env[variable.name];

      if (!value || value.includes("your_") || value.includes("here")) {
        this.results.push({
          name: variable.name,
          status: "FAIL",
          message: `❌ Missing or placeholder value`,
          instructions: variable.instructions,
        });
        console.log(chalk.red(`❌ ${variable.name}: Missing or placeholder`));
      } else {
        this.results.push({
          name: variable.name,
          status: "PASS",
          message: `✅ Configured`,
        });
        console.log(chalk.green(`✅ ${variable.name}: Configured`));
      }
    }
  }

  private async validateDatabaseConfiguration(): Promise<void> {
    console.log(chalk.yellow("\n🗄️ Database Configuration"));
    console.log("-".repeat(40));

    const dbUrl = process.env.DATABASE_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (dbUrl && !dbUrl.includes("your_password")) {
      console.log(chalk.green("✅ DATABASE_URL: Configured"));
      this.results.push({
        name: "Database Connection",
        status: "PASS",
        message: "✅ Database URL configured",
      });
    } else {
      console.log(chalk.red("❌ DATABASE_URL: Missing password"));
      this.results.push({
        name: "Database Connection",
        status: "FAIL",
        message: "❌ DATABASE_URL missing password",
        instructions:
          "Replace 'your_password' with your actual Supabase database password",
      });
    }

    if (supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes("your_")) {
      console.log(chalk.green("✅ Supabase Client: Ready"));
    } else {
      console.log(chalk.red("❌ Supabase Client: Missing anon key"));
    }
  }

  private async validateAIAgentConfiguration(): Promise<void> {
    console.log(chalk.yellow("\n🤖 AI Agent Configuration"));
    console.log("-".repeat(40));

    const aiKeys = [
      { name: "OPENAI_API_KEY", service: "OpenAI" },
      { name: "APOLLO_API_KEY", service: "Apollo.io" },
      { name: "APIFY_API_KEY", service: "Apify" },
      { name: "PERPLEXITY_API_KEY", service: "Perplexity" },
    ];

    let allConfigured = true;

    for (const key of aiKeys) {
      const value = process.env[key.name];
      if (value && !value.includes("your_")) {
        console.log(chalk.green(`✅ ${key.service}: Configured`));
      } else {
        console.log(chalk.red(`❌ ${key.service}: Missing`));
        allConfigured = false;
      }
    }

    this.results.push({
      name: "AI Agent APIs",
      status: allConfigured ? "PASS" : "FAIL",
      message: allConfigured
        ? "✅ All AI agent APIs configured"
        : "❌ Some AI agent APIs missing",
    });
  }

  private async validateGmailConfiguration(): Promise<void> {
    console.log(chalk.yellow("\n📧 Gmail API Configuration"));
    console.log("-".repeat(40));

    const gmailVars = [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
    ];
    const allPresent = gmailVars.every((varName) => process.env[varName]);

    if (allPresent) {
      console.log(chalk.green("✅ Gmail API: Fully configured"));
      this.results.push({
        name: "Gmail API",
        status: "PASS",
        message: "✅ Gmail API fully configured",
      });
    } else {
      console.log(chalk.red("❌ Gmail API: Missing configuration"));
      this.results.push({
        name: "Gmail API",
        status: "FAIL",
        message: "❌ Gmail API missing configuration",
      });
    }
  }

  private async validateRedisConfiguration(): Promise<void> {
    console.log(chalk.yellow("\n🔄 Redis Configuration"));
    console.log("-".repeat(40));

    const useRedis = process.env.USE_REDIS === "true";
    const redisUrl = process.env.REDIS_URL;

    if (useRedis && redisUrl) {
      console.log(chalk.green("✅ Redis: Enabled and configured"));
      this.results.push({
        name: "Redis",
        status: "PASS",
        message: "✅ Redis enabled and configured",
      });
    } else {
      console.log(chalk.yellow("⚠️ Redis: Disabled (using in-memory queue)"));
      this.results.push({
        name: "Redis",
        status: "WARNING",
        message: "⚠️ Redis disabled - using in-memory queue for development",
        instructions:
          "For production, set USE_REDIS=true and configure Redis server",
      });
    }
  }

  private async validateProductionConfiguration(): Promise<void> {
    console.log(chalk.yellow("\n🚀 Production Configuration"));
    console.log("-".repeat(40));

    const nodeEnv = process.env.NODE_ENV;
    const frontendUrl = process.env.FRONTEND_URL;
    const jwtSecret = process.env.JWT_SECRET;

    console.log(`Environment: ${nodeEnv}`);
    console.log(`Frontend URL: ${frontendUrl}`);
    console.log(`JWT Secret: ${jwtSecret ? "Configured" : "Missing"}`);

    const isProductionReady =
      frontendUrl && jwtSecret && !frontendUrl.includes("your-domain");

    this.results.push({
      name: "Production Readiness",
      status: isProductionReady ? "PASS" : "WARNING",
      message: isProductionReady
        ? "✅ Production configuration ready"
        : "⚠️ Production configuration needs updates",
    });
  }

  private printResults(): void {
    console.log(chalk.blue.bold("\n📊 Validation Summary"));
    console.log(chalk.blue("=".repeat(50)));

    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const warnings = this.results.filter((r) => r.status === "WARNING").length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);

    if (failed > 0) {
      console.log(chalk.red.bold("\n❌ CRITICAL ISSUES FOUND:"));
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((result) => {
          console.log(chalk.red(`\n• ${result.name}: ${result.message}`));
          if (result.instructions) {
            console.log(chalk.yellow(`  Instructions: ${result.instructions}`));
          }
        });
    }
  }

  private printNextSteps(): void {
    console.log(chalk.blue.bold("\n🎯 Next Steps for Phase 4"));
    console.log(chalk.blue("=".repeat(50)));

    const failedResults = this.results.filter((r) => r.status === "FAIL");

    if (failedResults.length === 0) {
      console.log(chalk.green("🎉 All critical configurations are ready!"));
      console.log(chalk.green("You can proceed with Phase 4 testing:"));
      console.log(chalk.white("   npm run test:phase4"));
    } else {
      console.log(chalk.red("⚠️ Please fix the following before proceeding:"));
      console.log("");

      failedResults.forEach((result, index) => {
        console.log(chalk.yellow(`${index + 1}. ${result.name}`));
        if (result.instructions) {
          console.log(chalk.white(`   ${result.instructions}`));
        }
        console.log("");
      });
    }
  }
}

// Run validation if called directly
const validator = new Phase4EnvironmentValidator();
validator.validate().catch(console.error);

export { Phase4EnvironmentValidator };
