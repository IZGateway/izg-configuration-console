import { Page, BrowserContext, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { createApiKeyWithExistingDomain } from '../helpers/createApiKey'

// Acceptance criteria: e2e/specs/api-key-management/spec.md
// → "Revoke an active key".
//
// Precondition: a fresh Active key on a domain that is already authorized for
// this organization and environment. Names must match the dropdown labels.
const TEST_ORG_NAME = 'Audacious Inquiry LLC'
const TEST_ENV_NAME = 'Development'
const AUTHORIZED_TEST_DOMAIN = 'revokeKey.fastTrack.playwright.org'
const TEST_USE_TYPE = 'Provider'
const REVOKE_REASON = 'Automated test revocation'

let context: BrowserContext
let page: Page

const revokedCount = async () =>
  Number(
    await page
      .getByTestId('stat-card-revoked')
      .getByTestId('stat-card-value')
      .innerText()
  )

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
})

test.beforeEach(async () => {
  await page.goto('/apikeys')
  await page.waitForLoadState('networkidle')
})

test.afterAll(async () => {
  if (page) await logout(page).catch(() => {})
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})

test('Revoking an active key sets status to Revoked and disables further actions', async () => {
  const description = `E2E revoke ${Date.now()}`

  const row = await test.step('Precondition: create an Active key', () =>
    createApiKeyWithExistingDomain(page, {
      org: TEST_ORG_NAME,
      env: TEST_ENV_NAME,
      domain: AUTHORIZED_TEST_DOMAIN,
      useType: TEST_USE_TYPE,
      description,
    })
  )
  const revokedBefore = await revokedCount()

  await row.getByLabel('Revoke key').click()

  const revokeDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Revoke API Key' })
  await expect(revokeDialog).toBeVisible()
  await expect(revokeDialog).toContainText(`Revoking ${TEST_ORG_NAME} |`)
  await expect(revokeDialog).toContainText('this cannot be undone')
  await expect(
    revokeDialog.getByText(
      'Any integration using this key will stop working immediately upon revocation.'
    )
  ).toBeVisible()

  await revokeDialog.getByLabel('Reason (optional)').fill(REVOKE_REASON)
  await revokeDialog.getByRole('button', { name: 'CONFIRM REVOCATION' }).click()
  await expect(revokeDialog).toBeHidden()

  await expect(
    page.getByText(`${TEST_ORG_NAME} API Key revoked`)
  ).toBeVisible()
  await expect(page.getByText('This key can no longer be used.')).toBeVisible()

  await expect(row.getByTestId('FlagIcon')).toBeVisible()
  await expect(row).toContainText(/Revoked \d{1,2}\/\d{1,2}\/\d{4}/)
  await expect(row.getByRole('button')).toHaveCount(0)

  await expect
    .poll(revokedCount)
    .toBe(revokedBefore + 1)
})
