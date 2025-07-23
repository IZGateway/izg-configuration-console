import { Page, expect, test } from '@playwright/test';
import { loginToOkta } from '../helpers/oktaLogin';

test.beforeEach('Login User', async ({ page }) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);
});

test.afterEach('Logout User', async ({ page }) => {
  await page.locator('#logout').click();
});

test('Verify Connections Table For Admin User', async ({ page }) => {
  await page.locator('[id="Manage Connections_button"]').click();

  await expect(page.locator('#title-table')).toContainText('My Connections');

  const gridRowCount = await page.locator('.MuiDataGrid-row').count();
  console.log(`Found ${gridRowCount} connections in the table`);

  expect(gridRowCount).toBeGreaterThanOrEqual(5);

  // Click the dropdown arrow
  await page.locator('.MuiTablePagination-select').click();
// Select 25 from the dropdown
  await page.getByRole('option', { name: '25' }).click();
});
