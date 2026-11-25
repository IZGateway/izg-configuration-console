/**
 * §9.8 RBAC Scoping (Jurisdiction Security vs. IZG Security) — security
 * regression.
 *
 * Acceptance criteria: e2e/specs/api-key-management/spec.md
 * → "RBAC scoping".
 *
 * Keep this spec in the suite permanently: a missing ownership check is the
 * class of bug that regresses silently, because the UI never lists another
 * jurisdiction's keys either way. A failure here is a security finding — log
 * it per test plan §8, cross-referenced to IGDD-3184.
 *
 * TARGET KEY: the probes aim at a throwaway key that IZG Security creates
 * at the start of the run, never at a real one. If ownership enforcement is
 * broken, the probes really do reveal, renew, revoke or cancel their target.
 * Its organization ("Jurisdiction B") is pinned by TEST_ORG_NAME, so the keys
 * each run leaves behind land in one known org rather than in whichever tenant
 * happens to sort first. The key is revoked or cancelled again in afterAll.
 *
 * JURISDICTION A: the Jurisdiction Security user, the jurisdiction role that
 * holds API keys (IGDD-3500 moved them off Jurisdiction Operations). Its
 * organizations are the sender organizations whose prefix is in its own
 * session (session.user.jurisdictions), the reach the server's can() checks,
 * so no organization name is pinned here. A creates a throwaway key in the
 * first of them, so its list is never empty; afterAll removes that key too.
 * B must be outside A's reach; beforeAll fails before creating anything in B
 * if it is not.
 *
 * DPoP: every /api/* call must carry a proof signed by the browser's session
 * key (src/middleware.ts), which the app's window.fetch wrapper adds. So the
 * probes run as fetch() inside the logged-in page. A Playwright `request`
 * call with copied cookies has no proof; the middleware redirects it to
 * sign-in before the route's ownership check ever runs.
 *
 * Accounts (.env.test locally; the same names are already wired as GitHub
 * Actions secrets for the nightly CI run — see playwright-nightly.yml and
 * e2e/rbac/README.md). The spec skips with a reason if any are unset:
 *   E2E_RBAC_IZG_SECURITY_USERNAME / _PASSWORD
 *     IZG Security — the global-reach role for API keys (IGDD-3549; IZG
 *     Operations lost this access).
 *   E2E_RBAC_JURIS_SECURITY_USERNAME / _PASSWORD
 *     Jurisdiction Security for Jurisdiction A. Its jurisdictions claim must
 *     name at least one sender organization, and not B.
 *   E2E_RBAC_NO_ROLE_USERNAME / _PASSWORD / _FULLNAME
 *     A user with no API key role (e.g. Jurisdiction Support).
 * Neither Security account has a `_FULLNAME` variant (e2e/rbac/README.md):
 * the sign-in passes `null` and skips the app header name check, since the
 * session's roles prove who signed in.
 *
 * Also requires FEATURE_API_KEY_MANAGEMENT_ENABLED=true on the console under
 * test; without it /apikeys returns notFound.
 */
import { Browser, BrowserContext, Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { callApi } from '../helpers/dpopFetch'
import { apiKeyRow } from '../helpers/createApiKey'
import {
  API_KEYS_VIEWPORT,
  openApiKeyManagement,
} from '../helpers/apiKeyHelpers'
import { ROLES } from '../rbac/roles'

const REQUIRED_ENV = [
  'E2E_RBAC_IZG_SECURITY_USERNAME',
  'E2E_RBAC_IZG_SECURITY_PASSWORD',
  'E2E_RBAC_JURIS_SECURITY_USERNAME',
  'E2E_RBAC_JURIS_SECURITY_PASSWORD',
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
// Jurisdiction B, by its Create Key Organization dropdown name: where the
// target key is created. Must be outside Jurisdiction A's reach.
const TEST_ORG_NAME = 'Utah Department of Health (sender + jurisdiction)'
// Environment id of Development (DEST_TYPES in src/lib/desttypehelper.ts).
const DEV_ENV_ID = 5

type Jurisdiction = {
  jurisdictionId: number
  name?: string
  description?: string
  prefix?: string
  useTypes?: string[]
}
type Credential = {
  sortKey: string
  jurisdictionId: string
  jurisdictionDescription: string
  status: string
  revokedAt?: string | null
  supersededBy?: string
  cancelledAt?: string
}
type SessionUser = { roles?: string[]; jurisdictions?: string[] }

// Roles that reach every jurisdiction, from the e2e RBAC role model (which
// mirrors globalTenancy in src/lib/security/accessdefinitions).
const GLOBAL_ROLES: string[] = ROLES.filter((r) => r.reach === 'all').map((r) => r.name)

// The caller's own session: its jurisdiction prefixes are exactly the reach
// the server checks (policy.ts scopeAllows). /api/auth/* needs no DPoP proof.
const sessionOf = async (page: Page) => {
  const res = await callApi(page, 'GET', '/api/auth/session')
  expect(res.status).toBe(200)
  const user = (res.body as { user?: SessionUser }).user
  return {
    roles: user?.roles ?? [],
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

// Status only, not a message (IGDD-3549 review follow-up): the declarative
// gate answers with a plain-text body ('forbidden'), not JSON, so there is
// no longer a distinct message naming which gate refused — the status code
// is the only signal this probe can check.
const expectAllDenied = async (page: Page, target: Credential) => {
  for (const probe of probes(target)) {
    const res = await callApi(page, probe.method, probe.path, probe.body)
    expect(
      res.status,
      `${probe.name} on another jurisdiction's key must be refused`
    ).toBe(403)
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

// Jurisdiction B: the one sender organization named TEST_ORG_NAME, checked
// to be outside A's reach. If A could reach B, A's legitimate 200s would read
// as an IDOR.
const targetOrg = (orgs: Jurisdiction[], reachOfA: string[]): Jurisdiction => {
  const matches = orgs.filter((org) => orgLabel(org) === TEST_ORG_NAME)
  expect(
    matches.map(orgLabel),
    `TEST_ORG_NAME "${TEST_ORG_NAME}" must name exactly one sender organization. ` +
      `Sender organizations: ${orgs.map(orgLabel).join(' | ')}`
  ).toHaveLength(1)
  const org = matches[0]
  expect(
    reachOfA,
    `TEST_ORG_NAME (prefix ${org.prefix}) must be outside Jurisdiction A's reach`
  ).not.toContain(String(org.prefix).toLowerCase())
  return org
}

// Creates a throwaway key in `org` as the signed-in caller. Prefers an Active
// key, on a domain already authorized there in Development (no DNS
// challenge). Otherwise falls back to a pending key ("Ready for Validation")
// on a throwaway domain, which needs no setup data. On B's key either way a
// non-owner must get 403; on a pending key a broken ownership check surfaces
// as 409/400 instead, which also fails.
//
// `onCreated` fires as soon as the POST succeeds, before the key is read back,
// so afterAll can still clean it up if a later step in here fails.
const createKey = async (
  page: Page,
  org: Jurisdiction,
  description: string,
  onCreated: (sortKey: string, pending: boolean) => void
): Promise<Credential> => {
  const create = async (upn: string, dnsChoice: 'existing' | 'other') => {
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
    expect(key, "new key missing from its creator's list").toBeDefined()
    return key as Credential
  }

  const domains = await callApi(
    page,
    'GET',
    `/api/apikeys/domains?envId=${DEV_ENV_ID}&jurisdictionId=${org.jurisdictionId}`
  )
  const domain = (domains.body as { domain: string }[] | undefined)?.[0]
  if (domains.status === 200 && domain) {
    return create(domain.domain, 'existing')
  }
  return create(`rbac-${Date.now()}.e2e.playwright.org`, 'other')
}

const signIn = async (
  browser: Browser,
  username: string,
  password: string,
  fullName?: string | null
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
  // Jurisdiction A's prefixes, from A's own session, and the sender
  // organizations they name.
  let reachOfA: string[]
  let orgsOfA: Jurisdiction[]
  // The throwaway key A creates in its own organization.
  let ownKey: Credential
  // The throwaway key in another jurisdiction ("B"): the target of every probe.
  let target: Credential
  // Every key this run created, recorded as soon as its POST succeeds, so
  // cleanup does not depend on `ownKey` or `target`.
  const created: { sortKey: string; pending: boolean }[] = []
  const record = (sortKey: string, pending: boolean) => {
    created.push({ sortKey, pending })
  }
  const runId = Date.now()
  const ownDescription = `E2E rbac own ${runId}`
  const targetDescription = `E2E rbac target ${runId}`

  test.beforeAll(async ({ browser }) => {
    // A first: B is only safe to create once A's reach is known.
    ;({ context: jurisContext, page: juris } = await signIn(
      browser,
      env('E2E_RBAC_JURIS_SECURITY_USERNAME'),
      env('E2E_RBAC_JURIS_SECURITY_PASSWORD'),
      null
    ))
    const sessionA = await sessionOf(juris)
    expect(sessionA.roles, 'Jurisdiction A must hold Jurisdiction Security').toContain(
      'Jurisdiction Security'
    )
    // A global-reach role would make every scoping assertion below vacuous.
    expect(
      sessionA.roles.filter((r) => GLOBAL_ROLES.includes(r)),
      'Jurisdiction A must not hold a global-reach role'
    ).toEqual([])
    expect(
      sessionA.jurisdictions,
      'Jurisdiction A has no jurisdictions in its session'
    ).not.toHaveLength(0)
    reachOfA = sessionA.jurisdictions
    orgsOfA = (await senderOrgs(juris)).filter((org) =>
      reachOfA.includes(String(org.prefix).toLowerCase())
    )
    expect(
      orgsOfA.map(orgLabel),
      "Jurisdiction A's jurisdictions claim names no sender organization"
    ).not.toHaveLength(0)
    await openApiKeyManagement(juris)
    ownKey = await createKey(juris, orgsOfA[0], ownDescription, record)

    ;({ context: adminContext, page: admin } = await signIn(
      browser,
      env('E2E_RBAC_IZG_SECURITY_USERNAME'),
      env('E2E_RBAC_IZG_SECURITY_PASSWORD'),
      // No _FULLNAME secret exists for this role (e2e/rbac/README.md): the
      // role check, not the header name, proves who signed in.
      null
    ))
    await openApiKeyManagement(admin)
    target = await createKey(
      admin,
      targetOrg(await senderOrgs(admin), reachOfA),
      targetDescription,
      record
    )
  })

  test.afterAll(async () => {
    // Clean up the throwaway keys: revoke an Active one, cancel a pending one.
    // IZG Security reaches both; if it never signed in, A removes its own.
    const cleaner = admin ?? juris
    if (cleaner) {
      const revoke = (key: string) =>
        callApi(cleaner, 'PATCH', '/api/apikeys', {
          sortKey: key,
          reason: 'RBAC scoping e2e cleanup',
        }).catch(() => {})
      const list = await listCredentials(cleaner).catch(() => [] as Credential[])
      for (const { sortKey, pending } of created) {
        // If a renew probe got through, the key is now in grace_period and a
        // live successor (sortKey = the supersededBy jti) exists. Revoke it.
        const current = list.find((c) => c.sortKey === sortKey)
        if (current?.supersededBy) await revoke(current.supersededBy)
        if (pending) {
          await callApi(cleaner, 'DELETE', '/api/apikeys', { sortKey }).catch(
            () => {}
          )
        } else {
          await revoke(sortKey)
        }
      }
    }
    if (jurisContext) {
      await logout(juris).catch(() => {})
      await jurisContext.close()
    }
    if (adminContext) {
      await logout(admin).catch(() => {})
      await adminContext.close()
    }
  })

  test('IZG Security sees every jurisdiction', async () => {
    await openApiKeyManagement(admin)

    // The Create Key Organization dropdown is filtered to the organizations
    // the caller may create keys for, so a scoped role sees a subset. IZG
    // Security must see every sender organization.
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

  test("Jurisdiction Security cannot list or mutate another jurisdiction's credentials", async () => {
    await openApiKeyManagement(juris)

    // Step 1: only Jurisdiction A's keys, in the API response and the table.
    // A's own key keeps the list from being empty, which would let every
    // check below pass vacuously.
    const visible = await listCredentials(juris)
    expect(visible.map((c) => c.sortKey), 'Jurisdiction A must see its own key').toContain(
      ownKey.sortKey
    )
    const idsOfA = orgsOfA.map((org) => String(org.jurisdictionId))
    for (const c of visible) {
      expect(
        idsOfA,
        `key ${c.sortKey} (${c.jurisdictionDescription}) is outside Jurisdiction A's organizations`
      ).toContain(String(c.jurisdictionId))
    }
    expect(visible.map((c) => c.sortKey)).not.toContain(target.sortKey)
    await expect(apiKeyRow(juris, targetDescription)).toHaveCount(0)

    // Steps 2-3: direct calls on B's key are refused by the ownership gate.
    await expectAllDenied(juris, target)

    // Not mutated: same status as created, never renewed, revoked or cancelled.
    const adminList = await listCredentials(admin)
    const after = adminList.find((c) => c.sortKey === target.sortKey)
    expect(after?.status).toBe(target.status)
    expect(after?.revokedAt ?? null).toBeNull()
    expect(after?.supersededBy).toBeUndefined()

    // Step 4: IZG Security sees every key Jurisdiction A sees, plus B's.
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
      expect(list.status).toBe(403)
      await expectAllDenied(page, target)
    } finally {
      await logout(page).catch(() => {})
      await context.close()
    }
  })
})
