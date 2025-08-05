import { test, expect, Page } from '@playwright/test';
import { loginToOkta } from '../helpers/oktaLogin';

let page = null;

test.beforeEach('Login', async ({ page }) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
})

test.afterEach('Logout', async ({ page }) => {
  await page.locator('#logout').click();
  await page.close();
})

async function checkPrintButton(page: Page) {
  const printButton = page.getByRole('button', { name: 'PRINT' })
  //    Expect to see test results can be printed or save as pdf
  await expect.soft(printButton).toBeVisible()
  await expect.soft(printButton).toBeEnabled()
}

async function testResults(page : Page, results) {
  const testInfo = page.locator('#test-connection-info')
  await expect.soft(testInfo).toBeVisible()
  
  // Expect to see test results table with 7 tests
  // Expect to see 7 tests for DNS Lookup, TCP Connectivity Test, TLS Version Test, 
  // NIST Approved Encryption, WSDLsadf Test, Send Connectivity Test, Submit Single Message,
  // with their results of PASS, FAIL, WARNING, or N/A
  const verifyDNS = page.locator('tr:has-text("Verify DNS")')
  await expect.soft(verifyDNS).toBeVisible()
  await expect.soft(verifyDNS.locator('td').getByText(results[0])).toBeVisible()
  // If test has warning or error, expect to see error/warning message under the test
  if (results[0] === 'FAIL' || results[0] === 'WARNING') {

  }

  const verifyTCP = page.locator('tr:has-text("TCP Connectivity Test")')
  await expect.soft(verifyTCP).toBeVisible()
  await expect.soft(verifyTCP.locator('td').getByText(results[1])).toBeVisible()
  const tlsVersion = page.locator('tr:has-text("TLS Version Test")')
  await expect.soft(tlsVersion).toBeVisible()
  await expect.soft(tlsVersion.locator('td').getByText(results[2])).toBeVisible()
  const nistEncryption = page.locator('tr:has-text("Host uses a NIST approved encryption")')
  await expect.soft(nistEncryption).toBeVisible()
  await expect.soft(nistEncryption.locator('td').getByText(results[3])).toBeVisible()
  const wsdlTest = page.locator('tr:has-text("WSDL Test")')
  await expect.soft(wsdlTest).toBeVisible()
  await expect.soft(wsdlTest.locator('td').getByText(results[4])).toBeVisible()
  const connectivityTest = page.locator('tr:has-text("Send a Connectivity Test")')
  await expect.soft(connectivityTest).toBeVisible()
  await expect.soft(connectivityTest.locator('td').getByText(results[5])).toBeVisible()
  const singleMessage = page.locator('tr:has-text("Submit Single Message")')
  await expect.soft(singleMessage).toBeVisible()
  await expect.soft(singleMessage.locator('td').getByText(results[6])).toBeVisible()
}

test('Test Navigation to Test Connection Page', async ({ page }) => {
  await page.goto('https://dev.console.izgateway.org/manageconnections')
  await page.waitForLoadState('networkidle') 
  // User should be able to navigate to test connection page by clicking on ‘Test’ button under ‘Actions’ column for a connection in connections table.
  await expect.soft(page).toHaveURL(/.*\/manageconnections/)
  // Verify test button exists and is visible
  const test404 = page.getByRole('row', { name: '404 Development DEVELOPMENT /' }).getByLabel('test')
  await expect.soft(test404).toBeVisible()

  // For some reason, click() isn't working here.
  await test404.click()

  // await page.goto('https://dev.console.izgateway.org/test/5/404')
  await page.waitForLoadState('networkidle') // Ensure the page is fully loaded
  // Expect to see test connection page
  await expect.soft(page).toHaveURL(/.*\/test\/5\/404/)
  
  // Expect to see results of the tests
  await testResults(page, ['PASS', 'PASS', 'PASS', 'PASS', 'WARNING', 'WARNING', 'FAIL'])

  let testTime = page.locator('#TestTime')
  // Expect to see test time
  await expect.soft(testTime).toBeVisible()
  // Expect to see test time in format of MM/DD/YYYY HH:MM:SS AM/PM
  const testTimeText = await testTime.textContent()
  const testTimeRegex = /^\d{1,2}:\d{2}:\d{2} (AM|PM)$/
  expect.soft(testTimeText).toMatch(testTimeRegex) 

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
  await page.getByRole('button', { name: 'CLOSE' }).click()
  // Expect to be back to manage connections page
  await expect.soft(page).toHaveURL(/.*\/manageconnections/)
})

test('Test Maint Endpoint', async ({ page }) => {
  // Check the ones that should pass
  await page.goto('https://dev.console.izgateway.org/test/5/maint')
  await testResults(page, ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS'])
})

test('Test Dev Endpoint', async ({ page }) => {
  await page.goto('https://dev.console.izgateway.org/test/5/dev')
  await testResults(page, ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS'])
})

test('Test Down Endpoint', async ({ page }) => {
  await page.goto('https://dev.console.izgateway.org/test/5/down')
  await testResults(page, ['PASS', 'FAIL', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'])
})

test('Test Invalid Endpoint', async ({ page }) => {
  await page.goto('https://dev.console.izgateway.org/test/5/invalid')
  await testResults(page, ['FAIL', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Batman'])
})

test('Test Reject Endpoint', async ({ page }) => {
  await page.goto('https://dev.console.izgateway.org/test/5/reject')
  await testResults(page, ['PASS', 'FAIL', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A'])
})
