/**
 * Shared Create Key helpers for the API key management specs.
 *
 * Acceptance criteria: `e2e/specs/api-key-management/spec.md`.
 *
 * Selector policy (from that file): reach form controls through the
 * `data-testid` hooks on the Create Key dialog, never by CSS class or field
 * label. The labels come from FieldLabel/LabeledField, which render a plain
 * <Typography> with no htmlFor/id link to the control beneath them, so
 * getByLabel('DNS Name') matches nothing.
 */
import { expect, Locator, Page, test } from '@playwright/test'

// Optional pins for the Create Key pickers. Left unset, each helper takes the
// first option the logged-in user is offered, so the specs run unchanged
// against any console whose user owns at least one sender organization.
const ORG = process.env.E2E_APIKEY_ORG
const ENV = process.env.E2E_APIKEY_ENV
const USE_TYPE = process.env.E2E_APIKEY_USE_TYPE

const CHALLENGE_PATTERN = /izg-challenge=[0-9a-fA-F-]{36}/
// Trailing `*` so the glob also matches the challenge re-read
// `GET ...?sortKey=...`. Without it that request never matches this route
// and the method guard in the handlers below would be unreachable.
export const VERIFY_DOMAIN_URL = '**/api/apikeys/verify-domain*'

/**
 * MUI icon `data-testid`s for addressing row ACTION buttons via `rowAction`.
 * ActionIconButton also sets `aria-label={title}` on the IconButton itself, so
 * `row.getByRole('button', { name: 'Revoke key' })` works too (apiKeyRevoke and
 * apiKeyCancel use that), which names the action rather than its icon.
 *
 * Renew/Re-issue share Autorenew, and Revoke/Cancel share RemoveCircleOutline.
 * That is unambiguous in practice because no row status offers both at once
 * (Active renews, Expired re-issues; Active revokes, pending cancels).
 */
export const ActionIcon = {
  viewKey: 'VisibilityIcon',
  renewKey: 'AutorenewIcon',
  revokeKey: 'RemoveCircleOutlineIcon',
  validateDomain: 'CheckIcon',
} as const

/**
 * Guards the tests that need a DNS challenge to actually succeed, which needs
 * `ALLOW_DNS_VERIFY_BYPASS=true` on the console under test (§9.10). Skipping
 * with a reason keeps the nightly suite honest about the gap instead of either
 * failing every night or quietly dropping the coverage.
 *
 * The deployed dev console does not set the bypass today, and
 * playwright-nightly.yml runs every spec in all four browser projects — hence
 * an explicit opt-in rather than an assumption.
 */
export const requiresDnsBypass = () =>
  test.skip(
    process.env.DNS_VERIFY_BYPASS_AVAILABLE !== 'true',
    'Requires ALLOW_DNS_VERIFY_BYPASS=true on the console under test; set DNS_VERIFY_BYPASS_AVAILABLE=true to enable.'
  )

/** A domain no ApiKeyDomain row can already authorize, fresh per call. */
export const newDomain = () => `e2e-${Date.now()}.iz.gateway.org`
export const newDescription = (tag: string) => `e2e-${tag}-${Date.now()}`

/**
 * A readable, single-use automation domain: `<tag>-YYYYMMDD-HHMMSS-mmm`.
 *
 * Millisecond precision rather than bare seconds, because collisions are not
 * cosmetic here: a repeat of a domain this suite has already validated leaves
 * an `authorized` ApiKeyDomain row behind, and Create Key then skips the DNS
 * challenge entirely and 201s from the form step — so `submitCreateForm` would
 * wait out its timeout on a challenge title that never appears. `retries: 2`
 * makes a same-second repeat realistic.
 *
 * Built from local-time parts rather than `toISOString()` so the name matches
 * the clock of whoever is reading the table. Lower-case only: DNS names are
 * case-insensitive and both `claimDomainOwnership` and the ApiKeyDomain sort
 * key normalise with `toLowerCase()`.
 */
export const automationDomain = (tag: string) => {
  const d = new Date()
  const p = (n: number, width = 2) => String(n).padStart(width, '0')
  const stamp =
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` +
    `-${p(d.getMilliseconds(), 3)}`
  return `${tag}-${stamp}.automation.izgateway.org`
}

export const createDialog = (page: Page) =>
  page.getByRole('dialog').filter({ hasText: 'Create API Key' })

export const tokenDialog = (page: Page) =>
  page.getByRole('dialog').filter({ hasText: 'View API Key' })

/** The Create Key dialog at a given step, identified by its title text. */
export const stepDialog = (page: Page, title: string) =>
  page.getByRole('dialog').filter({ hasText: title })

/**
 * Opens the MUI Select or Autocomplete wrapped in `testId` and picks
 * `optionName`, or the first option when omitted. Returns the chosen label.
 *
 * No Escape afterwards: both control types close their own popup on select, and
 * a stray Escape reaches the enclosing Dialog and dismisses the whole form.
 */
export const chooseOption = async (
  page: Page,
  scope: Locator,
  testId: string,
  optionName?: string
) => {
  await scope.getByTestId(testId).getByRole('combobox').click()
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  const option = optionName
    ? listbox.getByRole('option', { name: optionName, exact: true })
    : listbox.getByRole('option').first()
  const label = (await option.innerText()).trim()
  await option.click()
  await expect(listbox).toBeHidden()
  return label
}

/**
 * Fills the Create Key form for a brand-new custom domain.
 *
 * Field order matters: Use Types is disabled until an Organization is chosen,
 * DNS Name until both Organization and Environment are, and changing either one
 * clears the DNS selection.
 */
export const fillCreateFormForNewDomain = async (
  page: Page,
  {
    domain,
    description,
    org = ORG,
    env = ENV,
    useType = USE_TYPE,
  }: {
    domain: string
    description: string
    org?: string
    env?: string
    useType?: string
  }
) => {
  const dialog = createDialog(page)
  await chooseOption(page, dialog, 'create-key-organization', org)
  await chooseOption(page, dialog, 'create-key-environment', env)
  await dialog
    .getByTestId('create-key-description')
    .getByRole('textbox')
    .fill(description)
  await chooseOption(page, dialog, 'create-key-use-types', useType)
  await chooseOption(page, dialog, 'create-key-dns-name', 'Other')
  // The Custom DNS Name field has no data-testid; its placeholder is the
  // documented example FQDN and is unique within the dialog. Placeholders are
  // neither a CSS class nor a field label, so this stays within the policy.
  await dialog.getByPlaceholder('dev.iz.gateway.org').fill(domain)
}

/**
 * Clicks NEXT and lands on the challenge step. An exact-duplicate scope only
 * arms a warning on the first click and relabels the button to CREATE ANYWAY;
 * a fresh domain per run should avoid that, but absorb it rather than fail on
 * leftover state from an earlier run.
 */
export const submitCreateForm = async (page: Page) => {
  const dialog = createDialog(page)
  await dialog.getByRole('button', { name: 'NEXT' }).click()

  const createAnyway = dialog.getByRole('button', { name: 'CREATE ANYWAY' })
  // A server rejection (403/409/500) leaves the form step showing an error
  // Alert. Without it in the race below, all the challenge tests burn the full
  // expect timeout and report only "title not visible", discarding the reason.
  // `hasNotText` excludes the duplicate-scope warning, which is also role=alert.
  const formError = dialog
    .getByRole('alert')
    .filter({ hasNotText: 'already exists' })
  // `exact` matters: Playwright text matching is case-insensitive and
  // substring-based, and this step's own body copy ends "...to verify domain
  // ownership:", which would otherwise match the title too.
  const challengeTitle = page.getByText('Verify Domain Ownership', {
    exact: true,
  })
  await expect(
    challengeTitle.or(createAnyway).or(formError).first()
  ).toBeVisible()
  if (await createAnyway.isVisible().catch(() => false)) {
    await createAnyway.click()
  }
  if (await formError.isVisible().catch(() => false)) {
    throw new Error(
      `Create Key did not reach the DNS challenge: ${(
        await formError.innerText()
      ).trim()}`
    )
  }
  await expect(challengeTitle).toBeVisible()
}

/** Reads the `izg-challenge=<uuid>` TXT value currently shown in a dialog. */
export const readChallengeValue = async (dialog: Locator) => {
  const text = await dialog.innerText()
  const match = text.match(CHALLENGE_PATTERN)
  expect(
    match,
    `expected an izg-challenge TXT value in the dialog, got:\n${text}`
  ).not.toBeNull()
  return match![0]
}

/** Narrows the grid to a single row via the toolbar search box. */
export const findRowByDescription = async (page: Page, description: string) => {
  await page
    .getByPlaceholder('Search by key ID or jurisdiction')
    .fill(description)
  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toHaveCount(1)
  return row
}

/** An ACTION-column button in a key row, addressed by its MUI icon testid. */
export const rowAction = (row: Locator, icon: string) =>
  row.locator(`[data-field="actions"] button:has([data-testid="${icon}"])`)

/**
 * Opens Create Key from the grid, fills it for a brand-new domain and submits,
 * leaving the dialog on the "Verify Domain Ownership" step. The credential is
 * already persisted (`ready_for_validation`) once this returns.
 */
const startNewDomainKey = async (
  page: Page,
  opts: { domain: string; description: string }
) => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  await expect(createDialog(page)).toBeVisible()
  await fillCreateFormForNewDomain(page, opts)
  await submitCreateForm(page)
}

/**
 * Creates a credential for a new domain and walks away at the challenge step,
 * leaving it `Ready for Validation` — the precondition for §9.7 (cancel).
 * Returns the row, already narrowed by the search box.
 *
 * Needs no DNS bypass: nothing is validated, and the credential is persisted
 * by the create POST itself. Expects the caller to be on /apikeys.
 */
export const createPendingKey = async (
  page: Page,
  opts: { domain: string; description: string }
) => {
  await startNewDomainKey(page, opts)
  await stepDialog(page, 'Verify Domain Ownership')
    .getByRole('button', { name: 'CLOSE' })
    .click()
  // Not `expect(challengeDialog).toBeHidden()`: handleClose resets the step in
  // the same commit as onClose, so that text-filtered locator resolves to zero
  // elements either way and the assertion could never fail.
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const row = await findRowByDescription(page, opts.description)
  await expect(row).toContainText('Ready for Validation')
  return row
}

/**
 * Creates a credential through the DNS challenge and validates it, then closes
 * the success dialog with CLOSE rather than VIEW KEY — leaving the key Active
 * with its token still unviewed (`viewedAt` unset), which is the precondition
 * for §9.4.
 *
 * Expects the caller to have already logged in and navigated to /apikeys; it
 * starts from the grid's own Create Key button. Callers must also have invoked
 * `requiresDnsBypass()`, since this drives a real challenge to completion.
 */
export const createActiveUnviewedKey = async (
  page: Page,
  opts: { domain: string; description: string }
) => {
  await startNewDomainKey(page, opts)

  await stepDialog(page, 'Verify Domain Ownership')
    .getByRole('button', { name: 'VALIDATE' })
    .click()

  const successDialog = stepDialog(page, 'Validation Completed!')
  await expect(successDialog).toBeVisible({ timeout: 20000 })
  // Walking away here is what leaves the token unviewed.
  await successDialog.getByRole('button', { name: 'CLOSE' }).click()
  // Not `expect(successDialog).toBeHidden()`: handleClose resets the step in
  // the same commit as onClose, so that text-filtered locator resolves to zero
  // elements either way and the assertion could never fail.
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/**
 * Creates an Active credential on a brand-new custom domain — "Other" in the
 * DNS Name dropdown plus a typed Custom DNS Name — drives the DNS challenge to
 * completion, reveals the token, and returns the new grid row.
 *
 * The counterpart to `createApiKeyWithExistingDomain` (in the *other* helper
 * file, `createApiKey.ts`) for specs that would rather mint their own domain
 * than depend on one being hand-seeded as authorized. Nothing about the "Other"
 * option is gated — it is an unconditional MenuItem — but the challenge that
 * follows is, so callers MUST invoke `requiresDnsBypass()` first or the real
 * TXT lookup returns NXDOMAIN and validation can never succeed.
 *
 * Closes on VIEW KEY rather than walking away, so the returned row has had its
 * token revealed and carries no View action — matching the state
 * `createApiKeyWithExistingDomain` leaves behind. Use `createActiveUnviewedKey`
 * instead when the point is an Active-but-unviewed key.
 *
 * Expects the caller to be logged in and on /apikeys.
 */
export const createActiveKeyOnNewDomain = async (
  page: Page,
  {
    domain,
    description,
    org,
    env,
    useType,
  }: {
    domain: string
    description: string
    org?: string
    env?: string
    useType?: string
  }
) => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  await expect(createDialog(page)).toBeVisible()
  await fillCreateFormForNewDomain(page, {
    domain,
    description,
    org,
    env,
    useType,
  })
  await submitCreateForm(page)

  await stepDialog(page, 'Verify Domain Ownership')
    .getByRole('button', { name: 'VALIDATE' })
    .click()

  // VIEW KEY is the success step's only action button, so this is also the
  // assertion that validation succeeded rather than falling to 'Validation
  // Failed' (whose single button is a VALIDATE retry).
  const successDialog = stepDialog(page, 'Validation Completed!')
  await expect(successDialog).toBeVisible({ timeout: 20000 })
  await successDialog.getByRole('button', { name: 'VIEW KEY' }).click()

  await expect(tokenDialog(page)).toBeVisible()
  await tokenDialog(page).getByRole('button', { name: 'CLOSE' }).click()
  // Not toBeHidden() on the text-filtered dialog: handleClose resets the step
  // in the same commit as onClose, so that locator resolves to zero elements
  // either way and the assertion could never fail.
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toContainText('Active')
  return row
}
