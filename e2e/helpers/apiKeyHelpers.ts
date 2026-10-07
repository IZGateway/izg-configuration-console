import { Page, expect } from '@playwright/test'

// Navigates directly to the API Key Management page rather than clicking the
// nav link — the nav entry is gated behind both a role check and the
// apiKeyManagementEnabled release flag (see menuItems.tsx), so a direct visit
// is the more reliable path for a test that only cares about the page itself.
export const openApiKeyManagement = async (page: Page) => {
  // The `/api/apikeys` SWR fetch only starts once the session resolves to
  // "authenticated", and its `isLoading` flag is false both before that
  // fetch has started AND after it completes — the empty-state copy ("No API
  // keys yet.") renders identically in both cases. So "the page looks
  // loaded" is not a reliable signal that data has actually arrived; wait
  // for the real network response instead.
  const apiKeysResponse = page.waitForResponse(
    (res) =>
      new URL(res.url()).pathname === '/api/apikeys' &&
      res.request().method() === 'GET',
    { timeout: 30000 }
  )
  await page.goto('/apikeys')
  await apiKeysResponse
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
