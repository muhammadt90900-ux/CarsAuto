/**
 * apps/api/jest.config.js
 * Jest config for NestJS API — unit + integration suites
 * CI mode: --coverage --ci --forceExit (set in package.json test:ci script)
 */

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'api',
  rootDir: 'src',
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/common/**/*.spec.ts',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          strict: false,
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    '<rootDir>/modules/**/*.ts',
    '<rootDir>/common/**/*.ts',
    '!**/*.d.ts',
    '!**/dist/**',
    '!**/*.module.ts',
    '!**/main.ts',
  ],
  // Enforce minimum coverage thresholds — CI fails below these
  coverageThreshold: {
    global: {
      branches:   65,
      functions:  70,
      lines:      75,
      statements: 75,
    },
  },
  coverageReporters: [
    'text',           // console summary
    'lcov',           // for Codecov / SonarQube
    'html',           // browsable report
    'json-summary',   // machine-readable (used by CI coverage comment script)
  ],
  coverageDirectory: '<rootDir>/../coverage',
  // JUnit XML — consumed by GitHub Actions test-results reporter
  reporters: [
    'default',
    ...(process.env.CI ? [['jest-junit', {
      outputDirectory: '<rootDir>/../coverage',
      outputName: 'junit-api.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }]] : []),
  ],
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  // Bail after first failure in CI to speed up feedback
  bail: process.env.CI ? 1 : 0,
};
