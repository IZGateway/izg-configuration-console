import { Page, Locator, expect } from '@playwright/test'

// Opens a MUI Select / Autocomplete wrapped in `testId` and picks `optionName`
// (or the first option when omitted).
export const chooseOption = async (
  page: Page,
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

export const apiKeyRow = (page: Page, description: string) =>
  page.getByRole('row').filter({ hasText: description })

// Creates an Active key on a domain that is already authorized (picked from
// the DNS Name dropdown, so there is no DNS challenge), closes the one-time
// token dialog, and waits for the new row. Expects to start on /apikeys.
export const createApiKeyWithExistingDomain = async (
  page: Page,
  opts: {
    org: string
    env: string
    domain: string
    useType?: string
    description: string
  }
) => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  const createDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Create API Key' })
  await expect(createDialog).toBeVisible()

  await chooseOption(page, createDialog, 'create-key-organization', opts.org)
  await chooseOption(page, createDialog, 'create-key-environment', opts.env)
  await createDialog
    .getByTestId('create-key-description')
    .getByRole('textbox')
    .fill(opts.description)
  await chooseOption(page, createDialog, 'create-key-use-types', opts.useType)
  await chooseOption(page, createDialog, 'create-key-dns-name', opts.domain)

  const createResponse = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/apikeys'
  )
  await createDialog.getByRole('button', { name: 'NEXT' }).click()

  // A same-scope Active key from an earlier run triggers the soft duplicate
  // warning; click through it.
  const createAnyway = createDialog.getByRole('button', {
    name: 'CREATE ANYWAY',
  })
  const tokenDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'View API Key' })
  await expect(
    createAnyway.or(tokenDialog).or(createDialog.getByRole('alert')).first()
  ).toBeVisible()
  if (await createAnyway.isVisible()) await createAnyway.click()

  expect((await createResponse).status()).toBe(201)

  await expect(tokenDialog).toBeVisible()
  await tokenDialog.getByRole('button', { name: 'CLOSE' }).click()
  await expect(tokenDialog).toBeHidden()

  const row = apiKeyRow(page, opts.description)
  await expect(row).toContainText('Active')
  return row
}
