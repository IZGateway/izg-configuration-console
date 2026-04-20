import { Page, Locator, expect } from '@playwright/test'

const setInputValue = async (locator: Locator, value: string) => {
  await locator.evaluate((el, val) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!
    setter.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

export const loginToOkta = async (
  page: Page,
  username: string,
  password: string,
  userFullName: string = 'Automation Testerson'
) => {
  if (typeof username !== 'string' || username.length === 0) {
    throw new Error(
      'loginToOkta: username is missing or empty (check OKTA_USERNAME env var)'
    )
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error(
      'loginToOkta: password is missing or empty (check OKTA_PASSWORD env var)'
    )
  }

  await page.goto('/', { waitUntil: 'load', timeout: 120000 })

  const appHeader = page.locator('#app-header')
  const logoutButton = page.locator('#logout')

  // Wait for the Okta login form to fully load (past the intermediate redirect page)
  await page
    .locator('input[name="identifier"]')
    .waitFor({ state: 'visible', timeout: 20000 })
  await setInputValue(page.locator('input[name="identifier"]'), username)
  await page.locator('[type="submit"]').click()

  // Wait for Okta to transition away from identifier step
  await page
    .locator(
      'input[name="credentials.passcode"], input[name="password"], .button.select-factor.link-button'
    )
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })

  const body = page.locator('body')
  const selectFactorExists = await body
    .locator('.button.select-factor.link-button')
    .count()
  if (selectFactorExists > 0) {
    await body.locator('.button.select-factor.link-button').click()
    await page
      .locator('input[name="credentials.passcode"]')
      .waitFor({ state: 'visible', timeout: 15000 })
  }
  await setInputValue(
    page.locator('input[name="credentials.passcode"]'),
    password
  )
  await page.locator('[type="submit"]').click()
  await page.waitForSelector('#app-header', { timeout: 60000 })
  await expect(page.locator('#app-header')).toContainText(userFullName)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}
