#!/usr/bin/env node

/**
 * Test the frontend logic for detecting API key validity
 * This simulates the exact logic used in the frontend
 */

// Simulate the data structure returned from the API
const mockApiResponse = [
  {
    userName: "shajith",
    userEmail: "shajith4434@gmail.com",
    userId: "some-user-id",
    setupTasks: [
      {
        id: 1,
        agent_name: "falcon",
        status: "pending",
        api_keys_configured: {},
        api_keys_required: ["openai_api_key", "apollo_api_key", "apify_api_key"]
      },
      {
        id: 2,
        agent_name: "sage", 
        status: "pending",
        api_keys_configured: {},
        api_keys_required: ["openai_api_key", "apify_api_key", "perplexity_api_key"]
      },
      {
        id: 3,
        agent_name: "sentinel",
        status: "pending", 
        api_keys_configured: {},
        api_keys_required: ["openai_api_key", "gmail_client_id", "gmail_client_secret", "gmail_refresh_token"]
      }
    ]
  }
];

// Simulate the frontend functions
function getAgentApiKeys(agentName) {
  const agentKeys = {
    falcon: ["openai_api_key", "apollo_api_key", "apify_api_key"],
    sage: ["openai_api_key", "apify_api_key", "perplexity_api_key"],
    sentinel: ["openai_api_key", "gmail_client_id", "gmail_client_secret", "gmail_refresh_token"]
  };
  return agentKeys[agentName] || [];
}

function hasValidApiKeys(task) {
  console.log(`🔍 Checking API keys for ${task.agent_name}:`, {
    api_keys_configured: task.api_keys_configured,
    status: task.status
  });

  if (
    !task.api_keys_configured ||
    Object.keys(task.api_keys_configured).length === 0
  ) {
    console.log(`❌ ${task.agent_name}: No API keys configured`);
    return false;
  }

  // Check if any API keys are test placeholders or empty
  const requiredKeys = getAgentApiKeys(task.agent_name);
  const configuredKeys = task.api_keys_configured;

  console.log(`🔑 ${task.agent_name} required keys:`, requiredKeys);
  console.log(`🔑 ${task.agent_name} configured keys:`, Object.keys(configuredKeys));

  for (const keyName of requiredKeys) {
    const keyValue = configuredKeys[keyName];
    
    console.log(`  - ${keyName}: ${keyValue ? keyValue.substring(0, 20) + '...' : 'null'}`);

    // Consider key invalid if:
    // - Missing or empty
    // - Contains "test-encrypted:" prefix (placeholder)
    // - Is just whitespace
    if (
      !keyValue ||
      keyValue.trim() === "" ||
      keyValue.startsWith("test-encrypted:") ||
      keyValue === "null" ||
      keyValue === "undefined"
    ) {
      console.log(`❌ ${task.agent_name}: Invalid key ${keyName}`);
      return false;
    }
  }

  console.log(`✅ ${task.agent_name}: All keys valid`);
  return true;
}

function getActualTaskStatus(task) {
  if (task.status === 'completed' && hasValidApiKeys(task)) {
    return 'completed';
  }
  return 'pending';
}

// Test the logic
console.log('🧪 Testing Frontend Logic with Mock Data');
console.log('=' .repeat(60));

const selectedSetup = mockApiResponse[0];

console.log('\n📋 Setup Tasks:');
selectedSetup.setupTasks.forEach((task, index) => {
  console.log(`\n${index + 1}. ${task.agent_name.toUpperCase()} Agent:`);
  console.log(`   DB Status: ${task.status}`);
  console.log(`   API Keys Count: ${Object.keys(task.api_keys_configured || {}).length}`);
  
  const actualStatus = getActualTaskStatus(task);
  console.log(`   Actual Status: ${actualStatus}`);
});

// Test overall completion
const allCompleted = selectedSetup.setupTasks.every(
  (task) => getActualTaskStatus(task) === "completed"
);

console.log('\n🎯 Overall Completion Check:');
console.log(`   All tasks completed: ${allCompleted}`);
console.log(`   Expected: false (should show individual forms)`);
console.log(`   Result: ${allCompleted ? '❌ SHOWS COMPLETION MESSAGE' : '✅ SHOWS INDIVIDUAL FORMS'}`);

console.log('\n' + '=' .repeat(60));

// Test with test-encrypted keys
console.log('\n🧪 Testing with Test-Encrypted Keys');
const mockApiResponseWithTestKeys = [
  {
    userName: "shajith",
    userEmail: "shajith4434@gmail.com", 
    userId: "some-user-id",
    setupTasks: [
      {
        id: 1,
        agent_name: "falcon",
        status: "completed",
        api_keys_configured: {
          "openai_api_key": "test-encrypted:fake-key-1",
          "apollo_api_key": "test-encrypted:fake-key-2", 
          "apify_api_key": "test-encrypted:fake-key-3"
        },
        api_keys_required: ["openai_api_key", "apollo_api_key", "apify_api_key"]
      },
      {
        id: 2,
        agent_name: "sage",
        status: "completed", 
        api_keys_configured: {
          "openai_api_key": "test-encrypted:fake-key-1",
          "apify_api_key": "test-encrypted:fake-key-3",
          "perplexity_api_key": "test-encrypted:fake-key-4"
        },
        api_keys_required: ["openai_api_key", "apify_api_key", "perplexity_api_key"]
      },
      {
        id: 3,
        agent_name: "sentinel",
        status: "completed",
        api_keys_configured: {
          "openai_api_key": "test-encrypted:fake-key-1",
          "gmail_client_id": "test-encrypted:fake-key-5",
          "gmail_client_secret": "test-encrypted:fake-key-6", 
          "gmail_refresh_token": "test-encrypted:fake-key-7"
        },
        api_keys_required: ["openai_api_key", "gmail_client_id", "gmail_client_secret", "gmail_refresh_token"]
      }
    ]
  }
];

const selectedSetupWithTestKeys = mockApiResponseWithTestKeys[0];

console.log('\n📋 Setup Tasks with Test Keys:');
selectedSetupWithTestKeys.setupTasks.forEach((task, index) => {
  console.log(`\n${index + 1}. ${task.agent_name.toUpperCase()} Agent:`);
  console.log(`   DB Status: ${task.status}`);
  console.log(`   API Keys Count: ${Object.keys(task.api_keys_configured || {}).length}`);
  
  const actualStatus = getActualTaskStatus(task);
  console.log(`   Actual Status: ${actualStatus}`);
});

// Test overall completion with test keys
const allCompletedWithTestKeys = selectedSetupWithTestKeys.setupTasks.every(
  (task) => getActualTaskStatus(task) === "completed"
);

console.log('\n🎯 Overall Completion Check with Test Keys:');
console.log(`   All tasks completed: ${allCompletedWithTestKeys}`);
console.log(`   Expected: false (test keys should be treated as invalid)`);
console.log(`   Result: ${allCompletedWithTestKeys ? '❌ SHOWS COMPLETION MESSAGE' : '✅ SHOWS INDIVIDUAL FORMS'}`);

console.log('\n🏁 Test Complete');
