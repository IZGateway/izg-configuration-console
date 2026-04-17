import { Page } from '@playwright/test'

export const logout = async (page: Page) => {
  await page.locator('#logout').click({ force: true })

  // Okta logout can land on app sign-in or different Okta username pages.
  const signInButton = page.getByRole('button', { name: 'Sign in with Okta' })
  const oktaIdentifier = page.locator('input[name="identifier"]')
  const oktaUsername = page.locator('input[name="username"]')

  const startedAt = Date.now()
  while (Date.now() - startedAt < 30000) {
    const hasSignInButton = await signInButton.isVisible().catch(() => false)
    const hasIdentifier = await oktaIdentifier.isVisible().catch(() => false)
    const hasUsername = await oktaUsername.isVisible().catch(() => false)

    if (hasSignInButton || hasIdentifier || hasUsername) {
      return
    }

    await page.waitForTimeout(500)
  }

  throw new Error(`Logout did not reach sign-in page. Current URL: ${page.url()}`)
}
