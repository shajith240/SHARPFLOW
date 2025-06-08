#!/usr/bin/env node

/**
 * ============================================================================
 * SharpFlow Deployment Verification Script
 * Post-deployment verification for CI/CD pipeline
 * ============================================================================
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration
const CONFIG = {
  timeout: 15000, // 15 seconds
  maxRetries: 10,
  retryDelay: 5000, // 5 seconds
  tests: {
    health: true,
    authentication: true,
    database: true,
    aiAgents: true,
    multiTenant: true,
  },
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SharpFlow-Deployment-Verification/1.0',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${CONFIG.timeout}ms`));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test application health
 */
async function testHealth(baseUrl) {
  console.log('🏥 Testing application health...');

  try {
    const response = await makeRequest(`${baseUrl}/api/health`);

    if (response.statusCode !== 200) {
      throw new Error(`Health check failed with status ${response.statusCode}`);
    }

    const data = JSON.parse(response.data);

    if (data.status !== 'healthy') {
      throw new Error(`Application reports unhealthy status: ${data.status}`);
    }

    console.log('✅ Health check passed');
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test authentication endpoints
 */
async function testAuthentication(baseUrl) {
  console.log('🔐 Testing authentication endpoints...');

  try {
    // Test login endpoint exists
    const response = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: { email: 'test@example.com', password: 'invalid' },
    });

    // Should return 401 or 400 for invalid credentials, not 500
    if (response.statusCode >= 500) {
      throw new Error(`Authentication endpoint error: ${response.statusCode}`);
    }

    console.log('✅ Authentication endpoints accessible');
    return { success: true };
  } catch (error) {
    console.error(`❌ Authentication test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test database connectivity
 */
async function testDatabase(baseUrl) {
  console.log('🗄️ Testing database connectivity...');

  try {
    const response = await makeRequest(`${baseUrl}/api/health/database`);

    if (response.statusCode !== 200) {
      throw new Error(`Database health check failed with status ${response.statusCode}`);
    }

    const data = JSON.parse(response.data);

    if (!data.connected) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Database connectivity verified');
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Database test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test AI agents functionality
 */
async function testAIAgents(baseUrl) {
  console.log('🤖 Testing AI agents functionality...');

  try {
    // Test Prism agent endpoint
    const response = await makeRequest(`${baseUrl}/api/agents/prism/status`);

    if (response.statusCode !== 200) {
      throw new Error(`AI agents status check failed with status ${response.statusCode}`);
    }

    const data = JSON.parse(response.data);

    if (!data.available) {
      throw new Error('AI agents not available');
    }

    console.log('✅ AI agents functionality verified');
    return { success: true, data };
  } catch (error) {
    console.error(`❌ AI agents test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test multi-tenant isolation
 */
async function testMultiTenant(baseUrl) {
  console.log('🏢 Testing multi-tenant isolation...');

  try {
    // Test tenant isolation endpoint
    const response = await makeRequest(`${baseUrl}/api/health/multi-tenant`);

    if (response.statusCode !== 200) {
      throw new Error(`Multi-tenant check failed with status ${response.statusCode}`);
    }

    const data = JSON.parse(response.data);

    if (!data.isolated) {
      throw new Error('Multi-tenant isolation not properly configured');
    }

    console.log('✅ Multi-tenant isolation verified');
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Multi-tenant test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Wait for application to be ready
 */
async function waitForApplication(baseUrl) {
  console.log(`⏳ Waiting for application to be ready at ${baseUrl}...`);

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await makeRequest(`${baseUrl}/api/health`);

      if (response.statusCode === 200) {
        console.log(`✅ Application is ready (attempt ${attempt}/${CONFIG.maxRetries})`);
        return true;
      }
    } catch (error) {
      console.log(`⏳ Attempt ${attempt}/${CONFIG.maxRetries} failed: ${error.message}`);
    }

    if (attempt < CONFIG.maxRetries) {
      console.log(`⏳ Waiting ${CONFIG.retryDelay}ms before next attempt...`);
      await sleep(CONFIG.retryDelay);
    }
  }

  throw new Error(`Application not ready after ${CONFIG.maxRetries} attempts`);
}

/**
 * Run comprehensive deployment verification
 */
async function runDeploymentVerification(baseUrl) {
  console.log('🚀 Starting deployment verification...');
  console.log('='.repeat(60));
  console.log(`🌐 Target URL: ${baseUrl}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const results = {
    overall: true,
    tests: {},
    timestamp: new Date().toISOString(),
    baseUrl,
  };

  try {
    // Wait for application to be ready
    await waitForApplication(baseUrl);

    // Run health test
    if (CONFIG.tests.health) {
      results.tests.health = await testHealth(baseUrl);
      if (!results.tests.health.success) results.overall = false;
    }

    // Run authentication test
    if (CONFIG.tests.authentication) {
      results.tests.authentication = await testAuthentication(baseUrl);
      if (!results.tests.authentication.success) results.overall = false;
    }

    // Run database test
    if (CONFIG.tests.database) {
      results.tests.database = await testDatabase(baseUrl);
      if (!results.tests.database.success) results.overall = false;
    }

    // Run AI agents test
    if (CONFIG.tests.aiAgents) {
      results.tests.aiAgents = await testAIAgents(baseUrl);
      if (!results.tests.aiAgents.success) results.overall = false;
    }

    // Run multi-tenant test
    if (CONFIG.tests.multiTenant) {
      results.tests.multiTenant = await testMultiTenant(baseUrl);
      if (!results.tests.multiTenant.success) results.overall = false;
    }
  } catch (error) {
    console.error(`💥 Verification failed: ${error.message}`);
    results.overall = false;
    results.error = error.message;
  }

  // Print summary
  console.log('\n📋 Deployment Verification Summary');
  console.log('='.repeat(60));
  console.log(`🌐 Target URL: ${baseUrl}`);
  console.log(`⏰ Timestamp: ${results.timestamp}`);

  Object.entries(results.tests).forEach(([testName, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${testName.padEnd(15)}: ${status}`);
  });

  console.log('='.repeat(60));
  console.log(`📊 Overall Result: ${results.overall ? '✅ SUCCESS' : '❌ FAILURE'}`);

  return results;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Usage: node deployment-verification.js <base-url>');
    console.error('   Example: node deployment-verification.js https://staging.sharpflow.app');
    process.exit(1);
  }

  const baseUrl = args[0];

  try {
    // Validate URL
    new URL(baseUrl);
  } catch (error) {
    console.error(`❌ Invalid URL: ${baseUrl}`);
    process.exit(1);
  }

  try {
    const results = await runDeploymentVerification(baseUrl);

    // Output JSON results for CI/CD
    if (process.env.CI || args.includes('--json')) {
      console.log('\n📄 JSON Results:');
      console.log(JSON.stringify(results, null, 2));
    }

    // Exit with appropriate code
    process.exit(results.overall ? 0 : 1);
  } catch (error) {
    console.error(`💥 Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Verification interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Verification terminated');
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  runDeploymentVerification,
  testHealth,
  testAuthentication,
  testDatabase,
  testAIAgents,
  testMultiTenant,
};
