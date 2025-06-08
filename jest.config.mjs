/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/ci-pipeline.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/server/tests/SentinelIntelligentConfirmation.test.ts',
    '<rootDir>/server/tests/SentinelReminderEnhancement.test.ts',
    '<rootDir>/server/tests/GmailService.test.ts',
    '<rootDir>/server/tests/SentinelEmailMonitoring.integration.test.ts',
    '<rootDir>/server/tests/multi-tenant-isolation.test.ts',
    '<rootDir>/server/tests/run-phase3-tests.ts',
    '<rootDir>/server/tests/run-phase4-tests.ts',
    '<rootDir>/server/tests/simple-phase3-test.ts',
    '<rootDir>/server/tests/phase3-service-integration-test.ts',
    '<rootDir>/server/tests/phase4-complete-pipeline-test.ts',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        isolatedModules: true,
      },
    ],
  },
  collectCoverage: false,
  testTimeout: 30000,
  verbose: true,
  preset: 'ts-jest',
  maxWorkers: 1,
  bail: false,
  passWithNoTests: true,
  modulePathIgnorePatterns: [
    '<rootDir>/server/ai-agents/',
    '<rootDir>/server/services/GmailService.ts',
  ],
};
