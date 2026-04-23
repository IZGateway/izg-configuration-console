import { Page, Locator, expect } from '@playwright/test'
import { logout } from './logout'

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

  // After a logout, the browser may still be mid-redirect on Okta's signout
  // chain. Retry the navigation until it lands cleanly.
  await expect(async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  }).toPass({ timeout: 60000, intervals: [2000] })

  const appHeader = page.locator('#app-header')
  const signInWithOktaButton = page.getByRole('button', {
    name: /sign in with okta/i,
  })
  const identifierInput = page.locator(
    'input[name="identifier"], input#okta-signin-username'
  )
  const passwordInput = page.locator(
    'input[name="credentials.passcode"], input[name="password"], input#okta-signin-password'
  )

  // If the app landing page shows a "Sign in with Okta" button, click it
  // before waiting for Okta form fields.
  if (await signInWithOktaButton.isVisible().catch(() => false)) {
    await signInWithOktaButton.click()
  }

  await expect(async () => {
    const headerVisible = await appHeader.isVisible().catch(() => false)
    const identifierVisible = await identifierInput.first().isVisible().catch(() => false)
    const passwordVisible = await passwordInput.first().isVisible().catch(() => false)
    expect(headerVisible || identifierVisible || passwordVisible).toBeTruthy()
  }).toPass({ timeout: 45000 })

  if (await appHeader.isVisible().catch(() => false)) {
    const headerText = (await appHeader.innerText().catch(() => '')).trim()
    if (headerText.toLowerCase().includes(userFullName.toLowerCase())) {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      return
    }

    // Session is valid but for the wrong user; sign out first so we can
    // authenticate with the requested account.
    await logout(page)
    if (await signInWithOktaButton.isVisible().catch(() => false)) {
      await signInWithOktaButton.click()
    }
  }

  // Wait for the Okta login form to fully load (past the intermediate redirect page)
  if (await identifierInput.first().isVisible().catch(() => false)) {
    await identifierInput.first().waitFor({ state: 'visible', timeout: 20000 })
    await setInputValue(identifierInput.first(), username)
    await page.locator('[type="submit"]').first().click()
  }

  // Wait for Okta to transition away from identifier step - could land on:
  // 1. Password input directly
  // 2. Old factor selector (.button.select-factor.link-button)
  // 3. New authenticator list screen (#form52 with Email/Password options)
  await page
    .locator(
      'input[name="credentials.passcode"], input[name="password"], .button.select-factor.link-button'
    )
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })

  const body = page.locator('body')

  // Handle new authenticator selection screen (Email / Password list)
  const authenticatorListExists = (await body.locator('#form52').count()) > 0
  if (authenticatorListExists) {
    // Click the "Select" link for the Password option using its data-se attribute
    await page.locator('[data-se="okta_password"] a[data-se="button"]').click()
    await page
      .locator('input[name="credentials.passcode"]')
      .waitFor({ state: 'visible', timeout: 15000 })
  }
  await setInputValue(passwordInput.first(), password)
  await page.locator('[type="submit"]').first().click()
  await page.waitForSelector('#app-header', { timeout: 60000 })
  await expect(page.locator('#app-header')).toContainText(userFullName)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}
