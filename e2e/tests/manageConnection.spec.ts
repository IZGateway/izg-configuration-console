
import { test, expect } from '@playwright/test';
import { loginToOkta } from '../helpers/oktaLogin';

let context;
let page;

test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);
    await page.goto('/manageconnections');
    await page.waitForLoadState('networkidle'); // Ensure the page is fully loaded
});

test.afterAll(async () => {
    await page.locator('#logout').click();
    await page.close();
    await context.close();
})

test('Connection table should have correct columns', async () => {
    const expectedColumns = ['DESTINATION ID', 'ENVIRONMENT', 'ORGANIZATION', 'ENDPOINT URL', 'STATUS', 'ACTION'];
    for (const column of expectedColumns) {
        await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }
});

test('Connection table pagination works', async () => {
    await page.getByRole('combobox', { name: 'Rows per page:' }).click();
    await page.getByRole('option', { name: '25' }).click();
    const rows = page.locator('div[role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(1);
    await page.getByLabel('Go to next page').click();
    await expect(rows.first()).toBeVisible();
});

test('Connections table columns can be sorted except ACTION column', async () => {
    const sortableColumns = ['DESTINATION ID', 'ENVIRONMENT', 'ORGANIZATION', 'ENDPOINT URL', 'STATUS'];
    for (const column of sortableColumns) {
        const header = page.getByRole('columnheader', { name: column });
        await header.click();
        await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);
    }
    const actionColumn = page.getByRole('columnheader', { name: 'ACTION' });
    await expect(actionColumn).not.toHaveAttribute('aria-sort', /ascending|descending/);
});

test('Connections table has status column with "Connected" or "Not Connected" status', async () => {
    const statuses = await page.locator('div[data-field="status"][role="gridcell"]').allTextContents();
    console.log(statuses.length);
    for (const status of statuses) {
        expect(['Connected', 'Not Connected']).toContain(status.trim());
    }
});

test('Hovering over Status in Connection Table reveals last updated timestamp and status.', async () => {
    const statusText = page.locator('div[data-field="status"][role="gridcell"]').locator('p').first();
    await statusText.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip.locator('p').first()).toHaveText(/CONNECTED|NOT CONNECTED/i);
});

test('Connections table has each row with edit or change request or save draft, test, more actions buttons under ACTION', async () => {
    const rows = await page.locator('div[role="row"][data-rowindex]').all();
    for (const row of rows) {
        await expect(row.locator('button[aria-label]:is([aria-label="edit"], [aria-label="changerequest"], [aria-label="draft"])')).toBeVisible();
        await expect(row.locator('button[aria-label="test"]')).toBeVisible();
        await expect(row.locator('button[aria-label="moreactions"]')).toBeVisible();
    }
});

test('Connections table updates based on filter dropdown', async () => {
    await page.getByLabel('Filter').click();
    const filterInput = page.getByPlaceholder('Filter value');
    await expect(filterInput).toBeVisible();
    await filterInput.fill('ak');
    await page.waitForTimeout(500);
    const destinationCells = page.locator('div[data-field="destId"][role="gridcell"]');
    const cellCount = await destinationCells.count();

    expect(cellCount).toBeGreaterThan(0);

    for (let i = 0; i < cellCount; i++) {
        const value = await destinationCells.nth(i).innerText();
        expect(value.toLowerCase()).toContain('ak');
    }
});

test('Connection table updates records based on serach bar filter', async () => {
    await page.getByPlaceholder('Search').fill('ak');
    const cells = await page.locator('div[data-field="destId"][role="gridcell"]').allTextContents();
    await page.waitForTimeout(500);
    for (const text of cells) {
        expect(text.toLowerCase()).toContain('ak');
    }
});

test('User can download test report from connections table by selecting all rows', async () => {
    await page.getByText('Test Report(s)').click();
    const selectAllCheckbox = page.getByRole('checkbox', { name: 'Select all rows' });
    await expect(selectAllCheckbox).toBeVisible();
    await selectAllCheckbox.click();
    await Promise.all([
        page.waitForURL('**/testreport', { timeout: 10000 }),
        page.getByText('Generate Report').click(),
    ]);
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByText('Export').click(),
        page.getByText('Download as CSV').click(),
    ]);
    const path = await download.path();
    expect(path).toBeTruthy();
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/);
});
