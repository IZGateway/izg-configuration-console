import { expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'

test.beforeAll(() => {
  const requiredVars = ['OKTA_USERNAME', 'OKTA_PASSWORD']

  const missing = requiredVars.filter((varName) => !process.env[varName])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
})

test('Verify onboarding page has multiple table results', async ({ page }) => {
  // Login to the application
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)

  // Navigate to the onboarding page
  await page.goto('/onboarding', { waitUntil: 'networkidle' })

  // Wait for the table to load
  await page.waitForSelector('.MuiDataGrid-row', { timeout: 10000 })

  // Count the number of rows in the table
  const rowCount = await page.locator('.MuiDataGrid-row').count()

  // Verify there is more than one result
  expect(rowCount).toBeGreaterThan(1)

  console.log(`Onboarding table has ${rowCount} rows`)
})
