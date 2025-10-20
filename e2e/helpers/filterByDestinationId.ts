import { Page } from '@playwright/test'

export async function filterByDestinationId(page: Page, destId: string) {
  await page.locator('button[aria-label="Show filters"]').click()
  await page.locator('[role="combobox"]:has-text("contains")').click()
  await page.getByRole('option', { name: 'equals' }).click()
  await page.getByRole('textbox', { name: /value/i }).fill(destId)
  await page.getByText('My Connections').click() // Click anywhere to close filter pop up
}
