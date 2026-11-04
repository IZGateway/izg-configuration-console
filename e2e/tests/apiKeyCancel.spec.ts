/**
 * IGDD-3482 — §9.7 Cancel Pending Key (Ready for Validation)
 *
 * Acceptance criteria: e2e/specs/api-key-management/spec.md
 * → "Cancel a pending key".
 *
 * Cancel is a SOFT delete (design D1, revised from the original hard-delete
 * plan): the credential is set to `cancelled` and retained for audit, hidden
 * from the default view but surfaced by Status = Cancelled. The stat cards
 * count every fetched key, cancelled ones included, so none of them move.
 *
 * PRECONDITIONS
 *  - The spec provisions its own pending key: Create Key on a throwaway
 *    "Other" domain, closed at the challenge step. Nothing is validated, so
 *    unlike §9.3/§9.4 this needs no DNS bypass.
 *  - `FEATURE_API_KEY_MANAGEMENT_ENABLED=true` on the console under test; it
 *    is default-off, and without it /apikeys returns notFound.
 *  - The Okta user has canCreateApiKey and canCancelApiKey for at least one
 *    sender organization.
 *  - Each run leaves one Cancelled `e2e-cancel-*` row behind (hidden by
 *    default).
 */
import { expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import {
  createPendingKey,
  newDescription,
  newDomain,
} from '../helpers/apiKeyCreate'
import {
  API_KEYS_VIEWPORT,
  getStatCardValue,
  openApiKeyManagement,
} from '../helpers/apiKeyHelpers'

// loginToOkta alone budgets a 60s navigation retry plus 45s/30s/60s internal
// waits before the fixture even starts, so the config's 60s default is not
// enough. Matches loginLogout.spec.ts (120s) and connectionHistory.spec.ts (180s).
test.describe.configure({ timeout: 120000 })

// The grid and the row action buttons show only on a wide viewport. See
// API_KEYS_VIEWPORT.
test.use({ viewport: API_KEYS_VIEWPORT })

test.beforeAll(() => {
  const missing = ['OKTA_USERNAME', 'OKTA_PASSWORD'].filter(
    (name) => !process.env[name]
  )
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
})

test('Cancelling a pending key soft-cancels it: hidden by default, counts unchanged, filterable as Cancelled', async ({
  page,
}) => {
  const description = newDescription('cancel')

  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await openApiKeyManagement(page)
  await expect(
    page.getByRole('button', { name: 'Create Key' }),
    'Create Key not found. Is FEATURE_API_KEY_MANAGEMENT_ENABLED=true on the console under test? /apikeys returns notFound without it.'
  ).toBeVisible()

  const row = await test.step('Precondition: create a Ready for Validation key', () =>
    createPendingKey(page, { domain: newDomain(), description }))
  // The cell, the cancel dialog and the snackbar all render the same
  // `jurisdiction` field, so this is the exact text both must name.
  const org = (
    await row.locator('[data-field="jurisdiction"]').innerText()
  ).trim()

  const statCounts = async () => ({
    total: await getStatCardValue(page, 'TOTAL KEYS'),
    active: await getStatCardValue(page, 'ACTIVE'),
    revoked: await getStatCardValue(page, 'REVOKED'),
  })
  const countsBefore = await statCounts()

  // A pending key offers cancel, never revoke.
  const cancelButton = row.getByRole('button', { name: 'Cancel key' })
  await expect(cancelButton).toBeVisible()
  await expect(row.getByRole('button', { name: 'Revoke key' })).toHaveCount(0)

  await cancelButton.click()
  const cancelDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Cancel API Key Request' })
  await expect(cancelDialog).toBeVisible()
  await expect(cancelDialog).toContainText(
    `Cancel the pending request for ${org} | `
  )
  await expect(cancelDialog).toContainText('the record is retained for audit')
  // Distinct from revoke: cancellation records no reason.
  await expect(cancelDialog.getByRole('textbox')).toHaveCount(0)

  // Revoke is PATCH /api/apikeys and cancel is DELETE on the same path, so the
  // method is what proves cancel did not go through the revoke handler.
  let revokeCalls = 0
  page.on('request', (req) => {
    if (
      req.method() === 'PATCH' &&
      new URL(req.url()).pathname === '/api/apikeys'
    ) {
      revokeCalls++
    }
  })
  // Bounded, so a confirm that never sends the request fails here by name
  // rather than as an opaque whole-test timeout.
  const cancelResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'DELETE' &&
      new URL(r.url()).pathname === '/api/apikeys',
    { timeout: 15000 }
  )
  await cancelDialog.getByRole('button', { name: 'CONFIRM CANCELLATION' }).click()

  // Status only, not the body: reading it with `res.json()` was observed to
  // hang until the test timeout in Chromium (every attempt), while the status
  // was already 200. The soft-cancel itself is proven below (row hidden, then
  // retained under Status = Cancelled).
  expect((await cancelResponse).status()).toBe(200)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await expect(
    page.getByText(`${org} API Key request cancelled`, { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('The pending request has been cancelled.')
  ).toBeVisible()

  // Gone from the default view. This also proves the post-cancel refetch has
  // landed, so the "unchanged" counts below can't pass by reading stale data.
  await expect(row).toHaveCount(0)
  expect(await statCounts()).toEqual(countsBefore)
  expect(revokeCalls).toBe(0)

  // Retained, not deleted: Status = Cancelled brings the row back. The search
  // box still holds the description, so `row` narrows to it again.
  await page.getByRole('button', { name: 'Filters' }).click()
  await page.getByRole('combobox', { name: 'Status' }).click()
  await page.getByRole('option', { name: 'Cancelled', exact: true }).click()
  await expect(page.getByRole('listbox')).toBeHidden()
  await page.keyboard.press('Escape')

  await expect(row).toHaveCount(1)
  await expect(row).toContainText(/Cancelled \d{1,2}\/\d{1,2}\/\d{4}/)
  await expect(row.getByRole('button')).toHaveCount(0)
})
