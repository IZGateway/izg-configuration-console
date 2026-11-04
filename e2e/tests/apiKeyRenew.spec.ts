import { Page, BrowserContext, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { apiKeyRow } from '../helpers/createApiKey'
import {
  automationDomain,
  createActiveKeyOnNewDomain,
  requiresDnsBypass,
} from '../helpers/apiKeyCreate'
import { API_KEYS_VIEWPORT } from '../helpers/apiKeyHelpers'

// Acceptance criteria: e2e/specs/api-key-management/spec.md
// → "Renew API Key".
//
// Precondition: an Active key. The test mints its own on a single-use custom
// domain — "Other" in the DNS Name dropdown plus a typed Custom DNS Name —
// rather than picking a hand-seeded domain out of the dropdown. That keeps it
// self-contained (no other spec has to have run first, and renewal is one-way
// Active → Grace Period, so renewing a found row would make this
// order-dependent and consume a fixture other specs may need) and, because the
// domain is fresh every run, it needs nothing provisioned in advance and
// cannot collide with another spec's scope.
//
// The cost is that minting a new domain means completing a DNS challenge, so
// this test requires `ALLOW_DNS_VERIFY_BYPASS=true` on the console under test
// and skips without the `DNS_VERIFY_BYPASS_AVAILABLE=true` opt-in — see
// `requiresDnsBypass`. The deployed dev console does not set the bypass today,
// so this spec skips on the nightly until it does.
//
// Organization/Environment/Use Type names must match the dropdown labels.
const TEST_ORG_NAME = 'Audacious Inquiry LLC'
const TEST_ENV_NAME = 'Development'
const TEST_USE_TYPE = 'Provider'

const DAY_MS = 24 * 60 * 60 * 1000

// The two renewal rules this test pins, mirroring
// src/pages/api/apikeys/renew/index.ts (THIRTY_DAYS_MS / ONE_YEAR_MS).
//
// Deliberately duplicated rather than imported: those are function-local consts
// in an API route whose only export is the withMiddleware default, so importing
// them means exporting them and pulling dbClient + the AWS SDK into the test
// process. And RENEW_EARLY_THRESHOLD_DAYS is a precondition guard, not a
// re-implementation — it asserts the fixture lands in the ">30 days before old
// expiry" branch. Importing it would move the guard in lockstep with a bad
// change to the rule, and the test would keep passing while silently checking
// the wrong branch.
const RENEW_EARLY_THRESHOLD_DAYS = 30
const RENEWAL_TERM_DAYS = 365

let context: BrowserContext
let page: Page

const cell = (row: ReturnType<typeof apiKeyRow>, field: string) =>
  row.locator(`[data-field="${field}"]`)

// The created and expiry dates share one DURATION cell, stacked as
// "Created: <date>" over "Expires: <date>", under `field: 'created'` — there is
// no EXPIRES column of its own. So the expiry is pulled out by its label.
//
// The dates are `toLocaleDateString()` in the context's locale, pinned to
// en-US in beforeAll so this M/D/YYYY match holds on every browser project.
// Matched explicitly rather than handed to `new Date()`, whose treatment of
// bare date strings is implementation-defined.
const readExpiry = async (row: ReturnType<typeof apiKeyRow>): Promise<Date> => {
  const text = await cell(row, 'created').innerText()
  const match = text.match(/Expires:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  expect(
    match,
    `expected "Expires: M/D/YYYY" in the DURATION cell, got:\n${text}`
  ).not.toBeNull()
  const [, month, day, year] = match!
  return new Date(Number(year), Number(month) - 1, Number(day))
}

/** Whole days from now to `date`, rounded — the cells are date-only. */
const daysFromNow = (date: Date) =>
  Math.round((date.getTime() - Date.now()) / DAY_MS)

test.beforeAll(async ({ browser }) => {
  // A context made here does not inherit test.use(), so the viewport and
  // locale are set on it directly — pinning `locale` in playwright.config.ts
  // would not reach this context. See API_KEYS_VIEWPORT.
  //
  // The locale is pinned because readExpiry matches M/D/YYYY: the grid renders
  // dates with a bare toLocaleDateString(), so the format follows the
  // browser's default locale. Chromium defaults to en-US, but on Linux the
  // Firefox and WebKit projects resolve their ICU default from LANG, and the
  // nightly runner ships LANG=C.UTF-8.
  context = await browser.newContext({
    viewport: API_KEYS_VIEWPORT,
    locale: 'en-US',
  })
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

test('Renewing an active key issues a new token and moves the old key to Grace Period', async () => {
  requiresDnsBypass()

  const testDomain = automationDomain('renew')
  const sourceDescription = `E2E renew source ${Date.now()}`
  const renewalDescription = `E2E renew successor ${Date.now()}`

  const sourceRow =
    await test.step('Precondition: create an Active key on a new custom domain', () =>
      createActiveKeyOnNewDomain(page, {
        org: TEST_ORG_NAME,
        env: TEST_ENV_NAME,
        domain: testDomain,
        useType: TEST_USE_TYPE,
        description: sourceDescription,
      }))

  // Which half of the expiry rule step 6 must assert. A key minted moments ago
  // expires ~365 days out, so renewal is comfortably >30 days early and the new
  // expiry must run 1 year from *today*. Asserted rather than assumed, so a
  // change to the create-time expiry fails loudly instead of silently checking
  // the wrong branch.
  const sourceExpiry = await readExpiry(sourceRow)
  expect(
    daysFromNow(sourceExpiry),
    'fixture key should expire well over 30 days out, so the ">30 days before old expiry" renewal rule applies'
  ).toBeGreaterThan(RENEW_EARLY_THRESHOLD_DAYS)

  const sourceOrganization = (
    await cell(sourceRow, 'jurisdiction').innerText()
  ).trim()
  const sourceEnvironment = (
    await cell(sourceRow, 'environment').innerText()
  ).trim()

  await sourceRow.getByRole('button', { name: 'Renew key' }).click()

  // The dialog explains the grace window.
  const renewDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Renew API Key' })
  await expect(renewDialog).toBeVisible()
  await expect(renewDialog).toContainText('A new key will be issued')
  await expect(renewDialog).toContainText('10 business days')

  // Jurisdiction, Environment, Use Types and Domain (upn) are carried over
  // read-only; Description is the only editable field.
  //
  // getByLabel is correct in *this* dialog, unlike the Create Key dialog the
  // selector policy warns about: these are real MUI TextFields with a `label`
  // prop, so MUI links the label to the input. Create Key's labels come from
  // FieldLabel/LabeledField, which render a bare <Typography> with no htmlFor.
  const jurisdictionField = renewDialog.getByLabel('Jurisdiction')
  const environmentField = renewDialog.getByLabel('Environment')
  const domainField = renewDialog.getByLabel('Domain (upn)')
  const descriptionField = renewDialog.getByLabel('Description (optional)')

  await expect(jurisdictionField).toHaveValue(sourceOrganization)
  await expect(environmentField).toHaveValue(sourceEnvironment)
  await expect(domainField).toHaveValue(testDomain)
  // The renewed key must keep the domain of the key it replaces — the server
  // sources upn, jurisdiction and environment(s) from the stored credential and
  // ignores the request body, so this is read-only rather than a required
  // input, and a renewal cannot be redirected to another scope.
  await expect(domainField).not.toBeEditable()
  await expect(jurisdictionField).not.toBeEditable()
  await expect(environmentField).not.toBeEditable()
  await expect(renewDialog).toContainText('Carried over from the existing key')
  await expect(descriptionField).toBeEditable()

  // 201 is the assertion that the renewal landed; 409 would mean the row's
  // Active status was stale (already renewed elsewhere).
  const renewed = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/apikeys/renew'
  )
  await descriptionField.fill(renewalDescription)
  await renewDialog.getByRole('button', { name: 'RENEW KEY' }).click()
  const renewResponse = await renewed
  expect(
    renewResponse.status(),
    `POST /api/apikeys/renew returned ${renewResponse.status()}: ${await renewResponse
      .text()
      .catch(() => '<no body>')}`
  ).toBe(201)

  // Renewal does not auto-reveal the way create does: it confirms first and
  // puts the one-time token behind VIEW KEY.
  const successDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Renewal Complete' })
  await expect(successDialog).toBeVisible()
  await expect(successDialog).toContainText('A new API key was created for')
  await expect(successDialog).toContainText('10 business days')
  await successDialog.getByRole('button', { name: 'VIEW KEY' }).click()

  // The one-time token, for the NEW credential.
  const tokenDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'View API Key' })
  await expect(tokenDialog).toBeVisible()
  await expect(
    tokenDialog.getByText('Validation Completed. Copy this token now')
  ).toBeVisible()
  await expect(
    tokenDialog.getByTestId('api-key-token').getByRole('textbox')
  ).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/)
  await tokenDialog.getByRole('button', { name: 'CLOSE' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // The old row is now in its grace period, with a stated end date and Revoke
  // as its only remaining action. STATUS renders "Grace period expires on
  // <date>" rather than the bare label once graceExpiresAt is set, so match
  // that text, not "Grace Period".
  await expect(sourceRow).toContainText(/Grace period expires on \d/)
  await expect(
    sourceRow.getByRole('button', { name: 'Revoke key' })
  ).toBeVisible()
  await expect(
    sourceRow.getByRole('button', { name: 'Renew key' })
  ).toHaveCount(0)
  await expect(sourceRow.getByRole('button', { name: 'View key' })).toHaveCount(
    0
  )

  // The successor row is Active, on the same scope, and is a distinct
  // credential rather than the same row relabelled.
  const newRow = apiKeyRow(page, renewalDescription)
  await expect(newRow).toContainText('Active')
  await expect(newRow).toContainText(testDomain)
  await expect(newRow).toContainText(sourceOrganization)
  await expect(newRow).toContainText(sourceEnvironment)
  // The token was just revealed, so the eye is already gone, leaving Renew and
  // Revoke.
  await expect(newRow.getByRole('button', { name: 'View key' })).toHaveCount(0)
  await expect(newRow.getByRole('button', { name: 'Renew key' })).toBeVisible()

  // The new expiry follows the >30-days-early rule pinned above: 1 year from
  // the renewal date, not an extension of the old expiry. The two branches stay
  // distinguishable even though the fixture key was created today — the "within
  // 30 days" branch would have produced ~730 days (old expiry + 1 year), not
  // ~365. The two expiry *dates* coinciding is expected (both endpoints add a
  // flat 365 days), so this asserts the interval, not that the dates differ.
  const newExpiry = await readExpiry(newRow)
  expect(
    Math.abs(daysFromNow(newExpiry) - RENEWAL_TERM_DAYS),
    `new expiry ${newExpiry.toDateString()} should be ~1 year from today (the >30-days-early rule), not ~1 year past the old expiry ${sourceExpiry.toDateString()}`
  ).toBeLessThanOrEqual(1)

  // Both outcomes are persisted, not just local SWR state.
  await page.reload({ waitUntil: 'networkidle' })
  await expect(apiKeyRow(page, sourceDescription)).toContainText(
    /Grace period expires on \d/
  )
  await expect(apiKeyRow(page, renewalDescription)).toContainText('Active')
})
