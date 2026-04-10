import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

/*
  Test for https://izgateway.atlassian.net/wiki/spaces/IGDD/pages/22184696/UAT+Test+Plan+for+Config+Console+0.1
  Section 12 -> h -> iii
 */

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
  },
  password: {
    tooShort: 'Short1!A', // Only 8 characters - needs 15
    noDigits: 'NoDigitsHere!!AA', // No numbers
    onlyOneDigit: 'OnlyOneDigit1!!AA', // Only 1 digit - needs 2
    noLowercase: 'NOLOWERCASE11!!', // No lowercase letters
    onlyOneLowercase: 'ONLYONELOWERa11!!', // Only 1 lowercase - needs 2
    noUppercase: 'nouppercase11!!', // No uppercase letters
    onlyOneUppercase: 'onlyoneupperA11!!', // Only 1 uppercase - needs 2
    noSpecialChars: 'NoSpecialChars11AA', // No special characters
    onlyOneSpecialChar: 'OnlyOneSpecial11AA!', // Only 1 special char - needs 2
    startsWithEquals: '==ValidPassword11!!AA', // Starts with == which is not allowed
    invalidSpecialChar: 'InvalidChar11AAzz*', // Contains * which is not in the allowed set
  },
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
  await editButton.first().click()
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

async function enablePasswordFields(page: Page) {
  // Check if password fields are already visible
  const newPasswordField = page.locator('input[name="newPassword"]')
  const isVisible = await newPasswordField.isVisible().catch(() => false)

  if (!isVisible) {
    // Click the "CHANGE PASSWORD" button to reveal the password fields
    // Searching for it this way because it didn't have an id
    await page.getByRole('button', { name: /change password/i }).click()
    await newPasswordField.waitFor({ state: 'visible' })
  }
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

  fieldsToValidate.forEach(
    ({ displayName, inputName, errorId, badValuesKey }) => {
      test(`Invalid ${displayName} values not accepted`, async () => {
        const { shouldSkip, nextButton } = await getToEditScreen(page, destId)
        test.skip(
          shouldSkip,
          'Edit button is not available for this destination'
        )

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
    }
  )
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

test.describe('Password validation', () => {
  const passwordFields = [
    {
      displayName: 'New Password',
      inputName: 'newPassword',
      errorId: 'new-password-helper-text',
    },
    {
      displayName: 'Confirm Password',
      inputName: 'confirmPassword',
      errorId: 'confirm-new-password-helper-text',
    },
  ]

  passwordFields.forEach(({ displayName, inputName, errorId }) => {
    test(`Invalid ${displayName} values not accepted`, async () => {
      const { shouldSkip, nextButton } = await getToEditScreen(page, destId)
      test.skip(shouldSkip, 'Edit button is not available for this destination')

      // Enable password fields by clicking the "CHANGE PASSWORD" button
      await enablePasswordFields(page)

      const field = page.locator(`input[name="${inputName}"]`)
      const errorMessage = page.locator(`#${errorId}`)

      // Test each invalid password
      for (const [key, value] of Object.entries(badValues.password)) {
        await test.step(`Test invalid ${displayName}: ${key} ("${value}")`, async () => {
          await field.clear()
          await field.fill(value)
          await page.locator('body').click()

          await expect.soft(errorMessage).toBeVisible()
          await expect.soft(nextButton).toBeDisabled()
        })
      }
    })
  })

  test('Password mismatch is not accepted', async () => {
    const { shouldSkip, nextButton } = await getToEditScreen(page, destId)
    test.skip(shouldSkip, 'Edit button is not available for this destination')

    // Enable password fields by clicking the "CHANGE PASSWORD" button
    await enablePasswordFields(page)

    const newPasswordField = page.locator('input[name="newPassword"]')
    const confirmPasswordField = page.locator('input[name="confirmPassword"]')
    const confirmPasswordError = page.locator(
      '#confirm-new-password-helper-text'
    )

    // Valid passwords but different values
    const validPassword1 = 'ValidPassword11!!'
    const validPassword2 = 'DifferentPass22@@'

    await test.step('Fill newPassword and confirmPassword with different valid values', async () => {
      await newPasswordField.clear()
      await newPasswordField.fill(validPassword1)
      await confirmPasswordField.clear()
      await confirmPasswordField.fill(validPassword2)
      await page.locator('body').click()

      // Should show error for password mismatch
      await expect.soft(confirmPasswordError).toBeVisible()
      await expect.soft(confirmPasswordError).toContainText(/must match/i)
      await expect.soft(nextButton).toBeDisabled()
    })

    await test.step('Update confirmPassword to match newPassword', async () => {
      await confirmPasswordField.clear()
      await confirmPasswordField.fill(validPassword1)
      await page.locator('body').click()

      // Error should clear when passwords match
      await expect.soft(confirmPasswordError).not.toBeVisible()
      await expect.soft(nextButton).toBeEnabled()
    })
  })
})
