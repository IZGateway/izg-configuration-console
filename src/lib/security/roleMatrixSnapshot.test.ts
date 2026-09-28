/**
 * @jest-environment node
 */
import accessLevel from './accesslevel'
import type { PageKey } from './accesslevel'
import { ROLE_PRECEDENCE } from './rolemapping'

/**
 * A committed snapshot of the whole role matrix (IGDD-3472).
 *
 * This change's design names its own largest risk: a ~60-file PR that gets
 * rubber-stamped. Colocating route declarations at the route file is right for
 * the declaration, but it gives up the single place to answer "who can do
 * what?". This restores it, and does something the source files cannot: any
 * permission change becomes an **explicit diff line in review** — "IZG Support
 * gained console.canViewConsole" — instead of something a reviewer has to
 * infer from an edit to a role file.
 *
 * Snapshots the **role matrix only**, not route declarations. Those are inline
 * across 39 files and extracting them would need source parsing — brittle, and
 * the matrix is where the access risk actually lives.
 *
 * `accessLevel` is pure data with no DB or session dependency, so this needs
 * no mock stack.
 *
 * If this snapshot fails, do not update it reflexively. Read the diff: it is
 * the change to who can do what.
 */

function renderMatrix(): string {
  const roles = [...ROLE_PRECEDENCE].sort()
  const pages = Object.keys(accessLevel[roles[0]])
    .filter((k) => k !== 'globalTenancy')
    .sort() as PageKey[]

  const lines: string[] = []
  lines.push('| Page | Capability | ' + roles.join(' | ') + ' |')
  lines.push('|---|---|' + roles.map(() => '---|').join(''))

  lines.push(
    '| _tenancy_ | globalTenancy | ' +
      roles.map((r) => (accessLevel[r].globalTenancy ? 'YES' : '—')).join(' | ') +
      ' |'
  )

  for (const page of pages) {
    const capabilities = Object.keys(accessLevel[roles[0]][page]).sort()
    for (const capability of capabilities) {
      const cells = roles.map((role) =>
        accessLevel[role][page][capability as never] ? 'YES' : '—'
      )
      lines.push(`| ${page} | ${capability} | ${cells.join(' | ')} |`)
    }
  }
  return lines.join('\n')
}

describe('role matrix snapshot', () => {
  it('matches the committed matrix', () => {
    expect('\n' + renderMatrix() + '\n').toMatchSnapshot()
  })
})
