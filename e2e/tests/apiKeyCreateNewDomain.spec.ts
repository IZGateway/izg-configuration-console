/**
 * IGDD-3478 — §9.3 Create Key: New Domain (DNS challenge path)
 *
 * Acceptance criteria: e2e/specs/api-key-management/spec.md
 * → "Create Key: new domain (DNS challenge)".
 *
 * Covers both entry points into DNS domain validation:
 *   1. In-dialog: Create Key -> NEXT -> "Verify Domain Ownership" -> VALIDATE
 *      -> "Validation Completed!" -> VIEW KEY (one-time token).
 *   2. From the table: close the dialog at the challenge step, then use the
 *      row's Validate domain action on the `Ready for Validation` row.
 *
 * Plus the client-side FQDN validation on the custom DNS field, and the
 * failure/TRY AGAIN state (which must not mint a new challenge UUID).
 *
 * PRECONDITIONS
 *  - Three of the four tests drive the DNS challenge to completion and so need
 *    the server-side bypass — see `requiresDnsBypass`. They invent a throwaway
 *    domain, so without it the real TXT lookup returns NXDOMAIN and validation
 *    can never succeed.
 *  - `FEATURE_API_KEY_MANAGEMENT_ENABLED=true` on the console under test. It
 *    is default-off, and without it /apikeys returns notFound, so every test
 *    here dies on an opaque "Create Key" action timeout.
 *  - The Okta user can create keys for at least one sender organization
 *    (canCreateApiKeys), and that org has at least one permitted use type.
 *  - Each test mints its own `e2e-<timestamp>.iz.gateway.org`, so the "no
 *    existing ApiKeyDomain authorization for this (env, jurisdiction, domain)
 *    triple" precondition holds on every run, including retries.
 *  - These tests leave their credentials behind (Active, never revoked). There
 *    is no teardown, so repeated runs accumulate `e2e-*` rows in the target
 *    table.
 */
import { expect, Locator, Page, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import {
  ActionIcon,
  createDialog,
  fillCreateFormForNewDomain,
  findRowByDescription,
  newDescription,
  newDomain,
  readChallengeValue,
  requiresDnsBypass,
  rowAction,
  stepDialog,
  submitCreateForm,
  tokenDialog,
  VERIFY_DOMAIN_URL,
} from '../helpers/apiKeyCreate'
import { API_KEYS_VIEWPORT } from '../helpers/apiKeyHelpers'

// loginToOkta alone budgets a 60s navigation retry plus 45s/30s/60s internal
// waits before the create flow even starts, so the config's 60s default is not
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

const openCreateKeyDialog = async (page: Page) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/apikeys', { waitUntil: 'networkidle' })
  await expect(
    page.getByRole('button', { name: 'Create Key' }),
    'Create Key not found. Is FEATURE_API_KEY_MANAGEMENT_ENABLED=true on the console under test? /apikeys returns notFound without it.'
  ).toBeVisible()
  await page.getByRole('button', { name: 'Create Key' }).click()
  await expect(createDialog(page)).toBeVisible()
}

/**
 * Clicks a row's Validate domain action and waits out the dialog's `loading`
 * step. That dialog GETs the persisted challenge before it can render the TXT
 * pair, and its title is identical in both steps — so waiting on the title
 * alone returns a dialog holding nothing but a spinner.
 */
const openRowValidateDialog = async (page: Page, row: Locator) => {
  await rowAction(row, ActionIcon.validateDomain).click()
  const dialog = stepDialog(page, 'Verify Domain Ownership')
  await expect(dialog).toContainText(
    'Add the following DNS TXT record at your DNS provider to prove ownership'
  )
  return dialog
}

test('Create key for a new domain shows DNS challenge, then issues token on validation', async ({
  page,
}) => {
  requiresDnsBypass()

  const domain = newDomain()
  const description = newDescription('dns')

  await openCreateKeyDialog(page)
  await fillCreateFormForNewDomain(page, { domain, description })
  await submitCreateForm(page)

  // Step 3 — the challenge step: TXT host/value pair plus the propagation note.
  const challengeDialog = stepDialog(page, 'Verify Domain Ownership')
  await expect(
    challengeDialog.getByText(
      'Add the following DNS TXT record at your DNS provider'
    )
  ).toBeVisible()
  // The record goes at the domain apex, so the TXT host is the domain itself.
  await expect(challengeDialog).toContainText(domain)
  const challengeValue = await readChallengeValue(challengeDialog)
  await expect(
    challengeDialog.getByText('DNS changes may take up to 48 hours to propagate.')
  ).toBeVisible()

  // Steps 4/5 — the TXT record is satisfied by the bypass; nothing is
  // published to real DNS.
  await challengeDialog.getByRole('button', { name: 'VALIDATE' }).click()

  const successDialog = stepDialog(page, 'Validation Completed!')
  await expect(successDialog).toBeVisible({ timeout: 20000 })
  await expect(
    successDialog.getByRole('heading').getByTestId('CheckCircleIcon')
  ).toBeVisible()
  // The same host/value pair is shown again, now for cleanup.
  await expect(successDialog).toContainText(domain)
  await expect(successDialog).toContainText(challengeValue)
  await expect(successDialog.getByText('You can now remove this record.')).toBeVisible()

  await successDialog.getByRole('button', { name: 'VIEW KEY' }).click()

  const keyDialog = tokenDialog(page)
  await expect(
    keyDialog.getByText('Validation Completed. Copy this token now')
  ).toBeVisible()
  await expect(
    keyDialog.getByTestId('api-key-token').getByRole('textbox')
  ).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/)
  await keyDialog.getByRole('button', { name: 'CLOSE' }).click()

  // Step 6 — the new row is Active and carries the domain it was issued for.
  const row = await findRowByDescription(page, description)
  await expect(row).toContainText('Active')
  await expect(row).toContainText(domain)
  // The token really was one-time: having been revealed, the row stops
  // offering View key. §9.4 covers that path in full. Anchor on the ACTION
  // cell first — DataGrid virtualizes columns, so a bare count of 0 would also
  // be satisfied by the cell not being rendered. Deliberately the cell and not
  // a sibling action: Renew is gated on canRenewApiKey, a different capability
  // from the canCreateApiKey these tests require.
  await expect(row.locator('[data-field="actions"]')).toBeVisible()
  await expect(rowAction(row, ActionIcon.viewKey)).toHaveCount(0)
})

test('Custom domain name is validated client-side before allowing submission', async ({
  page,
}) => {
  await openCreateKeyDialog(page)
  const dialog = createDialog(page)

  // Fill everything else first, so NEXT's disabled state can only be down to
  // the domain field. With the form otherwise empty this assertion would pass
  // even if domain validation were removed entirely.
  await fillCreateFormForNewDomain(page, {
    domain: 'dev.iz.gateway.org',
    description: newDescription('fqdn'),
  })
  const next = dialog.getByRole('button', { name: 'NEXT' })
  await expect(next).toBeEnabled()

  const customDomain = dialog.getByPlaceholder('dev.iz.gateway.org')
  const inlineError = dialog.getByText('Enter a valid domain name')

  for (const malformed of [
    'not-a-domain', // no dot — not an FQDN
    '-dev.iz.gateway.org', // leading hyphen in a label
    'dev-.iz.gateway.org', // trailing hyphen in a label
    'dev..iz.gateway.org', // empty label
  ]) {
    await customDomain.fill(malformed)
    await expect(inlineError, `expected "${malformed}" to be rejected`).toBeVisible()
    await expect(next, `expected NEXT disabled for "${malformed}"`).toBeDisabled()
  }

  // A valid FQDN clears the error and re-enables NEXT.
  await customDomain.fill('dev.iz.gateway.org')
  await expect(inlineError).toBeHidden()
  await expect(next).toBeEnabled()
})

test('Validation failure repeats the TXT instructions and retries the same challenge', async ({
  page,
}) => {
  requiresDnsBypass()

  const domain = newDomain()
  const description = newDescription('dns-retry')

  // POST /api/apikeys is the only call that mints a challenge UUID, so counting
  // it is what actually proves TRY AGAIN reuses the existing challenge. The
  // displayed TXT value alone cannot show that: it comes from React state that
  // handleValidate never writes, so it would look unchanged either way.
  let createPosts = 0
  page.on('request', (req) => {
    if (
      req.method() === 'POST' &&
      new URL(req.url()).pathname === '/api/apikeys'
    ) {
      createPosts++
    }
  })

  await openCreateKeyDialog(page)
  await fillCreateFormForNewDomain(page, { domain, description })
  await submitCreateForm(page)
  expect(createPosts).toBe(1)

  const challengeDialog = stepDialog(page, 'Verify Domain Ownership')
  const challengeValue = await readChallengeValue(challengeDialog)

  // Force the not-yet-propagated outcome. The bypass makes the real lookup
  // always succeed, so the failure state is only reachable by stubbing the
  // response — which also lets us inspect exactly what each attempt posts.
  const attempts: Array<Record<string, unknown>> = []
  await page.route(VERIFY_DOMAIN_URL, async (route) => {
    // Only the submit is stubbed. The row-action dialog GETs this same path to
    // re-read the challenge; pass that through or we would mask a real
    // regression. (VERIFY_DOMAIN_URL ends in `*` so the GET does match here.)
    if (route.request().method() !== 'POST') return route.fallback()
    attempts.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verified: false,
        error: `TXT record not found at ${domain}. DNS may not have propagated yet.`,
      }),
    })
  })

  await challengeDialog.getByRole('button', { name: 'VALIDATE' }).click()

  const failureDialog = stepDialog(page, 'Validation Failed')
  await expect(failureDialog).toBeVisible()
  await expect(
    failureDialog.getByRole('heading').getByTestId('WarningAmberIcon')
  ).toBeVisible()
  await expect(
    failureDialog.getByText("We couldn't find the expected record")
  ).toBeVisible()
  // The same TXT instructions are repeated so the user can fix and retry.
  await expect(failureDialog).toContainText(domain)
  await expect(failureDialog).toContainText(challengeValue)
  await expect(failureDialog).toContainText('DNS may not have propagated yet')

  // TRY AGAIN re-attempts the same lookup; it must not mint a new challenge.
  await failureDialog.getByRole('button', { name: 'TRY AGAIN' }).click()
  // Nothing in the DOM changes to wait on: handleValidate leaves step ===
  // 'failure' for the whole retry, so the dialog never leaves this step. Poll
  // the intercepted calls instead — asserting the length directly races the
  // fetch round-trip and reads length 1.
  await expect.poll(() => attempts.length).toBe(2)
  expect(await readChallengeValue(failureDialog)).toEqual(challengeValue)
  // Guards against the comparison below passing on two nulls.
  expect(attempts[0]).toMatchObject({ domain, jti: expect.any(String) })
  expect(attempts[1]).toEqual(attempts[0])
  expect(createPosts).toBe(1)

  // With the record "propagated", the same challenge now validates.
  await page.unroute(VERIFY_DOMAIN_URL)
  await failureDialog.getByRole('button', { name: 'TRY AGAIN' }).click()
  await expect(stepDialog(page, 'Validation Completed!')).toBeVisible({
    timeout: 20000,
  })
})

test('Validate domain row action succeeds without reopening the create dialog', async ({
  page,
}) => {
  requiresDnsBypass()

  const domain = newDomain()
  const description = newDescription('dns-row')

  await openCreateKeyDialog(page)
  await fillCreateFormForNewDomain(page, { domain, description })
  await submitCreateForm(page)

  // Walk away at the challenge step, as a tester would while waiting out DNS
  // propagation. The credential is already persisted at this point.
  const challengeDialog = stepDialog(page, 'Verify Domain Ownership')
  const challengeValue = await readChallengeValue(challengeDialog)
  await challengeDialog.getByRole('button', { name: 'CLOSE' }).click()
  // Not `expect(challengeDialog).toBeHidden()`: handleClose resets the step in
  // the same commit as onClose, so that text-filtered locator resolves to zero
  // elements either way and the assertion could never fail.
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const row = await findRowByDescription(page, description)
  await expect(row).toContainText('Ready for Validation')

  // First attempt: the record has not propagated. Only the POST is stubbed, so
  // the dialog's own GET still re-reads the real persisted challenge.
  await page.route(VERIFY_DOMAIN_URL, async (route) => {
    // Pass the challenge re-read GET through; only stub the submit.
    if (route.request().method() !== 'POST') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        verified: false,
        error: `TXT record not found at ${domain}. DNS may not have propagated yet.`,
      }),
    })
  })

  // The row action does not post blind. It re-fetches the still-pending
  // challenge (GET /verify-domain) and re-displays the TXT pair in its own
  // dialog before offering VALIDATE, so a tester who never copied the record at
  // create time is not stuck with an unusable credential.
  const validateDialog = await openRowValidateDialog(page, row)
  await expect(validateDialog).toContainText(domain)
  // Re-read from persisted state, so it must be the same challenge — not a
  // freshly minted UUID that would invalidate a record already published.
  expect(await readChallengeValue(validateDialog)).toEqual(challengeValue)

  await validateDialog.getByRole('button', { name: 'VALIDATE' }).click()

  // Failure here is a snackbar, not a dialog step, and the row holds its
  // status so the attempt can simply be repeated.
  await expect(page.getByText('DNS validation failed')).toBeVisible({
    timeout: 20000,
  })
  await expect(row).toContainText('Ready for Validation')

  // Second attempt, with the record "propagated".
  await page.unroute(VERIFY_DOMAIN_URL)
  const retryDialog = await openRowValidateDialog(page, row)
  // Still the same challenge after a failed attempt — no new UUID was minted.
  expect(await readChallengeValue(retryDialog)).toEqual(challengeValue)
  await retryDialog.getByRole('button', { name: 'VALIDATE' }).click()

  // Deliberately not asserting the organization name: the dropdown label is
  // `description || name || id` while the snackbar renders
  // `jurisdictionDescription ?? jurisdictionId`, and those differ for an org
  // with no description — a failure unrelated to the behaviour under test.
  await expect(page.getByText(/API Key is active/)).toBeVisible({
    timeout: 20000,
  })
  await expect(page.getByText('DNS domain successfully verified.')).toBeVisible()
  // The create dialog is not open now (a point-in-time check, not proof it
  // was never reopened in between).
  await expect(createDialog(page)).toHaveCount(0)

  await expect(row).toContainText('Active')
  // The token is not revealed here — §9.4 covers viewing it from the row.
  await expect(rowAction(row, ActionIcon.viewKey)).toBeVisible()
})
