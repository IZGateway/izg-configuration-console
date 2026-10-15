/**
 * §9.8 RBAC Scoping (Jurisdiction Ops vs. IZG Ops) — security regression.
 *
 * Acceptance criteria: e2e/specs/api-key-management/spec.md
 * → "RBAC scoping".
 *
 * Keep this spec in the suite permanently: a missing ownership check is the
 * class of bug that regresses silently, because the UI never lists another
 * jurisdiction's keys either way. A failure here is a security finding — log
 * it per test plan §8, cross-referenced to IGDD-3184.
 *
 * TARGET KEY: the probes aim at a throwaway key that IZG Operations creates
 * at the start of the run, never at a real one. If ownership enforcement is
 * broken, the probes really do reveal, renew, revoke or cancel their target.
 * Its organization ("Jurisdiction B") is picked automatically from the sender
 * organizations other than A; see createTargetKey. The key is revoked or
 * cancelled again in afterAll.
 *
 * DPoP: every /api/* call must carry a proof signed by the browser's session
 * key (src/middleware.ts), which the app's window.fetch wrapper adds. So the
 * probes run as fetch() inside the logged-in page. A Playwright `request`
 * call with copied cookies has no proof; the middleware redirects it to
 * sign-in before the route's ownership check ever runs.
 *
 * Accounts (.env.test). The spec skips with a reason if any are unset:
 *   OKTA_USERNAME / OKTA_PASSWORD / OKTA_USER_FULLNAME
 *     IZG Operations.
 *   E2E_RBAC_JURIS_OPS_USERNAME / _PASSWORD / _FULLNAME
 *     Jurisdiction Operations for Jurisdiction A only.
 *   E2E_RBAC_JURIS_OPS_ORG
 *     Jurisdiction A's organization name, as the Organization column shows it.
 *   E2E_RBAC_NO_ROLE_USERNAME / _PASSWORD / _FULLNAME
 *     A user with no API key role (e.g. Jurisdiction Support).
 *
 * Also requires FEATURE_API_KEY_MANAGEMENT_ENABLED=true on the console under
 * test; without it /apikeys returns notFound.
 */
import { Browser, BrowserContext, Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { apiKeyRow } from '../helpers/createApiKey'
import {
  API_KEYS_VIEWPORT,
  openApiKeyManagement,
} from '../helpers/apiKeyHelpers'

const REQUIRED_ENV = [
  'OKTA_USERNAME',
  'OKTA_PASSWORD',
  'E2E_RBAC_JURIS_OPS_USERNAME',
  'E2E_RBAC_JURIS_OPS_PASSWORD',
  'E2E_RBAC_JURIS_OPS_FULLNAME',
  'E2E_RBAC_JURIS_OPS_ORG',
  'E2E_RBAC_NO_ROLE_USERNAME',
  'E2E_RBAC_NO_ROLE_PASSWORD',
  'E2E_RBAC_NO_ROLE_FULLNAME',
]
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name])

const env = (name: string) => process.env[name] as string
// Environment id of Development (DEST_TYPES in src/lib/desttypehelper.ts).
const DEV_ENV_ID = 5

// The two messages requireApiKeyAccess / hasApiKeyPermission return. Matching
// the text, not just the status, proves which gate refused the request.
const NOT_OWNER = 'Forbidden - not authorized for this jurisdiction'
const NO_ROLE = 'Forbidden - insufficient role'

type Jurisdiction = {
  jurisdictionId: number
  name?: string
  description?: string
  prefix?: string
  useTypes?: string[]
}
type ApiResult = { status: number; body: { error?: string } | unknown }
type Credential = {
  sortKey: string
  jurisdictionId: string
  jurisdictionDescription: string
  status: string
  revokedAt?: string | null
  supersededBy?: string
  cancelledAt?: string
}

// fetch() from inside the page so the DPoP wrapper signs it. `redirect:
// 'manual'` turns a middleware rejection into status 0 (opaque redirect)
// instead of silently following it to the sign-in page's 200.
const callApi = (
  page: Page,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<ApiResult> =>
  page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        redirect: 'manual',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        // Non-JSON body; keep the raw text for the failure message.
      }
      return { status: res.status, body: parsed }
    },
    { method, path, body }
  )

const listCredentials = async (page: Page): Promise<Credential[]> => {
  const res = await callApi(page, 'GET', '/api/apikeys')
  expect(res.status, JSON.stringify(res.body)).toBe(200)
  return res.body as Credential[]
}

// Every mutating route, aimed at `target`. Bodies are what a caller would
// send; renew deliberately names B's jurisdiction, as an attacker would.
const probes = (target: Credential) => [
  {
    name: 'view token',
    method: 'POST',
    path: '/api/apikeys/token',
    body: { sortKey: target.sortKey },
  },
  {
    name: 'renew',
    method: 'POST',
    path: '/api/apikeys/renew',
    body: {
      oldSortKey: target.sortKey,
      jurisdictionId: target.jurisdictionId,
    },
  },
  {
    name: 'revoke',
    method: 'PATCH',
    path: '/api/apikeys',
    body: { sortKey: target.sortKey, reason: 'IDOR probe' },
  },
  {
    name: 'cancel',
    method: 'DELETE',
    path: '/api/apikeys',
    body: { sortKey: target.sortKey },
  },
]

const expectAllDenied = async (
  page: Page,
  target: Credential,
  message: string
) => {
  for (const probe of probes(target)) {
    const res = await callApi(page, probe.method, probe.path, probe.body)
    expect(
      { status: res.status, body: res.body },
      `${probe.name} on another jurisdiction's key must be refused`
    ).toEqual({ status: 403, body: { error: message } })
  }
}

// Every sender organization, from /api/jurisdictions. That route is reference
// data and is not scoped by tenancy, so it is the ground truth for "every
// jurisdiction". Same filter as the Create Key Organization dropdown, minus its
// per-caller ownership filter; rows without a prefix are dropped there for
// every caller.
const senderOrgs = async (page: Page): Promise<Jurisdiction[]> => {
  const res = await callApi(page, 'GET', '/api/jurisdictions')
  expect(res.status, JSON.stringify(res.body)).toBe(200)
  return (res.body as Jurisdiction[]).filter(
    (j) => (j.useTypes?.length ?? 0) > 0 && j.prefix
  )
}

// The dropdown's option label for an organization.
const orgLabel = (j: Jurisdiction) =>
  String(j.description || j.name || j.jurisdictionId)

// As IZG Operations, creates the target key in a sender organization other
// than Jurisdiction A. Prefers an Active key, on a domain already authorized
// in Development (no DNS challenge). If no other organization has one, falls
// back to a pending key ("Ready for Validation") on a throwaway domain, which
// needs no setup data. Either way a non-owner must get 403; on a pending key a
// broken ownership check surfaces as 409/400 instead, which also fails.
const createTargetKey = async (
  page: Page,
  description: string
): Promise<Credential> => {
  const others = (await senderOrgs(page)).filter(
    (org) => orgLabel(org) !== env('E2E_RBAC_JURIS_OPS_ORG')
  )
  if (others.length === 0) {
    throw new Error(
      'No sender organization other than Jurisdiction A exists to create the target key in'
    )
  }

  const create = async (
    org: Jurisdiction,
    upn: string,
    dnsChoice: 'existing' | 'other'
  ) => {
    const created = await callApi(page, 'POST', '/api/apikeys', {
      jurisdictionId: String(org.jurisdictionId),
      environments: [DEV_ENV_ID],
      upn,
      dnsChoice,
      useTypes: [org.useTypes?.[0]],
      description,
    })
    // 201 = issued Active, 202 = pending DNS validation.
    expect([201, 202], JSON.stringify(created.body)).toContain(created.status)
    const { sortKey } = created.body as { sortKey: string }
    const key = (await listCredentials(page)).find((c) => c.sortKey === sortKey)
    expect(key, 'new key missing from IZG Operations list').toBeDefined()
    return key as Credential
  }

  for (const org of others) {
    const domains = await callApi(
      page,
      'GET',
      `/api/apikeys/domains?envId=${DEV_ENV_ID}&jurisdictionId=${org.jurisdictionId}`
    )
    const domain = (domains.body as { domain: string }[] | undefined)?.[0]
    if (domains.status === 200 && domain) {
      return create(org, domain.domain, 'existing')
    }
  }
  return create(others[0], `rbac-${Date.now()}.e2e.playwright.org`, 'other')
}

const signIn = async (
  browser: Browser,
  username: string,
  password: string,
  fullName?: string
) => {
  // A context made here does not inherit test.use(), so the viewport is set
  // on it directly. See API_KEYS_VIEWPORT.
  const context = await browser.newContext({ viewport: API_KEYS_VIEWPORT })
  const page = await context.newPage()
  await loginToOkta(page, username, password, fullName)
  return { context, page }
}

test.describe.configure({ mode: 'serial', timeout: 180000 })

test.describe('API key RBAC scoping', () => {
  test.skip(
    missingEnv.length > 0,
    `Set ${missingEnv.join(', ')} in .env.test to run the RBAC scoping spec`
  )

  let adminContext: BrowserContext
  let admin: Page
  // The throwaway key in another jurisdiction ("B"): the target of every probe.
  let target: Credential
  const targetDescription = `E2E rbac target ${Date.now()}`

  test.beforeAll(async ({ browser }) => {
    ;({ context: adminContext, page: admin } = await signIn(
      browser,
      env('OKTA_USERNAME'),
      env('OKTA_PASSWORD'),
      process.env.OKTA_USER_FULLNAME
    ))
    await openApiKeyManagement(admin)
    target = await createTargetKey(admin, targetDescription)
  })

  test.afterAll(async () => {
    if (!admin) return
    // Clean up the throwaway key: revoke an Active one, cancel a pending one.
    if (target) {
      const cleanup =
        target.status === 'ready_for_validation'
          ? callApi(admin, 'DELETE', '/api/apikeys', {
              sortKey: target.sortKey,
            })
          : callApi(admin, 'PATCH', '/api/apikeys', {
              sortKey: target.sortKey,
              reason: 'RBAC scoping e2e cleanup',
            })
      await cleanup.catch(() => {})
    }
    await logout(admin).catch(() => {})
    await adminContext.close()
  })

  test('IZG Operations sees every jurisdiction', async () => {
    await openApiKeyManagement(admin)

    // The Create Key Organization dropdown is filtered to the organizations
    // the caller may create keys for, so a scoped role sees a subset. IZG
    // Operations must see every sender organization.
    await admin.getByRole('button', { name: 'Create Key' }).click()
    await admin
      .getByRole('dialog')
      .filter({ hasText: 'Create API Key' })
      .getByTestId('create-key-organization')
      .getByRole('combobox')
      .click()
    await expect(admin.getByRole('option')).toHaveText(
      (await senderOrgs(admin)).map(orgLabel)
    )
  })

  test("Jurisdiction Ops cannot list or mutate another jurisdiction's credentials", async ({
    browser,
  }) => {
    const { context, page } = await signIn(
      browser,
      env('E2E_RBAC_JURIS_OPS_USERNAME'),
      env('E2E_RBAC_JURIS_OPS_PASSWORD'),
      env('E2E_RBAC_JURIS_OPS_FULLNAME')
    )
    let visible: Credential[] = []
    try {
      await openApiKeyManagement(page)

      // Step 1: only Jurisdiction A's keys, in the API response and the table.
      visible = await listCredentials(page)
      for (const c of visible) {
        expect(c.jurisdictionDescription).toBe(env('E2E_RBAC_JURIS_OPS_ORG'))
      }
      expect(visible.map((c) => c.sortKey)).not.toContain(target.sortKey)
      await expect(apiKeyRow(page, targetDescription)).toHaveCount(0)

      // Steps 2-3: direct calls on B's key are refused by the ownership gate.
      await expectAllDenied(page, target, NOT_OWNER)
    } finally {
      await logout(page).catch(() => {})
      await context.close()
    }

    // Not mutated: same status as created, never renewed, revoked or cancelled.
    const adminList = await listCredentials(admin)
    const after = adminList.find((c) => c.sortKey === target.sortKey)
    expect(after?.status).toBe(target.status)
    expect(after?.revokedAt ?? null).toBeNull()
    expect(after?.supersededBy).toBeUndefined()

    // Step 4: IZG Operations sees every key Jurisdiction A sees, plus B's.
    const adminKeys = adminList.map((c) => c.sortKey)
    for (const c of visible) expect(adminKeys).toContain(c.sortKey)
  })

  test('A user with no API key role gets no key management, in the UI or the API', async ({
    browser,
  }) => {
    const { context, page } = await signIn(
      browser,
      env('E2E_RBAC_NO_ROLE_USERNAME'),
      env('E2E_RBAC_NO_ROLE_PASSWORD'),
      env('E2E_RBAC_NO_ROLE_FULLNAME')
    )
    try {
      // Step 5: no nav entry, and the page itself renders access denied.
      // Nav items carry id={label} and are filtered out of the DOM entirely
      // when isVisible() is false (Navigation/index.tsx).
      await expect(page.locator('[id="API Key Management"]')).toHaveCount(0)
      await page.goto('/apikeys')
      await expect(
        page.getByText('You do not have access to this page.')
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Create Key' })
      ).toHaveCount(0)

      // Direct route calls are refused by the role gate.
      const list = await callApi(page, 'GET', '/api/apikeys')
      expect({ status: list.status, body: list.body }).toEqual({
        status: 403,
        body: { error: NO_ROLE },
      })
      await expectAllDenied(page, target, NO_ROLE)
    } finally {
      await logout(page).catch(() => {})
      await context.close()
    }
  })
})
