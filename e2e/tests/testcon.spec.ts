import { test, expect, Page } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'

let page = null
let context = null

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
})

async function checkPrintButton(page: Page) {
  const printButton = page.getByRole('button', { name: 'PRINT' })
  //    Expect to see test results can be printed or save as pdf
  await expect.soft(printButton).toBeVisible()
  await expect.soft(printButton).toBeEnabled()
}

const testTypes = ['dns', 'tcp', 'tls', 'cipher', 'wsdl', 'connectivity', 'qbp']

async function testResults(page: Page, results) {
  const testInfo = page.locator('#test-connection-info')
  await expect.soft(testInfo).toBeVisible()

  // Expect to see 7 tests for DNS Lookup, TCP Connectivity Test, TLS Version Test,
  // NIST Approved Encryption, WSDLsadf Test, Send Connectivity Test, Submit Single Message,
  // with their results of PASS, FAIL, WARNING, or N/A
  const verifyDNS = page.getByText('Verify DNS entry')
  await expect.soft(verifyDNS).toBeAttached()
  await expect
    .soft(page.getByTestId('dns-status-chip').getByText(results[0]))
    .toBeVisible()

  const verifyTCP = page.getByText('TCP Connectivity Test')
  await expect.soft(verifyTCP).toBeAttached()
  await expect
    .soft(page.getByTestId('tcp-status-chip').getByText(results[1]))
    .toBeVisible()

  const tlsVersion = page.getByText('TLS Version Test')
  await expect.soft(tlsVersion).toBeAttached()
  await expect
    .soft(page.getByTestId('tls-status-chip').getByText(results[2]))
    .toBeVisible()

  const nistEncryption = page.getByText('Host uses a NIST approved')
  await expect.soft(nistEncryption).toBeAttached()
  await expect
    .soft(page.getByTestId('cipher-status-chip').getByText(results[3]))
    .toBeVisible()

  const wsdlTest = page.getByText('WSDL Test')
  await expect.soft(wsdlTest).toBeAttached()
  await expect
    .soft(page.getByTestId('wsdl-status-chip').getByText(results[4]))
    .toBeVisible()

  const connectivityTest = page.getByText('Send a Connectivity Test')
  await expect.soft(connectivityTest).toBeAttached()
  await expect
    .soft(page.getByTestId('connectivity-status-chip').getByText(results[5]))
    .toBeVisible()

  const singleMessage = page.getByText('Send a Submit Single Message')
  await expect.soft(singleMessage).toBeAttached()
  await expect
    .soft(page.getByTestId('qbp-status-chip').getByText(results[6]))
    .toBeVisible()
}

test('Test Navigation to Test Connection Page', async ({}) => {
  // Verify test button exists and is visible
  const test404 = page
    .getByRole('row', { name: '404 Development DEVELOPMENT' })
    .getByLabel('test')
  await expect.soft(test404).toBeVisible()

  // For some reason, click() isn't working here.
  await test404.click()

  //await page.goto('/test/5/404')
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
  // Expect to see test connection page
  await expect.soft(page).toHaveURL(/.*\/test\/5\/404/)
  // Expect to see results of the tests
  await testResults(page, [
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'WARNING',
    'WARNING',
    'FAIL',
  ])

  let testTime = page.locator('#TestTime')
  // Expect to see test time
  await expect.soft(testTime).toBeVisible()
  // Expect to see test time in format of MM/DD/YYYY HH:MM:SS AM/PM
  const testTimeText = await testTime.textContent()
  const testTimeRegex = /^\d{1,2}:\d{2}:\d{2} (AM|PM)$/
  expect.soft(testTimeText).toMatch(testTimeRegex)
  await page.waitForTimeout(10000)
  // User can re run tests with 'Re run test' button
  // Once test results are back, click on 'Re run Test' button
  await page.getByRole('button', { name: 'RERUN TEST' }).click()
  // Ensure the page is fully loaded
  await page.waitForLoadState('networkidle')
  testTime = page.locator('#TestTime')
  const newTestTimeText = await testTime.textContent()
  // Ensure the test time has changed
  expect.soft(newTestTimeText).not.toEqual(testTimeText)

  // User can print the test results by click on ‘Print.’
  await checkPrintButton(page)

  // Click on 'Close' button
  await page.getByRole('button', { name: 'Close' }).click()
  // Expect to be back to manage connections page
  await expect.soft(page).toHaveURL(/.*\/manageconnections/)
})

test('Test Maint Endpoint', async ({}) => {
  // Check the ones that should pass
  await page.goto('/test/5/maint')
  await testResults(page, [
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'PASS',
  ])
})

test('Test Dev Endpoint', async ({}) => {
  await page.goto('/test/5/dev')
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
  await expect.soft(page).toHaveURL(/.*\/test\/5\/dev/)
  await testResults(page, [
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'PASS',
    'PASS',
  ])
})

// We do not need to test down or reject, as they will be same as invalid
test.skip('Test Invalid Endpoint', async ({}) => {
  await page.goto('/test/5/invalid')
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
  await expect.soft(page).toHaveURL(/.*\/test\/5\/invalid/)
  await testResults(page, [
    'FAIL',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'Batman',
  ])
})
