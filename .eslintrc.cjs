// ============================================================================
// SharpFlow ESLint Configuration
// Code quality and style enforcement for TypeScript/JavaScript
// ============================================================================

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '*.min.js',
    'coverage',
    '.next',
    'public',
    'client/**/*',
    'server/**/*',
    '*.tsx',
    '*.ts',
    '*.js',
    '!scripts/health-check.js',
    '!scripts/deployment-verification.js',
    '!scripts/commit-cicd.sh',
    '!scripts/commit-cicd.bat',
    '!.github/workflows/*.yml',
    'test-*.js',
    'debug-*.js',
    'fix-*.js',
    'setup-*.js',
    'verify-*.js',
    'update-*.js',
    'clean-*.js',
    'dev-*.js',
    'diagnose-*.js',
    'final-*.js',
    'force-*.js',
    'reset-*.js',
    'execute-*.js',
    'demo-*.js',
    'postcss.config.js',
    'vite.config.ts',
    'tailwind.config.ts',
    'drizzle.config.ts',
    'jest.config.mjs',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [],
  rules: {
    // ========================================================================
    // General ESLint Rules
    // ========================================================================
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    'no-undef': 'off', // TypeScript handles this
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
    indent: ['error', 2, { SwitchCase: 1 }],
    'max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true }],
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    'eol-last': 'error',
    'no-trailing-spaces': 'error',

    // Basic code quality rules
    'no-unused-vars': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
};
