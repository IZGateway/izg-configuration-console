import { Page, expect, test } from '@playwright/test'
import { ROLES, RoleDef, accountFor } from '../rbac/roles'
import { loginToOkta } from './oktaLogin'

// The API key specs sign in as IZG Security, the global-reach role for API
// keys (IGDD-3549 removed them from IZG Operations, so OKTA_USERNAME can no
// longer open /apikeys). It is the same account as the RBAC matrix's IZG
// Security column, so the env var names come from e2e/rbac/roles.ts.
const apiKeyAdminRole = (): RoleDef => {
  const role = ROLES.find((r) => r.name === 'IZG Security')
  if (!role) throw new Error('IZG Security is missing from e2e/rbac/roles.ts')
  return role
}

const apiKeyAdminEnv = () => {
  const prefix = apiKeyAdminRole().accountEnv
  return [`${prefix}_USERNAME`, `${prefix}_PASSWORD`]
}

/**
 * Skips the spec when the API key account (plus any `extraEnv`) is not set.
 * In CI it fails instead: a skipped spec reports green every night without
 * ever running. Call it at the top level of the spec file, not in a hook.
 */
export const requireApiKeyAdmin = (...extraEnv: string[]) => {
  const missing = [...apiKeyAdminEnv(), ...extraEnv].filter(
    (name) => !process.env[name]
  )
  if (process.env.CI && missing.length > 0) {
    throw new Error(
      `API key spec cannot run in CI: set ${missing.join(', ')} in the workflow env`
    )
  }
  test.skip(
    missing.length > 0,
    `Set ${missing.join(', ')} in .env.test to run this spec`
  )
}

/**
 * Signs in as the API key account. No full name: none is kept for the RBAC
 * accounts (e2e/rbac/README.md), so the header name check is skipped.
 */
export const loginAsApiKeyAdmin = async (page: Page) => {
  const account = accountFor(apiKeyAdminRole())
  if (!account) {
    throw new Error(
      `loginAsApiKeyAdmin: set ${apiKeyAdminEnv().join(' and ')} (see requireApiKeyAdmin)`
    )
  }
  await loginToOkta(page, account.username, account.password, null)
}

// The API keys page shows one card per key below 1344px and collapses the row
// actions into one "More Options" button below 1600px. Specs that read grid
// rows, grid cells or the row action buttons must run wider than both. The
// config's default 1280px viewport shows cards.
export const API_KEYS_VIEWPORT = { width: 1680, height: 1050 }

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
// paragraph in the same container (src/components/StatCard:
// `{label.toUpperCase()}`) — matching the uppercase label exactly avoids
// colliding with mixed-case "Active"/"Revoked" text in the STATUS column.
export const getStatCardValue = async (
  page: Page,
  label: string
): Promise<number> => {
  const labelEl = page.getByText(label, { exact: true })
  const statBox = labelEl.locator('xpath=..')
  // Read `data-value`, not the visible text. The visible text counts up from 0
  // (AnimatedNumber), so it can show an earlier number mid-animation, and it
  // has a thousands separator ("1,231") that parseInt stops at. `data-value`
  // holds the final count as a plain number (see StatCard).
  const value = await statBox
    .getByTestId('stat-card-value')
    .getAttribute('data-value')
  // Fail on a missing or non-numeric value. NaN would otherwise slip through
  // a before/after comparison, since two NaN readings compare equal.
  const count = value === null ? NaN : parseInt(value, 10)
  if (!Number.isFinite(count)) {
    throw new Error(
      `Stat card "${label}" has no numeric data-value (got ${JSON.stringify(
        value
      )}). Check StatCard still renders data-value on stat-card-value.`
    )
  }
  return count
}
