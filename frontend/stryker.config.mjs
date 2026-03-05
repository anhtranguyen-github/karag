/**
 * Stryker Mutation Testing Configuration for Frontend
 * 
 * This configuration defines mutation testing rules for the TypeScript codebase.
 * Minimum mutation score: 80%
 * 
 * @see https://stryker-mutator.io/docs/stryker-js/configuration/
 */

export default {
  // Test runner configuration
  testRunner: 'vitest',
  testRunner_comment: 'Use vitest for running tests',
  
  // Reporters for output
  reporters: ['progress', 'clear-text', 'html', 'json'],
  
  // JSON reporter output path
  jsonReporter: {
    fileName: 'reports/stryker-report.json',
  },
  
  // HTML reporter output directory
  htmlReporter: {
    fileName: 'reports/stryker-html/index.html',
  },
  
  // Mutation score threshold
  thresholds: {
    high: 90,
    low: 80,
    break: 80,  // CI fails if mutation score < 80%
  },
  
  // Files to mutate
  mutate: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/tests/**/*',
    '!src/client/**/*',  // Generated code
    '!src/mocks/**/*',
    '!src/**/*.d.ts',
  ],
  
  // Files to ignore
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'dist/',
    'build/',
    'coverage/',
    'reports/',
    'src/client/**/*',
  ],
  
  // Mutators to enable
  mutators: {
    // Arithmetic operators
    arithmetic: true,
    // Array declarations
    array: true,
    // Arrow functions
    arrow: true,
    // Boolean literals
    boolean: true,
    // Conditional expressions
    conditional: true,
    // Equality operators
    equality: true,
    // Logical operators
    logical: true,
    // Optional chaining
    optionalChaining: true,
    // Regex literals
    regex: true,
    // String literals
    string: true,
    // Unary operators
    unary: true,
    // Update expressions
    update: true,
  },
  
  // Timeout for test runs (ms)
  timeoutMS: 60000,
  
  // Timeout factor for test runs
  timeoutFactor: 1.5,
  
  // Maximum concurrent test runners
  maxConcurrentTestRunners: 4,
  
  // Enable incremental analysis
  incremental: true,
  incrementalFile: '.stryker/incremental.json',
  
  // Clean temp directory after run
  cleanTempDir: true,
  
  // Disable type checking during mutation (faster)
  disableTypeChecks: true,
  
  // Log level
  logLevel: 'info',
  
  // Allow console colors in CI
  allowConsoleColors: true,
};
