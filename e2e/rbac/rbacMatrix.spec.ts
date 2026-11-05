/**
 * RBAC matrix verification (IGDD-3621).
 *
 * One test per role column. Each signs in once as that role's Okta test
 * account, confirms the CC session holds exactly that role, then checks
 * every row of e2e/rbac/matrix.ts at up to five layers: the nav link, the
 * page gate, the data a page sends in its payload, the API routes behind the
 * feature, and the controls a page shows on a destination in the right
 * state. Jurisdiction roles' own and foreign destinations come from the
 * session's jurisdictions, not from the API under test. Every cell is recorded,
 * even after a mismatch, and attached as JSON for e2e/rbac/rbacReporter.ts.
 *
 * Report only: the nightly Playwright workflow runs this with
 * continue-on-error. A test fails when its column has a cell needing
 * attention (FAIL, GAP CLOSED, ERROR), but nothing downstream waits on it.
 * Locally the failure names those cells; in CI it gives only a count,
 * because the repo's Actions logs are public. A live role with no account
 * (CONFIG) is skipped locally and fails in CI, where every account should be
 * set. A role not in code yet (PENDING) is always skipped.
 *
 * Probes never change data; see the header of matrix.ts for how.
 *
 * Run: npm run test:rbac (BASE_URL and the accounts come from .env.test).
 */
import { Page, TestInfo, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { MATRIX, MatrixRow } from './matrix'
import {
  Account,
  EXECUTION_ORDER,
  RoleDef,
  expectedSessionRoles,
  runnability,
} from './roles'
import {
  COLUMN_TITLE_PREFIX,
  CellResult,
  CheckResult,
  ColumnResults,
  Layer,
  NEEDS_ATTENTION,
  Outcome,
  RESULTS_ATTACHMENT,
  applyUiOnly,
  completeColumn,
  decide,
  expectedOutcome,
  foldCell,
  wholeColumn,
} from './evaluate'
import {
  DestinationCache,
  Observation,
  ProbeContext,
  SessionInfo,
  foreignDestination,
  listedDestinations,
  navLinks,
  observeApi,
  observePage,
  observePageData,
  observeUi,
  reachableDestinations,
  resolveDestination,
  sessionOf,
  uiDestination,
} from './probes'

const toCheck = (
  layer: Layer,
  target: string,
  expected: Outcome,
  obs: Observation
): CheckResult =>
  'error' in obs
    ? { layer, target, expected, status: 'ERROR', detail: obs.error }
    : decide(layer, target, expected, obs.observed, obs.detail)

async function evaluateRow(
  page: Page,
  row: MatrixRow,
  role: RoleDef,
  session: SessionInfo,
  ctx: ProbeContext,
  links: Set<string>
): Promise<CellResult> {
  const gap = row.knownGaps?.[role.name]
  const single = (status: CheckResult['status'], detail: string) =>
    foldCell(row.id, role.name, [{ layer: 'api', target: row.feature, status, detail }], gap)

  if (row.notAutomated) return single('NOT_AUTOMATED', row.notAutomated)
  if (row.requiresFlag === 'apiKeyManagement' && !session.apiKeyManagementEnabled) {
    return single('SKIPPED', 'API key management is switched off in this environment')
  }

  const checks: CheckResult[] = []
  const expected = expectedOutcome(row, role)

  for (const href of row.nav ?? []) {
    const shown = links.has(href)
    checks.push(
      decide('nav', href, expected, shown ? 'allowed' : 'denied', shown ? 'link shown' : 'link hidden')
    )
  }

  for (const url of row.pages ?? []) {
    checks.push(toCheck('page', url, expected, await observePage(page, url)))
  }

  for (const probe of row.pageData ?? []) {
    const target = `${probe.page} pageProps.${probe.prop}`
    checks.push(toCheck('data', target, expected, await observePageData(page, probe)))
  }

  // A jurisdiction role's destination list must hold only the jurisdictions
  // in its session. An extra entry is a tenancy leak, and a foreign
  // destination too, which is how the fold keeps it from any known gap.
  if (row.checksDestinationList && role.reach === 'own') {
    const extra = ctx.outOfClaim.map((d) => `${d.typeId}/${d.destId}`)
    checks.push({
      ...decide(
        'api',
        'GET /api/destinations (outside the jurisdictions claim)',
        'denied',
        extra.length ? 'allowed' : 'denied',
        extra.length ? `lists ${extra.join(', ')}` : "lists only the session's jurisdictions"
      ),
      dest: 'foreign',
    })
  }

  for (const probe of row.api ?? []) {
    const probeExpected = expectedOutcome(row, role, probe.dest)
    const target = `${probe.method} ${probe.path}${probe.dest ? ` (${probe.dest} destination)` : ''}`
    // Before resolving the destination: a probe that is never sent must not
    // fail on a destination it would not use.
    if (probe.denyOnly && probeExpected === 'allowed') {
      checks.push({
        layer: 'api',
        target,
        expected: probeExpected,
        status: 'SKIPPED',
        detail: `not sent for an allowed role: it ${probe.denyOnly}`,
        dest: probe.dest,
      })
      continue
    }
    let dest
    if (probe.dest) {
      const resolved = resolveDestination(probe.dest, ctx, role.reach)
      if ('skip' in resolved) {
        checks.push({ layer: 'api', target, expected: probeExpected, status: 'SKIPPED', detail: resolved.skip, dest: probe.dest })
        continue
      }
      if ('error' in resolved) {
        checks.push({ layer: 'api', target, expected: probeExpected, status: 'ERROR', detail: resolved.error, dest: probe.dest })
        continue
      }
      dest = resolved.dest
    }
    const obs = await observeApi(page, probe, dest)
    // `dest` tells the known-gap fold a foreign check from an own one.
    checks.push({ ...toCheck('api', obs.target, probeExpected, obs), dest: probe.dest })
  }

  for (const probe of row.ui ?? []) {
    const picked = uiDestination(ctx.listed, probe.state)
    if ('skip' in picked) {
      const target = `${probe.page} ${probe.control}`
      checks.push({ layer: 'ui', target, expected, status: 'SKIPPED', detail: picked.skip })
      continue
    }
    const obs = await observeUi(page, probe, picked.dest)
    checks.push(toCheck('ui', obs.target, expected, obs))
  }

  return applyUiOnly(foldCell(row.id, role.name, checks, gap, expected), expected, row.uiOnly)
}

async function runColumn(
  page: Page,
  role: RoleDef,
  account: Account,
  cache: DestinationCache,
  cells: CellResult[],
  deadline: number
): Promise<void> {
  // No name check (null): the role check below is what proves the identity.
  await loginToOkta(page, account.username, account.password, null)

  // A column is only evidence if the account holds exactly the role it
  // stands for. An extra or missing Okta group would make every cell lie.
  const session = await sessionOf(page)
  const want = expectedSessionRoles(role).sort()
  const got = [...session.roles].sort()
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    cells.push(
      ...wholeColumn(
        MATRIX,
        role,
        'ERROR',
        `the account's CC session holds [${got.join(', ')}], expected [${want.join(', ')}]; fix its Okta groups`
      )
    )
    return
  }

  // Own and foreign come from the verified session's jurisdictions, not from
  // /api/destinations: the list is part of what is under test, and a leaked
  // entry taken as "own" would never be probed as foreign. hasAccessToDestId
  // matches a destination id against the claim, exactly.
  const listed = await reachableDestinations(page)
  if (role.reach === 'all') cache.record(listed)
  const claims = new Set(session.jurisdictions.map((j) => j.toLowerCase()))
  const inClaim = (d: { destId: string }) => role.reach === 'all' || claims.has(d.destId.toLowerCase())
  const own = listed.filter(inClaim)
  const ctx: ProbeContext = {
    own: own[0],
    foreign: foreignDestination(own, cache),
    outOfClaim: listed.filter((d) => !inClaim(d)),
    listed: MATRIX.some((r) => r.ui?.length) ? await listedDestinations(page) : [],
  }
  const links = await navLinks(page)

  for (const row of MATRIX) {
    // Stop before the test timeout, so the results still get attached. The
    // rows left are marked by completeColumn below.
    if (Date.now() > deadline) return
    cells.push(await evaluateRow(page, row, role, session, ctx, links))
  }
}

// Time kept back from the test timeout for logout and attaching the results.
// The deadline is checked between rows, so this must also cover the slowest
// row: two UI probes at up to about 70s each.
const WRAP_UP_MS = 5 * 60 * 1000

const attach = (testInfo: TestInfo, results: ColumnResults) =>
  testInfo.attach(RESULTS_ATTACHMENT, {
    body: JSON.stringify(results),
    contentType: 'application/json',
  })

const describeCell = (cell: CellResult) => {
  const row = MATRIX.find((r) => r.id === cell.rowId)
  // The checks behind the cell's status. A closed gap has none with that
  // status (its checks pass), so it shows the ones that now pass.
  const status = cell.status === 'GAP_CLOSED' ? 'PASS' : cell.status
  const behind = cell.checks.filter((c) => c.status === status)
  const why = (behind.length ? behind : cell.checks)
    .map((c) => `${c.layer} ${c.target}: ${c.detail}`)
    .join('; ')
  return `${cell.status} ${row?.feature ?? cell.rowId}: ${why}`
}

for (const role of EXECUTION_ORDER) {
  const gate = runnability(role)

  // Decided when the file loads (the accounts come from the environment), so
  // a column that cannot run never asks for a browser.
  if (gate.run === false) {
    // eslint-disable-next-line no-empty-pattern
    test(`${COLUMN_TITLE_PREFIX}${role.name}`, async ({}, testInfo) => {
      await attach(testInfo, {
        role: role.name,
        cells: wholeColumn(MATRIX, role, gate.status, gate.reason),
      })
      // CI should hold every live role's account, so a missing one is a
      // mistake to fix; locally, developers rarely have them all.
      if (gate.status === 'CONFIG' && process.env.CI) throw new Error(`${role.name}: ${gate.reason}`)
      test.skip(true, gate.reason)
    })
    continue
  }

  test(`${COLUMN_TITLE_PREFIX}${role.name}`, async ({ browser }, testInfo) => {
    let cells: CellResult[] = []
    const context = await browser.newContext()
    const page = await context.newPage()
    // A timeout of 0 (--debug, --timeout=0) means no limit.
    const deadline = testInfo.timeout ? Date.now() + testInfo.timeout - WRAP_UP_MS : Infinity
    try {
      await runColumn(page, role, gate.account, DestinationCache.in(testInfo.project.outputDir), cells, deadline)
      cells = completeColumn(MATRIX, role.name, cells, 'not checked: the column ran out of time')
    } catch (e) {
      // Keep the cells already decided; the rest could not be checked.
      cells = completeColumn(MATRIX, role.name, cells, `column aborted: ${(e as Error).message}`)
    } finally {
      await attach(testInfo, { role: role.name, cells })
      await logout(page).catch(() => {})
      await context.close()
    }

    const attention = cells.filter((c) => NEEDS_ATTENTION.has(c.status))
    if (process.env.CI) {
      // Actions logs on this public repo are readable by anyone, so name no
      // cell there: the detail is in the private report.
      expect(attention.length, `${role.name}: cells needing attention (see the RBAC report)`).toBe(0)
    } else {
      expect(attention.map(describeCell), `${role.name}: cells needing attention`).toEqual([])
    }
  })
}
