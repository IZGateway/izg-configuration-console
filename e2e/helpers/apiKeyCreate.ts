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
 * MUI icon `data-testid`s, which is how the row ACTION buttons are addressed:
 * ActionIconButton wraps its IconButton in a <span> so the Tooltip can still
 * fire while the button is disabled, and the Tooltip puts `aria-label` on that
 * span rather than the button — so the buttons have no accessible name of their
 * own. Clicking the icon works because it sits inside the button.
 *
 * Renew/Re-issue share Autorenew, and Revoke/Cancel share RemoveCircleOutline.
 * That is unambiguous in practice because no row status offers both at once
 * (Active renews, Expired re-issues; Active revokes, pending cancels).
 */
export const ActionIcon = {
  viewKey: 'VisibilityIcon',
  renewKey: 'AutorenewIcon',
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
  { domain, description }: { domain: string; description: string }
) => {
  const dialog = createDialog(page)
  await chooseOption(page, dialog, 'create-key-organization', ORG)
  await chooseOption(page, dialog, 'create-key-environment', ENV)
  await dialog
    .getByTestId('create-key-description')
    .getByRole('textbox')
    .fill(description)
  await chooseOption(page, dialog, 'create-key-use-types', USE_TYPE)
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
  await expect(challengeTitle.or(createAnyway).or(formError).first()).toBeVisible()
  if (await createAnyway.isVisible().catch(() => false)) {
    await createAnyway.click()
  }
  if (await formError.isVisible().catch(() => false)) {
    throw new Error(
      `Create Key did not reach the DNS challenge: ${(await formError.innerText()).trim()}`
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
