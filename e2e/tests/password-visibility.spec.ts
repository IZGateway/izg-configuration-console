import { test, expect } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

const requiredEnvs = ['OKTA_USERNAME', 'OKTA_PASSWORD', 'BASE_URL'] as const

test.describe('Edit Connection – password visibility', () => {
  test.beforeEach(async ({ page }) => {
    const missing = requiredEnvs.filter((k) => !process.env[k])
    if (missing.length)
      test.skip(true, `Missing env vars: ${missing.join(', ')}`)

    await loginToOkta(
      page,
      process.env.OKTA_USERNAME!,
      process.env.OKTA_PASSWORD!,
      process.env.OKTA_USER_FULLNAME
    )
  })

  test('user can show/hide password in IDENTIFY', async ({ page }) => {
    // Navigate to Manage Connections and open Edit for destination 404
    await page.goto('/manageconnections')
    await expect(page.getByText('My Connections')).toBeVisible({
      timeout: 20000,
    })
    await filterByDestinationId(page, '404')
    const editBtn = page.getByRole('button', { name: /^edit$/i }).first()
    await editBtn.waitFor({ state: 'visible', timeout: 20000 })
    await editBtn.click()
    // Wait for any /edit/<type>/<id> URL
    await page.waitForURL(/\/edit\/\d+\/[^/]+$/i, { timeout: 20000 })

    // Agree and accept service agreement
    await expect(
      page.getByText('Authorization Attestation', { exact: true })
    ).toBeVisible({ timeout: 15000 })
    await page.getByTestId('agree-button').click()
    const acceptBtn = page.locator('#accept')
    await expect(acceptBtn).toBeEnabled({ timeout: 5000 })
    await acceptBtn.click()

    // Advance to Identify step
    const nextBtn = page.getByRole('button', { name: /^NEXT$/i })
    await nextBtn.click()
    await expect(
      page.getByText('Configure Credentials', { exact: true })
    ).toBeVisible({ timeout: 15000 })

    // Click Change Password
    await page.getByRole('button', { name: /change password/i }).click()

    // Locate New Password input by label
    const newPw = page.getByLabel('New Password', { exact: true })
    await newPw.waitFor({ state: 'visible', timeout: 10000 })

    // Type a sample password
    const sample = 'Abcdefghij12!@'
    await newPw.fill(sample)

    // Find the eye button associated with New Password
    const newPwControl = newPw.locator(
      'xpath=ancestor::*[contains(@class, "MuiFormControl-root")][1]'
    )
    const newPwEye = newPwControl.locator('button').last()

    // Toggle hidden
    await expect(newPw).toHaveAttribute('type', 'password')
    await newPwEye.click()
    await expect(newPw).toHaveAttribute('type', 'text')
    await expect(newPw).toHaveValue(sample)
    await newPwEye.click()
    await expect(newPw).toHaveAttribute('type', 'password')
    await expect(newPw).toHaveValue(sample)

    // Confirm Password field
    const confirmPw = page.getByLabel('Confirm New Password', { exact: true })
    await confirmPw.fill(sample)
    const confirmPwControl = confirmPw.locator(
      'xpath=ancestor::*[contains(@class, "MuiFormControl-root")][1]'
    )
    const confirmPwEye = confirmPwControl.locator('button').last()
    await expect(confirmPw).toHaveAttribute('type', 'password')
    await confirmPwEye.click()
    await expect(confirmPw).toHaveAttribute('type', 'text')
    await expect(confirmPw).toHaveValue(sample)
    await confirmPwEye.click()
    await expect(confirmPw).toHaveAttribute('type', 'password')
    await expect(confirmPw).toHaveValue(sample)
  })
})
