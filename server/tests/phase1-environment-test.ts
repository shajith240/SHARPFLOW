/**
 * Phase 1: Environment Configuration Test
 * Tests Redis connectivity and Gmail API authentication
 */

import Redis from "ioredis";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the root directory
dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

class EnvironmentTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log("🧪 Starting Phase 1: Environment Configuration Tests\n");

    await this.testRedisConnection();
    await this.testGmailAPIAuthentication();
    await this.testEnvironmentVariables();
    await this.testGoogleCalendarAPI();

    this.printResults();
  }

  private async testRedisConnection(): Promise<void> {
    console.log("📡 Testing Redis Connection...");

    // Check if Redis should be used
    const useRedis = process.env.USE_REDIS === "true";

    if (!useRedis) {
      this.results.push({
        name: "Redis Connection",
        success: true,
        message: "✅ Redis disabled - using in-memory queue for development",
        details: {
          useRedis: false,
          mode: "development",
          queueType: "in-memory",
        },
      });
      return;
    }

    try {
      const redis = new Redis(
        process.env.REDIS_URL || "redis://localhost:6379",
        {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          connectTimeout: 5000,
        }
      );

      // Test basic operations
      await redis.set("test:connection", "success", "EX", 10);
      const result = await redis.get("test:connection");

      if (result === "success") {
        await redis.del("test:connection");
        await redis.quit();

        this.results.push({
          name: "Redis Connection",
          success: true,
          message: "✅ Redis connection successful",
          details: {
            url: process.env.REDIS_URL || "redis://localhost:6379",
            testOperation: "SET/GET/DEL operations completed",
          },
        });
      } else {
        throw new Error("Redis test operation failed");
      }
    } catch (error: any) {
      this.results.push({
        name: "Redis Connection",
        success: false,
        message: `❌ Redis connection failed: ${error.message}`,
        details: {
          url: process.env.REDIS_URL || "redis://localhost:6379",
          error: error.message,
          suggestion: "Install Redis or set USE_REDIS=false for development",
        },
      });
    }
  }

  private async testGmailAPIAuthentication(): Promise<void> {
    console.log("📧 Testing Gmail API Authentication...");

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        "http://localhost:3000/api/auth/google/callback"
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });

      // Test token refresh
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        // Test Gmail API access
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: "me" });

        this.results.push({
          name: "Gmail API Authentication",
          success: true,
          message: "✅ Gmail API authentication successful",
          details: {
            emailAddress: profile.data.emailAddress,
            messagesTotal: profile.data.messagesTotal,
            threadsTotal: profile.data.threadsTotal,
            hasAccessToken: !!credentials.access_token,
          },
        });
      } else {
        throw new Error("Failed to obtain access token");
      }
    } catch (error: any) {
      this.results.push({
        name: "Gmail API Authentication",
        success: false,
        message: `❌ Gmail API authentication failed: ${error.message}`,
        details: {
          clientId: process.env.GMAIL_CLIENT_ID ? "Present" : "Missing",
          clientSecret: process.env.GMAIL_CLIENT_SECRET ? "Present" : "Missing",
          refreshToken: process.env.GMAIL_REFRESH_TOKEN ? "Present" : "Missing",
          error: error.message,
        },
      });
    }
  }

  private async testGoogleCalendarAPI(): Promise<void> {
    console.log("📅 Testing Google Calendar API Authentication...");

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        "http://localhost:3000/api/auth/google/callback"
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      });

      // Test Calendar API access
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();

      this.results.push({
        name: "Google Calendar API Authentication",
        success: true,
        message: "✅ Google Calendar API authentication successful",
        details: {
          calendarsCount: calendarList.data.items?.length || 0,
          primaryCalendar: calendarList.data.items?.find((cal) => cal.primary)
            ?.summary,
        },
      });
    } catch (error: any) {
      this.results.push({
        name: "Google Calendar API Authentication",
        success: false,
        message: `❌ Google Calendar API authentication failed: ${error.message}`,
        details: {
          error: error.message,
        },
      });
    }
  }

  private async testEnvironmentVariables(): Promise<void> {
    console.log("🔧 Testing Environment Variables...");

    const requiredVars = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "REDIS_URL",
      "JWT_SECRET",
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);
    const presentVars = requiredVars.filter((varName) => process.env[varName]);

    this.results.push({
      name: "Environment Variables",
      success: missingVars.length === 0,
      message:
        missingVars.length === 0
          ? "✅ All required environment variables are present"
          : `❌ Missing environment variables: ${missingVars.join(", ")}`,
      details: {
        present: presentVars,
        missing: missingVars,
        total: requiredVars.length,
        redisEnabled: process.env.USE_REDIS === "true",
        emailMonitoringEnabled: process.env.EMAIL_MONITORING_ENABLED === "true",
      },
    });
  }

  private printResults(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 PHASE 1 TEST RESULTS");
    console.log("=".repeat(60));

    const successCount = this.results.filter((r) => r.success).length;
    const totalCount = this.results.length;

    this.results.forEach((result) => {
      console.log(`\n${result.message}`);
      if (result.details) {
        console.log("   Details:", JSON.stringify(result.details, null, 2));
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log(`📈 SUMMARY: ${successCount}/${totalCount} tests passed`);

    if (successCount === totalCount) {
      console.log("🎉 Phase 1: Environment Configuration - READY FOR PHASE 2!");
    } else {
      console.log("⚠️  Phase 1: Environment Configuration - NEEDS ATTENTION");
      console.log("Please fix the failing tests before proceeding to Phase 2.");
    }
    console.log("=".repeat(60));
  }
}

// Run tests if this file is executed directly
const isMainModule =
  import.meta.url.endsWith(process.argv[1]) ||
  import.meta.url.includes("phase1-environment-test.ts");

if (isMainModule) {
  const tester = new EnvironmentTester();
  tester.runAllTests().catch(console.error);
}

export { EnvironmentTester };
