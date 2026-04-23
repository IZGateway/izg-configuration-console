import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'

test.describe.configure({ retries: 0 })

let context
let page: Page

const destId = 'al'
const user1 = {
  username: process.env.OKTA_USERNAME,
  password: process.env.OKTA_PASSWORD,
}
const user2 = {
  username: process.env.OKTA_NONADMIN_USERNAME,
  password: process.env.OKTA_NONADMIN_PASSWORD,
}

// Helper: navigate through service agreement to the Identify step (step 3)
async function navigateToIdentifyStep(page: Page) {
  const nextButton = page.locator('#next')
  const alert = page.locator('[class*="MuiAlert-message"]')

  // Handle service agreement if present
  const agreeButton = page.getByRole('radio', { name: 'I Agree' })
  try {
    await agreeButton.waitFor({ state: 'visible', timeout: 5000 })
    await agreeButton.click()
    const acceptBtn = page.locator('#accept')
    await expect(acceptBtn).toBeEnabled({ timeout: 5000 })
    await acceptBtn.click()
  } catch {
    // Service agreement not shown (already accepted in this session)
  }

  // Step 1 (Organization) -> click next
  await nextButton.waitFor({ state: 'visible', timeout: 15000 })
  await nextButton.click()

  // Dismiss any auto-save draft alert
  const alertAppeared = await alert
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  if (alertAppeared) {
    const closeButton = page.locator('[title="Close"]')
    await closeButton.click()
    await alert.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  // Step 2 (Identify) is now active - wait for the username field to be visible
  await page.locator('#username').waitFor({ state: 'visible', timeout: 15000 })
}

// Helper: make a change on the Identify step and click save (draft)
async function makeChangeAndSaveDraft(page: Page) {
  const alert = page.locator('[class*="MuiAlert-message"]')

  // Make a change to the username field with a timestamp to guarantee it always differs
  const usernameField = page.locator('#username')
  await usernameField.fill(`overwrite_${Date.now()}`)

  // Click the floating save (draft) button
  await page.locator('[aria-label="save"]').click()

  // Verify success alert
  await expect(alert).toBeVisible({ timeout: 15000 })
  await expect(alert).toContainText('Your draft was saved')
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
})

test.afterAll(async () => {
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})

test.describe('User can overwrite previously saved draft by any user', () => {
  test('User 1 saves a draft for the connection (or skips if draft already exists)', async () => {
    // Login as user 1
    await loginToOkta(page, user1.username, user1.password)
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')

    await filterByDestinationId(page, destId)

    const draftButton = page.locator('button[aria-label="draft"]')
    const editButton = page.locator('button[aria-label="edit"]')

    const hasDraft = (await draftButton.count()) > 0

    if (hasDraft) {
      // Draft already exists — skip directly to user 2 flow
      test.info().annotations.push({
        type: 'info',
        description: `Draft already exists for ${destId}, skipping user 1 draft creation.`,
      })
      return
    }

    // No draft: navigate to edit page and save a draft
    await expect(editButton.first()).toBeVisible()
    await editButton.first().click()
    await page.waitForURL(/\/edit\//, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    await navigateToIdentifyStep(page)
    await makeChangeAndSaveDraft(page)
  })

  test('User 2 opens the draft and overwrites it with new changes', async () => {
    // Navigate to a stable page before logging out so the nav drawer is accessible
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
    // Logout user 1 and login as user 2
    await logout(page)
    await loginToOkta(
      page,
      user2.username,
      user2.password,
      process.env.OKTA_NONADMIN_EXPECTED_FULLNAME
    )
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')

    await filterByDestinationId(page, destId)

    // The draft button (SaveIcon, aria-label="draft") should be visible
    const draftButton = page.locator('button[aria-label="draft"]')
    await expect(draftButton.first()).toBeVisible({ timeout: 15000 })

    // Click the draft icon to open the edit page with existing draft
    await draftButton.first().click()
    await page.waitForURL(/\/edit\//, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Navigate to Identify step (step 3)
    await navigateToIdentifyStep(page)

    // Make a change and save — overwriting the existing draft
    await makeChangeAndSaveDraft(page)
  })
})
