import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: require.resolve('./playwright.env.setup'),
  timeout: 60000,
  workers: 1,
  retries: 2,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 20000,
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
    launchOptions: {
      slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
    },
    screenshot: 'off',
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium', channel: 'chrome' },
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'Edge',
      use: { browserName: 'chromium', channel: 'msedge' },
    },
    {
      name: 'WebKit',
      use: { browserName: 'webkit' },
    },
    /* Uncomment these for mobile testing
    {
      name: 'galaxy-s24-emulation',
      use: {
        ...devices['Galaxy S24'], // Use the predefined Galaxy S24 device parameters
      },
    },
    {
      name: 'Mobile Safari - iPhone 12', // A descriptive name for your project
      use: {
        ...devices['iPhone 12'], // Emulates iPhone 12 properties (viewport, user agent, etc.)
      },
    },
    {
      name: 'iPad Pro 11',
      use: {
        ...devices['iPad Pro 11'], // Emulates iPad Pro 11 parameters
      },
    } */
  ],
})
