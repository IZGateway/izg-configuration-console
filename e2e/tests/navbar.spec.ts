import { BrowserContext, expect, Page, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'

let context: BrowserContext
let page: Page

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
})

test.afterAll(async () => {
  await page.locator('#logout').click()
  await page.close()
  await context.close()
})
test('Home page title and logo are correct', async () => {
  await expect.soft(page).toHaveTitle('IZ Gateway Configuration Console')

  const logo = page.getByAltText('izg logo')
  await expect.soft(logo).toBeVisible()
  const bb = await logo.boundingBox()
  expect.soft(bb.x).toBeLessThan(20)
  expect.soft(bb.y).toBeLessThan(20)
})

test('Navigation panel has expected links', async () => {
  const navPanel = await page.locator('#navigation')
  await expect.soft(navPanel).toBeVisible()
  await expect
    .soft(navPanel.getByRole('button', { name: 'toggle navigation drawer' }))
    .toBeVisible()

  const manageConnectionsLink = navPanel
    .getByRole('link')
    .filter({ hasText: 'Manage Connections' })
  await expect
    .soft(manageConnectionsLink)
    .toHaveAttribute('href', '/manageconnections')
  await expect.soft(manageConnectionsLink).toBeVisible()

  const apiLink = navPanel.locator('xpath=//a[@href="/api-doc"]')
  await expect.soft(apiLink).toHaveAttribute('href', '/api-doc')
  await expect.soft(apiLink).toHaveText('Swagger API')

  const swaggerButton = navPanel.getByText('Swagger API')
  await expect.soft(swaggerButton).toBeVisible()

  const logoutLink = navPanel.locator('#logout')
  await expect.soft(logoutLink).toHaveText('Log Out')
  await expect.soft(logoutLink).toBeVisible()
})

test('Navigation panel can collapse and expand', async () => {
  const navPanel = page.locator('#navigation')
  const bb = await navPanel.boundingBox()
  //Exapnded view
  await navPanel
    .getByRole('button', { name: 'toggle navigation drawer' })
    .click()
  let bb2 = await navPanel.boundingBox()
  expect.soft(bb2.width).toBeLessThan(bb.width)
  expect.soft(bb2.height).toBe(bb.height)
  //Collapsed view
  await navPanel
    .getByRole('button', { name: 'toggle navigation drawer' })
    .click()
  bb2 = await navPanel.boundingBox()
  expect.soft(bb2.width).toBe(bb.width)
  expect.soft(bb2.height).toBe(bb.height)
})
