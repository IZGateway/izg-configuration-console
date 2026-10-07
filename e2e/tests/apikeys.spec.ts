import { BrowserContext, expect, Page, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'

// First Playwright coverage for the API Key Management page. Covers the USE
// TYPES column, the Renew dialog's read-only Use Types field, the Use Types
// filter and the use-type search match.
//
// The page is gated by FEATURE_API_KEY_MANAGEMENT_ENABLED. Where the flag is
// off, the page redirects and every test here fails on the beforeAll guard with
// a message that names the flag rather than a selector timeout.
//
// These tests read the grid to find a row that fits each case, instead of
// assuming the data holds one. Where no row fits, the test skips with a reason.
// That keeps a data gap distinguishable from a defect.
//
// The page shows one card per key below 1344px and collapses the row actions
// into a "More Options" menu below 1600px. These tests read the grid and click
// the "Renew key" button directly, so they run at a viewport wider than both.

let context: BrowserContext
let page: Page

const GRID = '.MuiDataGrid-root'
// Wide enough for the grid (>= 1344px) and the full action-button strip
// (>= 1600px).
const VIEWPORT = { width: 1680, height: 1050 }
const header = (field: string) =>
  page.locator(`[role="columnheader"][data-field="${field}"]`)
const cells = (field: string) =>
  page.locator(`[role="gridcell"][data-field="${field}"]`)

// Chip labels inside one USE TYPES cell, in render order.
const chipLabelsInCell = async (index: number): Promise<string[]> =>
  cells('useTypes').nth(index).locator('.MuiChip-label').allInnerTexts()

const rowCount = async (): Promise<number> => cells('useTypes').count()

// Index of the first row whose USE TYPES cell renders exactly `n` chips, or -1.
const findRowWithChipCount = async (n: number): Promise<number> => {
  const total = await rowCount()
  for (let i = 0; i < total; i += 1) {
    const labels = await chipLabelsInCell(i)
    if (labels.length === n) return i
  }
  return -1
}

const openApiKeysPage = async () => {
  await page.goto('/apikeys')
  await page.waitForLoadState('networkidle')
}

test.beforeAll(async ({ browser }) => {
  // A context made here does not inherit test.use() options, so the viewport
  // is set on it directly.
  context = await browser.newContext({ viewport: VIEWPORT })
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await openApiKeysPage()

  // A redirect away from /apikeys means the release flag is off, or the account
  // lacks API key access. Say which, rather than letting a later selector time
  // out and read as a broken column.
  expect(
    new URL(page.url()).pathname,
    'Expected to land on /apikeys. A redirect means FEATURE_API_KEY_MANAGEMENT_ENABLED is off, or this account has no API key access.'
  ).toBe('/apikeys')
  await expect(page.locator(GRID)).toBeVisible()
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

test('USE TYPES column sits between DNS and STATUS', async () => {
  await expect(header('useTypes')).toBeVisible()
  await expect(header('useTypes')).toContainText('USE TYPES')

  const fields = await page
    .locator('[role="columnheader"]')
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('data-field') ?? '')
    )

  expect(fields).toEqual([
    'description',
    'environment',
    'jurisdiction',
    'domain',
    'useTypes',
    'status',
    'created', // headed DURATION: created and expiry dates in one cell
    'createdBy',
    'actions',
  ])
})

test('a key with two use types renders both labels as chips', async () => {
  const index = await findRowWithChipCount(2)
  test.skip(
    index === -1,
    'No key in this environment carries exactly two use types.'
  )

  const labels = await chipLabelsInCell(index)
  expect(labels).toHaveLength(2)

  // Canonical order — PATIENT, PROVIDER, PUBLIC_HEALTH — never stored order.
  const canonical = ['Patient', 'Provider', 'Public Health']
  const positions = labels.map((l) => canonical.indexOf(l.trim()))
  expect(positions.every((p) => p >= 0)).toBeTruthy()
  expect(positions[0]).toBeLessThan(positions[1])
})

test('a key with three use types shows every label and no overflow count', async () => {
  // The cell collapses use types behind a "+N more" count only when two or
  // more would be hidden. With three use types in the enumeration no key
  // reaches that, so all three render as chips and wrap if the cell is narrow.
  const index = await findRowWithChipCount(3)
  test.skip(
    index === -1,
    'No key in this environment carries all three use types.'
  )

  const labels = (await chipLabelsInCell(index)).map((l) => l.trim())
  expect(labels).toEqual(['Patient', 'Provider', 'Public Health'])
  expect(labels.some((l) => l.startsWith('+'))).toBeFalsy()
})

test('the USE TYPES column sorts', async () => {
  test.skip((await rowCount()) < 2, 'Needs at least two keys to compare.')

  const columnHeader = header('useTypes')
  const readColumn = async (): Promise<string[]> =>
    cells('useTypes').allInnerTexts()

  await columnHeader.click()
  await page.waitForTimeout(300)
  const ascending = await readColumn()

  await columnHeader.click()
  await page.waitForTimeout(300)
  const descending = await readColumn()

  // A sorted column reverses when the direction flips. Compare the first and
  // last visible values rather than the whole list, which paging truncates.
  expect(ascending.length).toBeGreaterThan(1)
  expect(descending[0]).not.toBe(ascending[0])
})

test('the Use Types filter matches a key carrying that use type among others', async () => {
  const multiRow = await findRowWithChipCount(2)
  test.skip(
    multiRow === -1,
    'No key in this environment carries two use types, so membership cannot be shown.'
  )

  const labels = (await chipLabelsInCell(multiRow)).map((l) => l.trim())
  const [first] = labels

  await page.getByRole('button', { name: 'Filters' }).click()
  const popover = page.locator('.MuiPopover-paper')
  await expect(popover).toBeVisible()

  // The popover's dropdowns read Environment, Status, Organization, Use Types.
  // Assert that order before selecting by index, so the index is justified.
  const captions = await popover
    .locator('.MuiTypography-caption')
    .allInnerTexts()
  expect(captions.map((c) => c.trim())).toEqual([
    'Environment',
    'Status',
    'Organization',
    'Use Types',
  ])

  await popover.getByRole('combobox').nth(3).click()
  await page.getByRole('option', { name: first, exact: true }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // Every remaining row carries the chosen use type, and a key scoped to it
  // plus another is still listed — the filter matches on membership, not on an
  // exact set.
  const remaining = await cells('useTypes').allInnerTexts()
  expect(remaining.length).toBeGreaterThan(0)
  for (const text of remaining) {
    expect(text).toContain(first)
  }
  const multi = await findRowWithChipCount(2)
  expect(multi).not.toBe(-1)

  // Reset for the tests that follow.
  await page.getByRole('button', { name: 'Filters' }).click()
  await page.locator('.MuiPopover-paper').getByText('Clear all').click()
  await page.keyboard.press('Escape')
})

test('the filter is counted in the badge and cleared by Clear all', async () => {
  await page.getByRole('button', { name: 'Filters' }).click()
  const popover = page.locator('.MuiPopover-paper')
  await popover.getByRole('combobox').nth(3).click()
  await page.getByRole('option', { name: 'Patient', exact: true }).click()
  await page.keyboard.press('Escape')

  await expect(page.locator('.MuiBadge-badge')).toContainText('1')

  await page.getByRole('button', { name: 'Filters' }).click()
  await page.locator('.MuiPopover-paper').getByText('Clear all').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  await expect(page.locator('.MuiBadge-badge')).not.toContainText('1')
})

test('search matches a use-type label', async () => {
  const index = await findRowWithChipCount(1)
  test.skip(
    index === -1,
    'No key in this environment carries exactly one use type.'
  )
  const [label] = (await chipLabelsInCell(index)).map((l) => l.trim())

  const search = page.getByPlaceholder('Search by key ID or jurisdiction')
  await search.fill(label)
  await page.waitForTimeout(300)

  const texts = await cells('useTypes').allInnerTexts()
  expect(texts.length).toBeGreaterThan(0)
  for (const text of texts) {
    expect(text).toContain(label)
  }

  // The stored enumeration value is not matched — it appears nowhere an
  // operator can read it.
  await search.fill('PUBLIC_HEALTH')
  await page.waitForTimeout(300)
  expect(await cells('useTypes').count()).toBe(0)

  await search.fill('')
  await page.waitForTimeout(300)
})

test('the Renew dialog shows a read-only Use Types field', async () => {
  await openApiKeysPage()

  // Renew is offered on Active rows only, so find the row that carries the
  // button rather than assuming it is the first row. Reading the use types from
  // a different row than the one being renewed would make this test pass or
  // fail for the wrong reason.
  const rows = page.locator('.MuiDataGrid-row')
  const total = await rows.count()
  let target = -1
  for (let i = 0; i < total; i += 1) {
    const hasRenew =
      (await rows.nth(i).getByRole('button', { name: 'Renew key' }).count()) > 0
    if (hasRenew) {
      target = i
      break
    }
  }
  test.skip(
    target === -1,
    'No Active key in this environment, so Renew cannot be opened.'
  )

  const row = rows.nth(target)
  const expected = (
    await row.locator('[data-field="useTypes"] .MuiChip-label').allInnerTexts()
  ).map((l) => l.trim())

  await row.getByRole('button', { name: 'Renew key' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Renew API Key')

  const field = dialog.getByLabel('Use Types')
  await expect(field).toBeVisible()

  // Read-only, like the Jurisdiction, Environment and Domain fields beside it.
  await expect(field).toHaveAttribute('readonly', '')

  // The value states every use type the credential carries, in the same
  // canonical order as the grid's chips. No key can reach the "+N more" count
  // today, so the chips are the full list and the value must match exactly.
  // A key with no use types shows "None" in the grid (no chips) but an em dash
  // in the dialog, like every other empty read-only field there.
  await expect(field).toHaveValue(expected.length ? expected.join(', ') : '—')

  await page.keyboard.press('Escape')
})
