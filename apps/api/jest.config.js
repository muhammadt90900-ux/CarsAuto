/**
 * apps/api/jest.config.js
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
  coverageThresholds: {
    global: {
      branches:   65,
      functions:  70,
      lines:      75,
      statements: 75,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/../coverage',
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
};
