/**
 * E2E tests for save-draft functionality in the edit connection workflow.
 *
 * Test 1 dynamically finds a connection with an edit button and saves a draft.
 * Test 2 dynamically finds any connection with a draft button and verifies the info message.
 * Test 3 verifies that the edit vs draft icon distinction is visible in the table.
 *
 * All tests expand to 25 rows per page so that connections with edit/draft buttons
 * (which may not appear in the default 10-row view) are reachable.
 */
import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

let context
let page: Page

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
 * Navigates to /manageconnections, expands the table to 25 rows, scans for the
 * first row whose action button matches buttonAriaLabel, clicks it, handles any
 * service agreement, then advances to the IDENTIFY step (step 2, the 3rd stepper).
 *
 * Returns the destId of the matched connection, or null if none was found.
 */
async function findAndGoToIdentifyStep(
  page: Page,
  buttonAriaLabel: 'edit' | 'draft'
): Promise<string | null> {
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')

  // Expand rows so connections beyond the first page are visible.
  await page.getByRole('combobox', { name: 'Rows per page:' }).click()
  await page.getByRole('option', { name: '25' }).click()
  await page.waitForTimeout(500)

  const rows = page.locator('div[role="row"][data-rowindex]')
  const rowCount = await rows.count()

  let foundDestId: string | null = null

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i)
    const btn = row.locator(`button[aria-label="${buttonAriaLabel}"]`)
    if ((await btn.count()) > 0) {
      foundDestId =
        (await row.locator('div[data-field="destId"]').textContent())?.trim() ||
        null
      await btn.click()
      break
    }
  }

  if (!foundDestId) return null

  await page.waitForURL(/\/(edit|changerequest)\//, { timeout: 15000 })

  // Accept the service agreement if shown (step 0).
  // Skipped automatically if already accepted in this browser session.
  try {
    const agreeRadio = page.getByRole('radio', { name: 'I Agree' })
    await agreeRadio.waitFor({ state: 'visible', timeout: 5000 })
    await agreeRadio.click()
    const acceptBtn = page.locator('#accept')
    await expect(acceptBtn).toBeEnabled({ timeout: 5000 })
    await acceptBtn.click()
  } catch {
    // Agreement already accepted or not shown — continue.
  }

  // At step 1 (ORGANIZATION), click Next to advance to step 2 (IDENTIFY).
  const nextButton = page.locator('#next')
  await nextButton.waitFor({ state: 'visible', timeout: 15000 })
  await nextButton.click()

  return foundDestId
}

test.describe('Save draft', () => {
  test('User can save pending updates to editing a connection', async () => {
    const saveButton = page.locator('button[aria-label="save"]')
    const usernameField = page.locator('#username')

    const destId = await findAndGoToIdentifyStep(page, 'edit')
    test.skip(
      !destId,
      'No connection with an edit button was found in the visible rows'
    )

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
    await filterByDestinationId(page, destId)
    const draftButton = page.locator('button[aria-label="draft"]')
    await expect(draftButton.first()).toBeVisible({ timeout: 10000 })

    // Re-open the exact connection we just saved (by filtering to its destId)
    // and navigate to the IDENTIFY step via the draft button.
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
    await filterByDestinationId(page, destId)
    await page.locator('button[aria-label="draft"]').first().click()
    await page.waitForURL(/\/(edit|changerequest)\//, { timeout: 15000 })

    // Service agreement is already accepted in this session — skip it.
    const nextButton = page.locator('#next')
    await nextButton.waitFor({ state: 'visible', timeout: 15000 })
    await nextButton.click()

    // The previously saved username should be pre-populated in the form.
    await expect(usernameField).toHaveValue(draftUsername)
  })
})

test.describe('Draft info message', () => {
  test('User sees a message while editing a previously saved draft', async () => {
    // Find any connection that currently has a draft button.
    const destId = await findAndGoToIdentifyStep(page, 'draft')
    test.skip(
      !destId,
      'No connection with a draft button was found — run the save draft test first or ensure a draft exists in the environment'
    )

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

    // Expand to 25 rows so connections with edit/draft buttons are visible.
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
