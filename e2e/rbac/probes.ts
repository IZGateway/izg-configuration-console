import * as fs from 'fs'
import * as path from 'path'
import { Page } from '@playwright/test'
import { callApi } from '../helpers/dpopFetch'
import { ApiProbe, DestinationKind, DestinationState, PageDataProbe, UiProbe } from './matrix'
import { Outcome } from './evaluate'
import { Reach } from './roles'

/** The heading `src/components/AccessDenied.tsx` renders on every denial. */
export const DENIAL_TEXT = 'You do not have access to this page.'

/**
 * Waiting for networkidle is capped: pages that keep polling (the connection
 * table) never go idle, and the uncapped wait is the 30s navigation timeout.
 */
const IDLE_WAIT = { timeout: 5000 }

export interface SessionInfo {
  signedIn: boolean
  roles: string[]
  jurisdictions: string[]
  apiKeyManagementEnabled: boolean
}

/** The caller's CC session. /api/auth/* needs no DPoP proof. */
export async function sessionOf(page: Page): Promise<SessionInfo> {
  // Its own timeout, as in callApi: page.evaluate has none.
  const session = await page.evaluate(async () => {
    const res = await fetch('/api/auth/session', { signal: AbortSignal.timeout(30000) })
    return res.json()
  })
  return {
    signedIn: !!session?.user,
    roles: session?.user?.roles ?? [],
    jurisdictions: session?.user?.jurisdictions ?? [],
    apiKeyManagementEnabled: !!session?.apiKeyManagementEnabled,
  }
}

export interface Destination {
  typeId: number
  destId: string
}

const key = (d: Destination) => `${d.typeId}/${d.destId}`

/** Fill `{dest}` (`<typeId>/<destId>`), `{typeId}` and `{destId}`, for API and UI probes alike. */
const fillDest = (s: string, dest: Destination) =>
  s
    .replaceAll('{dest}', key(dest))
    .replaceAll('{typeId}', String(dest.typeId))
    .replaceAll('{destId}', dest.destId)

/** Destinations this caller reaches, as /api/destinations filters them. */
export async function reachableDestinations(page: Page): Promise<Destination[]> {
  const res = await callApi(page, 'GET', '/api/destinations')
  if (res.status !== 200 || !Array.isArray(res.body)) {
    throw new Error(`GET /api/destinations answered ${res.status}`)
  }
  return (res.body as Array<{ destId?: string; destinationType?: { typeId?: number } }>)
    .filter((d) => d.destId && typeof d.destinationType?.typeId === 'number')
    .map((d) => ({ typeId: d.destinationType.typeId, destId: d.destId }))
    .sort((a, b) => a.typeId - b.typeId || a.destId.localeCompare(b.destId))
}

/**
 * Destinations seen by global-reach roles earlier in the run, kept in a file
 * so they survive a worker restart. The output dir is cleared per run.
 */
export class DestinationCache {
  constructor(private readonly file: string) {}

  static in(outputDir: string): DestinationCache {
    return new DestinationCache(path.join(outputDir, 'rbac-destinations.json'))
  }

  record(dests: Destination[]): void {
    const merged = new Map(this.read().map((d) => [key(d), d]))
    for (const d of dests) merged.set(key(d), d)
    fs.mkdirSync(path.dirname(this.file), { recursive: true })
    fs.writeFileSync(this.file, JSON.stringify([...merged.values()]))
  }

  read(): Destination[] {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'))
    } catch {
      return []
    }
  }
}

/** `E2E_RBAC_FOREIGN_DEST=<typeId>/<destId>` pins the foreign destination. */
function pinnedForeign(): Destination | undefined {
  const raw = process.env.E2E_RBAC_FOREIGN_DEST
  const match = raw?.match(/^(\d+)\/(.+)$/)
  return match ? { typeId: Number(match[1]), destId: match[2] } : undefined
}

/**
 * A destination outside this caller's reach: the pinned one, or the first
 * destination a global-reach role saw that this caller does not reach. One
 * pin serves every jurisdiction role, so it can be one role's own
 * destination; that role falls back to what the global roles saw.
 */
export function foreignDestination(
  own: Destination[],
  cache: DestinationCache
): Destination | undefined {
  const reached = new Set(own.map(key))
  const pinned = pinnedForeign()
  if (pinned && !reached.has(key(pinned))) return pinned
  return cache.read().find((d) => !reached.has(key(d)))
}

/** A destination with the change request state its table row shows. */
export interface ListedDestination extends Destination {
  state: Exclude<DestinationState, 'any'>
}

/**
 * The connections /manageconnections lists for this caller, read from the
 * page's server-rendered props. Empty when the page denies the caller.
 */
export async function listedDestinations(page: Page): Promise<ListedDestination[]> {
  await page.goto('/manageconnections', { waitUntil: 'domcontentloaded' })
  // The props script is in the server-rendered HTML; window.__NEXT_DATA__ is
  // only set once Next's client bundle has run, which may be later.
  const rows = await page.evaluate(() => {
    const json = document.getElementById('__NEXT_DATA__')?.textContent
    return json ? JSON.parse(json)?.props?.pageProps?.data : undefined
  })
  if (!Array.isArray(rows)) return []
  return (
    rows as Array<{
      destTypeId?: number
      destId?: string
      hasChangeRequest?: boolean
      hasActiveDraft?: boolean
    }>
  )
    .filter((r) => r.destId && typeof r.destTypeId === 'number')
    .map((r) => ({
      typeId: r.destTypeId,
      destId: r.destId,
      state: r.hasActiveDraft ? 'draft' : r.hasChangeRequest ? 'changeRequest' : 'idle',
    }))
}

const STATE_TEXT: Record<DestinationState, string> = {
  changeRequest: 'a submitted change request',
  draft: 'a saved draft',
  idle: 'no change request or draft',
  any: 'any state',
}

/**
 * The destination a UI probe uses: the fixture (`E2E_RBAC_FIXTURE_DEST`,
 * default `al`) when it is in the needed state, else the first listed one
 * that is.
 */
export function uiDestination(
  listed: ListedDestination[],
  state: DestinationState
): { dest: ListedDestination } | { skip: string } {
  const fixture = process.env.E2E_RBAC_FIXTURE_DEST || 'al'
  const fits = listed.filter((d) => state === 'any' || d.state === state)
  const dest = fits.find((d) => d.destId === fixture) ?? fits[0]
  if (dest) return { dest }
  return {
    skip: listed.length
      ? `no destination this role reaches has ${STATE_TEXT[state]} (fixture: ${fixture})`
      : 'no destinations listed on /manageconnections for this role',
  }
}

export interface ProbeContext {
  own?: Destination
  foreign?: Destination
  /** Destinations /api/destinations listed outside the session's jurisdictions. */
  outOfClaim: Destination[]
  listed: ListedDestination[]
}

/**
 * The destination a probe acts on, or why there is none. Every role reaches
 * at least one destination, so an account that reaches none is broken (an
 * error), not a skip.
 */
export function resolveDestination(
  kind: DestinationKind,
  ctx: ProbeContext,
  reach: Reach
): { dest: Destination } | { skip: string } | { error: string } {
  if (kind === 'own') {
    if (ctx.own) return { dest: ctx.own }
    return { error: 'the account reaches no destination; check its jurisdictions claim' }
  }
  if (reach === 'all') return { skip: 'global reach: every destination is its own' }
  if (ctx.foreign) return { dest: ctx.foreign }
  // In CI the global-reach roles always run first, so having no foreign
  // destination means the account reaches every destination: the
  // cross-tenant checks would be lost without a trace. Locally a --grep run
  // of one jurisdiction role is normal, so it is only a skip.
  if (process.env.CI) {
    return {
      error:
        'no foreign destination: the account reaches every destination the global roles saw; give it fewer jurisdictions or set E2E_RBAC_FOREIGN_DEST',
    }
  }
  return {
    skip:
      'no foreign destination: E2E_RBAC_FOREIGN_DEST is unset or this role reaches it, and no global-reach role ran first',
  }
}

function expand(probe: ApiProbe, dest?: Destination) {
  const fill = (s: string) => (dest ? fillDest(s, dest) : s)
  const body = probe.body
    ? Object.fromEntries(
        Object.entries(probe.body).map(([k, v]) => [k, typeof v === 'string' ? fill(v) : v])
      )
    : undefined
  return { path: fill(probe.path), body }
}

export type Observation =
  | { observed: Outcome; detail: string }
  | { error: string }

/** Statuses that may come from infrastructure rather than the route. */
const UNDECIDED = new Set([408, 429, 502, 503, 504])

/**
 * Send one probe and read the gate's answer from the status code.
 *
 * Only the probe's own `refusal` status is a refusal. Anything else means
 * the gate let the request through, even if the handler then refused it:
 * 400 for an empty body, 404 for a sentinel id, 405 or 500 for an
 * unsupported method, or a handler's own 401 for a missing record behind a
 * gate that refuses with 403. A 401 can also be the session ending, which
 * decides nothing about the role, so every 401 is checked against the
 * session first. Status 0 is the middleware redirecting to sign-in.
 */
export async function observeApi(
  page: Page,
  probe: ApiProbe,
  dest?: Destination
): Promise<Observation & { target: string }> {
  const { path: url, body } = expand(probe, dest)
  const target = `${probe.method} ${url}`
  let status: number
  try {
    status = (await callApi(page, probe.method, url, body)).status
  } catch (e) {
    return { target, error: `request failed: ${(e as Error).message}` }
  }
  if (status === 0) {
    return { target, error: 'redirected to sign-in by the middleware (session or DPoP proof)' }
  }
  // Answered by a proxy, a rate limiter or a timeout, possibly before the
  // gate ran: they say nothing about the role. A plain 500 still counts as
  // past the gate, since several probes rely on a handler throwing for an
  // unsupported method.
  if (UNDECIDED.has(status)) {
    return { target, error: `HTTP ${status}: answered before authorization could decide` }
  }
  if (status === 401) {
    const session = await sessionOf(page).catch(() => undefined)
    if (!session?.signedIn) return { target, error: 'HTTP 401 and the session has ended' }
  }
  if (status === probe.refusal) return { target, observed: 'denied', detail: `HTTP ${status}` }
  if (status === 401) {
    return { target, observed: 'allowed', detail: 'HTTP 401 from the handler: the gate (403) let it through' }
  }
  if (status === 403) {
    return { target, error: 'HTTP 403, but this route refuses with 401: check the probe\'s refusal in matrix.ts' }
  }
  return { target, observed: 'allowed', detail: `HTTP ${status}` }
}

/**
 * Navigate to `url`. Returns an observation when the response already
 * decides (404 is a denial) or decides nothing (a server error, a sign-in
 * redirect); undefined when the page loaded and needs looking at.
 */
async function navigate(page: Page, url: string): Promise<Observation | undefined> {
  let status = 0
  try {
    status = (await page.goto(url, { waitUntil: 'domcontentloaded' }))?.status() ?? 0
  } catch (e) {
    return { error: `navigation failed: ${(e as Error).message}` }
  }
  if (status === 404) return { observed: 'denied', detail: 'HTTP 404' }
  if (status >= 500) return { error: `HTTP ${status}` }
  const landed = new URL(page.url())
  if (landed.pathname.startsWith('/api/auth/signin') || /okta/i.test(landed.host)) {
    return { error: `redirected to sign-in (${landed.pathname})` }
  }
  return undefined
}

/**
 * Open a page and report whether it rendered or showed the denial screen.
 * 404 counts as denied: flag-gated and reach-gated pages answer notFound.
 */
export async function observePage(page: Page, url: string): Promise<Observation> {
  const decided = await navigate(page, url)
  if (decided) return decided
  await page.waitForLoadState('networkidle', IDLE_WAIT).catch(() => {})
  // /api-doc decides on the client once the session resolves; the SSR-gated
  // pages already have the denial in their HTML.
  const denied = await page
    .getByText(DENIAL_TEXT)
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false)
  if (denied) return { observed: 'denied', detail: 'access-denied screen' }
  // A crashed page is not evidence that the role got in.
  if (await page.getByText(ERROR_TEXT).isVisible()) return { error: CRASHED }
  return { observed: 'allowed', detail: 'page rendered' }
}

/**
 * Open a page and report whether its props payload carries `probe.prop`. It
 * reads the server-rendered `__NEXT_DATA__` script, which is what any
 * signed-in browser receives, whatever the page then shows.
 */
export async function observePageData(page: Page, probe: PageDataProbe): Promise<Observation> {
  const decided = await navigate(page, probe.page)
  if (decided) return decided
  // The payload is in the HTML already, but the next API probe runs on this
  // page: until the app has installed its DPoP fetch wrapper, those calls go
  // out without a proof and the middleware redirects them to sign-in.
  await page.waitForLoadState('networkidle', IDLE_WAIT).catch(() => {})
  const size = await page.evaluate((prop) => {
    const json = document.getElementById('__NEXT_DATA__')?.textContent
    if (!json) return -1
    const value = JSON.parse(json)?.props?.pageProps?.[prop]
    if (value === null || value === undefined) return 0
    const text = JSON.stringify(value)
    return text === '{}' || text === '[]' || text === '""' ? 0 : text.length
  }, probe.prop)
  if (size < 0) return { error: 'the page sent no __NEXT_DATA__ payload' }
  return size > 0
    ? { observed: 'allowed', detail: `payload carries ${probe.prop} (${size} bytes)` }
    : { observed: 'denied', detail: `payload has no ${probe.prop}` }
}

/** The fallback `src/pages/_error.tsx` renders, also for a crashed component. */
const ERROR_TEXT = 'We ran into a problem'
const CRASHED = 'the page showed its error screen: a request it depends on failed'

// The connection table paginates on wide screens; below 992px it lists every
// row as a card, so a row's controls are always in the page.
const NARROW_VIEWPORT = { width: 900, height: 900 }

/**
 * Open a UI probe's page for `dest` and report whether its control is shown.
 * A denial screen or a 404 is a denial too. The only click is `open`, a menu.
 */
export async function observeUi(
  page: Page,
  probe: UiProbe,
  dest: Destination
): Promise<Observation & { target: string }> {
  const fill = (s: string) => fillDest(s, dest)
  const url = fill(probe.page)
  const target = `${url} ${fill(probe.control)}`
  const control = page.locator(fill(probe.control)).first()
  const denial = page.getByText(DENIAL_TEXT)
  const crashed = page.getByText(ERROR_TEXT)
  const markers = [control, denial, crashed]
  if (probe.ready) markers.push(page.locator(fill(probe.ready)))
  const loaded = markers.reduce((a, b) => a.or(b)).first()

  const wide = page.viewportSize()
  await page.setViewportSize(NARROW_VIEWPORT)
  try {
    const decided = await navigate(page, url)
    if (decided) return { target, ...decided }
    const settled = await loaded
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false)
    if (!settled) {
      return { target, error: 'the page showed neither the control, its ready marker nor the denial screen' }
    }
    if (await denial.isVisible()) return { target, observed: 'denied', detail: 'access-denied screen' }
    if (await crashed.isVisible()) return { target, error: CRASHED }
    if (probe.open) await page.locator(fill(probe.open)).first().click()
    // Parts of a page render after their own fetch (the draft button waits
    // for the draft), so give the control a moment before calling it hidden.
    await page.waitForLoadState('networkidle', IDLE_WAIT).catch(() => {})
    const shown = await control
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (probe.open) await page.keyboard.press('Escape').catch(() => {})
    return shown
      ? { target, observed: 'allowed', detail: `control shown for ${key(dest)}` }
      : { target, observed: 'denied', detail: `control hidden for ${key(dest)}` }
  } finally {
    if (wide) await page.setViewportSize(wide)
  }
}

/** The hrefs of every link in the nav drawer, read once per column. */
export async function navLinks(page: Page): Promise<Set<string>> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('#navigation #logout').waitFor({ state: 'attached', timeout: 30000 })
  await page.waitForLoadState('networkidle', IDLE_WAIT).catch(() => {})
  const hrefs = await page
    .locator('#navigation a[href]')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')))
  return new Set(hrefs.filter(Boolean))
}
