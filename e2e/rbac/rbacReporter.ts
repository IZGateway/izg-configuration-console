/**
 * Builds the RBAC report from the per-column attachments that
 * rbacMatrix.spec.ts writes (IGDD-3621).
 *
 * Output, in RBAC_REPORT_DIR (default `rbac-report/`):
 *  - rbac-report.md   role × capability matrix, findings, known gaps
 *  - rbac-report.html the same matrix, with each cell's checks on hover
 *  - rbac-report.json every cell and check, for tooling
 *
 * In GitHub Actions it also writes a counts-only summary to the job summary.
 * Cell detail stays in the files, which the workflow uploads to a private S3
 * bucket: this repo is public, and its job summaries, logs and artifacts are
 * readable by anyone.
 */
import * as fs from 'fs'
import * as path from 'path'
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { MATRIX, MATRIX_SOURCE } from './matrix'
import { ROLES } from './roles'
import {
  COLUMN_TITLE_PREFIX,
  CellResult,
  CellStatus,
  ColumnResults,
  NEEDS_ATTENTION,
  REPORT_ORDER as ORDER,
  RESULTS_ATTACHMENT,
  STATUS_MEANING,
  STATUS_SYMBOL,
  completeColumn,
} from './evaluate'

/** The target's host, for the header. A malformed BASE_URL must not stop the report. */
const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).host : 'unknown'
  } catch {
    return 'unknown'
  }
}

const cellText = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const html = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

class RbacReporter implements Reporter {
  private readonly columns = new Map<string, CellResult[]>()

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!test.title.startsWith(COLUMN_TITLE_PREFIX)) return
    const role = test.title.slice(COLUMN_TITLE_PREFIX.length)
    const attachment = result.attachments.find((a) => a.name === RESULTS_ATTACHMENT)
    const cells = attachment?.body
      ? (JSON.parse(attachment.body.toString('utf8')) as ColumnResults).cells
      : []
    // A column whose test ended before it attached every row (a timeout, a
    // crashed worker) is an error, not "not part of this run". A retry
    // replaces the earlier attempt.
    this.columns.set(
      role,
      completeColumn(MATRIX, role, cells, `not checked: the column's test ended (${result.status}) first`)
    )
  }

  onEnd(result: FullResult): void {
    // `--list`, or a run of the integrity spec alone: no column ran, so keep
    // the last report rather than overwrite it with an empty one.
    if (this.columns.size === 0) return
    const grid = this.grid()
    const meta = {
      environment: hostOf(process.env.BASE_URL),
      commit: (process.env.GITHUB_SHA || 'local').slice(0, 12),
      matrix: `${MATRIX_SOURCE.page} v${MATRIX_SOURCE.version} (Confluence page ${MATRIX_SOURCE.pageId})`,
      generated: new Date().toISOString(),
      playwrightStatus: result.status,
    }
    const counts = this.counts(grid)

    const dir = process.env.RBAC_REPORT_DIR || 'rbac-report'
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'rbac-report.md'), this.markdown(grid, meta, counts))
    fs.writeFileSync(path.join(dir, 'rbac-report.html'), this.html(grid, meta))
    fs.writeFileSync(
      path.join(dir, 'rbac-report.json'),
      JSON.stringify(
        {
          meta,
          counts,
          roles: ROLES.map((r) => ({ name: r.name, status: r.status, reach: r.reach })),
          rows: MATRIX.map((r) => ({ id: r.id, feature: r.feature, allow: r.allow })),
          cells: grid.flat(),
        },
        null,
        2
      )
    )

    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, this.summary(meta, counts))
    }

    const attention = ORDER.filter((s) => NEEDS_ATTENTION.has(s) && counts[s])
      .map((s) => `${counts[s]} ${s}`)
      .join(', ')
    console.log(
      `\nRBAC report written to ${dir}/ (${attention || 'nothing needs attention'})`
    )
  }

  /** rows × roles, in matrix and Confluence column order. */
  private grid(): CellResult[][] {
    return MATRIX.map((row) =>
      ROLES.map((role) => {
        const found = this.columns.get(role.name)?.find((c) => c.rowId === row.id)
        return (
          found ?? {
            rowId: row.id,
            role: role.name,
            status: 'NOT_RUN' as CellStatus,
            checks: [],
          }
        )
      })
    )
  }

  private counts(grid: CellResult[][]): Partial<Record<CellStatus, number>> {
    const counts: Partial<Record<CellStatus, number>> = {}
    for (const cell of grid.flat()) counts[cell.status] = (counts[cell.status] ?? 0) + 1
    return counts
  }

  private header(meta: Record<string, string>): string {
    return [
      `- **Environment:** ${meta.environment}`,
      `- **Commit:** ${meta.commit}`,
      `- **Target matrix:** ${meta.matrix}`,
      `- **Generated:** ${meta.generated}`,
    ].join('\n')
  }

  private countsTable(counts: Partial<Record<CellStatus, number>>): string {
    const lines = ['| Status | Cells | Meaning |', '| --- | --- | --- |']
    for (const s of ORDER) {
      if (counts[s]) lines.push(`| ${STATUS_SYMBOL[s]} ${s} | ${counts[s]} | ${STATUS_MEANING[s]} |`)
    }
    return lines.join('\n')
  }

  private markdown(
    grid: CellResult[][],
    meta: Record<string, string>,
    counts: Partial<Record<CellStatus, number>>
  ): string {
    const out: string[] = ['# CC RBAC verification report', '', this.header(meta), '']
    out.push('## Summary', '', this.countsTable(counts), '')

    out.push('## Matrix', '')
    out.push(`| Feature — Capability | ${ROLES.map((r) => r.name).join(' | ')} |`)
    out.push(`| --- | ${ROLES.map(() => ':---:').join(' | ')} |`)
    MATRIX.forEach((row, i) => {
      out.push(
        `| ${cellText(row.feature)} | ${grid[i].map((c) => STATUS_SYMBOL[c.status]).join(' | ')} |`
      )
    })
    out.push('')

    const attention = grid
      .flat()
      .filter((c) => NEEDS_ATTENTION.has(c.status))
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
    out.push('## Needs attention', '')
    if (attention.length === 0) out.push('Nothing.', '')
    for (const cell of attention) {
      const row = MATRIX.find((r) => r.id === cell.rowId)
      out.push(`### ${STATUS_SYMBOL[cell.status]} ${cell.status}: ${row?.feature} — ${cell.role}`, '')
      if (cell.gap) {
        out.push(`Known gap${cell.gap.ticket ? ` (${cell.gap.ticket})` : ''}: ${cell.gap.reason}`, '')
      }
      for (const check of cell.checks) {
        const expectation = check.expected
          ? `expected ${check.expected}${check.observed ? `, observed ${check.observed}` : ''}`
          : ''
        out.push(
          `- ${STATUS_SYMBOL[check.status]} ${check.layer} \`${check.target}\`: ${[expectation, check.detail]
            .filter(Boolean)
            .join(' — ')}`
        )
      }
      out.push('')
    }

    const gaps = grid.flat().filter((c) => c.status === 'KNOWN_GAP')
    out.push('## Known gaps', '')
    if (gaps.length === 0) out.push('None observed.', '')
    for (const cell of gaps) {
      const row = MATRIX.find((r) => r.id === cell.rowId)
      out.push(
        `- ${row?.feature} — ${cell.role}: ${cell.gap?.ticket ? `${cell.gap.ticket}, ` : ''}${cell.gap?.reason}`
      )
    }
    out.push('')

    out.push('## Not automated', '')
    for (const row of MATRIX.filter((r) => r.notAutomated)) {
      out.push(`- ${row.feature}: ${row.notAutomated}`)
    }
    out.push('')

    const notRun = ROLES.filter((r) => !this.columns.has(r.name))
    const placeholders = ROLES.map((role, j) => ({ role, cell: grid[0]?.[j] })).filter(
      ({ cell }) => cell && (cell.status === 'PENDING' || cell.status === 'CONFIG')
    )
    out.push('## Columns not checked', '')
    for (const { role, cell } of placeholders) {
      out.push(`- ${role.name}: ${STATUS_SYMBOL[cell.status]} ${cell.checks[0]?.detail ?? cell.status}`)
    }
    for (const role of notRun) out.push(`- ${role.name}: not part of this run`)
    if (placeholders.length === 0 && notRun.length === 0) out.push('None.')
    out.push('')

    out.push('## Legend', '')
    for (const s of ORDER) out.push(`- ${STATUS_SYMBOL[s]} **${s}**: ${STATUS_MEANING[s]}`)
    out.push('')
    return out.join('\n')
  }

  private html(grid: CellResult[][], meta: Record<string, string>): string {
    const head = ROLES.map((r) => `<th>${html(r.name)}</th>`).join('')
    const body = MATRIX.map((row, i) => {
      const cells = grid[i]
        .map((c) => {
          const title = [
            c.status,
            c.gap ? `Known gap${c.gap.ticket ? ` ${c.gap.ticket}` : ''}: ${c.gap.reason}` : '',
            ...c.checks.map((k) => `${k.status} ${k.layer} ${k.target}: ${k.detail}`),
          ]
            .filter(Boolean)
            .join('\n')
          return `<td class="${c.status}" title="${html(title)}">${STATUS_SYMBOL[c.status]}</td>`
        })
        .join('')
      return `<tr><th scope="row">${html(row.feature)}</th>${cells}</tr>`
    }).join('\n')
    const legend = ORDER.map((s) => `<li>${STATUS_SYMBOL[s]} <b>${s}</b>: ${html(STATUS_MEANING[s])}</li>`).join('')
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>CC RBAC verification report</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem}
table{border-collapse:collapse}
th,td{border:1px solid #ccc;padding:4px 8px}
td{text-align:center;cursor:help}
th[scope=row]{text-align:left;font-weight:normal}
.FAIL,.ERROR{background:#fde2e2}.GAP_CLOSED,.CONFIG{background:#fff4d6}.PASS{background:#e6f6e6}
</style></head><body>
<h1>CC RBAC verification report</h1>
<ul>${Object.entries(meta)
      .map(([k, v]) => `<li><b>${html(k)}:</b> ${html(String(v))}</li>`)
      .join('')}</ul>
<p>Hover a cell for its checks.</p>
<table><thead><tr><th>Feature — Capability</th>${head}</tr></thead><tbody>
${body}
</tbody></table>
<h2>Legend</h2><ul>${legend}</ul>
</body></html>
`
  }

  private summary(meta: Record<string, string>, counts: Partial<Record<CellStatus, number>>): string {
    return [
      '## CC RBAC verification (report only)',
      '',
      this.header(meta),
      '',
      this.countsTable(counts),
      '',
      'Cell-level detail is in the private RBAC report bucket, not on GitHub.',
      '',
    ].join('\n')
  }
}

export default RbacReporter
