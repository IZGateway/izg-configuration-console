import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

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

async function navigateToEditIdentifyStep(page: Page, destId: string) {
  const editButton = page.locator('button[aria-label="edit"]')
  const nextButton = page.locator('#next')

  // Filter table by dest id
  await filterByDestinationId(page, destId)
  const hasEditButton = (await editButton.count()) > 0

  // Skip if edit button is not available
  if (!hasEditButton) {
    return { shouldSkip: true, editButton: null, nextButton: null }
  }

  // Click edit and accept the agreement if needed
  await editButton.click()
  if (await page.getByTestId('agree-button').isVisible()) {
    await page.getByTestId('agree-button').click()
    await page.locator('#accept').click()
  }
  await nextButton.click()

  return { shouldSkip: false, editButton, nextButton }
}

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

test('Validate MSH-3 and MSH-4 cannot both be empty', async () => {
  const destId = '404'
  const editButton = page.locator('button[aria-label="edit"]')
  const nextButton = page.locator('#next')
  const msh3ErrorMessage = page.locator('#msh3-helper-text')

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

  const msh3Field = page.locator('input[name="MSH3"]')
  const msh4Field = page.locator('input[name="MSH4"]')

  // Store original values to restore later
  const originalMsh3 = await msh3Field.inputValue()
  const originalMsh4 = await msh4Field.inputValue()

  // Clear MSH-3
  await msh3Field.clear()
  // Clear MSH-4
  await msh4Field.clear()
  // Click away to trigger validation
  await page.locator('body').click()

  // Verify error message appears
  await expect.soft(msh3ErrorMessage).toBeVisible()

  // Verify next button is disabled
  await expect.soft(nextButton).toBeDisabled()

  await test.step('Restore MSH-3 value and verify error clears', async () => {
    // Fill MSH-3 with original value
    await msh3Field.fill(originalMsh3)
    await page.locator('body').click()

    // Verify error message is not visible
    await expect.soft(msh3ErrorMessage).not.toBeVisible()

    // Verify next button is enabled
    await expect(nextButton).toBeEnabled()
  })

  // Restore original values
  await msh4Field.fill(originalMsh4)

})
