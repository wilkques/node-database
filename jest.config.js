/**
 * Jest Configuration for ES Modules
 * Supports TypeScript and ES6 imports/exports
 */

export default {
  // Test environment
  testEnvironment: "node",

  // Enable ES modules support
  preset: null,

  // Transform configuration
  transform: {},

  // Test file patterns
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/build/"],

  // Coverage settings
  collectCoverageFrom: [
    "dist/**/*.js",
    "!dist/**/*.test.js",
    "!dist/**/*.spec.js",
    "!dist/**/index.js",
  ],

  // Setup files
  setupFilesAfterEnv: [],

  // Global settings for ES modules
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },

  // Verbose output
  verbose: true,

  // Error handling
  errorOnDeprecated: false,

  // Module file extensions
  moduleFileExtensions: ["js", "json", "ts"],

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
};
