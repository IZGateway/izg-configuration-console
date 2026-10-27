// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextJest = require('next/jest')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    '@babel/preset-typescript',
  ]
}

dotenv.config({ path: '.env.test.local' });
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // The specs under e2e/ import @playwright/test and run under the Playwright
  // runner. Jest collected them as well, and every one failed to load. The first
  // two entries are the defaults from next/jest, repeated because naming this
  // option replaces them.
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '<rootDir>/e2e/'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
