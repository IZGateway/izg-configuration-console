## Context

`multi-role-permissions` (IGDD-3359) and `sender-role-access` built the decision layer: `can()`
enforces `∃r:(perm(r) ∧ reach(r))` — a permission and a jurisdiction check satisfied by the
**same** role — with exact-element prefix matching and deny-by-default. It is pure, has no logger
imports or Node builtins on its hot path, and is well covered. Nothing below changes it.

What does not exist is an enforcement layer. Verified by reading the current code:

1. **There is no page registration of any kind.** A new file under `src/pages/` is live and
   reachable the moment it is saved. `/accesscontrol`, `/console` and `/passwordencryption` have
   no server-side check; `/adminoperations` and `/api-doc` have `AdminGuard`, a `useEffect`
   redirect that runs after render.
2. **Route enforcement has five competing mechanisms**, and the default is the dangerous one:
   `withMiddleware()` with no arguments adds only request logging. `POST /api/rotatekey` and
   `POST /api/encrypt` are session-presence-only. `POST /api/maintenance/update/[...slug]` has
   nothing at all. Two files — `swaggerjson.ts` and `changerequeststatus/[id].tsx` — never call
   the wrapper. And `api-middleware-helper.ts`, the module that *defines* route authorization,
   is served as a route itself (Decision 13).
3. **A census of the 31 declared permission slots** found 6 enforced via `can()`, 1 via an SSR
   gate, 11 read only by UI conditionals, and **13 read by no code at all**. A flag that nothing
   reads is worse than a missing flag: it reads as a guarantee.

Two authorization axes exist. The `CcRole` matrix is one; `isAdmin` — membership of the Okta
group named by `OPERATIONS_GROUP` — is the other. `isAdmin` is not a `CcRole`, is not in the
matrix, is not covered by the drift test, and is not evaluated by `can()`. Folding it in was an
explicit non-goal in `multi-role-permissions/design.md` and remains out of scope here.

## Goals / Non-Goals

**Goals:**

- Make an ungated page or API route a **test failure**, not an act of memory.
- Give every admin page and its routes a matrix-driven gate, with within-page granularity
  (view vs. mutate) as the ticket's own example requires.
- Denial produces a message in place and exactly one queryable audit event.
- Make adding a role, a page, or a capability a data change with a compiler-enforced checklist —
  the "shall support that new role model when it is known" requirement.
- Remove no access that anyone legitimately uses; add none either.

**Non-Goals:**

- Changing `can()`, `mergePageAccess()`, `subjectOf()`, or the escalation guard. A new page is
  data, not logic.
- Deciding the real role→permission matrix. Seeds reproduce today; see Decision 3.
- Removing the `isAdmin` axis. Designed and costed separately (~1–1.5 days marginal after this
  lands); this change adds **no new `isAdmin` readers** so nothing built here has to be undone.
- Gating the remaining pages — `/edit`, `/history`, `/test`, `/changerequest`, `/testreport`,
  and migrating `/manageconnections` and `/apikeys` onto the same mechanism. **Deferred for
  sequencing, not because they are out of scope.** See "The deferred increment" below; the
  reason matters, because an allowlist entry reading "not an admin page" would tell the next
  reader these are permanently excluded when they are the rest of the same requirement.
- Deleting the 13 unwired permission flags. They are the only written record of the Confluence
  matrix's intended granularity, and a 13-key deletion across five role files for zero behaviour
  change is exactly the diff reviewers rubber-stamp.
- Fixing the Console's unfiltered Elastic query or `/api/swaggerjson`'s empty-spec-in-container
  bug. Both confirmed, both tracked separately. *(`/api/changerequest`'s missing capability
  checks were on this list and have been pulled in — see Decision 15.)*

## The deferred increment

The requirement behind IGDD-3472 is that **every** Configuration Console page is permission-
gated — users see only what they are allowed. This change covers the five surfaces with live
holes and builds the mechanism; the rest is a deliberate second increment. Recorded here with
the analysis already done, so the next ticket sizes itself rather than re-deriving this.

**Most of it is already agreed and inert.** `PAGE_ENTRY` names an entry capability for 10 of the
11 page keys. The remaining pages need a one-line gate each, using values nobody has to decide:

| Page | Today | Entry capability | Work |
|---|---|---|---|
| `edit` | **no gate at all** | `canChangeCredentials` | one line |
| `history` | **no gate at all** | `canViewConnectionInfo` | one line |
| `test` | session only | `canRunConnectionTest` | one line |
| `changerequest` | session + reach, no capability | `canViewDetails` | one line |
| `manageconnections` | real capability gate, different mechanism | `canViewConnections` | migrate |
| `apikeys` | `ApiKeyAccessGuard`, client-side | `canListApiKeys` | migrate, delete the guard |
| `testreport` | session only | **no page block exists** | the only new matrix data |
| `add`, `user` | none | — | orphans, zero inbound links; delete rather than gate |

**What it would actually remove**, checked against the current matrix values for all five roles:

- **`/edit` for IZG Support and Jurisdiction Support.** Both have an all-false `edit` block and
  the page has no gate today, so they can reach it. This is the one removal real users notice,
  and it is what the matrix has said all along.
- **Everything in the table for `Sender Operations`** — already set false deliberately by
  `sender-role-access`. Intended, not a regression.

Nobody else loses anything: `history`, `test` and `changerequest` entry capabilities are `true`
for all four IZG/Jurisdiction roles.

**Sizing:** roughly two to three days. The coverage-test allowlist drops from thirteen entries
to about five — the four framework files plus the landing page — which turns "every page is
gated or excused" into "every page is gated."

**Not included even then:** wiring the 11 UI-only and 13 unenforced flags to individual controls
across those screens. That is "only see the *controls* you're allowed" rather than "only see the
*pages* you're allowed", it is a separate body of work, and several of those flags have never
been enforced and their correct values are unconfirmed — it needs the ratified matrix first.

## Decisions

### 1. Two thin enforcement points, not one middleware gate

**Chosen:** a `getServerSideProps` wrapper for pages and a required argument on the existing
`withMiddleware` for routes. Both call the untouched `can()`. Neither contains policy.
Declarations are **colocated** with the page or route they govern.

**Alternative considered — a single gate in `src/middleware.ts`.** Rejected on two grounds.
Client-side navigation fetches `/_next/data/<buildId>/accesscontrol.json`, not `/accesscontrol`,
so a middleware page gate must normalize that path or in-app navigation silently bypasses it —
whereas `getServerSideProps` runs for both automatically. And it would put `/api/auth/*` and
sign-in inside the blast radius of a single regex. (The recorded non-goal "route-level middleware
gating… out of scope" in `multi-role-permissions/design.md` referred to Edge middleware and its
inability to use Winston/ALS. That reason is weaker on Next 16.1.7, which supports a Node
middleware runtime — the rejection above stands on its own grounds instead.)

**Alternative considered — a central `pattern → capability` route table** read by
`withMiddleware`'s default stack. It buys fail-closed-by-default without touching route files, at
the cost of ordering-sensitive regex matching, dynamic-segment resolution (`/api/denylist/abc123`
must hit the `[id]` rule, not the collection rule), trailing-slash and URL-encoding handling, and
~25 entries duplicating the filesystem. Adding a *matching layer* to an authorization decision is
a well-known bypass class. The required argument is fail-closed earlier — build time rather than
request time — with no matching layer at all; and where it does not reach (files that bypass the
wrapper), the table would not have reached either.

**Consequence:** a compile-breaking change across 39 route files with no partial landing.

### 2. The coverage tests are the guarantee; the compiler is a second layer

This distinction is load-bearing and was got wrong in an earlier draft of this design, so it is
recorded explicitly.

TypeScript has no view of the filesystem-as-router. **Nothing in the type system can force a new
`src/pages/foo.tsx` — or a new `src/pages/api/foo.ts` — to call anything at all.** That hole is
not hypothetical on the route side: two files bypass `withMiddleware` today. So the CI coverage
tests (source-regex over the `src/pages/` tree, with explicit reasoned allowlists) are what
actually hold the line, for pages **and** for routes.

Routes then get a second, sharper layer: once a file *does* call the wrapper, the required
`RouteAuthz` argument turns a forgotten declaration into a compile error rather than a silently
unprotected route. Precise where a source regex is crude, and it fails at build time. But it is a
refinement of the coverage test, not a replacement for it.

Neither layer is a *registry*. A registry gives you a place to look, not a guarantee, and
conflating the two is what made the first draft of this plan heavier than it needed to be.

**And the coverage test itself is crude, which has to be stated rather than glossed.** It is a
source regex: it asks whether a file *mentions* the wrapper, not whether it uses it correctly.
`api-middleware-helper.ts` would pass it trivially while being the single worst-behaved file in
the tree (Decision 13) — which is why that file is moved out rather than allowlisted. The
allowlists carry reasons, not bare paths, for the same reason: an allowlist entry is a claim
someone has to be able to check.

### 3. `PAGE_ENTRY` is centralized; route capabilities are not

**The rule: centralize only what has more than one reader.**

A page's entry capability has at least two — the SSR gate and the nav link — and they must
agree. Eleven lines mapped over `PageKey` makes disagreement unrepresentable, and a new page key
with no entry fails to compile.

That drift is live today, and `/api-doc` has **three** readers rather than two, all currently
independent:

| Reader | Today | Admits |
|---|---|---|
| `AdminGuard` (page) | `session.user.isAdmin` | IZG Operations |
| `Navigation/index.tsx:249` (nav link) | `session?.user.isAdmin` | IZG Operations |
| `Home/index.tsx:132` ("OUR API" button) | `isOperationsRole(session?.user.roles)` | IZG Operations **and IZG Support** |

So IZG Support sees a landing-page button to a page that rejects them. All three become
`PAGE_ENTRY['api-doc']`, which is the whole point of the constant — and note that fixing only
the first two, which an isAdmin-driven census would have done, leaves the drift exactly where it
was. `isOperationsRole` is not an `isAdmin` reader, so it does not appear in that census at all.

A route's capability has exactly one reader. A table would add a second place to look, a second
thing to keep in sync, and a bypass surface, for no benefit.

**Consequence:** listing a page in `PAGE_ENTRY` does *not* gate it. `edit`, `history`, `test` and
`changerequest` appear there because the mapped type requires every key; they are in the coverage
test's allowlist and stay ungated by this change. Their entries are inert until someone adds
`withPageAccess`, at which point the capability is already agreed. This is a real wart — a reader
can mistake presence in `PAGE_ENTRY` for protection — and is mitigated by a comment at the
constant and by the allowlist carrying reasons rather than bare paths.

### 4. Seeds reproduce today's access, not the target matrix

**Chosen:** every new admin flag is `true` for `IZG Operations` and `false` for the other four
roles, matching today's `isAdmin`-only access exactly. Each new block in `_IZGOperationsAccess.ts`
carries a `// [PROVISIONAL — IGDD-3472]` comment citing the specific target-matrix row and its
divergence.

The target matrix (Keith + Anusha spike review, Part 4) has nine role columns. **Five do not
exist in CC.** `IZG Security` and `Jurisdiction Security` are net-new Okta groups. `CDC
Operations` / `CDC Support` are proposed and deferred (Finding #16). `IZG Program` is an existing
Okta group with **no `CcRole` entry** — deliberately excluded at `rolemapping.ts:11-14` because it
had no matrix rows, so a member resolves to zero roles today. `Sender Operations` exists in code
but has no column; the target folds it into Jurisdiction Security.

Restricted to the four roles present in both:

| Target row | IZG Ops | IZG Sup | Jur Ops | Jur Sup | Target Enf. | Seed here | Divergence |
|---|---|---|---|---|---|---|---|
| Access Control — view tabs / write actions | — | — | — | — | Not enforced | IZG Ops `true` | Target holder is IZG Security (absent). Seeding `false` locks IZG Operations out of a page they use today |
| Admin Ops — Password Encryption card | — | — | — | — | Not enforced | IZG Ops `true` | Same |
| Password Encryption standalone page | — | — | — | — | Not enforced | IZG Ops `true` | Same |
| Swagger API Doc | — | — | — | — | Unconfirmed | IZG Ops `true` | Target holders all absent; Keith marks the row **Unconfirmed** |
| Admin Ops — CB Reset / DB Refresh | ✓ | **✓** | — | — | Enforced | IZG Ops only | **Real conflict — Finding #14 grants IZG Support** |
| Admin Log Search (`/console`) | ✓ | **✓** | — | — | Enforced (isAdmin) | IZG Ops only | **Real conflict — target grants IZG Support** |

**Tenancy agrees exactly.** Target reach is All / All / Own Jur. / Own Jur.; code is
`globalTenancy` `true` / `true` / `false` / `false`. This is the column where disagreement would
have been most expensive, and there is none.

Two directions, two different answers. Rows whose target holder is an **absent** role resolve to
nobody among current roles — keep today's value and let the correction arrive with the role. Rows
that **add IZG Support** are a real grant, and shipping them would cost this change its "only
removes access, never adds it" property — the property that makes it safe to review as a security
fix. So Finding #14 becomes its own ticket: four flags in `_IZGSupportAccess.ts`
(`canViewAdminOperations`, `canResetHubCircuitBreakers`, `canRefreshHubDatabase`,
`canViewConsole`), no code, its own approval trail. **That it is four lines and not a code change
is the proof this infrastructure did its job.**

**Do not confuse the two Console rows.** The target lists *"Console — status report"* (everyone)
and *"Admin Log Search (current /console route)"* (IZG Ops + IZG Support) as separate
capabilities. `canViewConsole` is **only the second**: `Console/index.tsx:291` renders
`Container title="Operations Console"` and gates on `isAdmin` at `:289`, matching that row
exactly. The "status report" row is a different surface — the Home `SystemResourcesWidget`, also
`isAdmin`-gated, also hitting `/api/elasticsearch/query`. Granting `canViewConsole` to everyone on
the strength of the first row would open the admin log search to all roles.

**Also confirmed by the target matrix, no action needed:** `changerequest.canDeployChange` is
IZG-Operations-only (matches code); reschedule/cancel excludes IZG Support, confirming the
out-of-scope `/api/changerequest` gap is a real bug rather than a judgement call;
`canScheduleMaintainance` is marked "UI-only", confirming that wiring it server-side here is the
right fix.

### 5. Granularity: one flag per page entry, plus one per independently-mutable resource

**Chosen:** ten flags across four blocks — not a view/create/update/delete quartet per resource,
which would have been ~30.

The ticket's own example is view-vs-mutate ("can view the page, but can't add items or edit
items"). The API surface is already resource-shaped (`/api/denylist`, `/api/adsfiletypes`,
`/api/accessgroups`). No anticipated role holds delete-but-not-add. And the target matrix
independently arrived at the same shape: its `adminoperations` rows put CB Reset and Password
Encryption on the same page with *different* holders, which is the ticket's "view but not edit"
requirement arriving from a second direction.

**`canResetHubCircuitBreakers` is deliberately new, not a reuse of
`manageconnections.canResetCircuitBreaker`.** They gate different operations: the existing flag
covers the per-destination reset at `/api/status/reset/[...slug]` (specified by
`destination-circuit-breaker-reset`); the new one covers the hub-wide reset at
`/api/status/reset`. One flag for both would silently widen a per-destination permission into a
hub-wide one.

**`byMethod` is required, not a nicety:** `accessgroups/index.ts` handles GET+POST in one handler
and `[sortKey].ts` handles PUT+DELETE, so one flag per file would conflate view with mutate —
exactly what the ticket calls out.

### 6. `{ inHandler }` is a comment with a type, and is ratcheted as one

Eleven routes get `{ inHandler: string }`. Nothing verifies the string describes what the
handler actually does, and nothing stops a later change deleting the inline check while the
reassuring declaration stays behind. That is precisely the false-guarantee failure this design
names for the 13 dead flags, so it gets the same treatment:

- **Every `{ inHandler }` string must name a follow-up ticket** — `{ inHandler: 'IGDD-xxxx:
  inline isAdmin check' }`, not a bare description. A reader can then tell an acknowledged gap
  from a settled decision.
- A test asserts the count equals the number of declared `AUTHZ_DEBT` rows (Decision 16), so it
  can only shrink. Closing one means changing that route's declaration to `{ capability }` and
  deleting its row — there is no ceiling to remember to decrement.

This is a ratchet, which Decision 2 explicitly avoids elsewhere, and the distinction is
deliberate. A ratchet over *undeclared* routes would be a permanent tax on a problem the compiler
already solves. A ratchet over *acknowledged gaps* is a finite backlog with a floor of zero, and
the number is the only thing that makes it visible.

### 7. `requiresGlobalTenancy` on every capability over an unfiltered data path

**The rule: if a capability's data path applies no jurisdiction filter, holding the capability
is not sufficient — the granting role must also have global tenancy reach.**

Admin pages show global, unscoped data and carry no jurisdiction in their URL, so they are
authorized with `ANY_JURISDICTION`. That is correct, and it is safe *only* while every holder
has `globalTenancy: true`. The moment the matrix grants such a capability to a
jurisdiction-scoped role, a one-line data edit becomes a cross-tenant data leak. A
`requiresGlobalTenancy` check in both enforcers makes that grant **fail loudly instead of
leaking**.

**The guarded set is central, not a field on `CapabilityRef`.** An earlier draft made it an
optional property set at each declaration site, which is a silent bypass: the same capability is
declared at more than one route, and omitting the flag at one of them opts that route out with
no diff that looks wrong. It also now has three readers — the page gate, the route enforcer, and
the invariant test — so the same rule that centralizes `PAGE_ENTRY` applies. It lives in
`accessregistry.ts` as `REQUIRES_GLOBAL_TENANCY` with a lookup, and nothing at a declaration
site can opt in or out.

**Which capabilities carry it.** Applying the rule as stated, rather than to the one page that
prompted it:

| Capability | Data path | Guard |
|---|---|---|
| `console.canViewConsole` | Elastic message-traffic query, no jurisdiction filter | **yes** |
| `accesscontrol.*` (all four) | `fetchDenyListData()` and `fetchAccessGroups()` take no jurisdiction argument at all | **yes** |
| `adminoperations.*` | hub-wide operations, not tenant data | no — see Open Questions |
| `'api-doc'.canViewApiDoc` | a static specification | no |

The whole `accesscontrol` block is covered rather than just its entry capability: a role that
should not *see* every jurisdiction's deny list certainly should not *delete* from it, and
covering the block is both simpler to state and simpler to test than picking individual flags.

**This was a live inconsistency in an earlier draft of this design**, which stated the rule
above and then applied it to `console` alone, on the grounds that Finding #13 concretely queues
a scoped grant there. That is a reason to *prioritise* console, not a reason to scope the rule
to it — the Access Control data paths are equally unfiltered, and the next person to apply the
rule as written would have got it wrong. Recorded because the failure mode (a correct rule,
narrowly applied, with the narrowing undocumented) is the one this whole design exists to
prevent.

**Zero behaviour change today.** The only holder of any guarded capability is IZG Operations,
which has `globalTenancy: true`. The guard is pure future-proofing, which is why widening it
costs nothing now and would cost a leak later.

**Any-of declarations evaluate the guard per alternative, not across the array.**
`/api/organizations` is declared `{ capability: [canViewAccessControl, canViewConsole,
onboarding.canViewOnboarding] }`, and only the first two are guarded. A caller holding
`canViewOnboarding` — which is unguarded, and which all four IZG/Jurisdiction roles hold today —
passes on that alternative regardless. Applying the strictest guard across the whole array would
silently break Jurisdiction Operations and Support on that route.

**This is not hypothetical — it is queued.** The spike review's **Finding #13** reads: *"Grant
Console access per the draft's intent (Jurisdiction Support / IZG Program)."*
`_JurisdictionSupportAccess.ts` has `globalTenancy: false`. Executed as the one-line data edit
this design makes easy, Finding #13 hands a jurisdiction-scoped role every jurisdiction's message
traffic. Consequences: (a) this decision is **not optional** and must not be trimmed for scope;
(b) Finding #13 cannot ship until the Console's Elastic query is jurisdiction-filtered — flagged
to the matrix owner now, not when the ticket is picked up; (c) the target matrix's own Admin Log
Search row shows Jurisdiction Support as `—`, contradicting Finding #13, and that needs resolving
regardless.

This is the one place the provisional-values risk is *not* reversible by a later edit, which is
why it belongs in this change.

### 8. `/api-doc` gets a client gate only, and is not counted as secured

`/api-doc` exports `getStaticProps`, and Next forbids exporting both that and
`getServerSideProps`. Converting it would move `createSwaggerSpec({ apis: ['src/pages/api/*/*.ts',
…] })` to request time — and the Dockerfile runner stage copies only `.next`, `next.config.js`
and the beat configs, **not `src/`** — so the spec would be empty in every deployed environment.

So it keeps `getStaticProps`, `AdminGuard` is replaced with an inline `useRoleAccess('api-doc')`
plus an explicit `status === 'loading'` branch, and it goes in the coverage test's allowlist with
that reason.

**Be precise about what this achieves: `/api-doc` is not protected — only its data is.** The gate
hides the UI after hydration; anyone authenticated can still reach the shell, and the denial is
not audited. Acceptable because the shell without a spec is an empty Swagger UI, and
`/api/swaggerjson` behind it *is* gated and *does* audit. **Do not count `/api-doc` among the
pages this change secures.** The honest count is five SSR-gated pages — the four admin pages
plus `/onboarding` (Decision 14) — and one client-hidden one.

### 9. Render on true, never hide on false

`useRoleAccess` returns `{}` while loading, so `{flag && <Control/>}` fails closed while
`{!flag && …}` fails open. Every in-page conditional follows the first form.

Relatedly: **the Access Control tabs do not become conditional.** With no per-tab *read* flags,
all three tabs render for anyone who can enter the page and only mutate controls hide. This
sidesteps a real hazard — `tabValue` is a number (`useState(0)`) and `TabPanel` matches
`index={0|1|2}`, so conditionally rendering a tab silently mis-maps panels. If per-tab read flags
are added later, convert the tabs to string `value` keys first.

### 10. `isAdmin` is retained but frozen

Keeping it is fine. Keeping it *and letting it grow* is not.

The concrete consequence of the second axis is that **any capability gated on `isAdmin` cannot be
granted to a future role by a data edit** — a role like `CDC CISO` ("inspect and *disconnect*
endpoints", one narrow destructive capability) would be `isAdmin: false` by construction. That is
the "support the new role model" requirement failing at the one axis this change does not touch.

So: this change adds **no new `isAdmin` readers** — every new gate goes through `can()`. It
migrates 11 of the ~16 existing capability-gate sites as a side effect (`AdminGuard`,
`checkAdmin`, `Console:289`, six `DenyList`/`FileTypeList` sites, two `Navigation` sites).
`checkAdmin` survives only on `/api/status/reset` and `/api/status/refresh`, where a real
capability is layered *alongside* it, so deleting the middleware later is a pure subtraction. The
`RouteAuthz` argument is the natural home for the remaining migrations: each becomes a single
route's declaration changing from `{ inHandler }` to `{ capability }`.

**Two further sites are migrated deliberately, because both are free and neither requires a
decision.** They bring the total to 13 of ~16:

- **`changerequest/deploy/[...slug].ts:58` → `changerequest.canDeployChange`.** The flag already
  exists and is already IZG-Operations-only, so this is an exact 1:1 replacement — no new flag,
  no seed value to choose, and the route is already being edited for its declaration. It moves
  from the mechanical `{ inHandler }` bucket to a real `{ capability }`, which is why the
  ratchet ceiling is 13 rather than 14.

  It also carries the same defect as Decision 13: the handler is
  `if (session.user.isAdmin) { … }` with **no `else`**, inside a method branch whose only
  alternative throws. A non-admin `GET` therefore falls through, sends nothing, and the request
  resolves without a response — the second instance of that class found in this change's scope.
  Replacing the check with a declaration fixes it structurally, because the wrapper answers 403
  before the handler runs.

- **`allowedusers/bydestination/index.ts:76` → rename only.** It already computes
  `isOperationsRole(session.user.roles)` and merely names the local variable `isAdmin`. Renaming
  it to reflect what it is has zero behaviour change and removes a reader that would otherwise
  look like a real one during the follow-up audit.

**What stays out, and why it is the whole rest of the job.** The remaining sites are not
mechanical — they are the two open decisions:

- **Destination row scoping.** `fetchLoggedInUsersDestinations(isAdmin, …)` and
  `fetchAllowedUsersByDestination(isAdmin, …)` take `isAdmin` as a **row-filter switch** — "see
  every row" vs. "see only these". That is `hasGlobalTenancy(subject)`, not a permission, and the
  fix is a rename through the DB interface (`dynamo.ts`, `DbClientFactory.ts`,
  `ConfigConsoleFetchRepository.ts`) rather than a new capability flag. `fetchEndpointStatus.ts:32`
  is a third instance of the same pattern, reached through `isOperationsRole` rather than
  `isAdmin` — worth naming, because an `isAdmin`-keyed census misses it entirely. Worse, the
  callers disagree: `destinations/index.ts:26` passes `session.user.isAdmin` (IZG Operations
  only) while `bydestination:76` passes `isOperationsRole` (IZG Operations **and** Support).
  Resolving that in favour of the matrix **widens IZG Support from scoped to global** on
  `/api/destinations`.

  That is a grant, and it lands on **the exact account this change nominates as its release
  gate** — IZG Support is the gate precisely because it is the role losing direct-URL access.
  Folding the two changes together would have that account simultaneously gaining reach and
  losing pages, so a tester seeing more destinations than the baseline could not tell intended
  from regression, and the baseline capture (`test-plan.md` Part 1) would stop being
  interpretable. It is the same reasoning as Decision 4, arriving from a different direction.

- **Multi-environment API keys.** `envIds.length > 1 && !session.user.isAdmin` is neither a
  capability nor a jurisdiction — it is **environment reach**, a third scope dimension. Either
  add `apikeys.canManageMultiEnvironmentKeys` (cheap and honest) or model environment as a real
  scope alongside jurisdiction in `can()` (more correct, its own ticket).

After this change, `isAdmin` is down to ~3 capability gates plus the DB row-scoping bucket, and
**every survivor is one of those two decisions**. That reshapes the follow-up from "migrate 16
sites" into "answer two questions and delete a field."

### 11. No runtime kill switch

Seed values live in code, not config, so unlike API Key Management's `apiKeyManagementEnabled`
(IGDD-3444) a bad grant cannot be reverted at runtime. Rollback is a redeploy.

That is the right trade here. The only access this change *removes* is direct-URL access to admin
pages that was never intended, so the blast radius of "we were too strict" is a user discovering
they relied on a hole. And a kill switch would be self-defeating: an off switch on an
authorization gate is an authorization bypass with a flag on it.

The mitigation is the release gate instead — see Migration Plan.

### 12. Extension contract: adding a role is data, not code

Adding `IZG Security`:

| Step | File | Size |
|---|---|---|
| 1 | `rolemapping.ts` — `GROUP_ROLE_MAPPING` entry | 1 line |
| 2 | `rolemapping.ts` — `CcRole` union member | 1 line |
| 3 | `rolemapping.ts` — `ROLE_PRECEDENCE` entry | 1 line |
| 4 | `accesslevel.ts` — `accessLevel` map entry | 1 line |
| 5 | `accessdefinitions/_IZGSecurityAccess.ts` — new role file | 1 file |

**No enforcement code changes at all**, and step 5 cannot be done wrong: `PageControls` is a
required-key type, so the file does not compile until every page block and every flag is present.
Steps 1–4 are the compiler's checklist. Adding a *capability* is symmetrical: one field on the
page's control type → compile errors in every role file → one declaration at the route → one
conditional in the component.

**The one thing that is not mechanical**, and which belongs in `specs/admin-page-access/spec.md`
rather than being re-derived later: the target matrix is keyed by **capability** (`"Change
Request — view Jira ticket"`), this design by **`page.capability`**. Several target rows straddle
page blocks. That row → `page.capability` table must be written down when the matrix is ratified.

### 13. The middleware helper moves out of the route tree

`src/pages/api/api-middleware-helper.ts` ends in `export default withMiddleware` and sits in the
Next.js API route tree, with no `pageExtensions` setting excluding it. Next therefore serves it
at **`/api/api-middleware-helper`**. A request there calls `withMiddleware(req, res)` — which
takes `...middlewareNames: string[]`, so the request and response objects become middleware
names — builds a stack of `undefined`s, returns the wrapper function, and never sends a
response. Next resolves the route without a reply.

**How exposed this actually is.** `src/middleware.ts` covers it: `withAuth` redirects an
unauthenticated request to sign-in, and DPoP enforcement redirects any `/api/*` request lacking
an `x-dpop-proof` header. Address-bar navigation never carries one — the proof comes from the
`window.fetch` interceptor in `_app.tsx` — so the handler is reachable only by an in-app fetch,
and nothing in the app fetches it. This is a latent defect currently absorbed by defence in
depth, not a live unauthenticated endpoint.

**Chosen:** move it to `src/lib/api/api-middleware-helper.ts` and update the 37 import sites.

**Why now rather than as a follow-up.** All 37 importers are already being edited in this change
for the `RouteAuthz` argument, so the move rides along in the same commit for near-zero marginal
cost. Deferred, it is a standalone 38-file diff that looks like pure churn and will keep being
deprioritized. It is also squarely in scope: an unintended endpoint one config change away from
being exposed is what this ticket exists to find, and this one is the authorization module
itself.

**Alternative considered:** leave it and add `pageExtensions` to `next.config.js` (e.g. require
`.page.ts`). Rejected — that renames every page and route file in the repo to fix one misplaced
module, and the misplacement is the actual defect.

**Alternative considered:** leave it and allowlist it in the coverage test. Rejected — it would
pass the coverage test anyway, since it mentions `withMiddleware` on every other line. An
allowlist entry would record that someone looked at it and decided it was fine, which is the
opposite of true.

**Consequence:** one extra mechanical change folded into the route-declaration commits, and the
count reconciles cleanly — the API tree holds 42 files today: 39 routes, two next-auth routes
that legitimately do not use the wrapper, and the helper, which after this change is not in the
tree at all.

**This was found by counting files for the coverage test, not by review**, which is the argument
for the coverage test in miniature: the defect had been in the tree since the helper was written
and nobody had reason to look at it.

### 14. Onboarding is closed with one capability, not a view/mutate split

`/onboarding` checks session presence and no capability — `canViewOnboarding` gates the nav
entry and nothing else, so any authenticated user reaches the page by typing the URL. Worse, all
three routes behind it sit behind `withMiddleware('captureErrors')`, which adds error capture
and **no authorization whatsoever**:

| Route | Methods | Today |
|---|---|---|
| `/api/allowedusers` | GET, **POST, DELETE** | session presence only |
| `/api/allowedusers/bydestination` | GET | session presence only |
| `/api/allowedusersaudit/[...slug]` | GET | session presence only |

So **adding, editing and deleting senders is reachable by any authenticated session**, including
`Sender Operations`. This is the spike review's **Finding #5**, and it was found here by
enumerating the page tree for the coverage test — the same way Decision 13 surfaced.

**Chosen:** gate the page and all three routes on `onboarding.canViewOnboarding`, one capability
across every method.

**Alternative considered:** the full Finding #5 treatment — a new `canManageSenders` flag
separating view from mutate, hidden controls in the five `Onboarding/*` components, and the
matrix data to go with it. Rejected *for this ticket*, on the ground that it is the only
permission value in the whole change with **no safe status quo to copy**. Every other seed here
transcribes today's `isAdmin`-gated access; here, today's answer is "anyone signed in," which is
the bug. Any `canManageSenders` seed is therefore a decision the matrix owner has to make, and
making it inside a security fix — under the "only removes access" banner — is how a judgement
gets shipped as a transcription.

**Consequence:** the hole closes completely. `Sender Operations` is blocked from the page and
all three routes; the four roles holding `canViewOnboarding` see no change, because they can
already do all of it. What remains for Finding #5 is only the granularity question — *should
Jurisdiction Support be able to add senders?* — which is a matrix question, not an open door.
That is a much better-shaped follow-up than the one it replaces.

**Note the scope honestly:** onboarding is not an admin page, so this takes the change slightly
past its ticket title. It is included because the write endpoint is open, it was found by this
ticket's own tooling, and the fix needs no decision from anyone.

### 15. The change-request routes are pulled in, not deferred

These were on the Non-Goals list until the deferral was examined and did not survive it.

| Route | Wrapper today | Methods | In-handler check |
|---|---|---|---|
| `changerequest/index.ts` | `withMiddleware()` — **nothing** | POST, PUT, DELETE | `hasAccessToDestId` only |
| `changerequest/[...slug].ts` | `withMiddleware('captureErrors')` | GET, DELETE | `hasAccessToDestId` only |

Reach is checked; capability never is. Combine that with `IZG Support`'s `globalTenancy: true`
and its `canCancelRequest: false` / `canRescheduleRequest: false`, and **IZG Support can cancel
or reschedule a change request on any destination in the system.** The flags already say no and
nothing reads them. `Jurisdiction Support` has the same gap within its own jurisdiction.

**Chosen:** real `byMethod` declarations —
`{ POST: edit.canCreateChangeRequest, PUT: canRescheduleRequest, DELETE: canCancelRequest }` on
the collection, `{ GET: canViewDetails, DELETE: canCancelRequest }` on the item.

**Why not defer.** Every capability already exists, both routes are already being edited for
their declaration, and gating the `/changerequest` *page* later while leaving these open would
repeat the asymmetry Decision 14 just closed for onboarding. The cost is converting two
`{ inHandler }` parking spots into real declarations, which drops the ratchet from 13 to 11.

**Consequence — this one removes access from real users.** IZG Support and Jurisdiction Support
lose cancel and reschedule. That is the fix, not a side effect, but it is the second-most
visible change in the PR after IZG Support's admin-page denials and belongs in the release
notes rather than being discovered.

### 16. One debt table, not four allowlists

Left unmanaged, this change would create four separate bookkeeping lists: `UNGATED_PAGES`, a
route allowlist, an `inHandler` ceiling, and `UNWIRED_PERMISSIONS`. Four places where someone
under deadline adds an entry instead of fixing the thing, and nothing forcing any of them to be
revisited.

**Chosen:** one typed `AUTHZ_DEBT` table in `src/lib/security/authzDebt.ts`, with a `kind`
discriminator. Each coverage test reads the slice it needs.

Three things fall out that four lists would not give:

- **One place to look.** Partial compensation for what colocating route declarations gives up.
- **A ticket reference required by the type**, not by reviewer memory.
- **No magic number in the ratchet.** The test asserts the source count equals the declared
  rows, so an `{ inHandler }` cannot be added without a row naming a ticket, and closing one
  needs no ceiling decremented in the same commit.

**Deliberately excluded from the table:** things that are permanently fine — `_app`, `404`, the
two next-auth routes, the landing page. Those stay as plain allowlists inside their own tests.
`AUTHZ_DEBT` is for rows that should eventually be zero; mixing in permanent exemptions is
exactly what makes an allowlist entry read as a clearance.

### 17. The role matrix is snapshotted for review

`accessLevel` is pure data with no DB or session dependency, so a node test can import it,
render role × page × capability to a markdown table, and snapshot it.

**The point is review, not documentation.** This design names its own largest risk as a ~60-file
PR getting rubber-stamped. A committed snapshot turns "IZG Support gained
`console.canViewConsole`" into an **explicit diff line** instead of something a reviewer has to
infer from a role-file edit — and it stays useful afterwards as the single artifact answering
"who can do what", which colocation otherwise costs.

**Scope: the role matrix only.** Route declarations are inline across 39 files and would need
source parsing to extract — brittle, and the matrix is where the access risk actually lives.

## Risks / Trade-offs

- **The required `RouteAuthz` argument is compile-breaking across 39 files — there is no partial
  landing.** Mitigated by splitting the migration into two commits: 15 mechanical declarations
  (status quo written down, reviewable in one pass) and 24 carrying real decisions. The PR
  description must tell reviewers which is which and ask them to go commit by commit; the failure
  mode for a ~60-file PR is a rubber stamp, which is the exact risk this design names elsewhere.

- **Success criterion 1 ("a message in the UI") has no automated coverage.** The jsdom test
  environment currently fails to start (`virtualConsole.sendTo is not a function`, from the
  `jsdom@28` override) and CI does not run jest. Every new test asserts props or logger calls; a
  page that receives `accessDenied: true` and forgets to branch on it would pass the entire suite.
  Partially mitigated by a crude static check — every file referencing `withPageAccess` must also
  reference `AccessDenied` — and otherwise by the manual walkthrough, which is the acceptance
  evidence. **Attach a screenshot to the ticket rather than citing a green suite.** Criterion 2
  (the audit entry) *is* fully automated.

- **A provisional seed could lock someone out of work they do daily.** Mitigated by making
  **IZG Support the release gate**: it is the account whose direct-URL access this change removes.
  "IZG Operations still works" is covered by automated tests; "we did not lock support staff out"
  is not. The tester must also be told the `/adminoperations` and `/console` denials are
  intentional and temporary (Finding #14 follow-up) or it will be filed as a regression.

- **`/api/maintenance/update` is the one route whose access genuinely narrows**, gaining both a
  capability check and the tenancy check it has never had. It is migrated last, deliberately, and
  gets its own manual check per role.

- **Threading permissions through the Admin Operations cards is unexplored ground** — those
  components have never had permission props. This is one of the two places the estimate could
  overrun.

- **`PageControls` being a required-key type forces touching all five role files.** Mechanical and
  additive, and the compiler is what guarantees no role is missed — the same trade-off
  `multi-role-permissions` accepted for `globalTenancy` and `sender-role-access` for `onboarding`.

- **Omitting the `as XPageAccessControl` assertions on the new blocks is deliberate.** Assertions
  permit excess properties, so a typo like `canDelteAccessGroup: true` would type-check and be
  `false` forever. The `RoleAccess` annotation on the parent already types the property and
  restores excess-property checking. The existing blocks keep their assertions; not worth churning
  them in this change.

## Migration Plan

1. **Matrix data first.** Adding the `PageControls` keys before filling the role files makes
   `tsc --noEmit` report five errors. That is the required-key completeness proof working —
   observe it deliberately, as `sender-role-access/tasks.md` 2.4 did.
2. Shared vocabulary, then **move the middleware helper out of the route tree** (Decision 13),
   *then* both enforcers. The move must precede the signature change so the import churn and the
   signature churn land in one pass over the same 37 files rather than two. After the enforcers
   land, `tsc --noEmit` fails in all 37 of them. **That is the forcing function working — do not
   work around it.**
3. Route declarations in two commits, mechanical then semantic. Wrap `swaggerjson.ts` and
   `changerequeststatus/[id].tsx`, which bypass `withMiddleware` today and which the compiler
   therefore will *not* flag. Do `maintenance/update` last.
4. Page gates, then in-page gating and nav. **Delete `AdminGuard` in the same commit as its last
   consumer** — if the SSR gate lands while `AdminGuard` remains, the denial message
   server-renders and then `AdminGuard`'s `useEffect` redirects away, so success criterion 1 fails
   intermittently and looks like a flake.
5. Tests, then `npm run code-quality-check && npm run test`, then **`npm run build`** (required
   before calling this done — `tsc`/jest/eslint alone are not sufficient in this repo).
6. **Smoke every route as IZG Operations after step 3.** Because all 39 routes now carry a
   declaration, the expected failure mode is a wrong `page`/`capability` pair or a mis-classified
   mechanical declaration — both surface as an unexpected 401/403. A dev deploy is a much worse
   place to find it.
7. **Release checklist:** confirm `OPERATIONS_GROUP` equals the Okta group mapped to
   `IZG Operations` in **every** environment. The whole "no behaviour change" claim rests on it,
   since `isAdmin` is group-membership while the new flags are role-based.
8. **Rollback is a straight revert/redeploy.** No persisted state changes shape; no API contract
   changes for authorized callers. See Decision 11 on why there is no runtime switch.

## Open Questions

- **Finding #13 vs. the matrix row it cites.** Finding #13 grants Console to Jurisdiction
  Support; the target matrix's Admin Log Search row shows Jurisdiction Support as `—`. These
  contradict. **[CONFIRM with the matrix owner.]** Does not block this change — Decision 7's
  guard rejects the unsafe reading either way — but it blocks the follow-up ticket.
- **Does IZG Operations really lose API Key Management?** The target matrix grants API Key
  view/create-renew-revoke to IZG Security + Jurisdiction Security **only**; IZG Operations is
  `—`. Finding #18 covers only Jurisdiction Operations. `_IZGOperationsAccess.ts:66` has
  `canListApiKeys: true` today. **[CONFIRM before anyone acts on Finding #18.]** Out of scope
  here; this change does not touch the `apikeys` block.
- **Access Control / Deny List / ADS File Types are inconsistent between Hub and CC rows** in the
  target matrix — granted to IZG Operations on the Hub rows, IZG Security only on the CC rows,
  for the same underlying resources. **[RAISE with the matrix owner.]** The seed here follows
  today's access and is unaffected either way.
- **Swagger API Doc's target holders are marked Unconfirmed** by Keith. Seeded to IZG Operations
  (today's behaviour) pending confirmation.
- **Should the `adminoperations` capabilities carry `requiresGlobalTenancy` too?** Decision 7
  covers `console` and `accesscontrol`, whose data paths are unfiltered reads of every tenant's
  data. Admin Operations is a different argument: hub-wide circuit-breaker reset, database
  refresh and key rotation are not data *exposure* but **blast radius** — a jurisdiction-scoped
  role performing them would affect every tenant without seeing any of them. That is arguably
  the same concern and arguably not, and it deserves its own decision rather than being folded
  in silently. No live risk either way: the only holder is IZG Operations, which is globally
  scoped. **[DECIDE before any scoped role is granted an Admin Operations capability.]**
- **Should `/api/accesscontrol` and `/api/filetype` be deleted rather than gated?** Both have
  **zero verified callers in `src/`**. Gating is the safe move now; deletion is a product call,
  tracked separately along with `/passwordencryption`, `/add` and `/user` (zero inbound links
  each).
