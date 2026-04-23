import { Page } from '@playwright/test'

export const logout = async (page: Page) => {
  await page.locator('#logout').click({ force: true })
  // Wait for Okta signout redirect to complete before proceeding
  await page
    .waitForURL(/oktapreview\.com|okta\.com|signin/, { timeout: 15000 })
    .catch(() => {})
  await page.waitForLoadState('domcontentloaded')
}
