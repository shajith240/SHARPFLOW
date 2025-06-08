#!/usr/bin/env node

/**
 * Development Bypass for Subscription Validation
 * This script temporarily bypasses subscription checks for development
 * Run with: node dev-bypass-subscription.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDevBypass() {
  console.log("🛠️  SETTING UP DEVELOPMENT BYPASS");
  console.log("=".repeat(50));

  const OWNER_EMAIL = "shajith4434@gmail.com";

  try {
    // 1. Ensure owner user exists with proper subscription
    console.log("\n1. Setting up owner user...");

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", OWNER_EMAIL)
      .single();

    let userId;

    if (existingUser) {
      userId = existingUser.id;
      console.log("✅ Owner user found:", userId);

      // Update existing user
      const { error: updateError } = await supabase
        .from("users")
        .update({
          subscription_status: "active",
          subscription_plan: "ultra",
          subscription_period_end: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_pending_activation: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Error updating user:", updateError.message);
        return;
      }

      console.log("✅ Owner subscription updated");
    } else {
      // Create new user
      userId = `owner_${Date.now()}`;

      const { error: createError } = await supabase.from("users").insert({
        id: userId,
        email: OWNER_EMAIL,
        first_name: "Shajith",
        last_name: "Owner",
        subscription_status: "active",
        subscription_plan: "ultra",
        subscription_period_end: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        is_pending_activation: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (createError) {
        console.error("❌ Error creating user:", createError.message);
        return;
      }

      console.log("✅ Owner user created:", userId);
    }

    // 2. Set up user agent configs for all agents
    console.log("\n2. Setting up agent configurations...");

    const agents = ["falcon", "sage", "sentinel"];

    for (const agent of agents) {
      const { error: configError } = await supabase
        .from("user_agent_configs")
        .upsert(
          {
            id: `${userId}_${agent}_config`,
            user_id: userId,
            agent_name: agent,
            is_enabled: true,
            api_keys: {
              openai_api_key: "configured",
              apollo_api_key: agent === "falcon" ? "configured" : undefined,
              apify_api_key: ["falcon", "sage"].includes(agent)
                ? "configured"
                : undefined,
              perplexity_api_key: agent === "sage" ? "configured" : undefined,
              gmail_client_id: agent === "sentinel" ? "configured" : undefined,
              gmail_client_secret:
                agent === "sentinel" ? "configured" : undefined,
              gmail_refresh_token:
                agent === "sentinel" ? "configured" : undefined,
            },
            configuration: {
              enabled: true,
              development_mode: true,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,agent_name",
          }
        );

      if (configError) {
        console.error(
          `❌ Error setting up ${agent} config:`,
          configError.message
        );
      } else {
        console.log(`✅ ${agent} agent configured`);
      }
    }

    // 3. Create development notification preferences
    console.log("\n3. Setting up notification preferences...");

    const { error: notifError } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          lead_generation_complete: true,
          research_report_complete: true,
          job_failed: true,
          plan_limit_reached: true,
          daily_summary: true,
          system_announcements: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (notifError) {
      console.error("❌ Error setting up notifications:", notifError.message);
    } else {
      console.log("✅ Notification preferences configured");
    }

    // 4. Verify setup
    console.log("\n4. Verifying setup...");

    const { data: verifyUser, error: verifyError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        subscription_status,
        subscription_plan,
        subscription_period_end,
        is_pending_activation
      `
      )
      .eq("email", OWNER_EMAIL)
      .single();

    if (verifyError) {
      console.error("❌ Verification failed:", verifyError.message);
      return;
    }

    console.log("\n✅ SETUP COMPLETE");
    console.log("=".repeat(50));
    console.log("User ID:", verifyUser.id);
    console.log("Email:", verifyUser.email);
    console.log("Subscription Status:", verifyUser.subscription_status);
    console.log("Subscription Plan:", verifyUser.subscription_plan);
    console.log("Period End:", verifyUser.subscription_period_end);
    console.log("Pending Activation:", verifyUser.is_pending_activation);

    console.log("\n🎉 READY FOR TESTING");
    console.log("✅ You can now login to the dashboard");
    console.log("✅ All AI agents should be accessible");
    console.log("✅ Owner dashboard should be available");
    console.log("✅ Lead generation features enabled");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Environment check function
async function checkEnvironment() {
  console.log("\n🔍 ENVIRONMENT CHECK");
  console.log("=".repeat(30));

  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: configured`);
    } else {
      console.log(`❌ ${envVar}: missing`);
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.log("\n⚠️  Missing environment variables:");
    missing.forEach((env) => console.log(`   - ${env}`));
    console.log(
      "\nPlease configure these in your .env file before running the setup."
    );
    return false;
  }

  return true;
}

// Main execution
async function main() {
  const envOk = await checkEnvironment();
  if (envOk) {
    await setupDevBypass();
  }
}

// Run the main function
main();
