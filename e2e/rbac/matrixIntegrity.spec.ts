/**
 * Checks on matrix.ts and the cell logic, with no browser (IGDD-3621).
 *
 * They catch a bad edit to the matrix before it produces a misleading
 * report: a duplicate row id, a probe that names a destination it never
 * gets, a row with no probes and no reason, a UI-only row with no UI check,
 * or a known gap for a role that does not exist. They also pin the
 * known-gap and UI-only rules the report relies on.
 */
import { expect, test } from '@playwright/test'
import { MATRIX } from './matrix'
import { ROLES, ROLE_NAMES } from './roles'
import {
  CheckResult,
  PRECEDENCE,
  REPORT_ORDER,
  STATUS_SYMBOL,
  applyUiOnly,
  completeColumn,
  decide,
  expectedOutcome,
  foldCell,
} from './evaluate'
import { DestinationCache, foreignDestination, resolveDestination } from './probes'

const role = (name: string) => ROLES.find((r) => r.name === name)

test.describe('matrix.ts', () => {
  test('row ids are unique', () => {
    const ids = MATRIX.map((r) => r.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  test('every role in the registry is a known column', () => {
    expect(ROLES.map((r) => r.name).sort()).toEqual([...ROLE_NAMES].sort())
  })

  test('probes that use a destination declare where it comes from', () => {
    const missing = MATRIX.flatMap((row) =>
      (row.api ?? [])
        .filter((p) => /\{dest(Id)?\}/.test(p.path + JSON.stringify(p.body ?? {})) && !p.dest)
        .map((p) => `${row.id}: ${p.method} ${p.path}`)
    )
    expect(missing).toEqual([])
  })

  test('a row is either automated or says why not', () => {
    const automated = (r: (typeof MATRIX)[number]) =>
      !!(r.nav?.length || r.pages?.length || r.api?.length || r.ui?.length)
    const neither = MATRIX.filter((r) => !r.notAutomated && !automated(r)).map((r) => r.id)
    const both = MATRIX.filter((r) => r.notAutomated && automated(r)).map((r) => r.id)
    expect({ neither, both }).toEqual({ neither: [], both: [] })
  })

  test('a UI-only row has a UI check to report it on', () => {
    expect(MATRIX.filter((r) => r.uiOnly && !r.ui?.length).map((r) => r.id)).toEqual([])
  })

  test('known gaps name a real role', () => {
    const unknown = MATRIX.flatMap((row) =>
      Object.keys(row.knownGaps ?? {})
        .filter((name) => !role(name))
        .map((name) => `${row.id}: ${name}`)
    )
    expect(unknown).toEqual([])
  })
})

test.describe('cell statuses', () => {
  // STATUS_SYMBOL is a Record<CellStatus, ...>, so the type system keeps it
  // complete; both orderings must list exactly the same statuses.
  const all = Object.keys(STATUS_SYMBOL).sort()

  test('the fold precedence lists every status once', () => {
    expect([...PRECEDENCE].sort()).toEqual(all)
  })

  test('the report order lists every status once', () => {
    expect([...REPORT_ORDER].sort()).toEqual(all)
  })
})

test.describe('cell logic', () => {
  const row = MATRIX.find((r) => r.id === 'console.logsearch')
  const jurOps = role('Jurisdiction Operations')
  const izgOps = role('IZG Operations')

  test('a foreign destination is denied to own-reach roles only', () => {
    expect(expectedOutcome(row, jurOps, 'own')).toBe('allowed')
    expect(expectedOutcome(row, jurOps, 'foreign')).toBe('denied')
    expect(expectedOutcome(row, izgOps, 'foreign')).toBe('allowed')
  })

  const pass: CheckResult = decide('api', 'x', 'denied', 'denied', 'HTTP 403')
  const fail: CheckResult = decide('api', 'y', 'denied', 'allowed', 'HTTP 200')
  const gap = { reason: 'recorded' }

  test('a mismatch with no gap fails', () => {
    expect(foldCell('r', 'R', [pass, fail]).status).toBe('FAIL')
  })

  test('a mismatch with a gap is a known gap', () => {
    expect(foldCell('r', 'R', [pass, fail], gap, 'denied').status).toBe('KNOWN_GAP')
  })

  test('a gap whose cell now matches is reported closed', () => {
    expect(foldCell('r', 'R', [pass], gap, 'denied').status).toBe('GAP_CLOSED')
  })

  test('a gap with nothing checked stays as it was', () => {
    const skipped: CheckResult = { layer: 'api', target: 'z', status: 'SKIPPED', detail: '' }
    expect(foldCell('r', 'R', [skipped], gap, 'denied').status).toBe('SKIPPED')
  })

  // "Not yet granted": the target allows the role, today's code refuses it.
  const ownRefused: CheckResult = { ...decide('api', 'own', 'allowed', 'denied', 'HTTP 401'), dest: 'own' }
  const ownAllowed: CheckResult = { ...decide('api', 'own', 'allowed', 'allowed', 'HTTP 405'), dest: 'own' }
  const foreignRefused: CheckResult = { ...decide('api', 'far', 'denied', 'denied', 'HTTP 401'), dest: 'foreign' }
  const foreignLeak: CheckResult = { ...decide('api', 'far', 'denied', 'allowed', 'HTTP 405'), dest: 'foreign' }

  test('a gap does not hide a foreign destination let through', () => {
    expect(foldCell('r', 'R', [ownRefused, foreignRefused], gap, 'allowed').status).toBe('KNOWN_GAP')
    expect(foldCell('r', 'R', [ownRefused, foreignLeak], gap, 'allowed').status).toBe('FAIL')
    // Once the grant ships, a leak still fails rather than reading as closed.
    expect(foldCell('r', 'R', [ownAllowed, foreignLeak], gap, 'allowed').status).toBe('FAIL')
    expect(foldCell('r', 'R', [ownAllowed, foreignRefused], gap, 'allowed').status).toBe('GAP_CLOSED')
  })

  test('a gap only explains a mismatch in its own direction', () => {
    // The gap says "not yet granted" (allowed expected); a denied check that
    // got through is a different problem.
    expect(foldCell('r', 'R', [fail], gap, 'allowed').status).toBe('FAIL')
  })

  test('a gap is closed only by a check in its direction', () => {
    expect(foldCell('r', 'R', [foreignRefused], gap, 'allowed').status).not.toBe('GAP_CLOSED')
  })

  test('a column that stopped early marks the rows it did not record', () => {
    const recorded = foldCell(MATRIX[0].id, 'R', [pass])
    const cells = completeColumn(MATRIX, 'R', [recorded], 'stopped')
    expect(cells).toHaveLength(MATRIX.length)
    expect(cells[0]).toBe(recorded)
    expect(cells.slice(1).every((c) => c.status === 'ERROR')).toBe(true)
  })

  test('a control hidden only in the UI is a known gap for a denied role', () => {
    const hidden = foldCell('r', 'R', [decide('ui', 'u', 'denied', 'denied', 'hidden')])
    expect(applyUiOnly(hidden, 'denied', gap).status).toBe('KNOWN_GAP')
    expect(applyUiOnly(hidden, 'denied', gap).gap).toBe(gap)
  })

  test('a pinned foreign destination the role reaches falls back to the cache', () => {
    const cache = DestinationCache.in(test.info().outputPath('cache'))
    cache.record([
      { typeId: 1, destId: 'al' },
      { typeId: 1, destId: 'md' },
    ])
    const saved = process.env.E2E_RBAC_FOREIGN_DEST
    process.env.E2E_RBAC_FOREIGN_DEST = '1/al'
    try {
      expect(foreignDestination([{ typeId: 1, destId: 'ak' }], cache)).toEqual({ typeId: 1, destId: 'al' })
      expect(foreignDestination([{ typeId: 1, destId: 'al' }], cache)).toEqual({ typeId: 1, destId: 'md' })
    } finally {
      if (saved === undefined) delete process.env.E2E_RBAC_FOREIGN_DEST
      else process.env.E2E_RBAC_FOREIGN_DEST = saved
    }
  })

  test('a jurisdiction role with no foreign destination is an error in CI only', () => {
    const ctx = { own: { typeId: 1, destId: 'al' }, listed: [] }
    const saved = process.env.CI
    try {
      process.env.CI = 'true'
      expect(resolveDestination('foreign', ctx, 'own')).toHaveProperty('error')
      delete process.env.CI
      expect(resolveDestination('foreign', ctx, 'own')).toHaveProperty('skip')
      // Global-reach roles have no foreign destination by definition.
      process.env.CI = 'true'
      expect(resolveDestination('foreign', ctx, 'all')).toHaveProperty('skip')
    } finally {
      if (saved === undefined) delete process.env.CI
      else process.env.CI = saved
    }
  })

  test('UI-only leaves allowed roles and real failures alone', () => {
    const shown = foldCell('r', 'R', [decide('ui', 'u', 'allowed', 'allowed', 'shown')])
    expect(applyUiOnly(shown, 'allowed', gap).status).toBe('PASS')
    const leaked = foldCell('r', 'R', [decide('ui', 'u', 'denied', 'allowed', 'shown')])
    expect(applyUiOnly(leaked, 'denied', gap).status).toBe('FAIL')
  })
})
