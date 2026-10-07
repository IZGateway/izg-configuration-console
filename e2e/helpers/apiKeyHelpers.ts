import { Page, expect } from '@playwright/test'

// Navigates directly to the API Key Management page rather than clicking the
// nav link — the nav entry is gated behind both a role check and the
// apiKeyManagementEnabled release flag (see menuItems.tsx), so a direct visit
// is the more reliable path for a test that only cares about the page itself.
export const openApiKeyManagement = async (page: Page) => {
  await page.goto('/apikeys')
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByText('API key management', { exact: true })
  ).toBeVisible({ timeout: 15000 })
}

// Stat cards render as a value paragraph followed by an uppercased label
// paragraph in the same container (see StatCard in ApiKeyManagement/index.tsx:
// `{label.toUpperCase()}`) — matching the uppercase label exactly avoids
// colliding with mixed-case "Active"/"Revoked" text in the STATUS column.
export const getStatCardValue = async (
  page: Page,
  label: string
): Promise<number> => {
  const labelEl = page.getByText(label, { exact: true })
  const statBox = labelEl.locator('xpath=..')
  const text = await statBox.locator('p').first().innerText()
  return parseInt(text, 10)
}
