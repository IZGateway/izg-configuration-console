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

const destId = 'dev'

test.describe('Edit connection and deploy', () => {
  test('User can create change request successfully by editing connection', async () => {
    await createChangeRequest(page, destId)
  })

  test.describe('Change request page', () => {
    test.beforeAll(async ({ browser }) => {
      const changeRequestButton = page.locator(
        'button[aria-label="changerequest"]'
      )
      await page.goto('/manageconnections')
      await filterByDestinationId(page, destId)
      await changeRequestButton.click()
    })

    test('User can run health check component', async () => {
      await expect(page.locator('#health-check')).toBeVisible()
      await page.getByTestId('runIcon').click()
      await expect(page.getByRole('progressbar')).toBeVisible()
    })

    test('User can view change request ticket', async () => {
      await expect(page.locator('#change-request')).toBeVisible()
      await expect(page.getByTestId('CRTicket')).toContainText(
        'Access Change Request Ticket'
      )
    })

    test('User can view reschedule and cancel CR buttons', async () => {
      await expect(
        page.getByRole('button', { name: 'Reschedule' })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'CANCEL REQUEST' })
      ).toBeVisible()
    })

    test('User can view details of change request', async () => {
      const header = page.getByText('Change Request Details')
      await expect(header).toBeVisible()
      await expect(
        page.getByRole('columnheader', { name: 'Category' })
      ).toBeVisible()
      await expect(
        page.getByRole('columnheader', { name: 'Existing' })
      ).toBeVisible()
      await expect(
        page.getByRole('columnheader', { name: 'Submitting' })
      ).toBeVisible()
      const categories = [
        'USERNAME',
        'DESTURI',
        'FACILITYID',
        'MSH3',
        'MSH4',
        'MSH5',
        'MSH6',
        'MSH22',
        'MSH11',
        'RXA11',
        'PASSWORD',
      ]

      for (const category of categories) {
        await expect(
          page.getByRole('rowheader', { name: category })
        ).toBeVisible()
      }
    })
  })
})
