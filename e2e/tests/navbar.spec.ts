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
  if (page)
    await page
      .locator('#logout')
      .click()
      .catch(() => {})
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})
test('Home page title and logo are correct', async () => {
  await expect.soft(page).toHaveTitle('IZ Gateway Configuration Console')

  const logo = page.getByAltText('izg logo')
  await expect.soft(logo).toBeVisible()
  const bb = await logo.boundingBox()
  expect.soft(bb.x).toBeLessThan(20)
  expect.soft(bb.y).toBeLessThan(40)
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
  // Icon buttons: the name is the aria-label (also the tooltip), not text.
  await expect.soft(apiLink).toHaveAccessibleName('Swagger API')

  const swaggerButton = navPanel.getByRole('link', { name: 'Swagger API' })
  await expect.soft(swaggerButton).toBeVisible()

  const logoutLink = navPanel.locator('#logout')
  await expect.soft(logoutLink).toHaveAccessibleName('Log Out')
  await expect.soft(logoutLink).toBeVisible()
})

test('Navigation panel can collapse and expand', async () => {
  const navPanel = page.locator('#navigation')
  // The flex row that holds the panel and the page column (Layout.tsx). Flex
  // stretch gives the panel the height of this row.
  const row = navPanel.locator('xpath=..')
  const viewportHeight = page.viewportSize().height
  const toggle = navPanel.getByRole('button', {
    name: 'toggle navigation drawer',
  })

  // The panel height follows the page content, so it changes with the page
  // layout (the app footer, reflow when the width changes). Check that the
  // panel fills the page, not that its height equals an earlier reading.
  // Polled, because the width has a CSS transition.
  const expectPanelFillsPage = async () => {
    await expect
      .poll(async () => {
        const panel = await navPanel.boundingBox()
        const parent = await row.boundingBox()
        return Math.abs(panel.height - parent.height)
      })
      .toBeLessThan(1)
    expect((await navPanel.boundingBox()).height).toBeGreaterThanOrEqual(
      viewportHeight
    )
  }

  const bb = await navPanel.boundingBox()
  await expectPanelFillsPage()

  //Expanded view
  await toggle.click()
  await expect
    .poll(async () => (await navPanel.boundingBox()).width)
    .toBeGreaterThan(bb.width)
  await expectPanelFillsPage()

  //Collapsed view
  await toggle.click()
  await expect
    .poll(async () => (await navPanel.boundingBox()).width)
    .toBe(bb.width)
  await expectPanelFillsPage()
})
