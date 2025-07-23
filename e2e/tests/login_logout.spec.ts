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

  // By default, we show 5 connections per-page, check that
  let gridRowCount = await page.locator('.MuiDataGrid-row').count()
  expect(gridRowCount).toEqual(5)

  // Choose 25 per-page
  await page.locator('.MuiTablePagination-select').click();
  await page.getByRole('option', { name: '25' }).click();
  gridRowCount = await page.locator('.MuiDataGrid-row').count();
  expect(gridRowCount).toEqual(25)

  // Choose 50 per-page
  await page.locator('.MuiTablePagination-select').click();
  await page.getByRole('option', { name: '50' }).click();
  gridRowCount = await page.locator('.MuiDataGrid-row').count();
  expect(gridRowCount).toEqual(50)

  // Choose 100 per-page - we expect at least 50 in dev at this time
  await page.locator('.MuiTablePagination-select').click();
  await page.getByRole('option', { name: '100' }).click();
  gridRowCount = await page.locator('.MuiDataGrid-row').count();
  expect(gridRowCount).toBeGreaterThanOrEqual(50)

});
