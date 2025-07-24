import { Page, expect, test } from '@playwright/test';
import { loginToOkta } from '../helpers/oktaLogin';

const rowsPerPageOptions = [
  { pageSize: '5', expectedCount: 5 },
  { pageSize: '25', expectedCount: 25 },
  { pageSize: '50', expectedCount: 50 },
  { pageSize: '100', expectedCount: 50, useMinimum: true }
];

// Test 12 - a - i
test('Verify Connections Table, for Admin, for all row count options', async ({ page }) => {

  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);

  await page.locator('[id="Manage Connections_button"]').click();
  await expect(page.locator('#title-table')).toContainText('My Connections');

  for (const { pageSize, expectedCount, useMinimum } of rowsPerPageOptions) {

    await page.locator('.MuiTablePagination-select').click();
    await page.getByRole('option', { name: pageSize, exact: true }).click();
    await page.waitForTimeout(500);

    const gridRowCount = await page.locator('.MuiDataGrid-row').count();

    if (useMinimum) {
      expect(gridRowCount).toBeGreaterThanOrEqual(expectedCount);
    } else {
      expect(gridRowCount).toEqual(expectedCount);
    }
  }

  await page.locator('#logout').click();
});

// Test 12 - a - i
// ON HOLD - need non-admin user setup in Okta

// Test 12 - a- iii
test('Verify unauthorized user cannot login', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load', timeout: 10000 })

  await page.getByText('Sign in with Okta').click()
  await page.locator('input[name="identifier"]').fill('fakeuser@izgateway.org')
  await page.locator('[type="submit"]').click()

  const body = page.locator('body')
  const selectFactorExists = await body
    .locator('.button.select-factor.link-button')
    .count()
  if (selectFactorExists > 0) {
    await body.locator('.button.select-factor.link-button').click()
  }
  await page.locator('input[name="credentials.passcode"]').fill('THIS IS A BOGUS PASSWORD')
  await page.locator('[type="submit"]').click()

  await expect(page.locator('.okta-form-infobox-error')).toContainText('Unable to sign in');

})

// Test 12 - iv
test('Verify Login then Logout', async ({ page }) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);

  await page.locator('#logout').click();

  // Verify we're back on the Okta login page by checking for the username input
  await page.waitForLoadState('networkidle');
  await expect(page.locator('input[name="identifier"]')).toBeVisible();

});
