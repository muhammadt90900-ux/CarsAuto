/**
 * apps/web/jest.config.js
 */
/** @type {import('jest').Config} */
module.exports = {
  displayName: 'web',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.spec.ts', '**/__tests__/**/*.spec.tsx'],
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
  testEnvironment: 'node',        // web-layer.spec.ts is pure logic, no DOM
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
  coverageDirectory: '<rootDir>/../coverage',
  testTimeout: 15000,
  verbose: true,
  clearMocks: true,
};
