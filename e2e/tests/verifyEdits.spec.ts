import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

let context
let page: Page

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')
})

test.afterAll(async () => {
  await logout(page)
  await page.close()
  await context.close()
})

const badValues = {
  username: {
    tooLong: 'a'.repeat(51), // 51 characters - exceeds max of 50
    withPipe: 'user|name', // Contains | which is not allowed
    withCaret: 'user^name', // Contains ^ which is not allowed
    withAmpersand: 'user&name', // Contains & which is not allowed
    withTilde: 'user~name', // Contains ~ which is not allowed
    withQuote: 'user"name', // Contains " which is not allowed
    withSlash: 'user/name', // Contains / which is not allowed
    withSpace: 'user name', // Contains space which is not allowed (despite error message saying otherwise)
    withMultipleInvalid: 'user|name&test', // Multiple invalid characters
  },
};

async function filterByDestinationId(page: Page, destId: string) {
  await page.locator('button[aria-label="Show filters"]').click()
  await page.locator('[role="combobox"]:has-text("contains")').click()
  await page.getByRole('option', { name: 'equals' }).click()
  await page.getByRole('textbox', { name: /value/i }).fill(destId)
  await page.getByText('My Connections').click() // Click anywhere to close filter pop up
}

test('Validate invalid usernames not accepted', async () => {
  const destId = '404'
  const editButton = page.locator('button[aria-label="edit"]')
  const nextButton = page.locator('#next')

  // filter table by dest id
  await filterByDestinationId(page, destId)
  const hasEditButton = (await editButton.count()) > 0

  // There is a change request set for this destination already
  test.skip(!hasEditButton, 'Edit button is not available for this destination')

  // There is NOT a change request set for this destination already
  // Click edit and then accept the agreement
  await editButton.click()
  if (page.getByTestId('agree-button').isVisible()) {
    await page.getByTestId('agree-button').click()
    await page.locator('#accept').click()
  }
  await nextButton.click()

  const usernameField = page.locator('#username')
  const usernameErrorMessage = page.locator('#username-helper-text')

  // Test each invalid username
  for (const [key, value] of Object.entries(badValues.username)) {
    await test.step(`Test invalid username: ${key} ("${value}")`, async () => {
      await usernameField.clear()
      await usernameField.fill(value)
      await page.locator('body').click()

      await expect.soft(usernameErrorMessage).toBeVisible()
      await expect.soft(nextButton).toBeDisabled()
    })
  }
})

