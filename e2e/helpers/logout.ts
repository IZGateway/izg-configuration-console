import { Page } from '@playwright/test'

export const logout = async (page: Page) => {
  await page.goto('/')
  await page.locator('#logout').click()
}
