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
  // Measure the panel users see, the Drawer's paper. The Drawer root
  // (#navigation) switches width the moment `open` changes; the paper animates
  // to it (the width transition in src/components/Navigation/index.tsx). So
  // only the paper shows whether the visible panel expands and collapses.
  const paper = navPanel.locator('.MuiDrawer-paper')
  const viewportHeight = page.viewportSize().height
  const toggle = navPanel.getByRole('button', {
    name: 'toggle navigation drawer',
  })

  // The paper is fixed to the window at full height (MUI's Drawer paper), so
  // it must be as tall as the viewport. 1 px of tolerance absorbs subpixel
  // layout, e.g. 719.99 at a 720 px viewport.
  const expectPanelFillsWindow = async () => {
    await expect
      .poll(async () => (await paper.boundingBox()).height)
      .toBeGreaterThanOrEqual(viewportHeight - 1)
  }

  const collapsedWidth = (await paper.boundingBox()).width
  await expectPanelFillsWindow()

  // Expanded view. Polled, because the paper's width animates.
  await toggle.click()
  await expect
    .poll(async () => (await paper.boundingBox()).width)
    .toBeGreaterThan(collapsedWidth)
  await expectPanelFillsWindow()

  // Collapsed view: back to the starting width once the transition ends.
  await toggle.click()
  await expect
    .poll(async () => (await paper.boundingBox()).width)
    .toBe(collapsedWidth)
  await expectPanelFillsWindow()
})
