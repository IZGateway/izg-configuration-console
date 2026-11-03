import { DestinationKind, KnownGap, MatrixRow } from './matrix'
import { RoleDef } from './roles'

/**
 * Cell statuses, shared by the spec (which decides them) and the reporter
 * (which renders them). Pure: no browser, no Playwright.
 */
export type CellStatus =
  | 'PASS' // observed matches the target
  | 'FAIL' // observed differs from the target, and no known gap says so
  | 'KNOWN_GAP' // differs from the target, as a knownGaps entry records
  | 'GAP_CLOSED' // a knownGaps entry exists but the cell now matches: remove it
  | 'ERROR' // the check could not decide (login, network, unexpected response)
  | 'PENDING' // the role is not in code yet
  | 'CONFIG' // a live role with no test account configured
  | 'SKIPPED' // not applicable in this run (feature flag off, no destination)
  | 'NOT_AUTOMATED' // the row has no safe probe yet
  | 'NOT_RUN' // the role's column was not part of this run (e.g. --grep)

/** Name of the per-column JSON attachment the spec writes and the reporter reads. */
export const RESULTS_ATTACHMENT = 'rbac-results'

/** Each column's test is titled this plus the role name; the reporter reads it back. */
export const COLUMN_TITLE_PREFIX = 'RBAC column: '

export interface ColumnResults {
  role: string
  cells: CellResult[]
}

export type Outcome = 'allowed' | 'denied'
export type Layer = 'nav' | 'page' | 'api' | 'ui' | 'identity'

export interface CheckResult {
  layer: Layer
  /** What was checked, e.g. `GET /api/denylist` or `/accesscontrol`. */
  target: string
  expected?: Outcome
  observed?: Outcome
  status: CellStatus
  detail: string
  /** For a probe on a destination: whose destination it was. */
  dest?: DestinationKind
}

export interface CellResult {
  rowId: string
  role: string
  status: CellStatus
  checks: CheckResult[]
  /** The knownGaps entry for this cell, when one exists. */
  gap?: KnownGap
}

/** Report symbols. Kept distinct from the Implementation Status page's ❌/⚠️. */
export const STATUS_SYMBOL: Record<CellStatus, string> = {
  PASS: '✅',
  FAIL: '❌',
  KNOWN_GAP: '⚠️',
  GAP_CLOSED: '🔁',
  ERROR: '❗',
  PENDING: '⏳',
  CONFIG: '🔧',
  SKIPPED: '⏭️',
  NOT_AUTOMATED: '➖',
  NOT_RUN: '·',
}

export const STATUS_MEANING: Record<CellStatus, string> = {
  PASS: 'Matches the target matrix',
  FAIL: 'Differs from the target matrix, with no known gap recorded: investigate',
  KNOWN_GAP: 'Differs from the target, as recorded in matrix.ts knownGaps (ticket)',
  GAP_CLOSED: 'Now matches the target: remove the knownGaps entry from matrix.ts',
  ERROR: 'The check could not decide (login, network or unexpected response)',
  PENDING: 'Role not in code yet',
  CONFIG: 'Live role without a test account configured',
  SKIPPED: 'Not applicable in this run (e.g. feature flag off)',
  NOT_AUTOMATED: 'No safe automated probe for this row yet',
  NOT_RUN: 'Role column not included in this run',
}

/** Statuses that mean someone has to act. */
export const NEEDS_ATTENTION: ReadonlySet<CellStatus> = new Set([
  'FAIL',
  'GAP_CLOSED',
  'ERROR',
  'CONFIG',
])

/** Does the target grant `row` to `role`, ignoring destination? */
export function targetAllows(row: MatrixRow, role: RoleDef): boolean {
  if (row.openToAnySignedInUser) return true
  return row.allow.includes(role.name)
}

/**
 * The target outcome of one check. A foreign destination is reachable only by
 * a role whose reach is every jurisdiction.
 */
export function expectedOutcome(
  row: MatrixRow,
  role: RoleDef,
  dest?: 'own' | 'foreign'
): Outcome {
  if (!targetAllows(row, role)) return 'denied'
  if (dest === 'foreign' && role.reach !== 'all') return 'denied'
  return 'allowed'
}

/** One decided check: PASS if observed matches expected, else FAIL. */
export function decide(
  layer: Layer,
  target: string,
  expected: Outcome,
  observed: Outcome,
  detail: string
): CheckResult {
  return {
    layer,
    target,
    expected,
    observed,
    status: observed === expected ? 'PASS' : 'FAIL',
    detail,
  }
}

/**
 * The report's display order: what needs acting on first. Not the same as
 * PRECEDENCE below, on purpose: a column of PENDING cells is listed before
 * PASS in the report, but a single PASS check outranks PENDING in a fold.
 * matrixIntegrity.spec.ts checks both list every status.
 */
export const REPORT_ORDER: readonly CellStatus[] = [
  'FAIL',
  'ERROR',
  'GAP_CLOSED',
  'CONFIG',
  'KNOWN_GAP',
  'PASS',
  'PENDING',
  'SKIPPED',
  'NOT_AUTOMATED',
  'NOT_RUN',
]

// Precedence when a cell has several checks: the most actionable wins.
export const PRECEDENCE: readonly CellStatus[] = [
  'FAIL',
  'ERROR',
  'GAP_CLOSED',
  'KNOWN_GAP',
  'CONFIG',
  'PENDING',
  'PASS',
  'SKIPPED',
  'NOT_AUTOMATED',
  'NOT_RUN',
]

function worst(statuses: CellStatus[]): CellStatus {
  for (const status of PRECEDENCE) if (statuses.includes(status)) return status
  return 'NOT_AUTOMATED'
}

/**
 * Fold a cell's checks into one status, applying its known gap.
 *
 * A gap explains a mismatch in one direction only: the cell's `expected`
 * outcome, on the role's own destination. "Not yet granted" explains an
 * allowed check that was refused; "still granted" explains a denied check
 * that got through. Those FAIL checks become KNOWN_GAP. Any other FAIL stays
 * a FAIL, above all a foreign destination let through, which is a tenancy
 * leak whatever the gap says. If no check in the gap's direction mismatches
 * any more and one passed, the gap has closed and the entry should go.
 */
export function foldCell(
  rowId: string,
  role: string,
  checks: CheckResult[],
  gap?: KnownGap,
  expected?: Outcome
): CellResult {
  if (!gap) return { rowId, role, status: worst(checks.map((c) => c.status)), checks, gap }
  const inGapDirection = (c: CheckResult) => c.expected === expected && c.dest !== 'foreign'
  const folded = checks.map((c) =>
    c.status === 'FAIL' && inGapDirection(c) ? { ...c, status: 'KNOWN_GAP' as CellStatus } : c
  )
  let status = worst(folded.map((c) => c.status))
  const explained = folded.some((c) => c.status === 'KNOWN_GAP')
  if (status !== 'FAIL' && !explained && checks.some((c) => c.status === 'PASS' && inGapDirection(c))) {
    status = checks.some((c) => c.status === 'ERROR') ? 'ERROR' : 'GAP_CLOSED'
  }
  return { rowId, role, status, checks: folded, gap }
}

/**
 * Apply a row's `uiOnly` gap. For a role the target denies, a hidden
 * control is not protection when no server check backs it, so a PASS is
 * reported as a known gap. Allowed roles, and any other status, are left as
 * they are.
 */
export function applyUiOnly(cell: CellResult, expected: Outcome, uiOnly?: KnownGap): CellResult {
  if (!uiOnly || expected !== 'denied' || cell.status !== 'PASS') return cell
  return { ...cell, status: 'KNOWN_GAP', gap: uiOnly }
}

/**
 * A column's cells with every row it did not record marked ERROR. A column
 * that stopped early (timeout, crash) must not leave rows that read as "not
 * part of this run".
 */
export function completeColumn(
  rows: readonly MatrixRow[],
  role: string,
  cells: CellResult[],
  detail: string
): CellResult[] {
  const recorded = new Set(cells.map((c) => c.rowId))
  const missing = rows
    .filter((row) => !recorded.has(row.id))
    .map((row) => ({
      rowId: row.id,
      role,
      status: 'ERROR' as CellStatus,
      checks: [{ layer: 'identity' as Layer, target: role, status: 'ERROR' as CellStatus, detail }],
    }))
  return [...cells, ...missing]
}

/** The same status, with one reason, for every row of a column. */
export function wholeColumn(
  rows: readonly MatrixRow[],
  role: RoleDef,
  status: CellStatus,
  detail: string
): CellResult[] {
  return rows.map((row) => ({
    rowId: row.id,
    role: role.name,
    status,
    checks: [{ layer: 'identity', target: role.name, status, detail }],
    gap: row.knownGaps?.[role.name],
  }))
}
