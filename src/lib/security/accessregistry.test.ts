/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { PAGE_ENTRY, derivePageKey } from './accessregistry'
import { AUTHZ_DEBT } from './authzDebt'

/**
 * The coverage tests. **These, not the compiler, are the guarantee.**
 *
 * TypeScript has no view of the filesystem-as-router: nothing in the type
 * system can force a newly added `src/pages/foo.tsx` — or a new
 * `src/pages/api/foo.ts` — to call anything at all. Two files bypassed
 * `withMiddleware` entirely before IGDD-3472, which is exactly the shape the
 * next one will take.
 *
 * The required `RouteAuthz` argument is a second, sharper layer on top: once a
 * file *does* call the wrapper, forgetting the declaration is a compile error.
 * It is a refinement of these tests, not a replacement for them.
 *
 * Both walk the tree with **static source regex, not dynamic import** —
 * importing a page or route would pull in `DbClientFactory` and need the full
 * mock stack — and normalize with `path.posix`, since this repo is developed
 * on Windows and built in Alpine.
 */

const SRC = path.join(process.cwd(), 'src')
const PAGES = path.join(SRC, 'pages')
const API = path.join(PAGES, 'api')

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, exts))
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full)
  }
  return out
}

/** Repo-relative, forward-slashed, so assertions read the same on both OSes. */
const relPosix = (file: string) =>
  path.relative(process.cwd(), file).split(path.sep).join(path.posix.sep)

/** `src/pages/accesscontrol/index.tsx` -> `accesscontrol`; `404.tsx` -> `404`. */
function pageKeyOf(file: string): string {
  const rel = path.relative(PAGES, file).split(path.sep).join(path.posix.sep)
  const route = '/' + rel.replace(/\.tsx?$/, '').replace(/\/index$/, '')
  return derivePageKey(route)
}

const debtSubjects = (kind: string) =>
  AUTHZ_DEBT.filter((d) => d.kind === kind).map((d) => d.subject)

describe('derivePageKey matches every declared page key', () => {
  // This is why the api-doc page key is 'api-doc' and not 'apidoc': the
  // invariant "page key === key derived from that page's route" holds with no
  // exceptions, so a denial event's page field is always the matrix key.
  it.each(Object.keys(PAGE_ENTRY))('/%s derives to itself', (key) => {
    expect(derivePageKey('/' + key)).toBe(key)
  })

  it('strips dynamic segments', () => {
    expect(derivePageKey('/changerequest/[...slug]')).toBe('changerequest')
    expect(derivePageKey('/edit/[...slug]')).toBe('edit')
  })

  it('derives a distinct, non-collapsed key for every page on disk', () => {
    // `derivePageKey` deletes every slash rather than taking the first path
    // segment, so a future nested page at `/access/control` would derive to
    // `accesscontrol` and silently inherit that page's capability block in
    // `useRoleAccess`'s route-derived form. Raised by review on PR #700.
    //
    // The suggested fix — `pathname.split('/')[1]` — was considered and is
    // worse. A nested route whose collapsed form is not a matrix key today
    // gets `{}` from `mergePageAccess`, i.e. deny-by-default; the first
    // segment would instead hand it the *parent* page's flags. That trades a
    // hypothetical collision for a real widening. So the derivation stays as
    // it is, and this is what makes a collision impossible to add quietly.
    const declared = new Set(Object.keys(PAGE_ENTRY))
    const seen = new Map<string, string>()
    const pages = walk(PAGES, ['.tsx']).filter(
      (f) => !f.startsWith(API + path.sep)
    )

    for (const file of pages) {
      const key = pageKeyOf(file)
      expect({ key, alreadyClaimedBy: seen.get(key) ?? null }).toEqual({
        key,
        alreadyClaimedBy: null,
      })
      seen.set(key, relPosix(file))

      // A page whose derived key IS a matrix key must live at that key's own
      // route — never at a nested path that happens to collapse onto it.
      if (!declared.has(key)) continue
      const route =
        '/' +
        path
          .relative(PAGES, file)
          .split(path.sep)
          .join(path.posix.sep)
          .replace(/\.tsx?$/, '')
          .replace(/\/index$/, '')
          .replace(/\/\[.*?\]$/, '')
      expect({ key, route }).toEqual({ key, route: '/' + key })
    }
  })
})

describe('page coverage: an ungated page is a test failure', () => {
  // Deliberately and permanently fine. NOT AUTHZ_DEBT rows — debt is for
  // things that should eventually be zero, and mixing the two is what makes
  // an allowlist read as a clearance.
  const PERMANENTLY_FINE: Record<string, string> = {
    _app: 'framework file, not a route',
    _document: 'framework file, not a route',
    _error: 'framework file, not a route',
    '404': 'framework file, not a route',
    index: 'the landing page, deliberately reachable by any session',
    add: 'orphan with zero inbound links, proposed for deletion',
    user: 'orphan with zero inbound links, proposed for deletion',
    // `api-doc` used to sit here, on the reasoning that the spec endpoint
    // behind it was gated. That reasoning was wrong — the page embeds the spec
    // in its own static payload and never calls the endpoint — so it is an
    // AUTHZ_DEBT row now rather than a page we claim is fine. PR #700.
  }

  // Excluding src/pages/api/** matters: without it the .tsx API route is
  // wrongly flagged as an ungated page. That subtree is the next test's.
  const pageFiles = walk(PAGES, ['.tsx']).filter(
    (f) => !f.startsWith(API + path.sep)
  )

  it('accounts for all 20 pages, so a new page cannot appear unnoticed', () => {
    expect(pageFiles.length).toBe(20)
  })

  it.each(pageFiles.map((f) => [relPosix(f), f]))(
    '%s is gated, permanently fine, or declared debt',
    (_rel, file) => {
      const key = pageKeyOf(file as string)
      const src = fs.readFileSync(file as string, 'utf8')
      const accountedFor =
        src.includes('withPageAccess') ||
        key in PERMANENTLY_FINE ||
        debtSubjects('ungated-page').includes(key)
      expect({ key, accountedFor }).toEqual({ key, accountedFor: true })
    }
  )

  it('gating a page and handling the denial are checked separately', () => {
    // Crude, but it closes a real hole: a page can receive accessDenied: true
    // and simply not branch on it, and no other test in this suite would
    // notice while the jsdom environment is broken.
    for (const file of pageFiles) {
      const src = fs.readFileSync(file, 'utf8')
      if (!src.includes('withPageAccess')) continue
      expect({
        file: relPosix(file),
        rendersDenial: src.includes('AccessDenied'),
      }).toEqual({ file: relPosix(file), rendersDenial: true })
    }
  })

  it('gates exactly the seven pages this change is responsible for', () => {
    // manageconnections and apikeys already checked the right capability
    // before this change; what they did on failure was a silent redirect, so
    // they were migrated to the shared gate for the outcome, not the check.
    const gated = pageFiles
      .filter((f) => fs.readFileSync(f, 'utf8').includes('withPageAccess'))
      .map(pageKeyOf)
      .sort()
    expect(gated).toEqual([
      'accesscontrol',
      'adminoperations',
      'apikeys',
      'console',
      'manageconnections',
      'onboarding',
      'passwordencryption',
    ])
  })

  it('no page answers an authorization failure with a redirect', () => {
    // The specific regression this guards: a page that checks the right
    // capability and then returns `redirect: { destination: '/' }` is gated,
    // passes every other check here, and still leaves the user with no
    // message and no audit event. Two pages did exactly that.
    //
    // A redirect to the sign-in route is the one legitimate case — that is
    // authentication, not RBAC.
    for (const file of pageFiles) {
      // Strip whole-line comments first. A comment explaining why a redirect
      // was REMOVED still contains the word, and prose is not behaviour.
      const src = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => {
          const t = line.trim()
          return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
        })
        .join('\n')
      // Annotated: `match() || []` infers `RegExpMatchArray | never[]`, and
      // `.filter` over that union types its parameter as `never`.
      const redirects: string[] = src.match(/destination:\s*'([^']+)'/g) ?? []
      const nonAuthRedirects = redirects.filter(
        (r) => !r.includes('/api/auth/signin')
      )
      expect({ file: relPosix(file), nonAuthRedirects }).toEqual({
        file: relPosix(file),
        nonAuthRedirects: [],
      })
    }
  })
})

describe('route coverage: a route that bypasses the wrapper is a test failure', () => {
  // The two next-auth routes never call withMiddleware and never should —
  // sign-in must not depend on the authorization stack it bootstraps.
  const NEXT_AUTH = ['src/pages/api/auth/[...nextauth].ts', 'src/pages/api/auth/bind-session.ts']

  // The .tsx half of this glob is not padding: changerequeststatus/[id].tsx is
  // a real API route with a .tsx extension, and was one of the two files that
  // bypassed the wrapper. A **/*.ts glob would skip precisely the file this
  // test exists to catch.
  const routeFiles = walk(API, ['.ts', '.tsx'])

  it('enumerates at least the 43 files known at the time of this change', () => {
    // A lower bound, so a future glob change cannot silently empty the test by
    // matching nothing. 41 routes + the 2 next-auth files. It was 39 + 2 when
    // this change was branched; `apikeysaudit/index.ts` and
    // `apikeysaudit/[sortKey].ts` landed on develop in between, declaring
    // nothing at all, and the required RouteAuthz argument is what stopped the
    // build rather than a reviewer noticing.
    expect(routeFiles.length).toBeGreaterThanOrEqual(43)
  })

  it.each(routeFiles.map((f) => [relPosix(f), f]))(
    '%s declares its authorization',
    (rel, file) => {
      const src = fs.readFileSync(file as string, 'utf8')
      const expected = NEXT_AUTH.includes(rel as string)
        ? { rel, declares: false, reason: 'allowlisted next-auth route' }
        : { rel, declares: true, reason: 'declares' }
      expect({
        rel,
        declares: src.includes('withMiddleware'),
        reason: expected.reason,
      }).toEqual(expected)
    }
  )

  it('contains only routes — no helpers, types or test files', () => {
    // This is what would have caught the defect where the middleware helper
    // itself sat in the route tree and was routable at
    // /api/api-middleware-helper, resolving without a response. (The DPoP
    // middleware made it unreachable in practice — see the note on the helper
    // itself — but a module in the route tree is one config change away from
    // being served for real.) A "mentions withMiddleware" regex would not have
    // caught it: that file mentioned it on every other line.
    for (const file of routeFiles) {
      const rel = relPosix(file)
      expect({ rel, isTest: rel.includes('.test.') }).toEqual({
        rel,
        isTest: false,
      })
      if (NEXT_AUTH.includes(rel)) continue
      const src = fs.readFileSync(file, 'utf8')
      // Every route's default export is the wrapper applied to a handler.
      expect({ rel, exportsHandler: /export default withMiddleware\(/.test(src) }).toEqual(
        { rel, exportsHandler: true }
      )
    }
  })
})

describe('the acknowledged-gap ratchet', () => {
  const routeFiles = walk(API, ['.ts', '.tsx'])
  const inHandlerCount = routeFiles.reduce(
    (n, f) => n + (fs.readFileSync(f, 'utf8').match(/inHandler:/g) || []).length,
    0
  )

  it('every { inHandler } in source has a debt row naming a ticket', () => {
    // Derived, not a magic number: an { inHandler } cannot be added without a
    // row, and closing one means deleting its row, with no ceiling to
    // remember to decrement.
    //
    // An acknowledged authorization gap may be CLOSED, never ADDED.
    expect(inHandlerCount).toBe(debtSubjects('in-handler').length)
  })

  it('every debt row names a real ticket', () => {
    for (const row of AUTHZ_DEBT) {
      expect({ subject: row.subject, ticket: row.ticket }).toEqual({
        subject: row.subject,
        ticket: expect.stringMatching(/^IGDD-\d+$/),
      })
    }
  })

  it('every in-handler debt row points at a route file that exists', () => {
    for (const subject of debtSubjects('in-handler')) {
      expect({
        subject,
        exists: fs.existsSync(path.join(API, subject)),
      }).toEqual({ subject, exists: true })
    }
  })

  it('every unwired-flag row names a capability that exists in the matrix', () => {
    // A stale row is worse than no row: it reads as an acknowledged gap for a
    // flag that may since have been wired or renamed.
    const accessLevel = require('./accesslevel').default
    for (const subject of debtSubjects('unwired-flag')) {
      const [page, capability] = subject.split('.')
      const block = accessLevel['IZG Operations'][page]
      expect({
        subject,
        exists: !!block && capability in block,
      }).toEqual({ subject, exists: true })
    }
  })

  it('every unwired-flag row carries an enforcement state', () => {
    // Using the target matrix's own vocabulary, so the code and the spike
    // document can be diffed directly rather than re-audited.
    for (const row of AUTHZ_DEBT.filter((d) => d.kind === 'unwired-flag')) {
      expect({ subject: row.subject, enforcement: row.enforcement }).toEqual({
        subject: row.subject,
        enforcement: expect.stringMatching(
          /^(Enforced|UI-only|Not enforced|Unconfirmed)$/
        ),
      })
    }
  })

  it('no unwired-flag row names a capability a route now declares', () => {
    // IGDD-3472 wires several previously-dead flags via route declarations.
    // A row left behind for one of them would be a false gap.
    const routeSource = walk(API, ['.ts', '.tsx'])
      .map((f) => fs.readFileSync(f, 'utf8'))
      .join('\n')
    for (const subject of debtSubjects('unwired-flag')) {
      // Match the page-qualified ref, not the bare capability name. Two of
      // these rows name a capability that also exists on another page block
      // (`test.canRunConnectionTest` and `history.canViewChangeRequest` both
      // have twins on `manageconnections`), so a bare-name match would fail
      // for a still-unwired row the moment a route declared the *other* page's
      // flag — which the debt note for tests/connectiontest explicitly plans.
      // The fix under that red build would look like deleting the row.
      const [page, capability] = subject.split('.')
      const declared = new RegExp(
        `page: '${page}',\\s*capability: '${capability}'`
      ).test(routeSource)
      expect({ subject, declaredAtARoute: declared }).toEqual({
        subject,
        declaredAtARoute: false,
      })
    }
  })

  it('prints the debt table, so it is visible on every run', () => {
    const byKind = AUTHZ_DEBT.reduce<Record<string, number>>((acc, row) => {
      acc[row.kind] = (acc[row.kind] || 0) + 1
      return acc
    }, {})
    console.log(
      '\nAUTHZ_DEBT (' +
        AUTHZ_DEBT.length +
        ' rows): ' +
        JSON.stringify(byKind) +
        '\n' +
        AUTHZ_DEBT.map(
          (r) =>
            `  [${r.kind}] ${r.subject} — ${r.ticket}` +
            (r.enforcement ? ` (${r.enforcement})` : '')
        ).join('\n')
    )
    expect(AUTHZ_DEBT.length).toBeGreaterThan(0)
  })
})
