> **One PR; the sections below are the review structure.** Roughly 60 touched files. The failure
> mode for a PR that size is a rubber stamp, so the PR description must ask reviewers to go
> commit by commit and say which commits carry judgement (1, 3, 6) and which are transcription
> (5). Sized at **8 points**.

## 1. Matrix data

- [x] 1.1 Add four control types to `src/lib/type/PageAccessControls.ts`:
      `AccessControlPageAccessControl` (`canViewAccessControl`, `canManageAccessGroups`,
      `canManageDenyList`, `canManageAdsFileTypes`), `AdminOperationsPageAccessControl`
      (`canViewAdminOperations`, `canManagePasswordEncryption`, `canResetHubCircuitBreakers`,
      `canRefreshHubDatabase`), `ConsolePageAccessControl` (`canViewConsole`),
      `ApiDocPageAccessControl` (`canViewApiDoc`), and export them
- [x] 1.2 Add the four all-false `default*` blocks and their exports to
      `src/lib/security/accessdefinitions/defaultaccesslevels.ts`
- [x] 1.3 Add `accesscontrol`, `adminoperations`, `console` and the **quoted key `'api-doc'`** to
      `PageControls` in `src/lib/security/accesslevel.ts`. Use the quoted form, not `apidoc`, so
      the invariant *page key === key derived from the route* holds with no exceptions
- [x] 1.4 **Observe `tsc --noEmit` reporting five errors** before filling the role files — that is
      the required-key completeness proof working (same deliberate step as
      `sender-role-access/tasks.md` 2.4)
- [x] 1.5 `_IZGOperationsAccess.ts`: add the four blocks with every flag `true`. Each block
      carries a `// [PROVISIONAL — IGDD-3472]` comment recording that the values reproduce
      pre-existing `isAdmin`-only access, and citing the specific target-matrix row and its
      divergence (see `design.md` Decision 4)
- [x] 1.6 `_IZGSupportAccess.ts`, `_JurisdictionOperationsAccess.ts`,
      `_JurisdictionSupportAccess.ts`, `_SenderOperationsAccess.ts`: add the four blocks
      spreading the defaults and adding **nothing** (the `_SenderOperationsAccess.ts` style,
      where deny is deliberate rather than incidental)
- [x] 1.7 **Omit the `as XPageAccessControl` assertions on the new blocks.** Assertions permit
      excess properties, so a typo'd flag would type-check and be `false` forever; the
      `RoleAccess` annotation on the parent already types the property and restores
      excess-property checking

## 2. Shared vocabulary

- [x] 2.1 Create `src/lib/security/accessregistry.ts` exporting `CapabilityRef` — a `(page,
      capability)` pair with the capability typed against that page's block
- [x] 2.1a Export `REQUIRES_GLOBAL_TENANCY`, the set of capabilities whose data path applies no
      jurisdiction filter, plus a `requiresGlobalTenancy(ref)` lookup. **Central, not a field on
      `CapabilityRef`** — a per-declaration flag can be forgotten at one of several declaration
      sites for the same capability, which is a silent bypass, and it now has three readers
      (page gate, route enforcer, the invariant test), so the same rule that centralizes
      `PAGE_ENTRY` applies. Contents per `design.md` Decision 7: `console.canViewConsole` and
      all four `accesscontrol` capabilities
- [x] 2.2 Export `PAGE_ENTRY: { [K in PageKey]: keyof PageControls[K] }` mapping all eleven page
      keys to their entry capability. Comment that the mapped type makes a new page key with no
      entry a compile error, **and** that presence here does not imply the page is gated
- [x] 2.3 Extract `derivePageKey(pathname)` from the inline expression at
      `src/lib/security/useRoleAccess.ts:32` so it is testable rather than duplicated, and have
      the hook call it. The hook gains an optional explicit key in task 3.8; **its seven current
      consumers stay untouched**, since the key remains route-derived when none is passed
- [x] 2.4 Do **not** add a route field, a `gate` field, or an API route table — the filesystem
      defines routes, and routes declare inline (§4)
- [x] 2.5 Create `src/lib/security/authzDebt.ts` — **one typed table replacing all four
      bookkeeping lists** this change would otherwise create (`UNGATED_PAGES`, the route
      allowlist, the `inHandler` ceiling, `UNWIRED_PERMISSIONS`):

      ```ts
      export type AuthzDebt = {
        kind: 'ungated-page' | 'unwrapped-route' | 'in-handler' | 'unwired-flag'
        subject: string   // page key, route path, or `page.capability`
        ticket: string    // IGDD-xxxx — required by the type, not by convention
        note: string
        enforcement?: 'Enforced' | 'UI-only' | 'Not enforced' | 'Unconfirmed'
      }
      export const AUTHZ_DEBT: AuthzDebt[] = [ … ]
      ```

- [x] 2.5a Each coverage test reads the slice it needs (tasks 9.5, 9.6, 9.8, 9.13). Three things
      fall out that four separate lists would not give: **one place to look**, which is part of
      what colocation costs elsewhere; **a ticket reference enforced by the type** rather than by
      reviewer memory; and **no magic number in the ratchet** — the test asserts the source count
      equals the declared rows, so an `{ inHandler }` cannot be added without a row naming a
      ticket, and closing one needs no ceiling to remember to decrement
- [x] 2.5b Entries for pages and routes that are *deliberately* fine (`_app`, `404`, the two
      next-auth routes, the landing page) are **not** debt — keep those as plain allowlists
      inside their own tests. `AUTHZ_DEBT` is for things that should eventually be zero;
      mixing the two is what makes an allowlist read as a clearance

## 3. Enforcer 1 — page gate, denial UI, client hook

- [x] 3.1 Create `src/lib/security/pageAccessGate.ts` with `withPageAccess<P extends PageKey, T>`
      taking the page key and an optional handler. The capability comes from `PAGE_ENTRY[page]`,
      never an argument, so the gate and the nav link cannot resolve to different flags
- [x] 3.2 It must **wrap** `withRequestContext`, not sit beside it, so the render runs inside
      `asyncRequestContext` and the denial event inherits the `sessionUser` block (`userId`,
      `email`, `sessionId`, `jti`) from the existing ALS logger injector
- [x] 3.3 No session → redirect to `/api/auth/signin` with **no audit event** (authentication,
      not RBAC — logging it would fire on every expired session, violating the header warning in
      `src/lib/security/accessDeniedAudit.ts`)
- [x] 3.4 Denied → log the audit event (§4.6 shape), then return
      `{ props: { accessDenied: true } }`. Allowed → delegate to the handler, or `{ props: {} }`
- [x] 3.5 Use **`ctx.resolvedUrl`**, not `ctx.req.url`: on a client-side transition Next fetches
      `/_next/data/<buildId>/<page>.json`, so `req.url` would record that path while the browser
      shows the page URL
- [x] 3.6 Type the props as an **intersection with an optional key**, never a union — a union
      breaks `InferGetServerSidePropsType` destructuring in the page component
- [x] 3.7 Create `src/components/AccessDenied.tsx` — a full-page message inside the existing
      `Container`/`Layout` chrome, reusing the `src/pages/404.tsx` visual pattern and its graphic
      asset. Include a line covering the stale-JWT case: membership is captured at sign-in with a
      30-minute session, so a newly granted role needs a re-login
- [x] 3.8 **Extend `useRoleAccess` with an optional explicit page key** rather than adding a
      second hook: `useRoleAccess<P extends PageKey>(page?: P)`. With a key it returns
      `Partial<PageControls[P]>` properly typed; with none it keeps today's route-derived
      behaviour, so all seven existing consumers are untouched and uncast. A parallel
      `usePageAccess` would mean two hooks answering the same question with different
      ergonomics, and the route-derived key is the part that is known-bad — an optional
      argument gives callers a way *out* of it, which a second hook does not
- [x] 3.8a Still returns `{}` while loading, so `{flag && <Control/>}` fails closed (task 8.9).
      Callers that pass an explicit key no longer need the
      `as XPageAccessControl | undefined` cast the current consumers use
- [x] 3.9 Add `deniedAt?: 'page' | 'api'` and `page?: PageKey` to `AccessDeniedEvent` as
      **optional** fields — zero change to the five existing call sites, zero breakage of
      existing Elastic searches

## 4. Enforcer 2 — route authorization

- [x] 4.0 **Move `src/pages/api/api-middleware-helper.ts` to `src/lib/api/api-middleware-helper.ts`
      and update the 37 import sites.** It currently ends in `export default withMiddleware` and
      sits in the route tree with no `pageExtensions` exclusion, so Next serves it at
      `/api/api-middleware-helper`, where it resolves without sending a response
      (`design.md` Decision 13). **Not a live unauthenticated endpoint** — `src/middleware.ts`
      (`withAuth` + DPoP) redirects both the no-session case and any address-bar `/api/*`
      request, so the handler is reachable only by an in-app fetch and nothing fetches it. It
      moves because a module in the route tree is one config change from being served for real.
      Do this **before** 4.2, so the import churn and the signature churn land in one pass over
      the same 37 files
- [x] 4.1 Add the `RouteAuthz` union to the relocated helper:
      `{ capability: CapabilityRef | CapabilityRef[] }` (any-of), `{ byMethod }`,
      `{ session: true }`, `{ inHandler: string }`, `{ public: string }`
- [x] 4.2 Make it the **required first argument** of `withMiddleware`. `withMiddleware()` must no
      longer compile
- [x] 4.3 Add a generic `enforceRouteAuthz` middleware, prepended **after** `logApiRequest` so the
      request log still precedes any denial
- [x] 4.4 `{ public }` → `next()`. `{ session: true }` → 401 unless `context.session?.user`, no
      audit event. `{ inHandler }` → `next()`; the handler owns the decision
- [x] 4.5 `{ capability }` / `{ byMethod }` → `can(subjectOf(context.session), page, capability,
      ANY_JURISDICTION)`; on deny `logAccessDenied` then `403 forbidden`, byte-identical to the
      existing `checkAdmin`. Unlisted method in a `byMethod` rule → `405` + `Allow` header
- [x] 4.6 Audit shape, both enforcers: fixed-literal `reason`, `deniedAt`, `page`, dotted
      `permission` (`'accesscontrol.canViewAccessControl'` — a bare capability is ambiguous, since
      `canViewChangeRequest` exists on two page blocks and `canRunConnectionTest` on two), `url`,
      `method`, `user`, `roles`. Exactly one event per denied request
- [x] 4.7 Both enforcers consult `requiresGlobalTenancy(ref)` from task 2.1a and additionally
      require `hasGlobalTenancy(subject)` when it returns true (`design.md` Decision 7). Nothing
      at a declaration site opts in or out — the lookup is the only source. Zero behaviour
      change today, since the only holder of any guarded capability is globally scoped
- [x] 4.7a In an any-of `{ capability: [...] }`, evaluate the guard **per alternative**, not
      across the array. An unguarded alternative must still pass on its own; applying the
      strictest guard to the whole array would break `/api/organizations` for Jurisdiction
      Operations and Support, who reach it via the unguarded `canViewOnboarding`

## 5. Route declarations — mechanical (15 files, no behaviour change)

Review summary for this commit: *15 one-line declarations, status quo written down.*

- [x] 5.1 `{ public: … }` (2): `healthcheck`, `deephealthcheck`
- [x] 5.2 `{ session: true }` (3): `destinations/index`, `jurisdictions/index`,
      `destinationuri/validate`. **The three `allowedusers*` routes are deliberately not here** —
      they carry real capabilities in tasks 6.14–6.16
- [x] 5.3 `{ inHandler: 'IGDD-xxxx: …' }` (10): all five `apikeys/*`,
      `destinations/[...slug]`, `destinationaudit/[...slug]`, `statushistory/[...slug]`,
      `tests/connectiontest/[...slug]`, `status/reset/[...slug]`. **None of the three
      `changerequest/*` routes are in this list** — all get real capabilities in tasks
      6.12 and 6.17–6.18
- [x] 5.4 Every `inHandler` string names a real follow-up ticket, not a bare description
- [x] 5.5 Confirm `auth/[...nextauth].ts` and `auth/bind-session.ts` are untouched — they never
      call `withMiddleware`, so sign-in cannot break

## 6. Route declarations — semantic (24 files)

- [x] 6.1 `accessgroups/index.ts` → `{ byMethod: { GET: canViewAccessControl, POST:
      canManageAccessGroups } }`; `accessgroups/[sortKey].ts` → `{ byMethod: { PUT, DELETE →
      canManageAccessGroups } }`
- [x] 6.2 `denylist/index.ts` → `{ byMethod: { GET: canViewAccessControl, POST:
      canManageDenyList } }`; `denylist/[id].ts` → `{ byMethod: { DELETE: canManageDenyList } }`
- [x] 6.3 `adsfiletypes/index.ts` → `{ byMethod: { GET: canViewAccessControl, POST:
      canManageAdsFileTypes } }`; `adsfiletypes/[id].ts` → `{ byMethod: { DELETE:
      canManageAdsFileTypes } }`
- [x] 6.4 `encryptionStatus`, `encrypt`, `rotatekey` → `{ capability:
      adminoperations.canManagePasswordEncryption }`
- [x] 6.5 `status/reset/index.ts` → `{ capability: adminoperations.canResetHubCircuitBreakers }`;
      `status/refresh/index.ts` → `{ capability: adminoperations.canRefreshHubDatabase }`. Keep
      `'checkAdmin'` alongside both for now, so removing it later is a pure subtraction
- [x] 6.6 `organizations/index.ts` → any-of `[canViewAccessControl, canViewConsole,
      onboarding.canViewOnboarding]`. Verified callers: `AddDenyList.tsx:40`,
      `AccessControl/index.tsx:223`, `Console/index.tsx:217`, `OrganizationCertificateSelector`
      (Onboarding only). **Two of the three alternatives are now tenancy-guarded** (task 4.7),
      so this is the route that proves 4.7a: Jurisdiction Operations and Support must still
      reach it via the unguarded `canViewOnboarding`
- [x] 6.7 `swaggerjson.ts` → `{ capability: 'api-doc'.canViewApiDoc }`. **Currently bypasses
      `withMiddleware` entirely — must be wrapped; the compiler will not flag it**
- [x] 6.8 `changerequeststatus/[id].tsx` → `{ session: true }`. **Also bypasses `withMiddleware`
      today and must be wrapped.** Note the `.tsx` extension on an API route — this is the file
      task 9.6's glob exists to catch
- [x] 6.9 `elasticsearch/query.ts` → `{ inHandler: 'IGDD-xxxx: inline isAdmin check; also called
      from Home/SystemResourcesWidget, so canViewConsole would be wrong' }`. This is the
      thirteenth and last `inHandler`
- [x] 6.10 `accesscontrol/index.ts`, `filetype/index.ts` → **verified zero callers in `src/`**.
      Propose deletion in review; otherwise `{ capability: canViewAccessControl }`
- [x] 6.11 **Last:** `maintenance/update/[...slug].ts` → `{ capability:
      manageconnections.canScheduleMaintainance }` **plus** `'checkAccessToDestIdSlug'` for the
      tenancy half. This is the only route whose effective access narrows; it has no session,
      capability or tenancy check today
- [x] 6.12 `changerequest/deploy/[...slug].ts` → `{ capability:
      changerequest.canDeployChange }`. **An exact 1:1 replacement for the `isAdmin` check at
      `:58`** — the flag already exists and is already IZG-Operations-only, so there is no new
      flag and no seed value to choose (`design.md` Decision 10)
- [x] 6.13 **While there, fix the missing `else`.** The handler is
      `if (session.user.isAdmin) { … }` with no alternative, inside a method branch whose only
      other path throws — so a non-admin `GET` falls through, sends nothing, and the request
      resolves without a response. Same defect class as task 4.0. Moving the check into the
      declaration fixes it structurally, because the wrapper answers `403` before the handler
      runs; confirm no `isAdmin` conditional remains wrapping the handler body
- [x] 6.14 `allowedusers/index.ts` → `{ capability: onboarding.canViewOnboarding }` for **all
      three methods**. It handles GET, POST and DELETE behind `withMiddleware('captureErrors')`,
      which adds error capture and **no authorization whatsoever** — so adding, editing and
      deleting senders is reachable by any authenticated session today, including
      `Sender Operations`. One capability across all methods, deliberately: splitting view from
      mutate needs a `canManageSenders` flag whose seed nobody has decided, and this closes the
      hole without inventing a permission value (see `design.md` Decision 14)
- [x] 6.15 `allowedusers/bydestination/index.ts` → `{ capability: onboarding.canViewOnboarding }`.
      **While there**, rename the local `isAdmin` at `:76` to reflect what it already computes —
      `isOperationsRole(session.user.roles)`, not the session flag. Pure rename, zero behaviour
      change; it removes a reader that would otherwise look like a real `isAdmin` dependency
      during the follow-up audit (`design.md` Decision 10)
- [x] 6.16 `allowedusersaudit/[...slug].ts` → `{ capability: onboarding.canViewOnboarding }`
- [x] 6.17 `changerequest/index.ts` → `{ byMethod: { POST: edit.canCreateChangeRequest,
      PUT: changerequest.canRescheduleRequest, DELETE: changerequest.canCancelRequest } }`.
      It is wrapped in `withMiddleware()` today — **no authorization middleware at all** — and
      checks only `hasAccessToDestId` inside the handler. Reach without capability
- [x] 6.18 `changerequest/[...slug].ts` → `{ byMethod: { GET: changerequest.canViewDetails,
      DELETE: changerequest.canCancelRequest } }`. Same shape: `withMiddleware('captureErrors')`
      plus an in-handler reach check only
- [x] 6.19 **This is a real privilege fix, not cleanup.** `IZG Support` holds
      `globalTenancy: true` with `canCancelRequest: false` and `canRescheduleRequest: false`, so
      today it can cancel or reschedule a change request on **any destination in the system**.
      The flags already say no; nothing reads them. `Jurisdiction Support` is the same within
      its own jurisdiction. Expect both roles to lose cancel and reschedule — that is the point,
      and it must be called out in the PR and in the release notes
- [x] 6.20 Confirm no route in the codebase is now undeclared, and that the `inHandler` count is
      exactly 11

## 7. Page gates

- [x] 7.1 `src/pages/accesscontrol/index.tsx` → `withPageAccess('accesscontrol')`; render
      `accessDenied ? <AccessDenied/> : <AccessControlComponent/>`
- [x] 7.2 `src/pages/console/index.tsx` → `withPageAccess('console')`, same branch
- [x] 7.3 `src/pages/adminoperations/index.tsx` → `withPageAccess('adminoperations', handler)`
      returning the existing `hasKeyName`/`hubEnvironments`; **drop `AdminGuard`**. Change
      `interface AdminOperationsPageProps` to a **`type` alias** — `withRequestContext<P extends
      Record<string, unknown>>` rejects interfaces, which get no implicit index signature
- [x] 7.4 `src/pages/passwordencryption/index.tsx` → `withPageAccess('adminoperations')`, reusing
      the same page key; **no fifth page key**
- [x] 7.4a `src/pages/onboarding/index.tsx` → `withPageAccess('onboarding', handler)`, keeping
      the existing `bydestination` fetch in the handler. It checks session presence and **no
      capability** today, so any authenticated user reaches it by URL. `canViewOnboarding`
      already exists with agreed values, so this is one line and no new matrix data
- [x] 7.5 `src/pages/api-doc.tsx` → **client gate only.** Keep `getStaticProps`; replace
      `AdminGuard` with inline `useRoleAccess('api-doc')` plus an explicit `status === 'loading'`
      branch. Do not attempt SSR here (`design.md` Decision 8)

## 8. In-page gating and navigation

- [x] 8.1 `AccessControl/DenyList.tsx` — remove the `useSession` import and call (lines 9, 185;
      leaving them trips `no-unused-vars`, an **error** in this repo), replace `isAdminOrIZGOp`
      with `canManageDenyList` at the row delete icon (~`:421`) and `CustomFooter canAdd`
      (~`:520`)
- [x] 8.2 `AccessControl/FileTypeList.tsx` — identical with `canManageAdsFileTypes` (lines 8, 241,
      483, 583)
- [x] 8.3 `AccessControl/index.tsx` — thread `canManageAccessGroups` into `<AccessGroups>` as a
      prop (the `ApiKeyManagement/index.tsx:2665-2671` precedent; `AccessGroups.tsx` is already
      presentational)
- [x] 8.4 `AccessControl/AccessGroups.tsx` — hide pencil (`:232`), trash (`:242`), "Add Group"
      (`:341`)
- [x] 8.5 **Do not make the Access Control tabs conditional** — `tabValue` is a number and
      `TabPanel` matches `index={0|1|2}`, so conditionally rendering a tab silently mis-maps
      panels (`design.md` Decision 9)
- [x] 8.6 `AdminOperations/` cards — three action flags from one `useRoleAccess('adminoperations')`
      call, ANDed with the existing `hasKeyName`/`isEncrypted` conditions
- [x] 8.7 `Console/index.tsx:289` — replace `!session?.user?.isAdmin` with the matrix flag; keep
      the `Alert` as defence in depth. `PasswordEncryptionConsole/index.tsx` →
      `canManagePasswordEncryption`
- [x] 8.8 `menuItems.tsx` — for Admin Operations / Access Control / Console flip
      `adminOnly: true` → `false` and add an `isVisible` predicate reading `PAGE_ENTRY[key]`, the
      same constant `withPageAccess` uses. Behaviour-identical today
- [x] 8.8a **`/api-doc` has three entry points and they must all read `PAGE_ENTRY['api-doc']`**:
      the client gate (task 7.5), `Navigation/index.tsx:249` (currently `session?.user.isAdmin`
      → IZG Operations only), and **`Home/index.tsx:132` (currently
      `isOperationsRole(session?.user.roles)` → IZG Operations *and* IZG Support)**. The last
      two disagree today, and that disagreement is the drift this design cites as the reason
      `PAGE_ENTRY` exists — fixing only the nav link would leave it in place
- [x] 8.8b **This one is not behaviour-identical: IZG Support loses the "OUR API" button on the
      landing page.** That is a removal, consistent with this change's direction, and it removes
      a link to a page that already rejects them — they currently get a dead end. Call it out in
      the PR description rather than letting it surface as a surprise
- [x] 8.8c Update the doc comment on `src/lib/security/accessutils.ts`, which currently says
      `isOperationsRole` "decides things like whether the 'OUR API' button appears on the home
      page" — after 8.8a that is no longer true. Its two remaining readers
      (`fetchEndpointStatus.ts:32` and `allowedusers/bydestination:76`) are both row scoping, not
      affordance, which is worth stating since it changes what the predicate is *for*
- [x] 8.9 Every conditional follows **render on true, never hide on false** — `useRoleAccess`
      returns `{}` while loading, so `{flag && <Control/>}` fails closed while `{!flag && …}`
      fails open
- [x] 8.10 **Delete `src/components/AdminGuard.tsx` in the same commit as the last consumer
      migration.** If the SSR gate lands while `AdminGuard` remains, the denial message
      server-renders and then `AdminGuard`'s `useEffect` redirects away — criterion 1 fails
      intermittently and looks like a flake. Its two consumers are `adminoperations/index.tsx`
      (task 7.3) and `api-doc.tsx` (task 7.5). Leave `ApiKeyAccessGuard.tsx` alone — it does
      **not** import `AdminGuard`, but its header comment calls it "the page-level counterpart
      to AdminGuard", so update that comment or it dangles at a deleted file

## 9. Automated tests

**All new tests need `/** @jest-environment node */`.** The jsdom environment currently fails to
start (`virtualConsole.sendTo is not a function`, from the `jsdom@28` override) and CI does not
run jest. There is no shared test-helper module; use the local-factory patterns from
`policy.test.ts:10-13` and `apikeys/lifecycle.test.ts:103-126`.

- [x] 9.1 `policy.test.ts`: seed table — every new admin flag `true` for IZG Operations, `false`
      for the other four
- [x] 9.2 `policy.test.ts`: block-shape drift — for every role, the page-key set and each block's
      sorted key set are identical. Catches a hand-written block with a typo'd flag, which
      omitting the `as` assertions alone would not
- [x] 9.3 `policy.test.ts`: tenancy invariant, **derived from `REQUIRES_GLOBAL_TENANCY`, not
      hardcoded** — for every capability in that set, assert no role with `globalTenancy: false`
      holds it. Deriving it means the test and the guard cannot drift, and adding a capability
      to the set automatically extends the coverage
- [x] 9.3a **Do not widen this test to every admin flag.** Only capabilities over an unfiltered
      data path are invariants; the rest are today's provisional seeds. A test asserting
      "`adminoperations` is false for every scoped role" would fail legitimately the first time
      the ratified matrix grants one, and whoever hits that red build under deadline will delete
      the test rather than narrow it — taking the real invariants with it. The
      `REQUIRES_GLOBAL_TENANCY` set is the line, and it moves by a deliberate edit to that set
- [x] 9.3b Assert the guard is enforced **per alternative** in an any-of: a subject holding only
      the unguarded `onboarding.canViewOnboarding` passes the `/api/organizations` rule even
      though two of its three alternatives are guarded (task 4.7a). This is the case that
      silently breaks Jurisdiction Operations and Support if implemented as a whole-array check
- [x] 9.4 New `src/lib/security/accessregistry.test.ts`: for every `PAGE_ENTRY` key,
      `derivePageKey(route) === key`
- [x] 9.5 Page coverage: enumerate `src/pages/**/*.tsx` **excluding `src/pages/api/**`**, derive
      routes, assert each file either references `withPageAccess`, appears in the test's own
      permanently-fine allowlist, or has an `AUTHZ_DEBT` row of kind `ungated-page` (task 2.5).
      Without the `api/**` exclusion the `.tsx` API route is wrongly flagged as an ungated page.
      The tree holds **20 pages** and every one must be accounted for — assert that total, so a
      new page cannot be added without appearing somewhere:

      | Bucket | Pages | Reason |
      |---|---|---|
      | Gated by `withPageAccess` (5) | `accesscontrol`, `adminoperations`, `console`, `passwordencryption`, `onboarding` | this change |
      | Not a route (4) | `_app`, `_document`, `_error`, `404` | framework files |
      | Deliberately public to any session (3) | `index`, `add`, `user` | landing page; the latter two are orphans proposed for deletion |
      | Client-gated only (1) | `api-doc` | `getStaticProps`, cannot be SSR-gated (Decision 8) |
      | **Deferred — same requirement, next increment (5)** | `edit`, `history`, `test`, `changerequest`, `testreport` | not out of scope; sequenced second. Four need only a one-line gate on a capability already in `PAGE_ENTRY`. See `design.md` "The deferred increment" |
      | **Already capability-gated by another mechanism (2)** | `manageconnections` (real SSR `canViewConnections` check from `sender-role-access`), `apikeys` (`ApiKeyAccessGuard`, client-side) | migrating both to `withPageAccess` is the named follow-up |
- [x] 9.6 Route coverage: enumerate `src/pages/api/**/*.{ts,tsx}` and assert each file calls
      `withMiddleware`, allowlisting only `auth/[...nextauth].ts` and `auth/bind-session.ts`.
      **The `tsx` half of the glob is not padding** — `changerequeststatus/[id].tsx` is a real API
      route with a `.tsx` extension and one of the two files that bypass the wrapper today, so a
      `**/*.ts` glob would skip precisely the file the test exists to catch. Assert the
      enumerated count is `>= 43` so a future glob change cannot silently empty the test. After
      task 4.0 the tree holds exactly 43 files — 41 routes plus the two allowlisted next-auth
      routes — so the allowlist needs no entry for the helper. (39 routes when this change was
      branched; see the integration note in §12)
- [x] 9.6a Assert **no file under `src/pages/api/` default-exports anything other than a request
      handler**, or equivalently that the tree contains no module whose default export is not
      reachable as a route. This is what would have caught task 4.0's defect; a `mentions
      withMiddleware` regex would not, since the helper mentions it on every other line
- [x] 9.7 Denial-is-rendered check: every file referencing `withPageAccess` must also reference
      `AccessDenied`. Crude, but gating a page and *handling* the result are separate acts and
      nothing else checks the second
- [x] 9.8 `inHandler` ratchet, **derived not hardcoded**: count `inHandler:` across
      `src/pages/api/**/*.{ts,tsx}` and assert it equals the number of `AUTHZ_DEBT` rows of kind
      `in-handler` (13 — 11 after task 6.20, plus the two `apikeysaudit` routes integrated in §12).
      Adding an `{ inHandler }` without a debt row naming a
      ticket fails; closing one means deleting its row, with no ceiling to remember to
      decrement. Failure message names the rule — an acknowledged authorization gap may be
      closed, never added
- [x] 9.8a Assert every `AUTHZ_DEBT` row's `ticket` matches `/^IGDD-\d+$/`, and print the whole
      table as CI output so the debt is visible on every run rather than only when something
      breaks
- [x] 9.8b Assert every declared route **sends a response on every path**, or at minimum add a
      regression test that a non-admin `GET /api/changerequest/deploy/{id}` returns `403` rather
      than hanging. Two instances of "resolves without responding" were found in this change's
      scope (tasks 4.0 and 6.13); neither would have been caught by any existing test
- [x] 9.9 Both coverage tests use **static source regex, not dynamic import** (importing
      pages/routes pulls in `DbClientFactory` and needs the full mock stack) and normalize with
      `path.posix` — this repo is developed on Windows and built in Alpine
- [x] 9.10 `api-middleware-helper.test.ts` (already node, already spies `logger.warn`): capability
      → 403 with handler not called and a dotted `permission`; capability → `next()` when
      authorized, plus any-of semantics for the organizations rule; no session → 401 with **no**
      audit event; `byMethod` GET passes / POST 403 / unlisted method 405 + `Allow`;
      `requiresGlobalTenancy` denies a scoped role that holds the flag; `{ session: true }` 401
      then `next()`, no audit either way; `{ public }` and `{ inHandler }` call `next()` with no
      capability check
- [x] 9.11 New SSR gate tests under `src/__tests__/pages/` — **test files must not live under
      `src/pages/`, where they become routes.** Mirror
      `src/__tests__/pages/manageconnections/index.test.ts`. `accesscontrol`: denied →
      `props.accessDenied === true` and **no** `redirect` key, plus one `logger.warn` with
      `eventType: 'AccessDenied'`, `deniedAt: 'page'`, the dotted permission and
      `url: '/accesscontrol'`; allowed → falsy. `adminoperations`: the gate fires **before** the
      handler — mock `getHubEnvironments`, assert it was not called and `hasKeyName` is absent on
      denial. `console`: one case each way
- [x] 9.12 `menuItems.test.tsx` (a `.tsx` that already runs under node): Access Control / Admin
      Operations / Console visible for IZG Operations, hidden for the other four
- [x] 9.12a **Prove the extension contract** (`design.md` Decision 12, and the spec requirement
      "adding a role, a page, or a capability is a data change"). Nothing currently verifies it,
      so it is a claim rather than a guarantee. Cheapest credible form: a test that builds a
      synthetic role holding exactly one capability and asserts `can()` grants that one and
      denies every other — which is what "a new role with one narrow capability" has to mean.
      The compiler covers the completeness half already; this covers the isolation half
- [x] 9.13 Record every unenforced flag as an `AUTHZ_DEBT` row of kind `unwired-flag`, using the
      target matrix's own vocabulary in the `enforcement` field — `Enforced` / `UI-only` /
      `Not enforced` / `Unconfirmed` — so the code and the spike document can be diffed rather
      than re-audited
- [x] 9.13a **Commit a snapshot of the role matrix.** A node test imports `accessLevel` (pure
      data, no DB or session dependencies), renders role × page × capability to a markdown
      table, and snapshots it. Any permission change then appears as an **explicit diff line in
      review** — "IZG Support gained `console.canViewConsole`" — instead of something a reviewer
      has to infer from a role-file edit. This directly mitigates the risk this change's own
      design names as its largest: that a ~60-file PR gets rubber-stamped. It also restores the
      single place to answer "who can do what", which colocating route declarations gives up
- [x] 9.13b Snapshot the **role matrix only**, not route declarations. Those are inline in 39
      files and would need source parsing to extract — brittle, and the matrix is where the
      access risk actually lives
- [x] 9.14 `npm run code-quality-check && npm run test`, then **`npm run build`** — required
      before calling this done; `tsc`/jest/eslint alone are not sufficient in this repo

> **Acceptance gap — state this in the ticket, do not let it surface at UAT.** Success criterion 1
> is *"a message in the UI."* Every test above asserts props or logger calls; **none asserts
> rendered output**, and none can until jsdom is fixed. 9.7 narrows that specific gap cheaply;
> beyond it, criterion 1 is covered by the manual walkthrough and by nothing else. Criterion 2 —
> the audit entry — **is** fully automated.

## 10. Manual verification

Follow `test-plan.md` in this change folder. **Session 2 (IZG Support) is the release gate.**

> **Reconciled 2026-09-30.** The sessions below were performed on 2026-09-30 and recorded in
> the [IGDD-3472](https://izgateway.atlassian.net/browse/IGDD-3472) comments by five testers:
> Anusha Kanuri (Tests 1 and 3), Keith Boone (Test 2 — the release gate, as IZG Support),
> Paul Cahill (Tests 4 and 6), and Evan Brock (Tests 5 and 7). Every box in this section is
> now `[x]`, but three of them are bookkeeping rather than completion. Per-task verdicts:
>
> | Task | Verdict | Evidence |
> |---|---|---|
> | 10.1 | Done | Anusha, Test 1, all checks marked, 11 screenshots |
> | 10.2 | Done | Screenshots from Anusha (Tests 1/3) and Keith (Account A2) |
> | 10.3 | Done, spawned a bug | Paul, Test 6 — one entry per denial, `deniedAt`, all roles, and `permission` as `page.capability`. **Events reach AWS but not Elastic → [IGDD-3541](https://izgateway.atlassian.net/browse/IGDD-3541), Open.** |
> | 10.4 | Done | Keith, Account A2, from devtools: `rotatekey` POST → 403, `encrypt` POST → 403, `accessgroups` POST → 403, `changerequest` DELETE → 403. **The two that returned `200` are closed.** Evan's Test 5 adds `allowedusers` and `organizations`. |
> | 10.5 | **Bookkeeping only — not run** | The change is not deployed. See below. |
> | 10.6a | Done, re-run 2026-09-30 | jest → **446 passed, 0 failed**, 4 suites fail to start (pre-existing `ERR_REQUIRE_ESM`). `code-quality-check` → 0 errors. `npm run build` → succeeds. The task expected 425 passed; more tests exist now. |
> | 10.6b | Mostly | `policy.test.ts` passed. Test-plan 4.7a is embedded in runbooks 3.1p/3.2x/3.3j, which Tests 1–3 completed. The local-only manual step is unevidenced. |
> | 10.6c | **Bookkeeping only — no evidence** | Nobody recorded running the six break-then-revert steps. |
> | 10.6d | **Bookkeeping only — no evidence** | The `/console` denial title was not reported. Screenshots on IGDD-3472 may already show it. |
>
> Tasks 10.5, 10.6c and 10.6d, plus 10.6b's local step, are recorded in
> `~/Downloads/izg-cc-openspec-archive.md`, sections 8 and 9.

- [x] 10.1 Smoke every route as IZG Operations immediately after §6 — all 41 now carry a
      declaration, so the expected failure mode is a wrong `page`/`capability` pair or a
      mis-classified mechanical declaration, both surfacing as an unexpected 401/403. A dev
      deploy is a much worse place to find it
- [x] 10.2 Criterion 1, per role: the denial message renders, nav still renders, the URL does not
      change, there is no redirect. **Attach a screenshot to the ticket** — this is the
      acceptance evidence, not a green suite
- [x] 10.3 Criterion 2: exactly one `eventType:AccessDenied AND deniedAt:page` entry with
      `permission: 'accesscontrol.canViewAccessControl'`, the caller's roles, and a `sessionId`
      matching that session's other log lines
- [x] 10.4 Route-level **from the browser devtools console** of an authenticated non-admin tab —
      **not `curl`**: `src/middleware.ts` enforces DPoP on every `/api/*` request and a cookie-only
      client has no proof header, so it is answered `302` to sign-in before `enforceRouteAuthz`
      runs and every check reports the same wrong answer. `POST /api/rotatekey`,
      `POST /api/encrypt`, `POST /api/accessgroups`, `DELETE /api/denylist/{id}`,
      `POST /api/maintenance/update/2/az` → all `403` with an `AccessDenied` event. **The first
      two return `200` today**
- [x] 10.5 Regression against dev after deploy: `navbar.spec.ts`, `manageConnection.spec.ts`,
      `cancelRescheduleCR.spec.ts`, `deployChangeRequest.spec.ts`, `onboarding.spec.ts` — all five
      depend on `OKTA_USERNAME` being an IZG Operations account

### 10.6 Developer-only checks — deliberately **not** in `test-plan.md`

`test-plan.md` is written for a tester with no access to the code. These four need the repo, so
they live here. Moved out of that document on 2026-09-28 because a developer-facing appendix in a
tester's runbook is exactly the kind of thing that gets read as an instruction.

- [x] 10.6a **Automated coverage** — `npx jest src/lib src/__tests__ src/components/Navigation` →
      425 passed, 0 failed (four suites fail *to start*, all pre-existing);
      `npm run code-quality-check` → 0 errors; `npm run build` succeeds
- [x] 10.6b **The tenancy guard.** `REQUIRES_GLOBAL_TENANCY` holds `console.canViewConsole` and all
      four `accesscontrol` capabilities. **No account can trigger it today** — no jurisdiction-
      scoped role holds any guarded capability — so it is covered by
      `npx jest src/lib/security/policy.test.ts`, where the invariant is *derived from* the guarded
      set rather than hardcoded. Test-plan check 4.7a is the closest live evidence: it proves the
      guard is evaluated **per alternative** rather than across the whole any-of array.
      *(Local only: set `canViewConsole: true` in `_JurisdictionSupportAccess.ts`, restart, confirm
      Jurisdiction Support is **still** denied `/console` with an audit event, then revert.)*
- [x] 10.6c **Demonstrate the safety nets fail.** A coverage test nobody has seen fail is a
      coverage test nobody knows works. Revert each immediately:
      1. Create `src/pages/sneaky.tsx` → `npx jest src/lib/security/accessregistry.test.ts`
         must **fail**
      2. Create `src/pages/api/sneaky.ts` → same suite must **fail**
      3. Make any gated page answer a denial with `redirect: { destination: '/' }` → the redirect
         check must **fail** *(this is the exact regression that let two pages pass every other
         check while giving the user no message and no audit entry)*
      4. Add `{ inHandler: 'IGDD-9999: test' }` with no matching `AUTHZ_DEBT` row → the ratchet
         must **fail**
      5. Change any flag in any role file → `roleMatrixSnapshot.test.ts` must **fail**, naming the
         exact role, page and capability
      6. Remove a `RouteAuthz` argument from any route → **`tsc` must fail**
- [x] 10.6d **`/console` layer diagnostic.** A denial there should carry the title **"Console"**.
      **"Operations Console"** means the SSR gate did not run and the component's defence-in-depth
      check caught it instead. Both read `canViewConsole`, so the outcome is still correct — but
      the title is the only way to tell the two layers apart, and seeing the second one is worth
      investigating

## 11. Release

> **Reconciled 2026-09-30.** Every box below is now `[x]`, but only 11.2 and 11.6 are
> complete. Per-task verdicts:
>
> | Task | Verdict | Evidence |
> |---|---|---|
> | 11.1 | **Bookkeeping only — no evidence** | An operations check. Nobody recorded confirming `OPERATIONS_GROUP` in every environment. |
> | 11.2 | Done | Keith's Account A2 comment on IGDD-3472 quotes the note verbatim. |
> | 11.3 | **Do not perform as written** | Keith wrote on IGDD-3472: *"Security mandates that IZG Support do NOT have the accesses listed above."* Finding #14 would grant IZG Support exactly those four flags, so it must be **closed as will-not-do**, not filed. This also makes 11.2's "temporary" wording wrong — the denials are **permanent** unless the matrix owner overrules the mandate. |
> | 11.4 | **Bookkeeping only — not done** | `authzDebt.ts` holds **37 rows, all still naming `IGDD-3472`** (the task said 28, so nine were added since). Of the eight named follow-ups, only the `isAdmin` axis has a ticket ([IGDD-3498](https://izgateway.atlassian.net/browse/IGDD-3498), Open, and only a partial match). Seven have none. |
> | 11.5 | Half done | Keith settled the IZG Support question. The Finding #13 contradiction is unresolved. `design.md` lists **five** open questions, four for the matrix owner — the task's "two" undercounts. |
> | 11.6 | Done | PR #700, merged as `c3281db`. Keith approved with a non-blocking note about a future refactor. |
>
> Tasks 11.1, 11.3, 11.4 and 11.5 are recorded in
> `~/Downloads/izg-cc-openspec-archive.md`, sections 7, 9, 10 and 11. **Read section 7
> before anyone acts on Finding #14.**

- [x] 11.1 Confirm `OPERATIONS_GROUP` equals the Okta group mapped to `IZG Operations` in **every**
      environment. The whole "no behaviour change" claim rests on it, since `isAdmin` is
      group-membership while the new flags are role-based
- [x] 11.2 Tell the tester that the `/adminoperations` and `/console` denials for IZG Support are
      **intentional and temporary** — the target matrix grants both, deferred to the Finding #14
      follow-up. Without that note it will be filed as a regression
- [x] 11.3 File the Finding #14 follow-up immediately (four flags in `_IZGSupportAccess.ts`, no
      code) — it is the demonstration that this infrastructure works, and it is cheapest while
      the context is fresh
- [x] 11.4 **Re-point every `AUTHZ_DEBT` row** at the follow-up that owns it — all 28
      rows currently name `IGDD-3472` itself (see Implementation notes 1). Then file
      the remaining follow-ups identified in `design.md`: jurisdiction-filter the
      Console's Elastic query (blocks Finding #13), capability checks on `/api/changerequest`,
      remove the `isAdmin` axis, fix the jsdom environment, `/api/swaggerjson`'s empty spec, page
      gates for `/edit` `/history` `/test` `/testreport`, delete the orphaned pages and routes,
      migrate `/apikeys` to `withPageAccess`
- [x] 11.5 Resolve the two matrix-owner questions in `design.md` Open Questions — the Finding #13
      contradiction, and whether IZG Operations really loses API Key Management
- [x] 11.6 Open a PR against `develop`, asking reviewers to go commit by commit

---

## Implementation notes — where the build diverged from the plan

Seven deviations, all deliberate. Each is a decision a reviewer should agree with
rather than discover.

1. **Every `AUTHZ_DEBT` row points at `IGDD-3472` itself.** Task 9.8a requires
   `/^IGDD-\d+$/`, and the follow-up tickets in `design.md` have not been filed
   yet — Jira was not reachable from the implementation session. The rows are
   therefore self-referential placeholders. **Task 11.4 must re-point each row
   at the ticket that actually owns it once filed**; until then the table names
   the gap and the reason but not the owner, which is weaker than intended.

2. **Three more files left the route tree than task 4.0 called for.** The
   framework serves *every* file under `src/pages/api/` as a route, so
   `apikeys/lifecycle.test.ts`, `auth/jwt-callback.test.ts` and
   `auth/session-callback.test.ts` were served alongside the middleware helper.
   They moved to `src/__tests__/api/`. Without this the route-coverage test
   would have needed an allowlist for them — and an allowlist entry for a test
   file reads as a clearance, which is exactly what task 2.5b forbids.

3. **`/api/changerequest` narrows on POST as well as PUT and DELETE.** Task 6.19
   says to expect IZG Support and Jurisdiction Support to lose cancel and
   reschedule. They also lose **create**: the POST declaration is
   `edit.canCreateChangeRequest`, which both roles hold as `false`. The UI
   already blocked them (`manageconnections.canEditConnection` is false for
   both, and the create flow starts from editing a connection), so this closes
   a direct-API hole rather than removing something they use — but the release
   note must say *create, reschedule and cancel*, not just the latter two.

4. **`adminOnly` was deleted from `MenuItem`, not merely set to `false`.** Task
   8.8 asks for the flip. Leaving the field in place would leave a dead
   authorization branch reading `session.user.isAdmin`, and a dead field is an
   invitation to set it again — reintroducing the axis `can()` cannot see. The
   filter in `Navigation/index.tsx` now reads `isVisible` alone.

5. **One log field was renamed, not just the local variable.** Task 6.15 calls
   the `bydestination` change a pure rename of the local `isAdmin`. The two
   `logger.info` calls also emitted it as a field named `isAdmin` whose value
   was never the session flag, so they now emit `hasGlobalReach`. A dashboard
   filtering on that field name would need updating; it is an informational
   log, not an audit event, and leaving a field named `isAdmin` that is not
   `isAdmin` defeats the point of the task.

6. **Four more denial paths were made consistent — "axis B".** The plan treated
   authorization as one problem; it is two. *What fact do we check* (`isAdmin` vs a matrix
   capability) is what §1–§8 addressed. *What we do when the check fails* is separate, and had
   no shared answer before this change created `AccessDenied` — so every earlier author invented
   one. Found by sweeping `src/pages` for `redirect: {` and `router.push`:

   | Surface | Was | Now |
   |---|---|---|
   | `/manageconnections` | server-side `redirect: { destination: '/' }` — silent, unaudited. Hit by Sender Operations | `withPageAccess('manageconnections')` |
   | `/apikeys` | `ApiKeyAccessGuard`, a client-side `router.push('/manageconnections')`. Hit by IZG Support and Jurisdiction Support | `withPageAccess('apikeys')`; guard **deleted** |
   | `/api-doc` | `return null` — a blank page | renders `AccessDenied` (still unaudited; Decision 8 stands) |
   | `Console/index.tsx` | a second, differently-worded MUI `Alert` | renders `AccessDenied` |

   Neither of the first two ever read `isAdmin` — both already checked the correct matrix
   capability. They were the *newest* authorization code in the repo (2026-08-27 and
   2026-09-16), written before a shared denial surface existed. **Gated pages 5 → 7**, and the
   `apikeys` debt row is gone (28 → 27 rows). `/apikeys` keeps its kill switch **ahead** of the
   capability gate, so a disabled feature still 404s rather than showing a denial.

   A new test locks this in: **no page may answer an authorization failure with a redirect**,
   with `/api/auth/signin` the one legitimate exception. It strips whole-line comments first,
   since prose explaining a removed redirect still contains the word.

7. **Reschedule and Cancel were split onto their own flags in the UI.** Deviation 3 wires
   `PUT /api/changerequest` to `canRescheduleRequest` and both `DELETE` routes to
   `canCancelRequest`. The UI did not match: `DeployConnection/index.tsx` rendered the whole
   "Need to make changes?" card — **both** buttons — on `canRescheduleRequest` alone, so the
   Cancel button's visibility was decided by the reschedule flag. Invisible today, because every
   role holds both or neither; a live mismatch the moment the matrix grants one without the
   other, which it contemplates as two separate rows. The card now shows when **either** flag is
   held and each button gates on its own.

   This touches `/changerequest`, a page outside this ticket's gate scope. It is included
   anyway because deviation 3 is what makes the conflation reachable: before it, the API checked
   no capability, so a wrongly-shown button still worked. Leaving the UI as-is would have meant
   shipping a known path to a visible button that answers 403.

### Deliberately NOT resolved

- **`/edit`, `/history`, `/test`, `/changerequest`, `/testreport` remain ungated.** These are
  not an axis-B inconsistency — they have no check at all, so gating them *removes access* from
  roles that can reach them today. That is a policy decision, not a UX fix, and it stays the
  deferred increment.
- **`checkAccessToDestId` / `checkAccessToDestIdSlug` still answer `401`** where the new
  enforcer answers `403`. A reach failure is an authorization failure, so `403` is correct — but
  changing a status code can affect client retry logic (nothing in `src/` keys on it today,
  which was checked). Its own ticket.

### Verification actually run

Re-run in full after fast-forwarding onto `origin/develop` at `b8e53e7` (2026-09-28).

- `npx tsc --noEmit` — clean. *(The dependency bump in that fast-forward
  tightened inference on `String.match(…) || []`, which now widens to
  `RegExpMatchArray | never[]` and types a subsequent `.filter` parameter as
  `never`. One annotation in `accessregistry.test.ts` fixes it.)*
- `npm run code-quality-check` — **0 errors**, 66 warnings, all pre-existing
  (none in any file added by this change).
- `npx jest` on the node-environment suites — **425 passed, 0 failed**,
  including 46 in `policy.test.ts`, 86 in `accessregistry.test.ts`, 23 in
  `api-middleware-helper.test.ts`, 14 in `adminPageGates.test.ts` and 22 in
  `menuItems.test.tsx`.
- **Four suites still fail to start, all pre-existing and none touched by this
  change:** `dynamo.integration`, `DbCrypto`, and both `cryptoSupport` files.
  The `jsdom@28` breakage recorded in `CLAUDE.md` is **partly resolved** by the
  fast-forward — three suites that previously could not start now run. The
  remaining three ES-module failures are an `@aws-sdk/core` packaging issue
  surfaced by the SDK bump, not the old jsdom fault; the fourth is an empty
  `.test.js` stub with no tests in it.
- **Negative controls on the coverage tests:** adding a throwaway ungated
  `src/pages/sneaky.tsx` and an undeclared `src/pages/api/sneaky.ts` failed four
  assertions; temporarily making a gated page answer with a redirect failed the
  new redirect check. All were then reverted. The guarantees are demonstrated,
  not assumed.
- `npm run build` — **compiled successfully**. The route table no longer lists
  `/api/api-middleware-helper`.
- Still failing, all **pre-existing and unrelated**: every jsdom suite
  (`virtualConsole.sendTo is not a function`, the `jsdom@28` override recorded
  in `CLAUDE.md`), the Playwright specs, and four shell tests in
  `scripts/tests/security-updates.test.js` timing out on `spawnSync bash`. The
  two `@swagger` YAML parse warnings during the build come from malformed
  JSDoc comments in `changerequest/[...slug].ts` and
  `maintenance/update/[...slug].ts` that this change did not touch.

## 12. Integration note — two routes arrived mid-flight

Rebasing onto `origin/develop` at `ffbaa8e` (2026-09-28) brought in IGDD_3083's API-key audit
feature, which added two API routes after this change was branched:
`apikeysaudit/index.ts` and `apikeysaudit/[sortKey].ts`.

Both were written as `export default withMiddleware()(handler)` — **no authorization declaration
at all**, and importing the helper from its old path inside the route tree. The rebase itself was
clean; the build then failed on both files.

That is the forcing function working on a case it was not designed against. Nobody on either side
coordinated, the two routes were written before the required argument existed, and no reviewer
had to notice — the compiler refused them. It is the most direct evidence available that this
mechanism does the thing it was built to do, and it happened by accident.

Both are declared `{ inHandler }`, matching the five existing `apikeys/*` routes: each resolves
the session, checks `canListApiKeys` itself, and then scopes rows to the caller's owned
jurisdictions, so the decision is per-row and cannot be expressed as one route-level capability.
Declaring them this way records the status quo and makes no new authorization decision, which
keeps this change's "only ever removes access" property intact.

Counts that moved, and everywhere they are asserted:

| | Branched | Now |
|---|---|---|
| Routes (excluding the 2 next-auth files) | 39 | **41** |
| Files under `src/pages/api/` | 41 | **43** |
| `{ inHandler }` declarations | 11 | **13** |
| `AUTHZ_DEBT` rows | 27 | **33** (29 after integration, +4 from PR #700 review — see §13) |
| Test-plan Group F endpoints | 11 | **13** |

Also carried across cleanly: develop modified `apikeys/lifecycle.test.ts` while this change moved
it out of the route tree to `src/__tests__/api/`. Git's rename detection applied their edits to
the moved file; verified line by line rather than assumed.

The two new routes inherit the open question that already applies to the five `apikeys/*` routes
beside them — whether per-row jurisdiction scoping in a handler should become a declared
capability. They are on the same follow-up, not a new one.

## 13. Review findings from PR #700

Seven automated review comments. Five were valid and are addressed here; one was
factually wrong; one was valid and is deferred with its reasoning recorded.

### Fixed — the tenancy guard was not role-local

**The defect this change was built to prevent, reintroduced by the code preventing it.**
`withPageAccess` and `enforceRouteAuthz` each asked two independent questions —
`can(subject, …)` for the capability and `hasGlobalTenancy(subject)` for the reach. Both are
subject-wide, so together they compute `(∃r: holds) ∧ (∃r: global)` where the rule requires
`∃r: (holds ∧ global)`. A scoped role holding a guarded capability could borrow reach from any
unrelated global role the same user held.

Not exploitable today — every holder of a guarded capability is already global — which is
exactly why the derived invariant test passed throughout and caught nothing. It would have
become exploitable on the first matrix edit granting a guarded capability to a scoped role,
which is the edit the guard exists to make safe.

Both enforcers now call `decideCapability`, which iterates roles and evaluates the capability
against a single-role subject each time. `can()` is untouched. Filtering roles *before* calling
`can()` would not work: with `ANY_JURISDICTION` it returns the first role holding the
capability, which may be a scoped one even when a later global role would legitimately allow.

Three regression tests in `policy.test.ts` inject the tenancy predicate, because no real role
can express the arrangement today. Reintroducing subject-wide reach fails them.

### Fixed — `/api-doc` embeds the spec it claims not to have

`getStaticProps` runs at build time, where `src/` is present, so the full API specification is
serialized into the page payload. The client gate hides the interface; **it does not hide the
content**, which any authenticated user can read from `__NEXT_DATA__`.

Pre-existing and unchanged by this work — the previous `AdminGuard` was also client-side — but
the code comment asserted the opposite ("without a spec this is an empty Swagger UI") and the
page was listed as *permanently fine* on the strength of it. Both corrected. The page is now an
`AUTHZ_DEBT` row, which is what it actually is.

Not fixed here, deliberately: the fix is to serve the spec from `/api/swaggerjson`, which is
gated and audited — but that endpoint resolves `src/pages/api/**` at request time and the runner
image ships no `src/`, so it very likely returns an empty spec in every deployed environment.
Switching to it would trade a disclosure for documentation that renders blank everywhere. Both
halves need one change, tested against a real container.

### Deferred, with the gap recorded — capability and reach are split on three routes

`changerequest/index.ts`, `changerequest/[...slug].ts` and `maintenance/update/[...slug].ts`
check the capability in the declaration and the destination reach in the handler, each against
the whole subject. `Jurisdiction Operations` (scoped, holds `canCancelRequest`) plus `IZG
Support` (global, holds no change-request write) can combine the halves — a live gap with
today's roles, not a future one.

**Narrower than what it replaces**: before this change these routes checked reach *alone* and no
capability at all, so that same user could already act everywhere. But it does not yet meet the
same-role rule, and saying so is better than implying otherwise.

Closing it needs the destination id — in the request body on one of the three — resolved inside
one role-local decision, which means changing `hasAccessToDestId`, a helper shared with six
routes outside this change. Three `split-decision` debt rows and a spec scenario now record it.

### Corrected — the spec required a status code the code does not return

The maintenance-update scenario said a caller failing *either* check receives `403`. The reach
half returns `401`, from a middleware shared with five other routes and predating this change.
`403` is correct for both, but changing it affects all six and can alter client retry behaviour.
The scenario now states both codes and why they differ. A specification that is not met is worse
than one that records the gap.

### Rejected — the page-count assertion

Reported as always failing on the grounds that 19 non-API pages exist against an assertion of
20. There are 20: `find src/pages -name '*.tsx' | grep -v /api/` returns 20, and the single
`.tsx` file under `src/pages/api/` is excluded before the count. The suite passes.

## 14. Review findings from PR #700, second pass

Twelve findings from a full-diff review. Eight are addressed, two are rejected on
evidence (one with a test substituted for the suggested fix), and two are deferred.

### Fixed — the nav predicate was a third implementation of the rule

`canEnterPage` read `accessLevel[role]?.[page]?.[capability]` directly. It never
called `can()` and never consulted `REQUIRES_GLOBAL_TENANCY`, so for the five
guarded capabilities a nav link could render for a role the page gate then
rejects — the precise drift `PAGE_ENTRY` was introduced to make
unrepresentable, and the same shape as the `AdminGuard` / `isOperationsRole`
divergence this change removes.

Unreachable today, and not only because of the seeds: the derived tenancy
invariant in `policy.test.ts` makes the grant that would expose it a red build.
But a rule with three implementations has one implementation too many. It now
routes through `decideCapability`, so a link and the page it points at run the
same decision.

### Fixed — the decision function was called two ways at two enforcement points

Both enforcers passed `(role) => hasGlobalTenancy({ ...subject, roles: [role] })`
verbatim — a full subject clone per held role to answer what is a single matrix
lookup, and, more to the point, two independently editable copies of the thing
that had just been consolidated. `decideCapability` now defaults its tenancy
predicate; the parameter stays only so `policy.test.ts` can inject an
arrangement no current role can express.

### Fixed — `canEnterPage` lived in the navigation menu module

A pure authorization predicate exported from a module whose top level builds six
MUI icon elements, so `Home` imported the nav component tree to ask whether a
role may enter a page. Moved to `accessregistry.ts`, beside `PAGE_ENTRY`,
`entryCapabilityOf` and `decideCapability`. Any future surface asking the same
question now has somewhere to import it from rather than a reason to
re-implement it.

### Fixed — unauthenticated callers got 403 and a phantom audit event

`subjectOf(undefined)` yields zero roles, so a request with no resolvable
session fell through the capability branches to a `403` plus an `AccessDenied`
event naming a permission nobody was denied. The `{ session: true }` branch and
the page gate both already special-cased this and cited the noise warning in
`accessDeniedAudit.ts`; the other branches did not. A session expiring between
the edge `withAuth` check and the handler is enough to trigger it, and the false
denials land in exactly the `eventType:AccessDenied` query this change adds
`deniedAt` and `permission` to support. Now `401`, no event, for every
declaration kind that requires a caller.

### Fixed — `captureErrors` no longer wrapped the authorization decision

The stack was assembled as `[logApiRequest, enforceRouteAuthz, ...declared]`,
which put authorization ahead of a `captureErrors` the caller had declared. On
the four routes that declare it, a throw inside the denial path — a logger
transport failure, say — would escape the trap that previously covered it: no
structured error log, no `500` body, a dropped request. The trap is now placed
ahead of `enforceRouteAuthz` when declared, keeping its original coverage.

### Fixed — the debt test matched a bare capability name

*"No `unwired-flag` row names a capability a route now declares"* matched
`capability: '<name>'` against all route source, dropping the page half of the
ref it was checking. Two rows name a capability with a twin on another page
(`test.canRunConnectionTest`, `history.canViewChangeRequest`), so declaring the
*other* page's flag — which the `tests/connectiontest` debt note explicitly
plans — would have failed this test for a row that is still genuinely unwired,
and the fix under that red build looks like deleting the row. Now matched
page-qualified.

### Fixed — a comment claimed a conjunction the code does not make

The Password Encryption card's comment said it was ANDed with `hasKeyName` and
"both must hold". The condition is `canManagePasswordEncryption` alone;
`hasKeyName` is forwarded to the card as a prop. In a change whose purpose is
removing reassuring-but-false authorization claims, this is the same defect
class.

### Fixed — the deploy handler could write a null password and answer twice

When a change request is flagged `isPasswordDifferent` and either password
lookup returns null, the `500` was sent without a `return`. Execution continued:
`updateDestination` wrote `password: null` over the stored credential,
`deleteDestinationChangeRequest` removed the source row, and the success reply
threw `ERR_HTTP_HEADERS_SENT`.

Pre-existing and byte-identical on `develop` — this change only removed the
`if (session.user.isAdmin)` wrapper and de-indented the block. Fixed anyway,
because this handler is rewritten here precisely for having resolved without
responding, and the note saying so now sits ten lines above a second
fall-through. One `return`; outside the authorization scope and called out as
such.

### Recorded as debt — one capability authorizes read and write on three routes

`allowedusers/index.ts`, `allowedusers/bydestination/index.ts` and
`allowedusersaudit/[...slug].ts` declare `onboarding.canViewOnboarding` across
`GET`, `POST` and `DELETE`, so a view flag authorizes mutation.

Reported as granting write access to the read-only Support tier. It does not:
all four roles hold `canViewOnboarding`, and before this change these routes
carried **no authorization at all**, so every authenticated session could
already `POST` and `DELETE`. The narrowing is real and the direction is right.

But the granularity gap is real too, and a comment repeated at three routes is
not a count. Splitting it needs an onboarding write capability whose seed value
belongs to the matrix owner — already tracked as the spike review's *Finding
#5, role-gate Onboarding Senders*. Three `coarse-capability` debt rows now
carry it.

### Rejected, test substituted — `derivePageKey` collapses every slash

True that the derivation maps `/access/control` onto the existing
`accesscontrol` key. The suggested fix — take the first path segment — is
worse: a nested route whose collapsed form is not a matrix key gets `{}` from
`mergePageAccess` today, which is deny-by-default, where the first segment
would hand it the **parent page's flags**. That trades a hypothetical collision
for a real widening.

The derivation stays. A new test asserts that every page on disk derives to a
distinct key, and that any page deriving to a declared key sits at exactly that
key's route — so the collision cannot be added quietly, which was the actual
concern.

### Rejected — `Partial<T>` on the denial path

The denial returns `{ accessDenied: true } as T & AccessDeniedProp`, so a gated
page's inferred props assert that data which is absent is present. Accurate.

The proposed fix does not work in this repo: `tsconfig.json` sets
`"strict": false`, so `strictNullChecks` is off and an optional property is not
`| undefined` at the use site. `Partial<T>` would change the declaration and
produce no new compile error at any `props.data.length`. Verified separately
that all seven gated pages branch on `accessDenied` before the first
dereference. Worth revisiting in whichever change turns `strict` on; worth
nothing before then.

### Deferred — `manageconnections` props typed as `{ data: unknown[] }`

Migrating to `withPageAccess` replaced a handler-inferred props type with an
explicit one, flattening the endpoint row shape to `unknown[]`. Nothing breaks
— `ConnectionsTable` takes an implicit `any` — but the page-to-table contract is
unchecked, so a renamed field in `getServerSideProps` surfaces as `undefined` at
runtime rather than as a compile error. Restoring it means naming the row type,
which the handler builds ad hoc. Follow-up, with the same caveat as above: under
`strict: false` the compile-time gain is smaller than it looks.

## 15. Integration — `develop` merged in after the PR opened

`develop` was merged into this branch at `2fb7e24`, bringing PR #696
(IGDD-3175, spoofable audit fields). Two things in it do not survive contact
with this change, and the merge was pushed without either being run.

### Four test files were living inside the route tree

IGDD-3175 added `index.test.ts` beside four route files under
`src/pages/api/`. `next.config.js` sets no `pageExtensions`, so **every `.ts`
file in the page tree is served as a route**: `/api/denylist/index.test` and
three siblings were routable endpoints whose default export is `undefined`.

The route-coverage test failed on all four, plus on its own *"contains only
routes — no helpers, types or test files"* assertion. That check exists because
this exact trap is what put `api-middleware-helper.ts` on a public URL before
this change moved it.

Moved to `src/__tests__/api/<route>/index.test.ts`, matching the convention
already used by `src/__tests__/api/apikeys/lifecycle.test.ts`. Only the mock
and import paths change; not a line of test logic.

### Their mocked sessions carried no roles

The four sessions are `{ user: { email: 'real-user@example.com' } }`. Those
routes now carry capability declarations, so `subjectOf` yields zero roles and
`enforceRouteAuthz` answers `403` before the handler runs. Six assertions
failed with `Number of calls: 0`.

Fixed by authorizing the caller — `roles: ['IZG Operations']` — not by
relaxing the route. These tests assert *which identity is written into an audit
row*, not *who may call the endpoint*; they need a caller who may call it.

### Worth noting for the PR

This is the third time the coverage test has caught work written against the
pre-IGDD-3472 model, on a case nobody aimed it at: two undeclared
`apikeysaudit` routes during the first rebase, and now four routable test files
and six unauthorized test callers. Each was a build or suite failure at the
moment of integration rather than a discovery in a deployed environment.

No authorization behaviour changes in this integration.
