import { Page, expect } from '@playwright/test'

// A cap on the whole sign-out. Okta's sign-out redirects normally take a few
// seconds, but in Edge on GitHub they can hang past the 60 s hook limit. Most
// callers sign out in afterAll and ignore the error, so a hang there would
// otherwise time out the hook and fail the sign-ins of the specs that follow.
const LOGOUT_DEADLINE_MS = 20000

const signOut = async (page: Page) => {
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
  }).toPass({ timeout: LOGOUT_DEADLINE_MS })
}

/**
 * Signs out through the app's Log Out link. Throws if that takes longer than
 * LOGOUT_DEADLINE_MS, whichever step hangs.
 */
export const logout = async (page: Page) => {
  const work = signOut(page)
  // If the deadline wins, the sign-out keeps running until the page or its
  // context closes. Its error then has nobody to report to.
  work.catch(() => {})
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `logout did not finish within ${LOGOUT_DEADLINE_MS / 1000} s. ` +
              `Current URL: ${page.url()}`
          )
        ),
      LOGOUT_DEADLINE_MS
    )
  })
  try {
    await Promise.race([work, deadline])
  } finally {
    clearTimeout(timer)
  }
}
