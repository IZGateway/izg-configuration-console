import { Page, expect } from '@playwright/test'

export const loginToOkta = async (
  page: Page,
  username: string,
  password: string,
  userFullName: string = 'Automation Testerson'
) => {
  await page.goto('/', { waitUntil: 'load', timeout: 120000 })

  const appHeader = page.locator('#app-header')
  const logoutButton = page.locator('#logout')

  // If already authenticated, either reuse current session or logout when switching users.
  if (await appHeader.isVisible().catch(() => false)) {
    const currentHeaderText = (await appHeader.textContent()) || ''
    if (currentHeaderText.includes(userFullName)) {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      return
    }

    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click()
    }
  }

  // Depending on the previous state, we may either be on the app landing page
  // with a "Sign in with Okta" button or already on the Okta login page.
  const signInButton = page.getByRole('button', { name: 'Sign in with Okta' })
  if (await signInButton.isVisible().catch(() => false)) {
    await signInButton.click()
  }

  // Wait for an expected auth state to appear.
  const identifierInput = page.locator('input[name="identifier"]')
  const usernameInput = page.locator('input[name="username"]')
  const oktaPasswordInput = page.locator('input[name="credentials.passcode"]')
  const classicPasswordInput = page.locator('input[name="password"]')

  const startedAt = Date.now()
  while (Date.now() - startedAt < 30000) {
    const hasHeader = await appHeader.isVisible().catch(() => false)
    const hasIdentifier = await identifierInput.isVisible().catch(() => false)
    const hasUsername = await usernameInput.isVisible().catch(() => false)
    const hasOktaPassword = await oktaPasswordInput
      .isVisible()
      .catch(() => false)
    const hasClassicPassword = await classicPasswordInput
      .isVisible()
      .catch(() => false)

    if (
      hasHeader ||
      hasIdentifier ||
      hasUsername ||
      hasOktaPassword ||
      hasClassicPassword
    ) {
      break
    }

    if (await signInButton.isVisible().catch(() => false)) {
      await signInButton.click()
    }

    await page.waitForTimeout(500)
  }

  if (await appHeader.isVisible().catch(() => false)) {
    const currentHeaderText = (await appHeader.textContent()) || ''
    if (currentHeaderText.includes(userFullName)) {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      return
    }

    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click({ force: true })
    }
  }

  const hasIdentifier = await identifierInput.isVisible().catch(() => false)
  const hasUsername = await usernameInput.isVisible().catch(() => false)
  const hasClassicPassword = await classicPasswordInput
    .isVisible()
    .catch(() => false)

  if (!hasIdentifier && !hasUsername && !hasClassicPassword) {
    throw new Error(
      `Okta login form did not appear. Current URL: ${page.url()}`
    )
  }

  if (hasIdentifier) {
    await identifierInput.fill(username)
    await page.locator('[type="submit"]').click()
  } else if (hasUsername && hasClassicPassword) {
    await usernameInput.fill(username)
    await classicPasswordInput.fill(password)
    await page.locator('[type="submit"]').click()
    await page.waitForSelector('#app-header', { timeout: 60000 })
    await expect(page.locator('#app-header')).toContainText(userFullName)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    return
  } else if (hasUsername) {
    await usernameInput.fill(username)
    await page.locator('[type="submit"]').click()
  }

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

  if (await oktaPasswordInput.isVisible().catch(() => false)) {
    await oktaPasswordInput.fill(password)
  } else {
    await classicPasswordInput.fill(password)
  }

  await page.locator('[type="submit"]').click()
  await page.waitForSelector('#app-header', { timeout: 60000 })
  await expect(page.locator('#app-header')).toContainText(userFullName)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}
