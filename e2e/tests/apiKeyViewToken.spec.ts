/**
 * IGDD-3479 — §9.4 View / Reveal Token (already-active, not-yet-viewed key)
 *
 * Acceptance criteria: e2e/specs/api-key-management/spec.md
 * → "View / reveal token".
 *
 * PRECONDITION: an Active credential whose token has not been viewed
 * (`viewedAt` unset). The spec provisions its own, exactly as the ticket
 * describes — run the DNS challenge, validate, then close the success dialog
 * with CLOSE instead of VIEW KEY. Two other routes do not work:
 *   - the existing-authorized-domain path (§9.2) auto-reveals the token on
 *     creation, so it can never leave one unviewed;
 *   - reusing whatever unviewed key happens to be in the table is
 *     order-dependent and consumes shared state, since reveal is one-shot.
 *
 * The Okta user needs canCreateApiKey for the fixture, plus canRenewApiKey and
 * canRevokeApiKey for step 4's "only Renew/Revoke remain" assertion.
 *
 * Also requires `FEATURE_API_KEY_MANAGEMENT_ENABLED=true` on the console under
 * test: it is default-off, and without it /apikeys returns notFound.
 *
 * Provisioning that way means this spec needs the server-side DNS bypass, so
 * it carries the same `DNS_VERIFY_BYPASS_AVAILABLE` opt-in as the §9.3 spec
 * and skips with a reason when it is unavailable.
 */
import { expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import {
  ActionIcon,
  createActiveUnviewedKey,
  findRowByDescription,
  newDescription,
  newDomain,
  requiresDnsBypass,
  rowAction,
  tokenDialog,
} from '../helpers/apiKeyCreate'
import { API_KEYS_VIEWPORT } from '../helpers/apiKeyHelpers'

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

test('Unviewed active key can be revealed once; view icon disappears after', async ({
  page,
}) => {
  requiresDnsBypass()

  const domain = newDomain()
  const description = newDescription('view-token')

  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/apikeys', { waitUntil: 'networkidle' })
  await expect(
    page.getByRole('button', { name: 'Create Key' }),
    'Create Key not found. Is FEATURE_API_KEY_MANAGEMENT_ENABLED=true on the console under test? /apikeys returns notFound without it.'
  ).toBeVisible()
  await createActiveUnviewedKey(page, { domain, description })

  // Step 1 — the row is Active and offers the eye (View key) action, because
  // the token has not been revealed yet.
  const row = await findRowByDescription(page, description)
  await expect(row).toContainText('Active')
  await expect(rowAction(row, ActionIcon.viewKey)).toBeVisible()

  // Step 2 — clicking it reveals the token, once.
  await rowAction(row, ActionIcon.viewKey).click()
  const dialog = tokenDialog(page)
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText('Validation Completed. Copy this token now')
  ).toBeVisible()
  await expect(
    dialog.getByText('The secret cannot be retrieved after closing this dialog')
  ).toBeVisible()
  await expect(
    dialog.getByTestId('api-key-token').getByRole('textbox')
  ).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/)

  // Step 3 — COPY TOKEN acknowledges the copy, then reverts.
  const copyButton = dialog.getByRole('button', { name: 'COPY TOKEN' })
  await expect(copyButton).toBeVisible()
  await copyButton.click()
  // `exact` is required: accessible-name matching is case-insensitive, and the
  // token field's own copy IconButton takes aria-label "Copied!" from its
  // Tooltip at the same moment — without it this matches two buttons.
  await expect(
    dialog.getByRole('button', { name: 'COPIED!', exact: true })
  ).toBeVisible()
  // "Briefly": the acknowledgement is on a 2s timer and then goes back.
  await expect(copyButton).toBeVisible({ timeout: 10000 })

  await dialog.getByRole('button', { name: 'CLOSE' }).click()
  await expect(dialog).toBeHidden()

  // Step 4 — the eye is gone and only Renew/Revoke remain. Anchor on the
  // ACTION cell first: DataGrid virtualizes columns, so a bare count of 0 would
  // also be satisfied by the cell not being rendered at all.
  const actionCell = row.locator('[data-field="actions"]')
  await expect(actionCell).toBeVisible()
  await expect(rowAction(row, ActionIcon.viewKey)).toHaveCount(0)
  // Renew and Revoke are gated on canRenewApiKey / canRevokeApiKey, which are
  // separate capabilities from the canCreateApiKey the fixture needs — hence
  // the extra precondition in the header rather than a silent dependency.
  await expect(rowAction(row, ActionIcon.renewKey)).toBeVisible()
  await expect(rowAction(row, ActionIcon.revokeKey)).toBeVisible()

  // The one-shot is persisted server-side (viewedAt), not just local state, so
  // it survives a reload. Without this the assertion above could pass on a
  // client-side flag alone.
  await page.reload({ waitUntil: 'networkidle' })
  const reloadedRow = await findRowByDescription(page, description)
  await expect(reloadedRow).toContainText('Active')
  await expect(reloadedRow.locator('[data-field="actions"]')).toBeVisible()
  await expect(rowAction(reloadedRow, ActionIcon.viewKey)).toHaveCount(0)
})
