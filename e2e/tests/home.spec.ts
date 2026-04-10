import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'

let context
let page: Page

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
})

test.afterAll(async () => {
  await logout(page)
  await page.close()
  await context.close()
})

test('Verify title', async () => {
  await expect(page).toHaveTitle('IZ Gateway Configuration Console')
})

test('Verify Manage connections and our api buttons', async () => {
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Manage Connections' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'OUR API' })).toBeVisible()
})

test('Verify homepage section headers', async () => {
  const headers = [
    'How does the IZ Gateway work?',
    'Frequently Asked Questions',
    'Use Cases',
    'Supporting Documentation',
  ]
  for (const header of headers) {
    await expect(page.getByText(header, { exact: true })).toBeVisible()
  }
})

test('Verify System Resources widget is visible', async () => {
  await expect(page.getByText('System Resources')).toBeVisible()
  await expect(page.getByText('CPU Usage')).toBeVisible()
  await expect(page.getByText('Memory Usage')).toBeVisible()
  await expect(page.getByText('Disk Usage')).toBeVisible()
})

test('Verify CTA buttons on cards', async () => {
  const buttons = [
    'Read More...',
    'Get Answers',
    'Learn More',
    'View Documentation',
  ]
  for (const label of buttons) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
})

test('Verify footer quick links', async () => {
  const quickLinks = [
    'Release Notes',
    'PolicyInfrastructure',
    'Request Support',
  ]
  for (const text of quickLinks) {
    await expect(page.getByText(text)).toBeVisible()
  }
})

test('Clicking "Release Notes" opens modal with "here" link', async () => {
  await page.locator('[data-testid="NotesOutlinedIcon"]').click()
  const modal = page.locator('[data-testid="NotesOutlinedIcon"]')
  await expect(modal).toBeVisible()
  const hereLink = page.getByRole('link', { name: 'here' })
  await expect(hereLink).toBeVisible()
  await expect(hereLink).toHaveAttribute(
    'href',
    'https://github.com/IZGateway/izgw-hub/releases'
  )
})

test('Clicking "Policy" opens modal with "Legal agreements" link', async () => {
  await page.goto('/')
  await page.locator('[data-testid="PolicyOutlinedIcon"]').click()
  const modal = page.locator('[data-testid="PolicyOutlinedIcon"]')
  await expect(modal).toBeVisible()
  const hereLink = page.getByRole('link', { name: 'IZG Legal Agreements' })
  await expect(hereLink).toBeVisible()
  await expect(hereLink).toHaveAttribute(
    'href',
    'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20Legal%20Agreements?csf=1&web=1&e=3UgLNm'
  )
})

test('Clicking Request Support icon contains correct support link', async () => {
  const supportLink = page
    .locator('[data-testid="ContactSupportOutlinedIcon"]')
    .locator('xpath=ancestor::a')
  await expect(supportLink).toBeVisible()
  await expect(supportLink).toHaveAttribute(
    'href',
    'https://help.izgateway.org/portal/1?createRequest=true&portalId=1&requestTypeId=16'
  )
})

test('Expand Supporting Documentation each section -> check link', async () => {
  await page.goto('/')
  await page.getByRole('button', { name: 'view documentation' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // "Data sharing with CDC" section
  await page.getByRole('button', { name: 'Data sharing with CDC' }).click()
  const dataSharingDocLink = page.getByRole('link', {
    name: 'Access documentation',
  })
  await expect(dataSharingDocLink).toBeVisible()
  await expect(dataSharingDocLink).toHaveAttribute(
    'href',
    'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20IIS-CDC%20Reporting%20(Automate%20Data%20Submissions)?csf=1&web=1&e=wZbFmh'
  )
  await page.getByRole('button', { name: 'Data sharing with CDC' }).click()
  // "Data exchange between IISs" section
  await page.getByRole('button', { name: 'Data exchange between IISs' }).click()
  const dataExchangeDocLink = page.getByRole('link', {
    name: 'Access documentation',
  })
  await expect(dataExchangeDocLink).toBeVisible()
  await expect(dataExchangeDocLink).toHaveAttribute(
    'href',
    'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20IIS-to-IIS%20Data%20Exchange?csf=1&web=1&e=5UcDZG'
  )
  await page.getByRole('button', { name: 'Data exchange between IISs' }).click()
  // "Data exchange with vaccine providers" section
  await page
    .getByRole('button', { name: 'Data exchange with vaccine providers' })
    .click()
  const dataExchangeVaccinePartnersDocLink = page.getByRole('link', {
    name: 'Access documentation',
  })
  await expect(dataExchangeVaccinePartnersDocLink).toBeVisible()
  await expect(dataExchangeVaccinePartnersDocLink).toHaveAttribute(
    'href',
    'https://cdcpartners.sharepoint.com/:f:/r/sites/NCIRD/PAP/IIS/IZ%20Gateway/IZG%20Provider-to-IIS%20Data%20Exchange?csf=1&web=1&e=Wid5UA'
  )
  // Close the dialog so it doesn't block subsequent interactions (e.g. logout)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
