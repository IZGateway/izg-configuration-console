import { Page, expect } from '@playwright/test'

export const loginToOkta = async (
  page: Page,
  username: string,
  password: string,
  userFullName: string = 'Automation Testerson'
) => {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 })

  await page.getByRole('button', { name: 'Sign in with Okta' }).click()

  // Wait for the Okta login form to fully load (past the intermediate redirect page)
  await page
    .locator('input[name="identifier"]')
    .waitFor({ state: 'visible', timeout: 20000 })
  await page.locator('input[name="identifier"]').clear()
  await page.locator('input[name="identifier"]').fill(username)
  await page.locator('[type="submit"]').click()

  // Wait for Okta to transition away from identifier step - could land on:
  // 1. Password input directly
  // 2. Old factor selector (.button.select-factor.link-button)
  // 3. New authenticator list screen (#form52 with Email/Password options)
  await page
    .locator(
      'input[name="credentials.passcode"], .button.select-factor.link-button, #form52'
    )
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })

  const body = page.locator('body')

  // Handle new authenticator selection screen (Email / Password list)
  const authenticatorListExists = (await body.locator('#form52').count()) > 0
  if (authenticatorListExists) {
    // Click the "Select" link for the Password option using its data-se attribute
    await page.locator('[data-se="okta_password"] a[data-se="button"]').click()
    await page
      .locator('input[name="credentials.passcode"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  } else {
    // Handle old factor selector
    const selectFactorExists = await body
      .locator('.button.select-factor.link-button')
      .count()
    if (selectFactorExists > 0) {
      await body.locator('.button.select-factor.link-button').click()
      await page
        .locator('input[name="credentials.passcode"]')
        .waitFor({ state: 'visible', timeout: 10000 })
    }
  }
  await page.locator('input[name="credentials.passcode"]').fill(password)
  await page.locator('[type="submit"]').click()
  await page.waitForSelector('#app-header', { timeout: 60000 })
  await expect(page.locator('#app-header')).toContainText(userFullName)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}
