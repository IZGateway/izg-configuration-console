---
schema_version: '1.0'
created:
  date: '2026-11-02T22:49:35.844Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '1.0'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~0606c3e9-cd38-4d9a-a741-d7eb31a0c3ee
  summary: >-
    design.md for protect-connection-pages-and-endpoints, including PO decision
    on Edit Connection seed values
updated:
  - date: '2026-11-02T23:21:59.032Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~d36e789d-b96c-4fc6-a38a-7cc990bfbca4
    summary: >-
      Correct design.md: reuse existing scope/REQUIRES_DESTINATION_SCOPE
      mechanism (PR #756) instead of inventing ReachSource
  - date: '2026-11-02T22:59:51.027Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~967f5c9a-fcab-44d1-ba4b-2dc089326fda
    summary: >-
      Add the four split-decision retrofit routes to the Decisions section,
      including the changerequest DELETE in-handler exception; Replace stale
      unmigrated-routes risk with risks specific to the retrofit; Add retrofit
      step to Migration Plan ordering
  - date: '2026-11-02T22:58:26.127Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~85ca8f7f-b812-4616-b21d-789f40bccc7d
    summary: >-
      Remove confusing negative non-goal bullet; retrofit belongs in
      Goals/Decisions instead; Add split-decision retrofit to Goals explicitly
  - date: '2026-11-02T22:57:21.066Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~34e9b0bf-5c35-44af-9a12-d0123fd49b1f
    summary: >-
      Fix stale Non-Goals bullet: fold existing split-decision rows into this
      change's scope
change_request: protect-connection-pages-and-endpoints
ticket: 'IGDD-3545, IGDD-3548'
---
# Design

## Context

See `proposal.md` - Why for motivation. The relevant mechanism already exists:

- `withPageAccess(pageKey, handler?)` (`src/lib/security/pageAccessGate.ts`) gates a page in
  `getServerSideProps`, denies in place (no redirect), and logs an `AccessDenied` audit event.
  `PAGE_ENTRY` (`src/lib/security/accessregistry.ts`) maps each page key to its entry capability.
- API routes declare authorization as the first argument to `withMiddleware`
  (`src/lib/api/api-middleware-helper.ts`): `{ capability: CapabilityRef | CapabilityRef[] }`,
  `{ byMethod: ... }`, `{ session: true }`, `{ public: string }`, or the escape hatch
  `{ inHandler: string }`, which requires naming a ticket and is counted against a parallel debt
  table, `authzDebt.ts`.
- `can(subject, page, capability, scope)` (`src/lib/security/policy.ts`) already evaluates a
  capability and a jurisdiction/destination scope together, per role, correctly — `status/reset`
  already uses it in-handler. Nothing today lets a route *declare* that combined check; a
  capability declaration always uses `ANY_JURISDICTION`, and the only destination-scoped check
  available is the separately-attached, reach-only `checkAccessToDestIdSlug` middleware.
- `authzDebt.ts` carries three row kinds relevant here: `ungated-page`, `unwired-flag`, and
  `in-handler`. Two ratchet tests in `accessregistry.test.ts` fail if source and table drift
  apart: an `inHandler:` occurrence count must equal the `in-handler` row count, and no route may
  declare a capability whose `unwired-flag` row still exists.
- **PO decision (2026-11-02):** Edit Connection's existing seed values (all five flags true only
  for IZG Operations and Jurisdiction Operations, false for IZG/Jurisdiction Support) are
  confirmed as the enforced target. No temporary widening, no further sign-off step - this is
  recorded here as the Product Owner decision, not a deferred question.

## Goals / Non-Goals

**Goals:**
- Gate the five connection pages and wire their in-page controls to existing matrix capabilities.
- Declare permissions on the five named routes, replacing their `inHandler` escape hatch.
- Add a composable reach requirement to `RouteAuthz` so capability and destination-scoped reach
  can be declared together and evaluated as one same-role decision, closing the gap without
  reproducing the `changerequest`-style split-decision pattern.
- Gate the two ungated ConnectionTable report controls.
- Retrofit the four existing `split-decision` rows (`changerequest/index.ts`,
  `changerequest/[...slug].ts`, `maintenance/update/[...slug].ts`, `allowedusers/index.ts`) onto
  the same primitive, closing them now rather than deferring - see Decisions.
- Retire every `ungated-page`, `unwired-flag`, `in-handler`, and `split-decision` row this change
  closes.

**Non-Goals:**
- IGDD-3549 (API key endpoints) - separate change, blocked on an unrelated decision.
- Deprecating `checkAccessToDestIdSlug`/`hasAccessToDestId` generally - other routes still use
  them correctly as a reach-only check with no paired capability; only the routes migrated here
  stop attaching that middleware.

## Decisions

**Reuse `withPageAccess` as-is; no new page-gating mechanism.** `edit` and `history` currently
have no `getServerSideProps` at all, so one is added, wrapping the page in `withPageAccess('edit'
| 'history', ...)`. `test`, `changerequest`, and `testreport` already have a `getServerSideProps`
with a hand-rolled session check; that check is deleted and the existing function body is passed
to `withPageAccess` as its handler. Alternative considered: a lighter inline check per page -
rejected because it would duplicate logic `withPageAccess` already centralizes (denial audit
logging, the in-place denial convention) and would not satisfy the coverage test's
`withPageAccess` substring scan.

**`testreport` reuses the `test` page's capability; no new `PAGE_ENTRY` key.** Same precedent as
`/passwordencryption` reusing `adminoperations`. Alternative considered: give it its own
capability, as `authzDebt.ts`'s current row for it suggests - rejected per the proposal's
reasoning that its audience is always identical to Test's, since it is reached only from Test's
own Generate Report action.

**Correction found during implementation:** the composable primitive sketched during design
already exists, under different names, landed by an unrelated PR (#756) after this design's
research was done. `RouteAuthz`'s `{ capability, scope? }` variant already carries a
`scope?: (req: NextApiRequest) => string | undefined` extractor, and `decideRouteCapability`
already runs the combined same-role `can()` check for any capability listed in the central
`REQUIRES_DESTINATION_SCOPE` array (`accessregistry.ts`) - currently just
`console.canViewConsole`. No new `ReachSource` type is needed. What's actually missing:

1. **`REQUIRES_DESTINATION_SCOPE` needs an entry for every capability this change declares with
   a `scope` extractor** - without one, `decideRouteCapability` silently falls back to
   `decideCapability` (`ANY_JURISDICTION`) and the `scope` extractor is ignored, reproducing the
   split-decision bug invisibly. Added: `history.canViewConnectionInfo`,
   `history.canViewChangeHistory`, `history.canViewHubStatusHistory`, `test.canRunConnectionTest`,
   `manageconnections.canResetCircuitBreaker`, `manageconnections.canScheduleMaintainance`,
   `edit.canCreateChangeRequest`, `changerequest.canRescheduleRequest`,
   `changerequest.canCancelRequest`, `changerequest.canViewDetails`, `onboarding.canManageSenders`.
2. **`byMethod`'s value type gains the same optional `scope` field** `CapabilityRef & { scope?:
   (req: NextApiRequest) => string | undefined }` - today only the non-`byMethod` variant carries
   `scope`, and every retrofit route in Group 3 needs it per-method.
3. **`byMethod`'s value type also gains a per-method `{ inHandler: string }` escape** -
   needed by exactly one case, `changerequest/[...slug].ts`'s DELETE (see below), which can't
   declare a capability at all because its destination id only exists after a database lookup.
   `enforceRouteAuthz`'s `byMethod` branch checks for `inHandler` on the resolved method entry
   before calling `satisfies`, mirroring the existing top-level `inHandler` check. This is the
   smallest extension that keeps the existing `inHandler:` ratchet test working unchanged - it
   still just counts literal occurrences of that token in route source.

This does not change which capabilities get declared where, or which routes end up declarative
vs. in-handler - only the mechanism by which the declaration gets made.

**The five `inHandler`/reach-only routes land on this primitive as follows:**

| Route | Capability | Reach |
|---|---|---|
| `destinations/[...slug].ts` | `history.canViewConnectionInfo` | `fromSlug: 1` |
| `destinationaudit/[...slug].ts` | `history.canViewChangeHistory` | `fromSlug: 1` |
| `status/reset/[...slug].ts` | `manageconnections.canResetCircuitBreaker` | `fromSlug: 1` |
| `statushistory/[...slug].ts` | `history.canViewHubStatusHistory` | `fromSlug: 1` |
| `tests/connectiontest/[...slug].ts` | `test.canRunConnectionTest` | `fromSlug: 1` |

`status/reset` changes from an in-handler `can()` call to the declarative form - same outcome,
now visible at the route's definition site. `destinations` and `destinationaudit` gain a
capability check where none existed before (previously reach-only); `statushistory` and
`tests/connectiontest` likewise. All four reuse capability flags already governed by the PO
decisions covering the matching page gates and in-page controls, so no additional seed-value
decision is needed for them.

**The four existing `split-decision` routes are retrofitted onto the same primitive:**

| Route | Method(s) | Capability | Reach |
|---|---|---|---|
| `changerequest/index.ts` | POST | `edit.canCreateChangeRequest` | `fromBody: 'destId'` |
| `changerequest/index.ts` | PUT | `changerequest.canRescheduleRequest` | `fromBody: 'destId'` |
| `changerequest/index.ts` | DELETE | `changerequest.canCancelRequest` | `fromBody: 'destId'` |
| `changerequest/[...slug].ts` | GET | `changerequest.canViewDetails` | `fromSlug: 1` |
| `maintenance/update/[...slug].ts` | — | `manageconnections.canScheduleMaintainance` | `fromSlug: 1` |
| `allowedusers/index.ts` | POST, DELETE | `onboarding.canManageSenders` | `fromBody: 'destinationId'` |

`allowedusers/index.ts`'s GET is unaffected - it has no destination argument and stays
capability-only. `maintenance/update/[...slug].ts` drops the shared `checkAccessToDestIdSlug`
middleware it currently names, which changes a reach-only denial from 401 to 403 for this route
alone (the other five routes that still use that middleware directly are untouched); no client
code in `src` branches on 401 vs. 403 for this endpoint, so this is not a user-visible regression.

One method does not fit the static `reach` field: `changerequest/[...slug].ts`'s DELETE takes a
change-request id, not a destination id, and the handler must fetch the record
(`fetchDestinationChangeRequestById`) before `changeRequest.destId` exists at all - there is
nothing for `fromSlug`/`fromBody`/`fromQuery` to point at before that lookup runs. For this one
method only, the fix is an in-handler `can()` call after the lookup, matching `status/reset`'s
existing pattern - correct and combined, just not declarative. Its `authzDebt.ts` row converts
from `split-decision` to `in-handler` rather than being deleted outright; every other row in both
tables above is deleted.

**ConnectionTable's two ungated controls are threaded, not re-architected.** The mobile Generate
Report button already has `accessLevels` in scope and is wrapped directly. The Test Report(s)
toggle (`CustomToolbar`) and desktop Generate Report button (`CustomFooter`) are both
module-level components outside `accessLevels`' scope; `canRunConnectionTest` is added to
`CustomToolbarProps` and to the `CustomFooter` call site's props, matching how other data already
reaches those components.

## Risks / Trade-offs

- [Risk] The hardcoded 7-element gated-page array in `accessregistry.test.ts` must be manually
  extended to include the 5 new page keys, or the coverage test fails. → Mitigation: this is a
  ratchet, not a silent gap - a missed update fails CI loudly, and it's an explicit task-list item.
- [Risk] The two ratchet tests (`inHandler:` count, `unwired-flag` regex scan) require the
  `authzDebt.ts` edit and the corresponding source edit to land in the same commit. → Mitigation:
  tasks.md groups each row removal with its code change, per the project's interleaving
  convention, rather than batching all debt-row deletions at the end.
- [Risk] Retrofitting four already-shipped routes changes real, live authorization behavior
  (closing a theoretical role-stacking escalation most users never exercised), not just adding
  enforcement to previously-unchecked surfaces. → Mitigation: the only combination that could
  exploit any of these gaps is the one documented, acknowledged case (a Jurisdiction
  Security/Operations split across jurisdictions on the same identity) - no legitimate
  single-role user's access changes.
- [Risk] `changerequest/[...slug].ts`'s DELETE stays in-handler rather than declarative, unlike
  every other route this change touches. → Mitigation: this matches `status/reset`'s existing,
  already-correct pattern; its debt row is relabeled `in-handler` rather than deleted, so the
  remaining gap stays visible rather than being hidden by a false "resolved" state.

## Migration Plan

No data migration. Recommended landing order, each independently revertable:
1. The `reach` primitive plus `status/reset`'s conversion (pure refactor, zero behavior change,
   lowest risk - proves the primitive before anything depends on it for new enforcement).
2. `destinations`, `destinationaudit`, `statushistory`, `tests/connectiontest` (new enforcement,
   same capability flags the page-gate work also seeds).
3. The four `split-decision` retrofits (`changerequest` x2, `maintenance/update`,
   `allowedusers/index.ts`) - closes a real, if narrow, escalation path, independent of the page
   gates below.
4. The five page gates and in-page control wiring (depends on the capability flags being correct,
   which they already are per the PO decision above).
5. ConnectionTable's two button fixes (independent UI consistency fix, no ordering dependency).

Rollback is a plain revert of the relevant commit/PR; re-adding an `authzDebt.ts` row is the
correct way to pause any one piece without blocking the others.
