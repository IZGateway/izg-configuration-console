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
  if (page) await logout(page).catch(() => {})
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})

const destId = 'ca'

test.describe('Close edit connection page', () => {
  test('User can exit edit page by clicking Close button and is navigated back to manage connections', async () => {
    // Filter table by destination ID
    await filterByDestinationId(page, destId)

    // Click the edit button for the first matching connection
    const editButton = page.locator('button[aria-label="edit"]')
    await expect(editButton.first()).toBeVisible()
    await editButton.first().click()

    // Wait for navigation to the edit page
    await page.waitForURL(/\/edit\//, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Click the Close button at the top of the edit page
    await page.locator('#close').click()

    // Expect to be navigated back to the manage connections page
    await page.waitForURL(/\/manageconnections/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/manageconnections/)
  })
})
