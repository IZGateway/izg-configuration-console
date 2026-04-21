import { Page, expect } from '@playwright/test'

export const logout = async (page: Page) => {
  await page.locator('#logout').click({ force: true })

  // Okta logout can land on app sign-in or different Okta username pages.
  const appHeader = page.locator('#app-header')
  const signInButton = page.getByRole('button', { name: 'Sign in with Okta' })
  const oktaIdentifier = page.locator('input[name="identifier"]')
  const oktaUsername = page.locator('input[name="username"]')

  await expect(async () => {
    const hasAppHeader = await appHeader.isVisible().catch(() => false)
    const hasSignInButton = await signInButton.isVisible().catch(() => false)
    const hasIdentifier = await oktaIdentifier.isVisible().catch(() => false)
    const hasUsername = await oktaUsername.isVisible().catch(() => false)

    if (!hasAppHeader || hasSignInButton || hasIdentifier || hasUsername) {
      return
    }

    throw new Error(`Logout did not complete yet. Current URL: ${page.url()}`)
  }).toPass({ timeout: 30000 })
}
