/**
 * E2E tests for save-draft functionality in the edit connection workflow.
 *
 * Tests 1 and 2 operate on the fixed destination 'at_draft'.
 * Test 3 scans visible rows to verify the pencil vs draft icon distinction.
 */
import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

const requiredEnvs = ['OKTA_USERNAME', 'OKTA_PASSWORD', 'BASE_URL'] as const
const requiredUserTwoEnvs = [
  'OKTA_NONADMIN_USERNAME',
  'OKTA_NONADMIN_PASSWORD',
  'OKTA_NONADMIN_EXPECTED_FULLNAME',
] as const

let context
let page: Page

const DEST_ID = 'at_draft'

// A distinct username value used to verify the draft was persisted.
const draftUsername = `DraftTest_${Date.now()}`

test.beforeAll(async ({ browser }) => {
  const missing = requiredEnvs.filter((k) => !process.env[k])
  if (missing.length)
    test.skip(true, `Missing env vars: ${missing.join(', ')}`)

  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(
    page,
    process.env.OKTA_USERNAME as string,
    process.env.OKTA_PASSWORD as string
  )
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

  // Depending on session state, user may land on service agreement (Accept)
  // or organization step (Next). Handle both deterministically.
  const nextButton = page.locator('#next')
  const acceptBtn = page.locator('#accept')

  await expect(async () => {
    const nextVisible = await nextButton.isVisible()
    const acceptVisible = await acceptBtn.isVisible()
    expect(nextVisible || acceptVisible).toBeTruthy()
  }).toPass({ timeout: 15000 })

  if (await acceptBtn.isVisible()) {
    const agreeRadio = page.getByRole('radio', { name: 'I Agree' })
    if (await agreeRadio.isVisible()) {
      await agreeRadio.click()
    }
    await expect(acceptBtn).toBeEnabled({ timeout: 5000 })
    await acceptBtn.click()
  }

  // At step 1 (ORGANIZATION), click Next to advance to step 2 (IDENTIFY).
  await nextButton.waitFor({ state: 'visible', timeout: 15000 })
  await nextButton.click()
}

/**
 * Opens edit workflow using draft icon if available, else falls back to pencil.
 */
async function goToIdentifyStepUsingAvailableAction(
  page: Page,
  destId: string
): Promise<'edit' | 'draft'> {
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')
  await filterByDestinationId(page, destId)

  // Data-grid updates are async after filtering; wait for either action icon.
  await expect(async () => {
    const draftCount = await page.locator('button[aria-label="draft"]').count()
    const editCount = await page.locator('button[aria-label="edit"]').count()
    expect(draftCount + editCount).toBeGreaterThan(0)
  }).toPass({ timeout: 15000 })

  const draftButton = page.locator('button[aria-label="draft"]')
  if ((await draftButton.count()) === 1) {
    await goToIdentifyStep(page, destId, 'draft')
    return 'draft'
  }

  await goToIdentifyStep(page, destId, 'edit')
  return 'edit'
}

test.describe('Save draft', () => {
  test('User can save pending updates to editing a connection', async () => {
    const saveButton = page.locator('button[aria-label="save"]')
    const resetButton = page.locator('button[aria-label="reset"]')
    const usernameField = page.locator('#username')

    // Precondition: user must be able to edit or resume draft for the target destination.
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
    await filterByDestinationId(page, DEST_ID)
    const userOneVisibleActionsForSaveTest =
      (await page.locator('button[aria-label="edit"]').count()) +
      (await page.locator('button[aria-label="draft"]').count())
    test.skip(
      userOneVisibleActionsForSaveTest === 0,
      `User 1 does not appear to have edit/draft access to destination '${DEST_ID}' in this environment`
    )

    // Open the destination in the edit workflow and navigate to the IDENTIFY step.
    // Some environments may already have a draft for this destination.
    await goToIdentifyStepUsingAvailableAction(page, DEST_ID)

    // Save button should be disabled before any changes are made.
    await saveButton.waitFor({ state: 'visible', timeout: 10000 })
    if (await saveButton.isEnabled()) {
      // If an existing draft left unsaved changes, reset to establish
      // a clean baseline for this test.
      await expect(resetButton).toBeVisible({ timeout: 5000 })
      await expect(resetButton).toBeEnabled({ timeout: 5000 })
      await resetButton.click()
      await page.locator('#yes').click()
      await expect(
        page.getByRole('alert').filter({ hasText: /Your draft was reset/i })
      ).toBeVisible({ timeout: 10000 })
    }
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
    const rowsPerPage = page.getByRole('combobox', { name: 'Rows per page:' })
    await rowsPerPage.click()
    await page.getByRole('option', { name: '25' }).click()
    await expect(rowsPerPage).toHaveText(/25/, { timeout: 10000 })
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

test.describe('Draft reset by another user', () => {
  test('Any user can reset configuration values from a saved draft', async ({ browser }) => {
    const missingUserTwo = requiredUserTwoEnvs.filter((k) => !process.env[k])
    test.skip(
      missingUserTwo.length > 0,
      `Missing env vars for user 2: ${missingUserTwo.join(', ')}`
    )

    const usernameField = page.locator('#username')
    const saveButton = page.locator('button[aria-label="save"]')
    const resetButton = page.locator('button[aria-label="reset"]')
    const userOneDraftUsername = `DraftResetByUser1_${Date.now()}`

    // Precondition: user 1 must be able to act on target destination.
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
    await filterByDestinationId(page, DEST_ID)
    const userOneVisibleActions =
      (await page.locator('button[aria-label="edit"]').count()) +
      (await page.locator('button[aria-label="draft"]').count())
    test.skip(
      userOneVisibleActions === 0,
      `User 1 does not appear to have access to destination '${DEST_ID}' in this environment`
    )

    // User 1: create/update and save a draft value on the target destination.
    await goToIdentifyStepUsingAvailableAction(page, DEST_ID)
    await usernameField.clear()
    await usernameField.fill(userOneDraftUsername)
    await page.locator('body').click() // blur to trigger validation
    await expect(saveButton).toBeEnabled()

    await saveButton.click()
    await expect(
      page.getByRole('alert').filter({ hasText: /Your draft was saved/i })
    ).toBeVisible({ timeout: 10000 })

    // User 2: login in an isolated context and reset the same draft.
    const expectedNonAdminFullName = (
      process.env.OKTA_NONADMIN_EXPECTED_FULLNAME as string
    ).replace(/^['\"]|['\"]$/g, '')

    const userTwoContext = await browser.newContext()
    const userTwoPage = await userTwoContext.newPage()
    try {
      await loginToOkta(
        userTwoPage,
        process.env.OKTA_NONADMIN_USERNAME as string,
        process.env.OKTA_NONADMIN_PASSWORD as string,
        expectedNonAdminFullName
      )

      // Precondition: user 2 must be able to see this destination in Manage Connections.
      await userTwoPage.goto('/manageconnections')
      await userTwoPage.waitForLoadState('networkidle')
      await filterByDestinationId(userTwoPage, DEST_ID)
      const userTwoVisibleActions =
        (await userTwoPage.locator('button[aria-label="edit"]').count()) +
        (await userTwoPage.locator('button[aria-label="draft"]').count())
      test.skip(
        userTwoVisibleActions === 0,
        `User 2 does not appear to have edit/draft access to destination '${DEST_ID}' in this environment`
      )

      await goToIdentifyStep(userTwoPage, DEST_ID, 'draft')

      const userTwoUsernameField = userTwoPage.locator('#username')
      const userTwoResetButton = userTwoPage.locator('button[aria-label="reset"]')

      // Confirm user 2 sees user 1's saved draft value, then reset.
      await expect(userTwoUsernameField).toHaveValue(userOneDraftUsername)
      await expect(userTwoResetButton).toBeEnabled()
      await userTwoResetButton.click()
      await userTwoPage.locator('#yes').click()

      const resetAlert = userTwoPage
        .getByRole('alert')
        .filter({ hasText: /Your draft was reset/i })
      await expect(async () => {
        const alertVisible = await resetAlert.isVisible().catch(() => false)
        const currentValue = await userTwoUsernameField.inputValue()
        expect(alertVisible || currentValue !== userOneDraftUsername).toBeTruthy()
      }).toPass({ timeout: 10000 })
      await expect(userTwoUsernameField).not.toHaveValue(userOneDraftUsername)

      // Return to manage page and verify draft icon is cleared.
      await userTwoPage.locator('#close').click()
      await userTwoPage.waitForURL('**/manageconnections', { timeout: 15000 })
      await filterByDestinationId(userTwoPage, DEST_ID)
      await expect(userTwoPage.locator('button[aria-label="edit"]')).toHaveCount(1)
      await expect(userTwoPage.locator('button[aria-label="draft"]')).toHaveCount(0)
    } finally {
      if (!userTwoPage.isClosed()) await userTwoPage.close()
      await userTwoContext.close()
    }
  })
})
