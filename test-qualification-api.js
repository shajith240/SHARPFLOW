// Test script for Lead Qualification API endpoints
import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";
const SESSION_COOKIE =
  "connect.sid=s%3A1E_LecrpJzuhfZU7vvPlbDdLGm7IUqGb.%2BExample";

async function testAPI(endpoint, method = "GET", body = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${endpoint}`);

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: SESSION_COOKIE,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.text();

    console.log(`📊 Status: ${response.status}`);
    console.log(
      `📄 Response: ${data.substring(0, 500)}${data.length > 500 ? "..." : ""}`
    );

    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { error: error.message };
  }
}

async function runTests() {
  console.log("🚀 Starting Lead Qualification API Tests...\n");

  // Test 1: Get qualification statistics
  await testAPI("/api/lead-qualification/stats");

  // Test 2: Get qualification summary
  await testAPI("/api/lead-qualification/summary");

  // Test 3: Get unqualified leads
  await testAPI("/api/lead-qualification/unqualified");

  // Test 4: Get recent qualification jobs
  await testAPI("/api/lead-qualification/jobs/recent");

  // Test 5: Setup qualification rules
  await testAPI("/api/lead-qualification/setup", "POST");

  // Test 6: Start bulk qualification (if there are unqualified leads)
  await testAPI("/api/lead-qualification/bulk/start", "POST");

  console.log("\n✅ API Tests Completed!");
}

// Run the tests
runTests().catch(console.error);
