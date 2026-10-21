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
 * Its organization ("Jurisdiction B") is pinned by TEST_ORG_NAME, so the keys
 * each run leaves behind land in one known org rather than in whichever tenant
 * happens to sort first. The key is revoked or cancelled again in afterAll.
 *
 * JURISDICTION A: JURIS_OPS_ORG_NAME, the only organization whose keys the
 * Jurisdiction Ops user may list. B must also be outside A's reach, the
 * prefixes in A's own session (session.user.jurisdictions) that the server's
 * can() checks; beforeAll fails before creating anything if it is not.
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
 *     Jurisdiction Operations for Jurisdiction A. Must own at least one key.
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
  'E2E_RBAC_NO_ROLE_USERNAME',
  'E2E_RBAC_NO_ROLE_PASSWORD',
  'E2E_RBAC_NO_ROLE_FULLNAME',
]
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name])
// Locally a missing account skips. In CI it fails: a skipped security
// regression reports green every night without ever running.
if (process.env.CI && missingEnv.length > 0) {
  throw new Error(
    `RBAC scoping spec cannot run in CI: set ${missingEnv.join(
      ', '
    )} in the workflow env`
  )
}

const env = (name: string) => process.env[name] as string
// Organizations by their Create Key Organization dropdown name.
// Jurisdiction A: every key the Jurisdiction Ops user lists must be in it.
const JURIS_OPS_ORG_NAME = 'Audacious Inquiry LLC'
// Jurisdiction B: where the target key is created. Must be outside A's reach.
const TEST_ORG_NAME = 'Utah Department of Health (sender + jurisdiction)'
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
type SessionUser = { isAdmin?: boolean; jurisdictions?: string[] }

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

const errorOf = (res: ApiResult) =>
  typeof res.body === 'object' && res.body !== null
    ? (res.body as { error?: string }).error
    : undefined

// The caller's own session: its jurisdiction prefixes are exactly the reach
// the server checks (policy.ts scopeAllows). /api/auth/* needs no DPoP proof.
const sessionOf = async (page: Page) => {
  const res = await callApi(page, 'GET', '/api/auth/session')
  expect(res.status).toBe(200)
  const user = (res.body as { user?: SessionUser }).user
  return {
    isAdmin: Boolean(user?.isAdmin),
    jurisdictions: (user?.jurisdictions ?? []).map((j) => j.toLowerCase()),
  }
}

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
    // Only {status, error}, never the raw body: a regressed view-token probe
    // returns the live JWT, and a diff of the body would print it to the log.
    expect(
      { status: res.status, error: errorOf(res) },
      `${probe.name} on another jurisdiction's key must be refused`
    ).toEqual({ status: 403, error: message })
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

// As IZG Operations, creates the target key in TEST_ORG_NAME. Prefers an
// Active key, on a domain already authorized there in Development (no DNS
// challenge). Otherwise falls back to a pending key ("Ready for Validation")
// on a throwaway domain, which needs no setup data. Either way a non-owner
// must get 403; on a pending key a broken ownership check surfaces as 409/400
// instead, which also fails.
//
// `onCreated` fires as soon as the POST succeeds, before the key is read back,
// so afterAll can still clean it up if a later step in here fails.
const createTargetKey = async (
  page: Page,
  reachOfA: string[],
  description: string,
  onCreated: (sortKey: string, pending: boolean) => void
): Promise<Credential> => {
  const orgs = await senderOrgs(page)
  const matches = orgs.filter((org) => orgLabel(org) === TEST_ORG_NAME)
  expect(
    matches.map(orgLabel),
    `TEST_ORG_NAME "${TEST_ORG_NAME}" must name exactly one sender organization. ` +
      `Sender organizations: ${orgs.map(orgLabel).join(' | ')}`
  ).toHaveLength(1)
  const org = matches[0]
  // If A can reach B, A's legitimate 200s would read as an IDOR.
  expect(
    reachOfA,
    `TEST_ORG_NAME (prefix ${org.prefix}) must be outside Jurisdiction A's reach`
  ).not.toContain(String(org.prefix).toLowerCase())

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
    onCreated(sortKey, created.status === 202)
    const key = (await listCredentials(page)).find((c) => c.sortKey === sortKey)
    expect(key, 'new key missing from IZG Operations list').toBeDefined()
    return key as Credential
  }

  const domains = await callApi(
    page,
    'GET',
    `/api/apikeys/domains?envId=${DEV_ENV_ID}&jurisdictionId=${org.jurisdictionId}`
  )
  const domain = (domains.body as { domain: string }[] | undefined)?.[0]
  if (domains.status === 200 && domain) {
    return create(org, domain.domain, 'existing')
  }
  return create(org, `rbac-${Date.now()}.e2e.playwright.org`, 'other')
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
  let jurisContext: BrowserContext | undefined
  let juris: Page
  // Jurisdiction A's prefixes, from A's own session.
  let reachOfA: string[]
  // The throwaway key in another jurisdiction ("B"): the target of every probe.
  let target: Credential
  // Set as soon as the POST succeeds, so cleanup does not depend on `target`.
  let created: { sortKey: string; pending: boolean } | undefined
  const targetDescription = `E2E rbac target ${Date.now()}`

  test.beforeAll(async ({ browser }) => {
    // A first: B is only safe to create once A's reach is known.
    ;({ context: jurisContext, page: juris } = await signIn(
      browser,
      env('E2E_RBAC_JURIS_OPS_USERNAME'),
      env('E2E_RBAC_JURIS_OPS_PASSWORD'),
      env('E2E_RBAC_JURIS_OPS_FULLNAME')
    ))
    const sessionA = await sessionOf(juris)
    expect(sessionA.isAdmin, 'Jurisdiction A must not be IZG Operations').toBe(
      false
    )
    expect(
      sessionA.jurisdictions,
      'Jurisdiction A has no jurisdictions in its session'
    ).not.toHaveLength(0)
    reachOfA = sessionA.jurisdictions
    ;({ context: adminContext, page: admin } = await signIn(
      browser,
      env('OKTA_USERNAME'),
      env('OKTA_PASSWORD'),
      process.env.OKTA_USER_FULLNAME
    ))
    await openApiKeyManagement(admin)
    target = await createTargetKey(
      admin,
      reachOfA,
      targetDescription,
      (sortKey, pending) => {
        created = { sortKey, pending }
      }
    )
  })

  test.afterAll(async () => {
    if (jurisContext) {
      await logout(juris).catch(() => {})
      await jurisContext.close()
    }
    if (!admin) return
    // Clean up the throwaway key: revoke an Active one, cancel a pending one.
    if (created) {
      const { sortKey, pending } = created
      const revoke = (key: string) =>
        callApi(admin, 'PATCH', '/api/apikeys', {
          sortKey: key,
          reason: 'RBAC scoping e2e cleanup',
        }).catch(() => {})
      // If a renew probe got through, the target is now in grace_period and a
      // live successor (sortKey = the supersededBy jti) exists in B. Revoke it.
      const current = await listCredentials(admin)
        .then((list) => list.find((c) => c.sortKey === sortKey))
        .catch(() => undefined)
      if (current?.supersededBy) await revoke(current.supersededBy)
      if (pending) {
        await callApi(admin, 'DELETE', '/api/apikeys', { sortKey }).catch(
          () => {}
        )
      } else {
        await revoke(sortKey)
      }
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

  test("Jurisdiction Ops cannot list or mutate another jurisdiction's credentials", async () => {
    await openApiKeyManagement(juris)

    // Step 1: only Jurisdiction A's keys, in the API response and the table.
    const visible = await listCredentials(juris)
    // With no keys, the checks below would all pass vacuously.
    expect(
      visible.length,
      'Jurisdiction A must own at least one key for the scoping checks to mean anything'
    ).toBeGreaterThan(0)
    for (const c of visible) {
      expect(
        c.jurisdictionDescription,
        `key ${c.sortKey} is not in ${JURIS_OPS_ORG_NAME}`
      ).toBe(JURIS_OPS_ORG_NAME)
    }
    expect(visible.map((c) => c.sortKey)).not.toContain(target.sortKey)
    await expect(apiKeyRow(juris, targetDescription)).toHaveCount(0)

    // Steps 2-3: direct calls on B's key are refused by the ownership gate.
    await expectAllDenied(juris, target, NOT_OWNER)

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
      expect({ status: list.status, error: errorOf(list) }).toEqual({
        status: 403,
        error: NO_ROLE,
      })
      await expectAllDenied(page, target, NO_ROLE)
    } finally {
      await logout(page).catch(() => {})
      await context.close()
    }
  })
})
