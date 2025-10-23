import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

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

const newValues = {
  uri: 'https://example.com',
  username: 'UsernameNEW',
  password: 'NEWpassword123!!',
  facilityId: 'xyz',
  MSH3: 'MSH3',
  MSH4: 'MSH4',
  MSH5: 'MSH5',
  MSH6: 'MSH6',
  MSH22: 'MSH22',
  MSH11: 'P',
  RXA11: 'RXA11',
}

async function filterByDestinationId(page: Page, destId: string) {
  await page.locator('button[aria-label="Show filters"]').click()
  await page.locator('[role="combobox"]:has-text("contains")').click()
  await page.getByRole('option', { name: 'equals' }).click()
  await page.getByRole('textbox', { name: /value/i }).fill(destId)
  await page.getByText('My Connections').click() // Click anywhere to close filter pop up
}

const destId = 'dev'

test.describe('Edit connection and deploy', () => {
  test('User can create change request successfully by editing connection', async () => {
    const changeRequestButton = page.locator(
      'button[aria-label="changerequest"]'
    )
    const nextButton = page.locator('#next')
    const scheduleButton = page.locator('#schedule')
    const alert = page.locator('[class*="MuiAlert-message"]')
    const editButton = page.locator('button[aria-label="edit"]')
    // filter table by dest id
    await filterByDestinationId(page, destId)
    const hasEditButton = (await editButton.count()) > 0

    // Skip only THIS test if edit button is not available
    test.skip(
      !hasEditButton,
      'Edit button is not available for this destination'
    )

    // if cr is not created
    await editButton.click()
    if (await page.getByTestId('agree-button').isVisible()) {
      await page.getByTestId('agree-button').click()
      await page.locator('#accept').click()
    }

    await nextButton.click()

    // close save draft alert if there
    if (await alert.isVisible()) {
      const closeButton = page.locator('[title="Close"]')
      await closeButton.click()
    }

    //start editing
    await page.locator('#destUri').fill(newValues.uri)
    await page.locator('#username').fill(newValues.username)
    await page.getByRole('button', { name: 'CHANGE PASSWORD' }).click()
    await page.locator('[name="newPassword"]').fill(newValues.password)
    await page.locator('[name="confirmPassword"]').fill(newValues.password)
    await page.locator('[name="facilityId"]').fill(newValues.facilityId)
    await page.locator('[name="MSH3"]').fill(newValues.MSH3)
    await page.locator('[name="MSH4"]').fill(newValues.MSH4)
    await page.locator('[name="MSH5"]').fill(newValues.MSH5)
    await page.locator('[name="MSH6"]').fill(newValues.MSH6)
    await page.locator('[name="MSH22"]').fill(newValues.MSH22)
    await page.locator('[name="MSH11"]').fill(newValues.MSH11)
    await page.locator('[name="RXA11"]').fill(newValues.RXA11)
    await nextButton.click()

    // check submitting values
    const rows = page.locator('table tbody tr')
    const submittingValues: string[] = []
    const rowCount = await rows.count()
    for (let i = 0; i < rowCount; i++) {
      const submittingCell = rows.nth(i).locator('td').nth(1)
      const value = await submittingCell.textContent()
      submittingValues.push(value?.trim() || '')
    }
    Object.values(newValues).forEach((value) => {
      expect(submittingValues).toContain(value)
    })

    await nextButton.click()

    //schedule
    await page.locator('[value="As Soon As Possible"]').click()
    await scheduleButton.click()

    await page.waitForURL('/manageconnections')
    await expect(alert).toBeVisible()
    expect(await alert.textContent()).toContain(
      'Change request is created successfully'
    )
    // Check now Edit button is not visible and CR button is visible
    await filterByDestinationId(page, destId)
    await expect(editButton).not.toBeVisible()
    await expect(changeRequestButton).toBeVisible()
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
