import { Page, expect } from '@playwright/test'

export const loginToOkta = async (
  page: Page,
  username: string,
  password: string,
  userFullName: string = 'Automation Testerson'
) => {
  await page.goto('/', { waitUntil: 'load', timeout: 120000 })

  await page.getByRole('button', { name: 'Sign in with Okta' }).click()

  // Wait for the Okta login form to fully load (past the intermediate redirect page)
  await page
    .locator('input[name="identifier"]')
    .waitFor({ state: 'visible', timeout: 20000 })
  await page
    .locator('input[name="identifier"]')
    .evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, username)
  await page.locator('[type="submit"]').click()

  // Wait for Okta to transition away from identifier step
  await page
    .locator(
      'input[name="credentials.passcode"], .button.select-factor.link-button'
    )
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })

  const body = page.locator('body')
  const selectFactorExists = await body
    .locator('.button.select-factor.link-button')
    .count()
  if (selectFactorExists > 0) {
    await body.locator('.button.select-factor.link-button').click()
    await page
      .locator('input[name="credentials.passcode"]')
      .waitFor({ state: 'visible', timeout: 10000 })
  }
  await page
    .locator('input[name="credentials.passcode"]')
    .evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )!.set!
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, password)
  await page.locator('[type="submit"]').click()
  await page.waitForSelector('#app-header', { timeout: 60000 })
  await expect(page.locator('#app-header')).toContainText(userFullName)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}
