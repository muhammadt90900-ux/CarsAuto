/**
 * apps/web/jest.config.js
 * Jest config for Next.js web — unit + hook + store suites
 * CI mode: --coverage --ci (set in package.json test:ci script)
 */

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'web',
  rootDir: 'src',
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.spec.tsx',
  ],
  transform: {
    '^.+\\.(tsx?|jsx?)$': [
      'ts-jest',
      {
        tsconfig: {
          strict: false,
          jsx: 'react',
          esModuleInterop: true,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testEnvironment: 'node',  // web-layer.spec.ts is pure logic, no DOM needed
  moduleNameMapper: {
    '^@/(.*)$':        '<rootDir>/$1',
    '\\.(css|scss)$':  '<rootDir>/../__mocks__/fileMock.js',
    '^zustand$':       '<rootDir>/../__mocks__/zustand.js',
    '^next/.*$':       '<rootDir>/../__mocks__/next.js',
  },
  collectCoverageFrom: [
    '<rootDir>/store/**/*.ts',
    '<rootDir>/hooks/**/*.ts',
    '<rootDir>/lib/**/*.ts',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches:   60,
      functions:  65,
      lines:      70,
      statements: 70,
    },
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],
  coverageDirectory: '<rootDir>/../coverage',
  reporters: [
    'default',
    ...(process.env.CI ? [['jest-junit', {
      outputDirectory: '<rootDir>/../coverage',
      outputName: 'junit-web.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }]] : []),
  ],
  testTimeout: 15000,
  verbose: true,
  clearMocks: true,
  bail: process.env.CI ? 1 : 0,
};
