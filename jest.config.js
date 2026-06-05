const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // Run unit tests only by default (no Redis required)
  // For integration tests: jest --testPathPattern=slidingWindow.test
  testPathIgnorePatterns: [
    "/node_modules/",
    // Exclude Redis-dependent integration tests from default `npm test`
    "src/limiter/slidingWindow.test.ts",
  ],
  // Collect test coverage
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
  ],
};