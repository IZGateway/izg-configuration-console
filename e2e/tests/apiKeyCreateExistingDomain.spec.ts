import { Page, Locator, BrowserContext, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

// Acceptance criteria: e2e/specs/api-key-management/spec.md
// → "Create Key: existing authorized domain".
//
// Requires a sender organization that already has an authorized (unexpired)
// domain for the chosen environment. Supply via .env.test:
//   E2E_APIKEY_ORG       Organization display name, as shown in the dropdown
//   E2E_APIKEY_ENV       Environment display name, e.g. "Development"
//   E2E_APIKEY_DOMAIN    The previously-authorized DNS name
//   E2E_APIKEY_USE_TYPE  (optional) Use Type label; defaults to the first offered
const TEST_ORG_NAME = process.env.E2E_APIKEY_ORG
const TEST_ENV_NAME = process.env.E2E_APIKEY_ENV
const AUTHORIZED_TEST_DOMAIN = process.env.E2E_APIKEY_DOMAIN
const TEST_USE_TYPE = process.env.E2E_APIKEY_USE_TYPE

let context: BrowserContext
let page: Page
let createdDescription: string | null = null

// Opens a MUI Select / Autocomplete wrapped in `testId` and picks `optionName`
// (or the first option when omitted).
const chooseOption = async (
  scope: Locator,
  testId: string,
  optionName?: string
) => {
  await scope.getByTestId(testId).getByRole('combobox').click()
  const option = optionName
    ? page.getByRole('option', { name: optionName, exact: true })
    : page.getByRole('option').first()
  await option.click()
  // Autocomplete multi-selects stay open after a pick. Autocomplete swallows
  // Escape, so this closes only its popup — a plain Select has already closed
  // by now, and an Escape there would reach (and close) the dialog instead.
  const listbox = page.getByRole('listbox')
  if (await listbox.isVisible()) {
    await page.keyboard.press('Escape')
    await expect(listbox).toBeHidden()
  }
}

const keyRow = (description: string) =>
  page.getByRole('row').filter({ hasText: description })

test.skip(
  !TEST_ORG_NAME || !TEST_ENV_NAME || !AUTHORIZED_TEST_DOMAIN,
  'Set E2E_APIKEY_ORG, E2E_APIKEY_ENV and E2E_APIKEY_DOMAIN in .env.test'
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

// Revoke the key this test minted so runs don't pile up Active keys (which
// would also trip the duplicate-scope warning on every later run).
test.afterEach(async () => {
  if (!createdDescription) return
  const description = createdDescription
  createdDescription = null
  try {
    await page.keyboard.press('Escape')
    const row = keyRow(description)
    await row.getByTestId('RemoveCircleOutlineIcon').click()
    await page.getByRole('button', { name: 'CONFIRM REVOCATION' }).click()
    await expect(row).toContainText('Revoked')
  } catch (err) {
    console.warn(`Cleanup: could not revoke "${description}"`, err)
  }
})

test.afterAll(async () => {
  if (page) await logout(page).catch(() => {})
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})

test('Create key with a pre-authorized domain issues token immediately, no DNS step', async () => {
  const description = `E2E existing domain ${Date.now()}`

  await page.getByRole('button', { name: 'Create Key' }).click()
  const createDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Create API Key' })
  await expect(createDialog).toBeVisible()
  for (const field of [
    'Organization',
    'Environment',
    'Description (optional)',
    'Use Types',
    'DNS Name',
  ]) {
    await expect(createDialog.getByText(field)).toBeVisible()
  }

  await chooseOption(createDialog, 'create-key-organization', TEST_ORG_NAME)
  await chooseOption(createDialog, 'create-key-environment', TEST_ENV_NAME)
  await createDialog
    .getByTestId('create-key-description')
    .getByRole('textbox')
    .fill(description)
  await chooseOption(createDialog, 'create-key-use-types', TEST_USE_TYPE)
  await chooseOption(createDialog, 'create-key-dns-name', AUTHORIZED_TEST_DOMAIN)

  // 201 = existing-domain fast path; 202 would mean a DNS challenge was issued.
  const createResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/apikeys'
  )
  await createDialog.getByRole('button', { name: 'NEXT' }).click()

  // A same-scope Active key from an earlier run triggers the soft duplicate
  // warning; it must not block creation. An error alert also ends the wait so
  // a rejected request fails on the status check below, not a timeout.
  const createAnyway = createDialog.getByRole('button', { name: 'CREATE ANYWAY' })
  const tokenDialog = page.getByRole('dialog').filter({ hasText: 'View API Key' })
  await expect(
    createAnyway.or(tokenDialog).or(createDialog.getByRole('alert')).first()
  ).toBeVisible()
  if (await createAnyway.isVisible()) await createAnyway.click()

  expect((await createResponse).status()).toBe(201)
  createdDescription = description

  // No "Verify Domain Ownership" step — straight to the token.
  await expect(tokenDialog).toBeVisible()
  await expect(page.getByText('Verify Domain Ownership')).toHaveCount(0)
  await expect(
    tokenDialog.getByText('Validation Completed. Copy this token now')
  ).toBeVisible()
  await expect(
    tokenDialog.getByText('The secret cannot be retrieved after closing this dialog')
  ).toBeVisible()
  await expect(
    tokenDialog.getByTestId('api-key-token').getByRole('textbox')
  ).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/)
  await expect(tokenDialog.getByRole('button', { name: 'COPY TOKEN' })).toBeVisible()

  await tokenDialog.getByRole('button', { name: 'CLOSE' }).click()
  await expect(tokenDialog).toBeHidden()

  const row = keyRow(description)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Active')
  await expect(row).toContainText(AUTHORIZED_TEST_DOMAIN!)
  // Token was revealed once already, so the View (eye) action is gone.
  await expect(row.getByTestId('VisibilityIcon')).toHaveCount(0)
})
