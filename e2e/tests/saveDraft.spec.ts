/**
 * E2E tests for save-draft functionality in the edit connection workflow.
 *
 * Tests 1 and 2 operate on the fixed destination 'at_draft'.
 * Test 1 requires 'at_draft' to have no draft in progress — it errors if one is found.
 * Test 3 scans visible rows to verify the pencil vs draft icon distinction.
 */
import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

let context
let page: Page

const DEST_ID = 'at_draft'

// A distinct username value used to verify the draft was persisted.
const draftUsername = `DraftTest_${Date.now()}`

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
})

test.afterAll(async () => {
  if (page) await logout(page).catch(() => {})
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})

/**
 * Navigates to /manageconnections, filters to destId, clicks the action button
 * matching buttonAriaLabel, handles any service agreement, then advances to the
 * IDENTIFY step (step 2, the 3rd stepper).
 */
async function goToIdentifyStep(
  page: Page,
  destId: string,
  buttonAriaLabel: 'edit' | 'draft'
): Promise<void> {
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')
  await filterByDestinationId(page, destId)

  const actionButton = page.locator(`button[aria-label="${buttonAriaLabel}"]`)
  await expect(actionButton).toHaveCount(1)
  await actionButton.click()
  await page.waitForURL(/\/(edit|changerequest)\//, { timeout: 15000 })

  // Accept the service agreement if shown (step 0).
  // Skipped automatically if already accepted in this browser session.
  const agreeRadio = page.getByRole('radio', { name: 'I Agree' })
  if (await agreeRadio.isVisible({ timeout: 5000 })) {
    await agreeRadio.click()
    const acceptBtn = page.locator('#accept')
    await expect(acceptBtn).toBeEnabled({ timeout: 5000 })
    await acceptBtn.click()
  }

  // At step 1 (ORGANIZATION), click Next to advance to step 2 (IDENTIFY).
  const nextButton = page.locator('#next')
  await nextButton.waitFor({ state: 'visible', timeout: 15000 })
  await nextButton.click()
}

test.describe('Save draft', () => {
  test('User can save pending updates to editing a connection', async () => {
    const saveButton = page.locator('button[aria-label="save"]')
    const usernameField = page.locator('#username')

    // Verify destination is in a clean state before proceeding.
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
    await filterByDestinationId(page, DEST_ID)
    await goToIdentifyStep(page, DEST_ID, 'edit')

    // Save button should be disabled before any changes are made.
    await saveButton.waitFor({ state: 'visible', timeout: 10000 })
    await expect(saveButton).toBeDisabled()

    // Make a change — fill username with a unique test value.
    await usernameField.clear()
    await usernameField.fill(draftUsername)
    await page.locator('body').click() // blur to trigger validation

    // Save button should now be enabled.
    await expect(saveButton).toBeEnabled()

    // Click save and verify the success feedback.
    await saveButton.click()
    const successAlert = page
      .getByRole('alert')
      .filter({ hasText: /Your draft was saved/i })
    await expect(successAlert).toBeVisible({ timeout: 10000 })

    // Close the edit workflow via the Cancel button.
    await page.locator('#close').click()
    await page.waitForURL('**/manageconnections', { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // The connection should now show a draft icon instead of the pencil icon.
    await filterByDestinationId(page, DEST_ID)
    await expect(
      page.locator('button[aria-label="draft"]').first()
    ).toBeVisible({ timeout: 10000 })

    // Re-open the draft for the destination and navigate to the IDENTIFY step.
    await goToIdentifyStep(page, DEST_ID, 'draft')

    // The previously saved username should be pre-populated in the form.
    await expect(usernameField).toHaveValue(draftUsername)
  })
})

test.describe('Draft info message', () => {
  test('User sees a message while editing a previously saved draft', async () => {
    await goToIdentifyStep(page, DEST_ID, 'draft')

    // The info alert is shown at the IDENTIFY step (step 2) when a draft exists.
    // It is triggered by clicking Next from the ORGANIZATION step (step 1): handleNext()
    // sets the alert, and the activeStep useEffect shows the snackbar when activeStep === 2.
    const infoAlert = page
      .getByRole('alert')
      .filter({ hasText: /You are working on the latest draft/i })
    await expect(infoAlert).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Manage connections draft vs pencil icon', () => {
  test.beforeEach(async () => {
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('columnheader', { name: 'DESTINATION ID' })
      .waitFor({ state: 'visible', timeout: 15000 })

    // Expand to 25 rows so connections with both button types are visible.
    await page.getByRole('combobox', { name: 'Rows per page:' }).click()
    await page.getByRole('option', { name: '25' }).click()
    await page.waitForTimeout(500)
  })

  test('Connection without a draft shows pencil edit icon', async () => {
    const rows = page.locator('div[role="row"][data-rowindex]')
    const rowCount = await rows.count()

    let found = false
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const editButton = row.locator('button[aria-label="edit"]')
      if ((await editButton.count()) > 0) {
        await expect(editButton).toBeVisible()
        // The draft icon must NOT appear in the same row.
        await expect(row.locator('button[aria-label="draft"]')).toHaveCount(0)
        found = true
        break
      }
    }

    test.skip(!found, 'No connection without a draft was visible in the table')
  })

  test('Connection with a draft shows draft icon instead of pencil icon', async () => {
    const rows = page.locator('div[role="row"][data-rowindex]')
    const rowCount = await rows.count()

    let found = false
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const draftButton = row.locator('button[aria-label="draft"]')
      if ((await draftButton.count()) > 0) {
        await expect(draftButton).toBeVisible()
        // The pencil edit icon must NOT appear in the same row.
        await expect(row.locator('button[aria-label="edit"]')).toHaveCount(0)
        found = true
        break
      }
    }

    test.skip(!found, 'No connection with a draft was visible in the table')
  })
})
