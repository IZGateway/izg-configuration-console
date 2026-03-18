import { test, expect, Page } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

const requiredEnvs = ['OKTA_USERNAME', 'OKTA_PASSWORD', 'BASE_URL'] as const

let context
let page: Page

const destId = 'ct'
const destTypeId = 5
const historyPath = `/history/${destTypeId}/${destId}`

test.describe('Connection History - changed values', () => {
  test.describe.configure({ timeout: 180000 })

  test.beforeAll(async ({ browser }) => {
    const missing = requiredEnvs.filter((k) => !process.env[k])
    if (missing.length) {
      test.skip(true, `Missing env vars: ${missing.join(', ')}`)
    }

    context = await browser.newContext()
    page = await context.newPage()

    await loginToOkta(
      page,
      process.env.OKTA_USERNAME as string,
      process.env.OKTA_PASSWORD as string,
      process.env.OKTA_USER_FULLNAME
    )

    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    if (page && !page.isClosed()) {
      const logoutButton = page.locator('#logout')
      if ((await logoutButton.count()) > 0) {
        await logout(page)
      }
      await page.close()
    }
    if (context) await context.close()
  })

  test('User can expand and collapse change history details to view old and new values', async () => {
    await page.goto(historyPath)
    await page.waitForURL(new RegExp(`${historyPath}$`), {
      timeout: 15000,
    })
    await expect(
      page.getByRole('heading', { name: 'Connection History' })
    ).toBeVisible()

    const changeHistoryCard = page.locator('#change-history')
    await expect(changeHistoryCard).toBeVisible()

    const showDetailsButton = changeHistoryCard
      .getByRole('button', { name: /show (details|changes)/i })
      .first()
    await expect(showDetailsButton).toBeVisible({ timeout: 10000 })
    await showDetailsButton.click()

    const hideDetailsButton = changeHistoryCard
      .getByRole('button', { name: /hide (details|changes)/i })
      .first()
    await expect(hideDetailsButton).toBeVisible({ timeout: 10000 })

    await expect(
      changeHistoryCard.getByRole('columnheader', { name: 'FIELDS' })
    ).toBeVisible()
    await expect(
      changeHistoryCard.getByRole('columnheader', { name: 'FROM' })
    ).toBeVisible()
    await expect(
      changeHistoryCard.getByRole('columnheader', { name: 'TO' })
    ).toBeVisible()

    const changedValueRow = changeHistoryCard.locator('table tbody tr').first()

    await expect(changedValueRow).toBeVisible()
    await expect(changedValueRow.locator('th,td').first()).not.toHaveText(
      /^\s*$/
    )
    await expect(changedValueRow.locator('td').first()).not.toHaveText(/^\s*$/)
    await expect(changedValueRow.locator('td').nth(1)).not.toHaveText(/^\s*$/)

    await hideDetailsButton.click()
    await expect(
      changeHistoryCard.getByRole('columnheader', { name: 'FIELDS' })
    ).not.toBeVisible()
  })
})
