import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

let context
let page: Page

const destId = '404'

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
  hl7Fields: {
    tooLong: 'a'.repeat(26), // 26 characters - exceeds max of 25
    withPipe: 'bad|value', // Contains | which is not allowed
    withCaret: 'bad^value', // Contains ^ which is not allowed
    withAmpersand: 'bad&value', // Contains & which is not allowed
    withTilde: 'bad~value', // Contains ~ which is not allowed
    withQuote: 'bad"value', // Contains " which is not allowed
    withSlash: 'bad/value', // Contains / which is not allowed
    withSpace: 'bad value', // Contains space which is not allowed (despite error message saying otherwise)
    withMultipleInvalid: 'bad|value&test', // Multiple invalid characters
  },
  msh11: {
    invalid: 'X',
  }
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')
})

test.beforeEach(async () => {
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')
})

test.afterAll(async () => {
  await logout(page)
  await page.close()
  await context.close()
})

async function filterByDestinationId(page: Page, destId: string) {
  await page.locator('button[aria-label="Show filters"]').click()
  await page.locator('[role="combobox"]:has-text("contains")').click()
  await page.getByRole('option', { name: 'equals' }).click()
  await page.getByRole('textbox', { name: /value/i }).fill(destId)
  await page.getByText('My Connections').click() // Click anywhere to close filter pop up
}

async function getToEditScreen(page: Page, destId: string) {
  const editButton = page.locator('button[aria-label="edit"]')
  const nextButton = page.locator('#next')

  // filter table by dest id
  await filterByDestinationId(page, destId)
  const hasEditButton = (await editButton.count()) > 0

  // There is a change request set for this destination already
  // Return true for shouldSkip
  if (!hasEditButton) {
    return { shouldSkip: true, nextButton }
  }

  // There is NOT a change request set for this destination already
  // Click edit and then accept the agreement if it appears
  await editButton.click()
  try {
    await page.getByTestId('agree-button').waitFor({ timeout: 2000 })
    await page.getByTestId('agree-button').click()
    await page.locator('#accept').click()
  } catch {
    // Agreement already accepted in this session, continue
  }
  await nextButton.click()

  return { shouldSkip: false, nextButton }
}

test.describe('Field validation - invalid values', () => {
  const fieldsToValidate = [
    {
      displayName: 'Username',
      inputName: 'username',
      errorId: 'username-helper-text',
      badValuesKey: 'username' as const,
    },
    {
      displayName: 'Facility ID',
      inputName: 'facilityId',
      errorId: 'facilityId-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
    {
      displayName: 'MSH-3',
      inputName: 'MSH3',
      errorId: 'msh3-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
    {
      displayName: 'MSH-4',
      inputName: 'MSH4',
      errorId: 'msh4-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
    {
      displayName: 'MSH-5',
      inputName: 'MSH5',
      errorId: 'msh5-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
    {
      displayName: 'MSH-6',
      inputName: 'MSH6',
      errorId: 'msh6-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
    {
      displayName: 'MSH-22',
      inputName: 'MSH22',
      errorId: 'msh22-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
    {
      displayName: 'MSH-11',
      inputName: 'MSH11',
      errorId: 'msh11-helper-text',
      badValuesKey: 'msh11' as const,
    },
    {
      displayName: 'RXA-11',
      inputName: 'RXA11',
      errorId: 'rxa11-helper-text',
      badValuesKey: 'hl7Fields' as const,
    },
  ]

  fieldsToValidate.forEach(({ displayName, inputName, errorId, badValuesKey }) => {
    test(`Invalid ${displayName} values not accepted`, async () => {
      const { shouldSkip, nextButton } = await getToEditScreen(page, destId)
      test.skip(shouldSkip, 'Edit button is not available for this destination')

      const field = page.locator(`input[name="${inputName}"]`)
      const errorMessage = page.locator(`#${errorId}`)

      // Test each invalid value
      for (const [key, value] of Object.entries(badValues[badValuesKey])) {
        await test.step(`Test invalid ${displayName}: ${key} ("${value}")`, async () => {
          await field.clear()
          await field.fill(value as string)
          await page.locator('body').click()

          await expect.soft(errorMessage).toBeVisible()
          await expect.soft(nextButton).toBeDisabled()
        })
      }
    })
  })
})

test.describe('MSH field pair validation', () => {
  const fieldPairs = [
    {
      firstField: 'MSH3',
      secondField: 'MSH4',
      errorId: 'msh3-helper-text',
      description: 'MSH-3 and MSH-4',
    },
    {
      firstField: 'MSH5',
      secondField: 'MSH6',
      errorId: 'msh5-helper-text',
      description: 'MSH-5 and MSH-6',
    },
  ]

  fieldPairs.forEach(({ firstField, secondField, errorId, description }) => {
    test(`${description} cannot be blank at the same time`, async () => {
      const { shouldSkip, nextButton } = await getToEditScreen(page, destId)
      test.skip(shouldSkip, 'Edit button is not available for this destination')

      const field1 = page.locator(`input[name="${firstField}"]`)
      const field2 = page.locator(`input[name="${secondField}"]`)
      const errorMessage = page.locator(`#${errorId}`)

      // Store original values
      const originalField1 = await field1.inputValue()
      const originalField2 = await field2.inputValue()

      // Clear both fields and trigger validation
      await field1.clear()
      await field2.clear()
      await page.locator('body').click()

      // Verify error and disabled state
      await expect.soft(errorMessage).toBeVisible()
      await expect.soft(nextButton).toBeDisabled()

      await test.step(`Restore ${firstField} value and verify error clears`, async () => {
        await field1.fill(originalField1)
        await page.locator('body').click()

        await expect.soft(errorMessage).not.toBeVisible()
        await expect.soft(nextButton).toBeEnabled()
      })

      // Restore original values
      await field2.fill(originalField2)
    })
  })
})
