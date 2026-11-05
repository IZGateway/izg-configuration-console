import * as dotenv from 'dotenv'
import { defineConfig } from '@playwright/test'

// Loaded here rather than in a globalSetup, because `use.baseURL` below is
// read when this file loads. Variables already set (CI secrets) win.
dotenv.config({ path: '.env.test' })

/**
 * RBAC matrix verification (IGDD-3621): `npm run test:rbac`.
 *
 * Separate from playwright.config.ts so the main suite does not pick it up,
 * and because it differs on purpose:
 *  - one browser (Chrome): authorization is decided on the server, not per
 *    browser;
 *  - no retries: a test fails whenever its column has a finding, so a retry
 *    would sign in and re-probe the whole column for nothing;
 *  - a long timeout: one test covers every row of one role's column.
 */
export default defineConfig({
  testDir: './e2e/rbac',
  testMatch: '*.spec.ts',
  timeout: 20 * 60 * 1000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  expect: {
    timeout: 15000,
  },
  reporter: [
    ['list'],
    ['./e2e/rbac/rbacReporter.ts'],
    ['html', { outputFolder: 'playwright-report-rbac', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 20000,
    // Playwright's default is no limit, so one page that never goes idle
    // would stall the whole column until the test timeout.
    navigationTimeout: 30000,
    screenshot: 'off',
    trace: 'off',
    // Local watching only: RBAC_SLOWMO=500 npm run test:rbac -- --headed
    launchOptions: { slowMo: Number(process.env.RBAC_SLOWMO) || 0 },
  },
  // The installed Google Chrome, as the main suite's Chrome project uses: no
  // Playwright browser download needed.
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium', channel: 'chrome' },
    },
  ],
})
