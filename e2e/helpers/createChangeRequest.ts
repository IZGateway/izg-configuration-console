import { Page, expect } from '@playwright/test'
import { filterByDestinationId } from './filterByDestinationId'

const newValues = {
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

export async function createChangeRequest(page: Page, destId: string) {
  const nextButton = page.locator('#next')
  const scheduleButton = page.locator('#schedule')
  const alert = page.locator('[class*="MuiAlert-message"]')

  const editButton = page.locator('button[aria-label="edit"]')

  // filter table by dest id
  await filterByDestinationId(page, destId)
  const hasEditButton = (await editButton.count()) > 0

  if (hasEditButton) {
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

    await page.waitForURL('/manageconnections', { timeout: 5000 })
    await page.waitForLoadState('networkidle')
    await expect(alert).toBeVisible({ timeout: 15000 })
    expect(await alert.textContent()).toContain(
      'Change request is created successfully'
    )
  }
}
