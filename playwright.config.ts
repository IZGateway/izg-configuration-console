import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: require.resolve('./playwright.env.setup'),
  use: {
    launchOptions: {
    args: ['--ignore-certificate-errors'],
    },
    baseURL: process.env.BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,  
    viewport: { width: 1280, height: 720 },
    actionTimeout: 5000,
    contextOptions: {
    ignoreHTTPSErrors: true,
    },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
    name: 'Chrome',
    use: {
      browserName: 'chromium',
      channel: 'chrome',
    },
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'Edge',
      use: {
        browserName: 'chromium',
        channel: 'msedge',
      },
    },
    {
      name: 'WebKit',
      use: { browserName: 'webkit' },
    }
  ],
});
