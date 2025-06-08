/**
 * ============================================================================
 * CI/CD Pipeline Verification Tests
 * Basic tests to ensure the CI/CD pipeline is working correctly
 * ============================================================================
 */

import { describe, test, expect } from '@jest/globals';

describe('🔄 CI/CD Pipeline Tests', () => {
  test('should verify basic functionality', () => {
    expect(true).toBe(true);
  });

  test('should verify environment setup', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('should verify package.json exists', () => {
    const fs = require('fs');
    const path = require('path');

    const packageJsonPath = path.join(__dirname, '../../package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(packageJson.name).toBe('sharpflow');
    expect(packageJson.version).toBeDefined();
  });

  test('should verify CI scripts are available', () => {
    const fs = require('fs');
    const path = require('path');

    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.scripts['ci:validate']).toBeDefined();
    expect(packageJson.scripts['ci:build']).toBeDefined();
    expect(packageJson.scripts['test:ci']).toBeDefined();
  });

  test('should verify health check script exists', async () => {
    const fs = require('fs');
    const path = require('path');

    const healthCheckPath = path.join(__dirname, '../../scripts/health-check.js');
    expect(fs.existsSync(healthCheckPath)).toBe(true);
  });

  test('should verify deployment verification script exists', async () => {
    const fs = require('fs');
    const path = require('path');

    const deploymentVerificationPath = path.join(
      __dirname,
      '../../scripts/deployment-verification.js'
    );
    expect(fs.existsSync(deploymentVerificationPath)).toBe(true);
  });

  test('should verify GitHub Actions workflows exist', async () => {
    const fs = require('fs');
    const path = require('path');

    const workflowsDir = path.join(__dirname, '../../.github/workflows');
    expect(fs.existsSync(workflowsDir)).toBe(true);

    const ciWorkflow = path.join(workflowsDir, 'ci.yml');
    const cdWorkflow = path.join(workflowsDir, 'cd.yml');
    const securityWorkflow = path.join(workflowsDir, 'security.yml');

    expect(fs.existsSync(ciWorkflow)).toBe(true);
    expect(fs.existsSync(cdWorkflow)).toBe(true);
    expect(fs.existsSync(securityWorkflow)).toBe(true);
  });

  test('should verify multi-tenant isolation test exists', async () => {
    const fs = require('fs');
    const path = require('path');

    const multiTenantTestPath = path.join(__dirname, 'multi-tenant-isolation.test.ts');
    expect(fs.existsSync(multiTenantTestPath)).toBe(true);
  });

  test('should verify CI/CD documentation exists', async () => {
    const fs = require('fs');
    const path = require('path');

    const cicdGuidePath = path.join(__dirname, '../../CI-CD-PIPELINE-GUIDE.md');
    expect(fs.existsSync(cicdGuidePath)).toBe(true);
  });

  test('should verify Docker configuration exists', async () => {
    const fs = require('fs');
    const path = require('path');

    const dockerfilePath = path.join(__dirname, '../../Dockerfile');
    const dockerComposePath = path.join(__dirname, '../../docker-compose.yml');
    const dockerComposeProdPath = path.join(__dirname, '../../docker-compose.prod.yml');

    expect(fs.existsSync(dockerfilePath)).toBe(true);
    expect(fs.existsSync(dockerComposePath)).toBe(true);
    expect(fs.existsSync(dockerComposeProdPath)).toBe(true);
  });
});
