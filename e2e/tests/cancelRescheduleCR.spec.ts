import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'
import { createChangeRequest } from '../helpers/createChangeRequest'

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

const destId = 'dev2011'

test('User should be able to reschedule submitted CR', async () => {
  await createChangeRequest(page, destId)
  await page.goto('/manageconnections')
  await filterByDestinationId(page, destId)
  const changeRequestButton = page.locator('button[aria-label="changerequest"]')
  await changeRequestButton.first().click()
  await page.getByRole('button', { name: 'Reschedule' }).click()
  await page.getByText('Reschedule ASAP').click()
  await page.getByRole('button', { name: 'Schedule Now' }).click()
  await expect(page.getByText('New scheduled Date Time is')).toBeVisible({
    timeout: 15000,
  })
})

test('User should be able to cancel submitted CR', async () => {
  await createChangeRequest(page, destId)
  await page.goto('/manageconnections')
  await filterByDestinationId(page, destId)
  const changeRequestButton = page.locator('button[aria-label="changerequest"]')
  await changeRequestButton.first().click()
  await page.getByRole('button', { name: 'CANCEL REQUEST' }).click()
  await page.getByRole('button', { name: 'Cancel Request' }).click()
  await expect(page.getByText('Change request is cancelled')).toBeVisible({
    timeout: 15000,
  })
})
