#!/usr/bin/env node

/**
 * Setup script to configure test user for owner dashboard testing
 * Run with: node setup-test-user.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple encryption function for testing (not production-ready)
function encrypt(text) {
  // For testing purposes, we'll just base64 encode with a prefix
  // In production, this should match the server-side encryption
  const encoded = Buffer.from(text).toString("base64");
  return `test-encrypted:${encoded}`;
}

async function setupTestUser() {
  const testUserEmail = "shajith4434@gmail.com";

  console.log(
    "🔧 Setting up test user for owner dashboard testing:",
    testUserEmail
  );
  console.log("=".repeat(60));

  try {
    // 1. Get user
    console.log("\n1. Getting user data...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", testUserEmail)
      .single();

    if (userError) {
      console.log("❌ User not found:", userError.message);
      return;
    }

    console.log("✅ User found:", user.email);

    // 2. Update subscription status to active
    console.log("\n2. Activating subscription...");
    const { error: updateError } = await supabase
      .from("users")
      .update({
        subscription_status: "active",
        subscription_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.log("❌ Error updating subscription:", updateError.message);
    } else {
      console.log("✅ Subscription activated");
    }

    // 3. Create owner notification
    console.log("\n3. Creating owner notification...");
    const notificationId = `owner-notif-${Date.now()}`;
    const { error: notifError } = await supabase
      .from("owner_notifications")
      .insert({
        id: notificationId,
        notification_type: "new_subscription",
        user_id: user.id,
        data: {
          userEmail: user.email,
          userName: user.first_name || "Test User",
          subscriptionPlan: user.subscription_plan,
          subscriptionId: `sub-${Date.now()}`,
          paypalCustomerId: user.paypal_customer_id || `paypal-${Date.now()}`,
          requiredAgents: ["falcon", "sage", "sentinel"], // Professional combo includes all agents
          requiredApiKeys: [
            "OpenAI API Key",
            "Apollo.io API Key",
            "Apify API Key",
            "Perplexity API Key",
            "Gmail Client ID",
            "Gmail Client Secret",
            "Gmail Refresh Token",
          ],
          customerInfo: {
            companyName: "Test Company",
            industry: "Technology",
            targetMarket: "B2B SaaS",
            businessSize: "startup",
          },
        },
        status: "pending_setup",
        created_at: new Date().toISOString(),
      });

    if (notifError) {
      console.log("❌ Error creating notification:", notifError.message);
    } else {
      console.log("✅ Owner notification created");
    }

    // 4. Create setup tasks for each agent
    console.log("\n4. Creating setup tasks...");
    const agents = ["falcon", "sage", "sentinel"];

    for (const agent of agents) {
      const taskId = `task-${agent}-${Date.now()}`;
      const { error: taskError } = await supabase
        .from("customer_setup_tasks")
        .insert({
          id: taskId,
          notification_id: notificationId,
          user_id: user.id,
          agent_name: agent,
          task_type: "api_key_setup",
          status: "pending",
          api_keys_required: getRequiredKeysForAgent(agent),
          api_keys_configured: {},
          created_at: new Date().toISOString(),
        });

      if (taskError) {
        console.log(`❌ Error creating task for ${agent}:`, taskError.message);
      } else {
        console.log(`✅ Setup task created for ${agent}`);
      }
    }

    // 5. Pre-configure API keys (using environment variables)
    console.log("\n5. Pre-configuring API keys...");

    const apiKeys = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      apolloApiKey: process.env.APOLLO_API_KEY,
      apifyApiKey: process.env.APIFY_API_KEY,
      perplexityApiKey: process.env.PERPLEXITY_API_KEY,
      gmailClientId: process.env.GMAIL_CLIENT_ID,
      gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
      gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN,
    };

    for (const agent of agents) {
      const agentKeys = getAgentSpecificKeys(agent, apiKeys);

      // Encrypt keys
      const encryptedKeys = {};
      for (const [key, value] of Object.entries(agentKeys)) {
        if (value) {
          encryptedKeys[key] = encrypt(value);
        }
      }

      const configId = `config-${agent}-${user.id}`;
      const { error: configError } = await supabase
        .from("user_agent_configs")
        .upsert(
          {
            id: configId,
            user_id: user.id,
            agent_name: agent,
            is_enabled: true,
            api_keys: encryptedKeys,
            configuration: getAgentConfiguration(agent),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,agent_name",
          }
        );

      if (configError) {
        console.log(`❌ Error configuring ${agent}:`, configError.message);
      } else {
        console.log(
          `✅ ${agent} agent configured with ${
            Object.keys(encryptedKeys).length
          } API keys`
        );
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 TEST USER SETUP COMPLETE!");
    console.log("\n📋 What was configured:");
    console.log("   ✅ Subscription activated");
    console.log("   ✅ Owner notification created");
    console.log("   ✅ Setup tasks created for all agents");
    console.log("   ✅ API keys configured for all agents");
    console.log("\n🧪 Next steps for testing:");
    console.log("   1. Sign in as owner: shajith240@gmail.com");
    console.log("   2. Go to owner dashboard to see pending setup");
    console.log("   3. Sign in as test user: shajith4434@gmail.com");
    console.log("   4. Test Prism AI agent functionality");
  } catch (error) {
    console.error("❌ Error during setup:", error.message);
  }
}

function getRequiredKeysForAgent(agent) {
  const keyMap = {
    falcon: ["OpenAI API Key", "Apollo.io API Key", "Apify API Key"],
    sage: ["OpenAI API Key", "Apify API Key", "Perplexity API Key"],
    sentinel: [
      "OpenAI API Key",
      "Gmail Client ID",
      "Gmail Client Secret",
      "Gmail Refresh Token",
    ],
  };
  return keyMap[agent] || ["OpenAI API Key"];
}

function getAgentSpecificKeys(agent, apiKeys) {
  const baseKeys = { openaiApiKey: apiKeys.openaiApiKey };

  switch (agent) {
    case "falcon":
      return {
        ...baseKeys,
        apolloApiKey: apiKeys.apolloApiKey,
        apifyApiKey: apiKeys.apifyApiKey,
      };
    case "sage":
      return {
        ...baseKeys,
        apifyApiKey: apiKeys.apifyApiKey,
        perplexityApiKey: apiKeys.perplexityApiKey,
      };
    case "sentinel":
      return {
        ...baseKeys,
        gmailClientId: apiKeys.gmailClientId,
        gmailClientSecret: apiKeys.gmailClientSecret,
        gmailRefreshToken: apiKeys.gmailRefreshToken,
      };
    default:
      return baseKeys;
  }
}

function getAgentConfiguration(agent) {
  const baseConfig = {
    enabled: true,
    version: "1.0.0",
  };

  switch (agent) {
    case "falcon":
      return {
        ...baseConfig,
        leadGeneration: {
          maxLeadsPerMonth: 500,
          targetIndustries: ["Technology", "SaaS"],
          leadSources: ["LinkedIn", "Apollo"],
        },
      };
    case "sage":
      return {
        ...baseConfig,
        research: {
          maxReportsPerMonth: 100,
          researchDepth: "comprehensive",
          sources: ["LinkedIn", "Company websites", "News"],
        },
      };
    case "sentinel":
      return {
        ...baseConfig,
        emailMonitoring: {
          enabled: true,
          monitoringInterval: 2,
          autoReplyEnabled: true,
          escalationEnabled: true,
        },
      };
    default:
      return baseConfig;
  }
}

// Run the setup
setupTestUser()
  .then(() => {
    console.log("\n🏁 Setup complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
