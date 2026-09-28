import accessLevel from './accesslevel'
import type { PageControls, PageKey } from './accesslevel'
import type { CcRole } from './rolemapping'
import type { AuthzSubject } from './authzsubject'
import { ANY_JURISDICTION, can, hasGlobalTenancy } from './policy'

/**
 * The shared authorization vocabulary (IGDD-3472).
 *
 * Deliberately small. The governing rule is *centralize only what has more than
 * one reader*: a page's entry capability has two (the SSR gate and the nav
 * link) and they must agree, so it lives here; an API route's capability has
 * exactly one reader, so routes declare theirs inline at the route file and
 * there is no route table here to drift from the filesystem.
 *
 * There is deliberately no `route` field, no `gate` field and no API route
 * table. The filesystem defines the route set and the coverage tests in
 * `accessregistry.test.ts` derive it from disk.
 */

/**
 * A (page, capability) pair, with the capability typed against that page's own
 * control block.
 *
 * Distributing over `PageKey` rather than writing
 * `{ page: PageKey; capability: string }` is what makes
 * `{ page: 'console', capability: 'canManageDenyList' }` a compile error.
 */
export type CapabilityRef = {
  [P in PageKey]: {
    page: P
    capability: keyof PageControls[P]
  }
}[PageKey]

/**
 * Capabilities whose data path applies **no jurisdiction filter**.
 *
 * Holding one of these is not sufficient on its own: the granting role must
 * also have global tenancy reach. These surfaces show every jurisdiction's data
 * and carry no jurisdiction in their URL, so they are authorized with
 * `ANY_JURISDICTION` — safe only while every holder is globally scoped. Without
 * this guard, granting one to a jurisdiction-scoped role would leak every other
 * tenant's data as the result of a one-line data edit. That is not
 * hypothetical: the spike review's Finding #13 queues exactly that grant for
 * `console.canViewConsole` to `Jurisdiction Support`.
 *
 * Central, and deliberately **not** a field on `CapabilityRef`: the same
 * capability is declared at more than one route, so a per-declaration flag
 * could be omitted at one of them with no diff that looks wrong. It has three
 * readers — the page gate, the route enforcer, and the invariant test in
 * `policy.test.ts` — so the same rule that centralizes `PAGE_ENTRY` applies.
 *
 * Membership follows from whether the data path filters by jurisdiction, not
 * from which page the capability sits on:
 *  - `console.canViewConsole` — the Elastic message-traffic query applies no
 *    jurisdiction filter.
 *  - all four `accesscontrol` capabilities — `fetchDenyListData()` and
 *    `fetchAccessGroups()` take no jurisdiction argument at all. The whole
 *    block, not just the entry flag: a role that should not *see* every
 *    jurisdiction's deny list should not *delete* from it either.
 *
 * `adminoperations.*` is deliberately absent — those are hub-wide operations,
 * not tenant data, so the argument for guarding them is blast radius, which is
 * a different question. `'api-doc'.canViewApiDoc` is a static spec.
 */
export const REQUIRES_GLOBAL_TENANCY: ReadonlyArray<CapabilityRef> = [
  { page: 'console', capability: 'canViewConsole' },
  { page: 'accesscontrol', capability: 'canViewAccessControl' },
  { page: 'accesscontrol', capability: 'canManageAccessGroups' },
  { page: 'accesscontrol', capability: 'canManageDenyList' },
  { page: 'accesscontrol', capability: 'canManageAdsFileTypes' },
]

/** True if `ref` names a capability over an unfiltered data path. */
export function requiresGlobalTenancy(ref: CapabilityRef): boolean {
  return REQUIRES_GLOBAL_TENANCY.some(
    (guarded) => guarded.page === ref.page && guarded.capability === ref.capability
  )
}

/**
 * Does this one role have global tenancy reach?
 *
 * The default `isGlobal` for `decideCapability`. A default rather than an
 * argument, because both enforcers were passing the same lambda verbatim — and
 * a single decision function invoked two slightly different ways at two
 * enforcement points is the drift this module exists to close. The parameter
 * stays overridable only so `policy.test.ts` can model an arrangement no
 * current role can express. Raised by review on PR #700.
 */
const roleHasGlobalTenancy = (role: CcRole): boolean =>
  hasGlobalTenancy({ roles: [role], jurisdictions: [] })

/**
 * Decide one `CapabilityRef`, with the tenancy guard applied **per role**.
 *
 * The rule this enforces is `∃r: (holds(r) ∧ reach(r))` — one role must supply
 * both halves. Never `(∃r: holds) ∧ (∃r: reach)`, which is what evaluating
 * `can(...)` and `hasGlobalTenancy(subject)` separately computes, because
 * `hasGlobalTenancy` is true if *any* held role is global.
 *
 * That difference is not cosmetic. Under the separate form, a future matrix
 * edit granting a guarded capability to a jurisdiction-scoped role would let
 * any user who *also* holds an unrelated global role read every tenant's data
 * — precisely the leak the guard exists to prevent, reintroduced by the guard's
 * own implementation. Caught in review on PR #700.
 *
 * Restricting the subject to one role per iteration is what makes the
 * conjunction role-local, and it keeps `can()` untouched: filtering first would
 * not work, because `can()` with `ANY_JURISDICTION` returns the *first* role
 * holding the capability, which may be a scoped one even when a later global
 * role would legitimately allow the request.
 */
export function decideCapability(
  subject: AuthzSubject,
  ref: CapabilityRef,
  isGlobal: (role: CcRole) => boolean = roleHasGlobalTenancy
): boolean {
  const needsGlobal = requiresGlobalTenancy(ref)
  return subject.roles.some((role) => {
    if (needsGlobal && !isGlobal(role)) return false
    return can(
      { ...subject, roles: [role] },
      ref.page,
      // See the note at the `can()` call in api-middleware-helper: CapabilityRef
      // is a union distributed over PageKey, and the page/capability
      // correlation cannot survive being passed as two arguments.
      ref.capability as never,
      ANY_JURISDICTION
    ).allowed
  })
}

/**
 * The capability that gates entry to each page.
 *
 * Exists so the server-side page gate and the navigation-visibility predicate
 * cannot resolve to different flags. That drift is live today: `Home` shows the
 * "OUR API" button to `isOperationsRole` (IZG Operations **and** IZG Support)
 * while `AdminGuard` admits IZG Operations only, so IZG Support sees a link to
 * a page that rejects them. Eleven lines makes that unrepresentable.
 *
 * The mapped type over `PageKey` means **adding a page key without an entry
 * capability is a compile error**, and naming a capability that does not exist
 * on that page's block is too.
 *
 * Listing a page here does **not** gate it. `edit`, `history`, `test` and
 * `changerequest` appear only because the mapped type requires every key; their
 * page files do not call `withPageAccess`, so they carry an `AUTHZ_DEBT` row of
 * kind `ungated-page`. Their entries are inert until someone adds the gate, at
 * which point the capability is already agreed.
 */
export const PAGE_ENTRY: { [K in PageKey]: keyof PageControls[K] } = {
  manageconnections: 'canViewConnections',
  accesscontrol: 'canViewAccessControl',
  adminoperations: 'canViewAdminOperations',
  console: 'canViewConsole',
  'api-doc': 'canViewApiDoc',
  onboarding: 'canViewOnboarding',
  apikeys: 'canListApiKeys',
  test: 'canRunConnectionTest',
  edit: 'canChangeCredentials',
  history: 'canViewConnectionInfo',
  changerequest: 'canViewDetails',
}

/** The `CapabilityRef` that gates entry to `page`. */
export function entryCapabilityOf<P extends PageKey>(page: P): CapabilityRef {
  return { page, capability: PAGE_ENTRY[page] } as CapabilityRef
}

/**
 * Is this page's entry capability held by any of these roles?
 *
 * The navigation-visibility predicate — what decides whether a nav link or a
 * landing-page button renders. It lives here, beside `PAGE_ENTRY` and
 * `decideCapability`, and not in `Navigation/menuItems.tsx` where it was first
 * written: it is a pure authorization question with no JSX, and while it lived
 * in the menu module any other surface needing it had to import the whole menu
 * (as `Home` did) or re-implement the check — and re-implementation is exactly
 * how the `AdminGuard` / `isOperationsRole` divergence this change removes came
 * about. Raised by review on PR #700.
 *
 * It routes through `decideCapability`, so a link and the page it points at run
 * the *same* decision, tenancy guard included. Reading `accessLevel` directly —
 * as the first version did — skipped the guard, so for the five capabilities in
 * `REQUIRES_GLOBAL_TENANCY` a link could render for a role the page gate then
 * rejects. Not reachable today, because the derived invariant in
 * `policy.test.ts` keeps every guarded capability inside globally-scoped roles;
 * but it made this a third implementation of a rule that is meant to have one.
 *
 * Jurisdictions are empty because page entry is decided with
 * `ANY_JURISDICTION`: these surfaces carry no jurisdiction, and `scopeAllows`
 * short-circuits on it before the prefix list is consulted.
 */
export function canEnterPage(
  page: PageKey,
  roles: string[] | undefined
): boolean {
  const subject: AuthzSubject = {
    // Same defence-in-depth filter `subjectOf` applies: a role with no matrix
    // entry never reaches the policy.
    roles: (roles ?? []).filter((role): role is CcRole => role in accessLevel),
    jurisdictions: [],
  }
  return decideCapability(subject, entryCapabilityOf(page))
}

/**
 * Derive a page key from a Next.js pathname.
 *
 * Extracted from the inline expression that used to live in `useRoleAccess` so
 * it is testable rather than duplicated, and so the invariant *page key === key
 * derived from that page's route* can be asserted for every `PAGE_ENTRY` key.
 * This is why the api-doc key is `'api-doc'` and not `'apidoc'`.
 *
 * A pathname with no matching page block (e.g. `/`) yields a string that is not
 * a `PageKey`; callers treat that as deny-by-default rather than an error.
 */
export function derivePageKey(pathname: string): string {
  return pathname.replace(/\[.*?\]/g, '').replaceAll('/', '')
}
