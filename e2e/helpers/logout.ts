import { Page } from '@playwright/test'

export const logout = async (page: Page) => {
  await page.locator('#logout').click()
}
