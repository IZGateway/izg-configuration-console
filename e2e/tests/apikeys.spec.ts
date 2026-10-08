import { BrowserContext, expect, Page, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'

// First Playwright coverage for the API Key Management page. Covers the USE
// TYPES column, the Renew dialog's read-only Use Types field, the Use Types
// filter, the use-type search match, the column chooser and the card layout.
//
// The page is gated by FEATURE_API_KEY_MANAGEMENT_ENABLED. Where the flag is
// off, the page redirects and every test here fails on the beforeAll guard with
// a message that names the flag rather than a selector timeout.
//
// These tests run against a shared dev environment whose data changes without
// notice. None of them looks for a row of a given shape. Each one reads what is
// on the page and derives its expectation from that, or skips with a reason.
// A data gap therefore stays distinguishable from a defect.
//
// The page shows one card per key below 1344px and collapses the row actions
// into a "More Options" menu below 1600px. These tests read the grid and click
// the "Renew key" button directly, so they run at a viewport wider than both.
// The last test narrows the viewport to cover the card layout, then restores it.

let context: BrowserContext
let page: Page

const GRID = '.MuiDataGrid-root'
// Wide enough for the grid (>= 1344px) and the full action-button strip
// (>= 1600px).
const VIEWPORT = { width: 1680, height: 1050 }
// Narrow enough for the card layout (< 1344px).
const NARROW_VIEWPORT = { width: 1280, height: 1050 }

// Canonical enumeration order. The cell renders use types in this order, never
// in stored order.
const CANONICAL = ['Patient', 'Provider', 'Public Health']

const header = (field: string) =>
  page.locator(`[role="columnheader"][data-field="${field}"]`)
const cells = (field: string) =>
  page.locator(`[role="gridcell"][data-field="${field}"]`)

// Chip labels inside one USE TYPES cell, in render order.
const chipLabelsInCell = async (index: number): Promise<string[]> =>
  (
    await cells('useTypes').nth(index).locator('.MuiChip-label').allInnerTexts()
  ).map((label) => label.trim())

const rowCount = async (): Promise<number> => cells('useTypes').count()

// Chip labels for every rendered row, outer index = row.
const allChipLabels = async (): Promise<string[][]> => {
  const total = await rowCount()
  const result: string[][] = []
  for (let i = 0; i < total; i += 1) result.push(await chipLabelsInCell(i))
  return result
}

// Index of the first row that renders at least one chip, or -1.
const findRowWithAnyChip = async (): Promise<number> => {
  const labels = await allChipLabels()
  return labels.findIndex((row) => row.length > 0)
}

// The grid pages at 5 rows by default. Every assertion below reads rendered
// cells only, so a small page would narrow the sample to 5 of ~90 rows and make
// the suite skip for no good reason.
const showAllRows = async () => {
  const selector = page.locator('.MuiTablePagination-select')
  if ((await selector.count()) === 0) return
  await selector.click()
  await page.getByRole('option', { name: '100', exact: true }).click()
  await expect(page.locator('.MuiTablePagination-select')).toContainText('100')
}

const openApiKeysPage = async () => {
  await page.goto('/apikeys')
  await page.waitForLoadState('networkidle')
  await expect(page.locator(GRID)).toBeVisible()
  await showAllRows()
}

// The Filters popover and the Columns popover share a class, and only one is
// open at a time, so one locator serves both. A MUI Select renders its own
// dropdown as a second popover carrying the extra class MuiMenu-paper, so that
// class is excluded here. Without the exclusion the locator matches two
// elements while a dropdown is open, and Playwright rejects it as ambiguous
// before it judges visibility.
const popover = () => page.locator('.MuiPopover-paper:not(.MuiMenu-paper)')

// The dropdown of a Select inside one of those popovers.
const selectMenu = () => page.locator('.MuiMenu-paper')

// Pick a value in the nth dropdown of the open Filters popover. The dropdown
// closes itself on the click, but it stays in the DOM through its close
// transition, so wait for it before acting on the popover behind it.
const chooseFilterOption = async (index: number, label: string) => {
  await popover().getByRole('combobox').nth(index).click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await expect(selectMenu()).toBeHidden()
}

const closePopover = async () => {
  await page.keyboard.press('Escape')
  await expect(popover()).toBeHidden()
}

const clearAllFilters = async () => {
  await page.getByRole('button', { name: 'Filters' }).click()
  await popover().getByText('Clear all').click()
  await closePopover()
}

test.beforeAll(async ({ browser }) => {
  // A context made here does not inherit test.use() options, so the viewport
  // is set on it directly.
  context = await browser.newContext({ viewport: VIEWPORT })
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.goto('/apikeys')
  await page.waitForLoadState('networkidle')

  // A redirect away from /apikeys means the release flag is off, or the account
  // lacks API key access. Say which, rather than letting a later selector time
  // out and read as a broken column.
  expect(
    new URL(page.url()).pathname,
    'Expected to land on /apikeys. A redirect means FEATURE_API_KEY_MANAGEMENT_ENABLED is off, or this account has no API key access.'
  ).toBe('/apikeys')
  await expect(page.locator(GRID)).toBeVisible()
  await showAllRows()
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

test('at least one key renders its use types as chips', async () => {
  expect(await rowCount()).toBeGreaterThan(0)
  const index = await findRowWithAnyChip()
  expect(
    index,
    'No key on the page renders a use-type chip. Either every key lacks use types, or the cell stopped rendering them.'
  ).not.toBe(-1)
})

test('every chip carries a known label, in canonical order', async () => {
  const rows = (await allChipLabels()).filter((labels) => labels.length > 0)
  test.skip(rows.length === 0, 'No key on the page carries a use type.')

  for (const labels of rows) {
    const positions = labels.map((label) => CANONICAL.indexOf(label))
    // An unknown label means a stored value escaped the enumeration filter.
    expect(
      positions,
      `Unexpected use-type label in ${labels.join(', ')}`
    ).not.toContain(-1)
    // Canonical order — PATIENT, PROVIDER, PUBLIC_HEALTH — never stored order.
    const sorted = [...positions].sort((a, b) => a - b)
    expect(positions).toEqual(sorted)
  }
})

test('a key with no use types reads None', async () => {
  const rows = await allChipLabels()
  const empty = rows
    .map((labels, index) => ({ labels, index }))
    .filter((row) => row.labels.length === 0)
  test.skip(empty.length === 0, 'Every key on the page carries a use type.')

  for (const row of empty) {
    await expect(cells('useTypes').nth(row.index)).toContainText('None')
  }
})

test('the USE TYPES column sorts', async () => {
  const readColumn = async (): Promise<string[]> =>
    cells('useTypes').allInnerTexts()

  const initial = await readColumn()
  test.skip(
    new Set(initial).size < 2,
    'Every key on the page shows the same use types, so a sort cannot be observed.'
  )

  const columnHeader = header('useTypes')
  await columnHeader.click()
  await expect(
    columnHeader.locator('[data-testid="ArrowUpwardIcon"]')
  ).toBeVisible()
  const ascending = await readColumn()

  await columnHeader.click()
  await expect(
    columnHeader.locator('[data-testid="ArrowDownwardIcon"]')
  ).toBeVisible()
  const descending = await readColumn()

  // A sorted column reverses when the direction flips. Compare the first value
  // rather than the whole list, which paging truncates.
  expect(ascending.length).toBeGreaterThan(1)
  expect(descending[0]).not.toBe(ascending[0])

  // Rows with no use types group together rather than scatter. Their shared
  // sort key is the em dash, which the platform collation places before every
  // letter, so they lead the ascending order.
  const emptyPositions = ascending
    .map((text, index) => ({ text: text.trim(), index }))
    .filter((row) => row.text === 'None')
    .map((row) => row.index)
  if (emptyPositions.length > 1) {
    const span = emptyPositions[emptyPositions.length - 1] - emptyPositions[0]
    expect(span).toBe(emptyPositions.length - 1)
  }

  await openApiKeysPage()
})

test('the Use Types filter narrows the list to that use type', async () => {
  const index = await findRowWithAnyChip()
  test.skip(index === -1, 'No key on the page carries a use type.')
  const [label] = await chipLabelsInCell(index)

  await page.getByRole('button', { name: 'Filters' }).click()
  await expect(popover()).toBeVisible()

  // The popover's dropdowns read Environment, Status, Organization, Use Types.
  // Assert that order before selecting by index, so the index is justified.
  const captions = await popover()
    .locator('.MuiTypography-caption')
    .allInnerTexts()
  expect(captions.map((c) => c.trim())).toEqual([
    'Environment',
    'Status',
    'Organization',
    'Use Types',
  ])

  await chooseFilterOption(3, label)
  await closePopover()

  // Every remaining row carries the chosen use type. The filter matches on
  // membership, so a key scoped to it plus another stays listed.
  const remaining = await cells('useTypes').allInnerTexts()
  expect(remaining.length).toBeGreaterThan(0)
  for (const text of remaining) expect(text).toContain(label)

  await clearAllFilters()
})

test('the filter is counted in the badge and cleared by Clear all', async () => {
  const index = await findRowWithAnyChip()
  test.skip(index === -1, 'No key on the page carries a use type.')
  const [label] = await chipLabelsInCell(index)

  await page.getByRole('button', { name: 'Filters' }).click()
  await chooseFilterOption(3, label)
  await closePopover()

  await expect(page.locator('.MuiBadge-badge')).toContainText('1')

  await clearAllFilters()
  await expect(page.locator('.MuiBadge-badge')).not.toContainText('1')
})

test('search matches a use-type label', async () => {
  const index = await findRowWithAnyChip()
  test.skip(index === -1, 'No key on the page carries a use type.')
  const [label] = await chipLabelsInCell(index)

  const before = await rowCount()
  const search = page.getByPlaceholder('Search by key ID or jurisdiction')
  await search.fill(label)

  // The search also matches the description, the DNS name, the jurisdiction and
  // the environment, so a matched row does not have to carry the use type.
  // Assert that the term narrows the list and still finds the key it was read
  // from, rather than that every row carries the label.
  await expect
    .poll(async () => rowCount(), {
      message: `Search for "${label}" did not narrow the list.`,
    })
    .toBeLessThan(before)
  expect(await rowCount()).toBeGreaterThan(0)
  const matched = await allChipLabels()
  expect(matched.some((labels) => labels.includes(label))).toBeTruthy()

  // The stored enumeration value is not matched — it appears nowhere an
  // operator can read it.
  await search.fill('PUBLIC_HEALTH')
  await expect.poll(async () => rowCount()).toBe(0)

  await search.fill('')
  await expect.poll(async () => rowCount()).toBe(before)
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
  await expect(dialog).toBeHidden()
})

test('the column chooser lists USE TYPES and hides it', async () => {
  await page.getByRole('button', { name: 'Columns' }).click()
  await expect(popover()).toBeVisible()

  const option = popover()
    .getByRole('menuitem')
    .filter({ hasText: 'USE TYPES' })
  await expect(option).toHaveCount(1)
  // Every column is visible in the default view, so the box starts checked.
  await expect(option.locator('input[type="checkbox"]')).toBeChecked()

  await option.click()
  await expect(option.locator('input[type="checkbox"]')).not.toBeChecked()
  await closePopover()
  await expect(header('useTypes')).toHaveCount(0)
})

test('Default view restores the USE TYPES column', async () => {
  // Runs after the test above, which left the column hidden.
  await expect(header('useTypes')).toHaveCount(0)

  await page.getByRole('button', { name: 'Columns' }).click()
  await popover().getByRole('button', { name: 'Default view' }).click()
  await closePopover()

  await expect(header('useTypes')).toBeVisible()
  await expect(header('useTypes')).toContainText('USE TYPES')
})

// Below 1344px the page shows one card per key instead of the grid. The card
// reuses the grid's use-type cell, and the same filtered list feeds both
// layouts, so this test guards the card layout itself: that each card still
// carries its use types, and that the filter and the search narrow the cards.
// It runs last and restores the wide viewport, so it leaves no state behind.
//
// The card has no test id, so the locators find it by its "Use Types:" label.
// The cards page 10 at a time, so the test reads only the cards on screen and
// uses the "N API Keys Found" heading for counts.
test('the card view shows use types and narrows by filter and search', async () => {
  await page.setViewportSize(NARROW_VIEWPORT)
  await expect(page.locator(GRID)).toHaveCount(0)

  const useTypesLabel = page.getByText('Use Types:', { exact: true })
  await expect(useTypesLabel.first()).toBeVisible()

  // The label is a <strong> inside a Typography, beside the use-type cell.
  // Two levels up is the row that holds both, which scopes the chips away
  // from the status chip in the card header.
  const cardUseTypes = async (): Promise<string[][]> => {
    const rows = useTypesLabel.locator('xpath=../..')
    const total = await rows.count()
    const result: string[][] = []
    for (let i = 0; i < total; i += 1) {
      const labels = await rows.nth(i).locator('.MuiChip-label').allInnerTexts()
      result.push(labels.map((label) => label.trim()))
    }
    return result
  }
  const keysFound = async (): Promise<number> => {
    const text = await page.getByText(/\d+ API Keys? Found/).innerText()
    return Number.parseInt(text, 10)
  }

  // Every card carries known labels in canonical order, or reads None.
  const before = await cardUseTypes()
  expect(before.length).toBeGreaterThan(0)
  for (const [i, labels] of before.entries()) {
    if (labels.length === 0) {
      await expect(useTypesLabel.nth(i).locator('xpath=../..')).toContainText(
        'None'
      )
      continue
    }
    const positions = labels.map((label) => CANONICAL.indexOf(label))
    expect(positions).not.toContain(-1)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  }

  const withChip = before.find((labels) => labels.length > 0)
  test.skip(!withChip, 'No card on screen carries a use type.')
  const label = (withChip as string[])[0]
  const total = await keysFound()

  // The filter narrows the cards to those carrying the chosen use type.
  await page.getByRole('button', { name: 'Filters' }).click()
  await expect(popover()).toBeVisible()
  await chooseFilterOption(3, label)
  await closePopover()
  const filtered = await cardUseTypes()
  expect(filtered.length).toBeGreaterThan(0)
  for (const labels of filtered) expect(labels).toContain(label)
  await clearAllFilters()
  await expect.poll(keysFound).toBe(total)

  // The search narrows the cards and still finds a card carrying the label.
  // Other fields can also match the term, so not every card must carry it.
  const search = page.getByPlaceholder('Search by key ID or jurisdiction')
  await search.fill(label)
  await expect
    .poll(keysFound, {
      message: `Search for "${label}" did not narrow the cards.`,
    })
    .toBeLessThan(total)
  expect((await cardUseTypes()).some((labels) => labels.includes(label))).toBe(
    true
  )
  await search.fill('')
  await expect.poll(keysFound).toBe(total)

  await page.setViewportSize(VIEWPORT)
  await expect(page.locator(GRID)).toBeVisible()
})
