#!/usr/bin/env node

/**
 * ============================================================================
 * SharpFlow Health Check Script
 * Comprehensive health checking for CI/CD pipeline
 * ============================================================================
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Configuration
const CONFIG = {
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 2000, // 2 seconds
  endpoints: {
    health: '/api/health',
    ready: '/api/ready',
    metrics: '/api/metrics',
  },
  expectedStatus: 200,
  expectedHeaders: {
    'content-type': 'application/json',
  },
};

/**
 * Make HTTP request with timeout
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
      timeout: options.timeout || CONFIG.timeout,
      headers: options.headers || {},
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

    req.on('error', error => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${requestOptions.timeout}ms`));
    });

    req.end();
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Perform health check with retries
 */
async function healthCheck(baseUrl, endpoint, retries = CONFIG.retries) {
  const url = `${baseUrl}${endpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Health check attempt ${attempt}/${retries}: ${url}`);

      const response = await makeRequest(url);

      // Check status code
      if (response.statusCode !== CONFIG.expectedStatus) {
        throw new Error(`Expected status ${CONFIG.expectedStatus}, got ${response.statusCode}`);
      }

      // Check content type
      const contentType = response.headers['content-type'];
      if (contentType && !contentType.includes('application/json')) {
        console.warn(`⚠️ Unexpected content type: ${contentType}`);
      }

      // Parse response data
      let responseData;
      try {
        responseData = JSON.parse(response.data);
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse JSON response: ${parseError.message}`);
        responseData = { raw: response.data };
      }

      console.log(`✅ Health check passed: ${url}`);
      console.log('📊 Response:', responseData);

      return {
        success: true,
        statusCode: response.statusCode,
        data: responseData,
        attempt,
      };
    } catch (error) {
      console.error(`❌ Health check failed (attempt ${attempt}/${retries}): ${error.message}`);

      if (attempt === retries) {
        return {
          success: false,
          error: error.message,
          attempt,
        };
      }

      if (attempt < retries) {
        console.log(`⏳ Waiting ${CONFIG.retryDelay}ms before retry...`);
        await sleep(CONFIG.retryDelay);
      }
    }
  }
}

/**
 * Comprehensive application health check
 */
async function comprehensiveHealthCheck(baseUrl) {
  console.log(`🏥 Starting comprehensive health check for: ${baseUrl}`);
  console.log('='.repeat(60));

  const results = {
    overall: true,
    checks: {},
    timestamp: new Date().toISOString(),
    baseUrl,
  };

  // Health endpoint check
  console.log('\n🔍 Checking health endpoint...');
  const healthResult = await healthCheck(baseUrl, CONFIG.endpoints.health);
  results.checks.health = healthResult;

  if (!healthResult.success) {
    results.overall = false;
    console.error('❌ Health endpoint check failed');
  }

  // Ready endpoint check (optional)
  console.log('\n🔍 Checking readiness endpoint...');
  const readyResult = await healthCheck(baseUrl, CONFIG.endpoints.ready);
  results.checks.ready = readyResult;

  if (!readyResult.success) {
    console.warn('⚠️ Readiness endpoint check failed (non-critical)');
  }

  // Basic connectivity test
  console.log('\n🔍 Checking basic connectivity...');
  try {
    const connectivityResult = await makeRequest(baseUrl);
    results.checks.connectivity = {
      success: true,
      statusCode: connectivityResult.statusCode,
    };
    console.log(`✅ Basic connectivity check passed (status: ${connectivityResult.statusCode})`);
  } catch (error) {
    results.checks.connectivity = {
      success: false,
      error: error.message,
    };
    results.overall = false;
    console.error(`❌ Basic connectivity check failed: ${error.message}`);
  }

  // Summary
  console.log('\n📋 Health Check Summary');
  console.log('='.repeat(60));
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log(`⏰ Timestamp: ${results.timestamp}`);
  console.log(`🏥 Health: ${results.checks.health?.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🚀 Ready: ${results.checks.ready?.success ? '✅ PASS' : '⚠️ WARN'}`);
  console.log(`🔗 Connectivity: ${results.checks.connectivity?.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📊 Overall: ${results.overall ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);

  return results;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Usage: node health-check.js <base-url>');
    console.error('   Example: node health-check.js http://localhost:3000');
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
    const results = await comprehensiveHealthCheck(baseUrl);

    // Output results as JSON for CI/CD consumption
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

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error(`💥 Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
main();

export { healthCheck, comprehensiveHealthCheck, makeRequest };
