import { Page, Locator, BrowserContext, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

// Acceptance criteria: e2e/specs/api-key-management/spec.md
// → "Create Key: existing authorized domain".
//
// Requires a sender organization that already has an authorized (unexpired)
// domain for the chosen environment. Names must match the dropdown labels.
const TEST_ORG_NAME = 'Audacious Inquiry LLC'
const TEST_ENV_NAME = 'Development'
const AUTHORIZED_TEST_DOMAIN = 'createKey.fastTrack.playwright.org'
const TEST_USE_TYPE = 'Provider'

let context: BrowserContext
let page: Page

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
  // Both Select and the Autocomplete multi-selects close themselves after a
  // pick. Don't press Escape here: it reaches the dialog and resets the form.
  await expect(page.getByRole('listbox')).toBeHidden()
}

const keyRow = (description: string) =>
  page.getByRole('row').filter({ hasText: description })

const createDialog = () =>
  page.getByRole('dialog').filter({ hasText: 'Create API Key' })
const tokenDialog = () =>
  page.getByRole('dialog').filter({ hasText: 'View API Key' })
const createAnyway = () =>
  createDialog().getByRole('button', { name: 'CREATE ANYWAY' })
const duplicateWarning = () =>
  createDialog()
    .getByRole('alert')
    .filter({ hasText: 'An active key with this exact scope already exists' })

// Every key created here has the same scope (org, env, use type, domain), so
// any earlier key from these tests is a same-scope duplicate of the next one.
const openCreateDialog = async () => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  await expect(createDialog()).toBeVisible()
}

const fillCreateForm = async (description: string) => {
  await chooseOption(createDialog(), 'create-key-organization', TEST_ORG_NAME)
  await chooseOption(createDialog(), 'create-key-environment', TEST_ENV_NAME)
  await createDialog()
    .getByTestId('create-key-description')
    .getByRole('textbox')
    .fill(description)
  await chooseOption(createDialog(), 'create-key-use-types', TEST_USE_TYPE)
  await chooseOption(
    createDialog(),
    'create-key-dns-name',
    AUTHORIZED_TEST_DOMAIN
  )
}

const waitForCreateResponse = () =>
  page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/apikeys'
  )

// Submits the filled form and returns the POST /api/apikeys response. Keys
// are never cleaned up, so whether the duplicate warning shows depends on
// earlier runs; this tolerates it either way. The duplicate test below asserts
// the warning without this tolerance. An error alert also ends the wait so a
// rejected request fails on the caller's status check, not a timeout.
const submitCreate = async () => {
  const createResponse = waitForCreateResponse()
  await createDialog().getByRole('button', { name: 'NEXT' }).click()
  await expect(
    createAnyway()
      .or(tokenDialog())
      .or(createDialog().getByRole('alert'))
      .first()
  ).toBeVisible()
  if (await createAnyway().isVisible()) await createAnyway().click()
  return createResponse
}

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

test('Create key with a pre-authorized domain issues token immediately, no DNS step', async () => {
  const description = `E2E existing domain ${Date.now()}`

  await openCreateDialog()
  for (const field of [
    'Organization',
    'Environment',
    'Description (optional)',
    'Use Types',
    'DNS Name',
  ]) {
    await expect(createDialog().getByText(field).first()).toBeVisible()
  }
  await fillCreateForm(description)

  // 201 = existing-domain fast path; 202 would mean a DNS challenge was issued
  // and the "Verify Domain Ownership" step shown. The status is the assertion.
  expect((await submitCreate()).status()).toBe(201)

  // Straight to the token — the create dialog closed on 201.
  const token = tokenDialog()
  await expect(token).toBeVisible()
  await expect(
    token.getByText('Validation Completed. Copy this token now')
  ).toBeVisible()
  await expect(
    token.getByText('The secret cannot be retrieved after closing this dialog')
  ).toBeVisible()
  await expect(
    token.getByTestId('api-key-token').getByRole('textbox')
  ).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/)
  await expect(token.getByRole('button', { name: 'COPY TOKEN' })).toBeVisible()

  await token.getByRole('button', { name: 'CLOSE' }).click()
  await expect(token).toBeHidden()

  const row = keyRow(description)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Active')
  await expect(row).toContainText(AUTHORIZED_TEST_DOMAIN)
  // Token was revealed once already, so the View (eye) action is gone.
  await expect(row.getByTestId('VisibilityIcon')).toHaveCount(0)
})

test('Same-scope duplicate shows the warning, and CREATE ANYWAY still creates the key', async () => {
  // Seed a same-scope Active key so the duplicate exists on a clean
  // environment too, rather than relying on keys left by earlier runs.
  await openCreateDialog()
  await fillCreateForm(`E2E duplicate seed ${Date.now()}`)
  expect((await submitCreate()).status()).toBe(201)
  await tokenDialog().getByRole('button', { name: 'CLOSE' }).click()
  await expect(tokenDialog()).toBeHidden()

  // Reload so the dialog's credential list includes the seeded key.
  await page.goto('/apikeys')
  await page.waitForLoadState('networkidle')

  const description = `E2E duplicate ${Date.now()}`
  await openCreateDialog()
  await fillCreateForm(description)

  // First click only arms the warning; it sends no request.
  await createDialog().getByRole('button', { name: 'NEXT' }).click()
  await expect(duplicateWarning()).toBeVisible()
  await expect(createAnyway()).toBeVisible()

  // Warns, does not block: the second click creates the key.
  const createResponse = waitForCreateResponse()
  await createAnyway().click()
  expect((await createResponse).status()).toBe(201)

  await expect(tokenDialog()).toBeVisible()
  await tokenDialog().getByRole('button', { name: 'CLOSE' }).click()
  await expect(tokenDialog()).toBeHidden()
  await expect(keyRow(description)).toContainText('Active')
})
