import { test, expect, Page } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { openApiKeyManagement, getStatCardValue } from '../helpers/apiKeyHelpers'

const requiredEnvs = ['OKTA_USERNAME', 'OKTA_PASSWORD', 'BASE_URL'] as const

let context
let page: Page

test.describe('API Key Management dashboard', () => {
  test.beforeAll(async ({ browser }) => {
    const missing = requiredEnvs.filter((k) => !process.env[k])
    if (missing.length) {
      test.skip(true, `Missing env vars: ${missing.join(', ')}`)
    }

    context = await browser.newContext()
    page = await context.newPage()

    await loginToOkta(
      page,
      process.env.OKTA_USERNAME as string,
      process.env.OKTA_PASSWORD as string,
      process.env.OKTA_USER_FULLNAME
    )

    await openApiKeyManagement(page)
  })

  test.afterAll(async () => {
    if (page && !page.isClosed()) {
      const logoutButton = page.locator('#logout')
      if ((await logoutButton.count()) > 0) {
        await logout(page)
      }
      await page.close()
    }
    if (context) await context.close()
  })

  test('shows the page header, stat cards, and correct table columns', async () => {
    await expect(page.getByText('API key management', { exact: true })).toBeVisible()

    for (const label of ['TOTAL KEYS', 'ACTIVE', 'REVOKED']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }

    const expectedColumns: [string, string][] = [
      ['description', 'DESCRIPTION'],
      ['environment', 'ENVIRONMENT'],
      ['jurisdiction', 'ORGANIZATION'],
      ['domain', 'DNS'],
      ['status', 'STATUS'],
      ['created', 'CREATED'],
      ['expires', 'EXPIRES'],
      ['createdBy', 'CREATED BY'],
      ['actions', 'ACTION'],
    ]
    for (const [field, headerName] of expectedColumns) {
      // Matched by data-field (mirroring the repo's existing gridcell
      // convention) rather than accessible name: MUI appends hidden sort
      // text ("sorted descending") to whichever header is actively sorted
      // (CREATED, by default here), which breaks a plain/exact name match.
      const header = page.locator(
        `div[data-field="${field}"][role="columnheader"]`
      )
      await expect(header).toBeVisible()
      await expect(header).toContainText(headerName)
    }
  })

  test('hovering the DESCRIPTION cell reveals a tooltip with the key ID', async () => {
    const rowCount = await page.locator('.MuiDataGrid-row').count()
    test.skip(rowCount === 0, 'No API key rows to hover')

    const descriptionText = page
      .locator('div[data-field="description"][role="gridcell"]')
      .locator('p')
      .first()
    await expect(descriptionText).toBeVisible()
    await descriptionText.hover()

    const tooltip = page.getByRole('tooltip')
    await expect(tooltip).toBeVisible()
    const tooltipText = (await tooltip.innerText()).trim()
    // Tooltip renders as "ID\n<jti>" (ApiKeyManagement/index.tsx) — assert
    // both the label and that an actual id value follows it.
    expect(tooltipText).toMatch(/^ID/)
    expect(tooltipText.replace(/^ID\s*/i, '')).not.toBe('')
  })

  test('search filters the table and stat cards keep counting the full unfiltered list', async () => {
    const totalKeysBefore = await getStatCardValue(page, 'TOTAL KEYS')

    // TOTAL KEYS counts every fetched key, including Cancelled ones that the
    // Keys tab hides by default (`matchesStatus` in filteredRows) — so a
    // non-zero TOTAL KEYS doesn't guarantee the grid has a visible row to
    // read an organization from. Check the grid itself instead.
    const rowCount = await page.locator('.MuiDataGrid-row').count()
    test.skip(rowCount === 0, 'No visible API key rows to search for')

    const firstOrganization = (
      await page
        .locator('div[data-field="jurisdiction"][role="gridcell"]')
        .first()
        .innerText()
    ).trim()
    test.skip(
      !firstOrganization || firstOrganization === '—',
      'No organization value available to search by'
    )

    const searchBox = page.getByPlaceholder('Search by key ID or jurisdiction')
    // Search for the row's own organization text verbatim: the filter does a
    // plain lowercased `includes` (see filteredRows in ApiKeyManagement/
    // index.tsx), so this is guaranteed to still match this row regardless of
    // punctuation in the name — no regex escaping needed on the input side.
    await searchBox.fill(firstOrganization)

    const organizationCells = page.locator(
      'div[data-field="jurisdiction"][role="gridcell"]'
    )
    await expect(organizationCells.first()).toBeVisible()
    const filteredCount = await organizationCells.count()
    expect(filteredCount).toBeGreaterThan(0)
    expect(filteredCount).toBeLessThanOrEqual(totalKeysBefore)
    // The row we searched for must still be present post-filter.
    await expect(
      page.locator('div[data-field="jurisdiction"][role="gridcell"]', {
        hasText: firstOrganization,
      })
    ).not.toHaveCount(0)

    // Stat cards are computed from the full fetched list, not the filtered
    // view — filtering the table must not move these numbers.
    expect(await getStatCardValue(page, 'TOTAL KEYS')).toBe(totalKeysBefore)

    await searchBox.fill('')
  })
})
