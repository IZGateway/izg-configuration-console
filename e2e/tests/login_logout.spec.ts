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

// Test 12 - iv
test('Verify Login then Logout', async ({ page }) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);

  await page.locator('#logout').click();

  // Verify we're back on the Okta login page by checking for the username input
  await page.waitForLoadState('networkidle');
  await expect(page.locator('input[name="identifier"]')).toBeVisible();

});
