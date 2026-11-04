## Why

Five admin surfaces in CC are reachable by any authenticated session, regardless of role.

Three pages — `/accesscontrol`, `/console`, `/passwordencryption` — have **no access check at
all**. Their nav entries are hidden from non-admins, so they look protected; typing the URL
renders them. Two more — `/adminoperations` and `/api-doc` — are guarded only by `AdminGuard`, a
client-side `useEffect` redirect that fires after the page has already rendered. Inside Access
Control, the deny-list and ADS-file-type controls hide on `isAdmin`, but the access-group
add/edit/delete controls have no gate whatsoever.

The API routes behind them are worse, because nothing hides them at all: `POST /api/rotatekey`
(rotates the database encryption key) and `POST /api/encrypt` are reachable by **any**
authenticated session today and return `200`. `POST /api/maintenance/update/[...slug]` has no
session, capability, or tenancy check of any kind.

**`/onboarding` has the same shape, and its write endpoint is open.** The page checks session
presence and no capability, so any authenticated user reaches it by URL — `canViewOnboarding`
gates only the nav entry. All three routes behind it sit behind `withMiddleware('captureErrors')`,
which adds error capture and no authorization, so **adding, editing and deleting senders is
reachable by any authenticated session**, `Sender Operations` included. This is the spike
review's Finding #5; the page and all three routes are gated here on the capability that
already exists, and the view-vs-mutate split stays with that ticket (`design.md` Decision 14).

One more, found while counting the route files for this change and not previously tracked:
**`src/pages/api/api-middleware-helper.ts` is itself a route.** It lives in the API tree, ends in
`export default withMiddleware`, and no `pageExtensions` setting excludes it — so Next serves it
at `/api/api-middleware-helper`. A request there calls `withMiddleware(req, res)`, which treats
the request and response as middleware names, returns a wrapper function, and never sends a
response; the request resolves without a reply.

**Severity, stated accurately:** `src/middleware.ts` stands in front of it. `withAuth` redirects
an unauthenticated request to sign-in, and DPoP enforcement redirects any `/api/*` request with
no `x-dpop-proof` header — which address-bar navigation never has, because the proof is attached
by the `window.fetch` interceptor in `_app.tsx`. The handler is therefore reachable only by an
in-app fetch, and nothing fetches it. This is a latent defect that defence in depth is currently
absorbing, not a live unauthenticated endpoint. It still belongs in this change: a module in the
route tree is one `pageExtensions` or middleware-matcher change away from being served for real,
and the coverage test would have false-passed it.

The shared root cause is that CC has an excellent *decision* layer and no *enforcement* layer.
`can()`, `mergePageAccess()` and `subjectOf()` (`policy.ts`, from `multi-role-permissions`) are
centralized, pure and well-tested — and 13 of the 31 declared permission slots are read by no
code at all. Meanwhile a new file under `src/pages/` is live and reachable with zero further
edits, and `withMiddleware()` called with no arguments adds *only* request logging while looking
protected. Adding a guard has always been an act of memory, and memory is what failed.

IGDD-3472 is the security-labelled, High-priority ticket covering this. Its success criteria are
explicit: hitting a URL you lack access to must show **a message in the UI** and write **an audit
log entry**. The ticket asks for infrastructure rather than one-off guards — *"Infrastructure is
needed for these pages and permissions within the page (ex. can view the page, but can't add
items or edit items)… This ticket does not handle the new roles that are anticipated, but shall
support that new role model when it is known."*

**Scope note.** The requirement is that *every* Configuration Console page is permission-gated —
users see only what they are allowed. This change covers the surfaces with live holes and builds
the mechanism that makes the rest cheap: `PAGE_ENTRY` names an entry capability for 10 of the 11
page keys, so most remaining pages need one line each. That second increment is deliberately
sequenced after this one and costed in `design.md` under "The deferred increment". It is **not**
out of scope, and the coverage-test allowlist entries say so rather than implying exclusion.

## What Changes

- **Four new page blocks, ten new flags** (`accesscontrol`, `adminoperations`, `console`,
  `'api-doc'`) added to `PageControls`. Granularity rule: one flag per page entry, plus one flag
  per independently-mutable resource — deliberately not a view/create/update/delete quartet.
  Because `PageControls` is a required-key type, adding these blocks is a compile error in all
  five role files until each declares a value.

- **One shared vocabulary, `PAGE_ENTRY`** — an 11-line map from page key to the capability that
  gates entry to it, in a new `src/lib/security/accessregistry.ts` alongside a `CapabilityRef`
  type and a `derivePageKey` helper extracted from `useRoleAccess`. It exists because a page's
  entry capability has several readers that must agree — the SSR gate, the nav link, and
  sometimes a landing-page button — and that drift is live today. `/api-doc` is read three
  independent ways: `Home/index.tsx:132` shows the "OUR API" button to IZG Operations *and* IZG
  Support, while `AdminGuard` and `Navigation/index.tsx:249` admit IZG Operations only. IZG
  Support sees a button to a page that rejects them. All three become `PAGE_ENTRY['api-doc']`,
  which costs IZG Support that button — the one visible behaviour change on the landing page.

- **Enforcer 1, pages: `withPageAccess(pageKey)`** — a `getServerSideProps` wrapper that wraps
  (not sits beside) the existing `withRequestContext`, calls `can()`, and on denial returns
  `{ props: { accessDenied: true } }` plus one audit event. Five pages become SSR-gated — the
  four admin pages plus `/onboarding`.

- **Enforcer 2, routes: the first argument of `withMiddleware` becomes a required `RouteAuthz`.**
  Every one of the 41 API route files declares its own authorization inline — `{ capability }`,
  `{ byMethod }`, `{ session: true }`, `{ inHandler: 'IGDD-xxxx: …' }` or `{ public: 'reason' }`.
  A wrapper call with no declaration stops compiling.

- **A denial renders rather than redirects**: new `src/components/AccessDenied.tsx`. In-page
  action visibility reuses the existing `useRoleAccess` hook, extended with an optional explicit
  page key — backward compatible, so its seven current consumers are untouched, and callers that
  pass a key get a properly typed result instead of the cast they use today.

- **Two coverage tests are the actual guarantee**: every file under `src/pages/` either calls
  `withPageAccess` or sits in an explicit allowlist with a reason; every file under
  `src/pages/api/` calls `withMiddleware`. TypeScript has no view of the filesystem-as-router, so
  nothing else can force a *new* file to call anything — and two route files bypass the wrapper
  today, which is exactly the shape the next one will take.

- **`api-middleware-helper.ts` moves out of the route tree** to `src/lib/api/`, so the module
  that defines route authorization stops being an unauthenticated route itself. Nearly free to
  do now — all 37 importers are already being edited for the `RouteAuthz` argument — and a
  standalone 38-file diff at any other time.

- **`AdminGuard.tsx` is deleted** in the same commit as its last consumer, and thirteen `isAdmin`
  call sites are migrated to matrix flags — eleven as a side effect of the gates above, plus two
  taken deliberately because they are free: the change-request deploy route maps 1:1 onto the
  existing `changerequest.canDeployChange`, and `allowedusers/bydestination` already computes
  from roles and merely names its local variable `isAdmin`. The deploy route carries the same
  no-response defect as the middleware helper — `if (session.user.isAdmin)` with no `else`, so a
  non-admin `GET` gets no reply at all — which the declaration fixes structurally. `isAdmin`
  itself stays; see `design.md` Decision 10 for what is deliberately left and why.

- **`AccessDeniedEvent` gains three optional fields**, `deniedAt: 'page' | 'api'`, `page` and
  `permissionAnyOf`, so page denials are queryable in Elastic without breaking the five existing
  call sites. `permissionAnyOf` is set **instead of** `permission` when an any-of rule rejects a
  caller who held none of its alternatives — naming one of several would tell an operator to grant
  a capability that is not the only answer, and `/api/organizations`, the one any-of rule in the
  codebase, spans three different page blocks so `page` would be arbitrary too.

## Capabilities

### New Capabilities

- `page-authorization`: The *mechanism*. Where a page or API route declares its authorization,
  what enforces the declaration, what a denied request does and logs, and the contract for adding
  a page, a capability, or a role. Should not churn when the role matrix changes.
- `admin-page-access`: The *values*. Which capabilities exist for the four admin page blocks, who
  holds them today, why those seeds reproduce current access rather than the target matrix, and
  the mapping from target-matrix rows to `page.capability` pairs. Expected to churn when the
  matrix is ratified, which is why it is kept separate.

### Modified Capabilities

None. No spec in `openspec/specs/` states requirements about page gating or route authorization.
`multi-role-authorization` and `okta-group-ingestion` (from `multi-role-permissions`) are not yet
archived to `openspec/specs/`; this change builds on their mechanisms — `can()`, `subjectOf()`,
the access matrix, the per-role escalation guard — without altering any of their requirements.
`destination-circuit-breaker-reset` specifies the per-destination reset at
`/api/status/reset/[...slug]`; this change adds a *separate* flag for the hub-wide reset at
`/api/status/reset` and deliberately does not reuse or widen the per-destination one.

## Impact

**This is a security-boundary change, and the boundary only ever narrows.** No role gains access
it does not have today. The decision layer is not touched: `can()`, `mergePageAccess()` and
`subjectOf()` are unchanged and already generic over the role set. All new work is enforcement
and matrix data.

**Affected code** (~60 files):

- New: `src/lib/security/accessregistry.ts`, `src/lib/security/pageAccessGate.ts`,
  `src/components/AccessDenied.tsx`, `src/lib/security/accessregistry.test.ts`, three suites
  under `src/__tests__/pages/`
- Extended: `src/lib/security/useRoleAccess.ts` (optional explicit page key)
- Matrix: `src/lib/type/PageAccessControls.ts`, `src/lib/security/accesslevel.ts`,
  `src/lib/security/accessdefinitions/defaultaccesslevels.ts` and all five role files
- Routes: the middleware helper (signature change, and relocated to `src/lib/api/`) and all 41
  route files — 15 mechanical one-line declarations, 24 carrying real capability decisions. Two
  of the 39 (`swaggerjson.ts`, `changerequeststatus/[id].tsx`) bypass the wrapper today and must
  be wrapped; the compiler will *not* flag those. The API tree holds 43 files: 41 routes, the
  two next-auth routes that legitimately do not use the wrapper, and the helper.
- Pages: `accesscontrol`, `console`, `adminoperations`, `passwordencryption`, `onboarding`,
  `api-doc`
- Components: `AccessControl/{index,DenyList,FileTypeList,AccessGroups}.tsx`,
  `AdminOperations/*`, `Console/index.tsx`, `PasswordEncryptionConsole/index.tsx`,
  `Navigation/{index,menuItems}.tsx`, `Home/index.tsx` (the "OUR API" button),
  `lib/security/accessutils.ts` (doc comment only)
- Deleted: `src/components/AdminGuard.tsx`

**Access that actually changes.** Two things, both narrowing:

- `/api/maintenance/update/[...slug]` is the only *route* whose effective audience narrows for a
  role that uses it today — it gains both a capability check and the tenancy check it has never
  had.
- IZG Support loses the "OUR API" button on the landing page, where it currently leads to a page
  that rejects them.

Everything else either closes a hole nobody was intentionally using (direct-URL admin page
access, `rotatekey`/`encrypt`, `/api/api-middleware-helper`) or writes down the status quo.

**Role→permission values are provisional and say so.** The Confluence RBAC matrix (page
22184643 v49) has rows only for `/manageconnections`, `/edit`, `/changerequest`, `/history` and
`/test` — nothing for any admin page. The product owner's position is that *"the matrix is not
decided but main purpose to restrict the pages to permissions that will be defined later."* A
**target** matrix now exists (Keith + Anusha spike review, "Part 4 — Combined Matrix") covering
every admin page, but most of its admin rows are held by roles that do not exist yet. Seeds here
reproduce today's `isAdmin`-only access so that flipping them later is a pure data edit. See
`design.md` for the row-by-row reconciliation and why the one real conflict (Finding #14, which
*grants* IZG Support three capabilities) is deferred to its own ticket.

**No Okta tenant change.** `OPERATIONS_GROUP` must equal the group mapped to `IZG Operations` in
every environment for the "no behaviour change" claim to hold — that is a release-checklist item,
not a code change.

**No runtime kill switch, deliberately.** Unlike API Key Management's `apiKeyManagementEnabled`
flag (IGDD-3444), seeds live in code and a bad grant cannot be reverted without a redeploy. An
off switch on an authorization gate is an authorization bypass with a flag on it. See
`design.md`.
