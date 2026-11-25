---
schema_version: '1.0'
created:
  date: '2026-11-07T21:44:49.033Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '5'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~043440be-796c-4c07-b032-cd073468842c
  summary: Write design.md for declare-api-key-endpoint-permissions (IGDD-3549)
updated:
  - date: '2026-11-09T19:48:13.786Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~4e0c8420-55d6-481c-9b2b-a7a689be0ac2
    summary: >-
      Correct Decision 4: the feature flag moved from in-handler to a
      first-class featureFlag option on the declarative gate, per PR #778 review
      (Anusha) and the user's standing rule that PR findings on an open CR
      return to that CR.; Add Decision 7 documenting the scope-resolution
      reordering and capability prefilter added in enforceRouteAuthz per PR #778
      review (Anusha comment #3).
  - date: '2026-11-08T16:45:39.432Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~73a28005-aabe-4678-8a5b-cbab5a5b2e0b
    summary: >-
      Correct design.md Decision 4: canActOnJurisdiction has a real remaining
      caller (scopeToOwnedJurisdictions) and must not be deleted
  - date: '2026-11-08T15:53:06.618Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~c4b621a4-8b50-4b92-947b-d54560a93b1e
    summary: >-
      Add Decision 6 documenting the lifecycle.test.ts authorization-coverage
      split; Point Migration Plan step 2 at the new authorization.test.ts file
  - date: '2026-11-08T14:47:14.347Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~1eaf0282-a45d-4062-80d1-c8849389c50f
    summary: >-
      Fix design.md Decision 3 mapping table: add missing apikeys/index.ts
      PATCH/DELETE rows
ticket: IGDD-3549
change_request: declare-api-key-endpoint-permissions
---
# Design

## Context

See `proposal.md` for motivation and `specs/page-authorization/spec.md` for the behavioral
contract. This covers how.

Today, `src/lib/api/api-middleware-helper.ts`'s `enforceRouteAuthz` resolves a route's `scope`
extractor synchronously (`authz.scope(req)`), then passes the resolved string (or `undefined`) to
`decideRouteCapability` (`accessregistry.ts`), which checks `REQUIRES_DESTINATION_SCOPE`: if the
capability is in that list and a scope value resolved, it decides per-destination; if the
capability is in that list and no value resolved, only globally-scoped roles pass. Every route
using a `REQUIRES_DESTINATION_SCOPE` capability today declares a `scope` extractor — none rely on
omitting one.

`src/lib/security/apiKeyAuthz.ts` is the seven routes' current in-handler authority:
`hasApiKeyPermission` (capability-only, any jurisdiction), `canActOnJurisdiction`/
`requireApiKeyAccess` (capability + jurisdiction, via a private `prefixOf` that reads the
jurisdiction's prefix from DynamoDB). The jurisdiction value these routes check is never on `req`
directly — it is either a query/body field read as-is, or a value looked up from a credential's
`sortKey` first (the IDOR-safe pattern already used by `token.ts`, `renew/index.ts`, and
`verify-domain.ts`'s GET).

## Goals / Non-Goals

**Goals:**

- Let `scope` resolve asynchronously, so a route's reach requirement can come from a lookup, not
  only a value already on `req`.
- Let a capability be declared with a reach requirement on one route and without one on another
  (the list routes vs. the single-credential routes), without changing behavior for any
  already-shipped route.
- Declare `capability` (+ `scope` where the route is single-jurisdiction) on all seven routes,
  closing their `in-handler` rows.
- Remove the `session.user.isAdmin` multi-environment check outright (per the resolved decision),
  with no replacement flag.
- Narrow IZG Operations off `apikeys.*`.

**Non-Goals:**

- Splitting `canListApiKeys` into separate list/single-jurisdiction capabilities — the new
  shared-capability rule makes that unnecessary.
- Jurisdiction Operations' `apikeys.*` flags or creating `Jurisdiction Security` — IGDD-3500.
- Sender Operations — being retired separately.
- Any change to `REQUIRES_DESTINATION_SCOPE` capabilities already in production use.

## Decisions

### 1. `scope` may return a `Promise`

`scope?: (req: NextApiRequest) => string | undefined` becomes
`scope?: (req: NextApiRequest) => string | undefined | Promise<string | undefined>` on both the
top-level `capability` shape and the `byMethod` per-method shape. `enforceRouteAuthz` already runs
inside an `async` middleware function; it awaits whatever `scope`/`ref.scope` returns, inside the
same try/catch that already treats a throw as "no destination."

Alternative considered: give `apikeys/*` routes a synchronous scope by pre-resolving the prefix
somewhere earlier in the middleware stack (e.g. a dedicated `resolveApiKeyPrefix` middleware
reading into `asyncRequestContext`). Rejected — it splits one route's authorization across two
unrelated-looking declaration sites, which is exactly what this mechanism exists to avoid.

### 2. Distinguish "no reach requirement declared" from "declared, but unresolved"

`enforceRouteAuthz` currently collapses both into `scope: undefined` and cannot tell them apart.
Add a second boolean — whether `authz.scope` (or `ref.scope` under `byMethod`) is present on the
declaration at all, captured once before the extractor is even called — and thread it into
`decideRouteCapability(subject, ref, scope, hasScope)`:

- `hasScope` true, value resolves → today's per-destination decision.
- `hasScope` true, no value resolves (throws, or resolves to nothing) → today's global-only
  fallback, unchanged. This is the safety net for a malformed or unexpected request shape.
- `hasScope` false → skip the destination-scope branch entirely; decide by `decideCapability`
  (any held role, any jurisdiction) — the same answer as if the capability were not in
  `REQUIRES_DESTINATION_SCOPE` for this declaration.

Safe to add: grep confirms no shipped route today declares a `REQUIRES_DESTINATION_SCOPE`
capability without a `scope` extractor, so no existing behavior changes. A new test asserts this
stays true (see Risks).

Alternative considered: a second, separate capability for the single-jurisdiction operations.
Rejected per Keith's correction — both shapes are legitimately "scoped," just to a set vs. a
single value, and the mechanism should express that without multiplying capability names across
every role's matrix.

### 3. Per-route mapping

| Route | Method | Capability | Reach requirement |
|---|---|---|---|
| `apikeys/index.ts` | GET | `canListApiKeys` | none — `scopeToOwnedJurisdictions` narrows rows after |
| `apikeys/index.ts` | POST | `canCreateApiKey` | `jurisdictionId` (body) → prefix |
| `apikeys/index.ts` | PATCH | `canRevokeApiKey` | `sortKey` (body) → credential → stored `jurisdictionId` → prefix |
| `apikeys/index.ts` | DELETE | `canCancelApiKey` | `sortKey` (body) → credential → stored `jurisdictionId` → prefix |
| `apikeys/domains.ts` | GET | `canListApiKeys` | `jurisdictionId` (query) → prefix |
| `apikeys/token.ts` | POST | `canCreateApiKey` | `sortKey` (body) → credential → stored `jurisdictionId` → prefix |
| `apikeys/renew/index.ts` | POST | `canRenewApiKey` | `oldSortKey` (body) → credential → stored `jurisdictionId` → prefix |
| `apikeys/verify-domain/index.ts` | GET | `canCreateApiKey` | `sortKey` (query) → credential → stored `jurisdictionId` → prefix |
| `apikeys/verify-domain/index.ts` | POST | `canCreateApiKey` | `jurisdictionId` (body) → prefix |
| `apikeysaudit/index.ts` | GET | `canListApiKeys` | none — row-filtered after, same as `apikeys/index.ts` GET |
| `apikeysaudit/[sortKey].ts` | GET | `canListApiKeys` | `sortKey` (query) → credential → stored `jurisdictionId` → prefix |

Where a credential lookup resolves the scope, it reads the credential's *stored* `jurisdictionId`,
never one the caller supplies directly — the existing IDOR protection in `token.ts`/
`renew/index.ts`/`verify-domain.ts` GET, preserved exactly, now expressed as the route's declared
reach requirement instead of an in-handler check. `verify-domain.ts` POST keeps trusting the body's
`jurisdictionId` directly, matching today's code (it separately validates the named domain belongs
to that jurisdiction before acting).

A small shared resolver (`prefixOf`, promoted from private to exported in `apiKeyAuthz.ts`) backs
every `→ prefix` step above, so the seven declarations share one lookup rather than seven copies.

### 4. `apiKeyAuthz.ts`'s role shrinks to the prefix lookup, not all of it

`canActOnJurisdiction` and `requireApiKeyAccess` exist today specifically to combine capability and
jurisdiction in-handler. Once the declarative gate does that combination before the handler runs,
every per-REQUEST call site of `requireApiKeyAccess` becomes a redundant second check — remove it,
along with `hasApiKeyPermission`/`getApiKeyAccess` (the pre-checks in `apikeysaudit/*` and
elsewhere, which exist only to pre-empt the same decision the declarative gate now makes first).

`canActOnJurisdiction` is different: `scopeToOwnedJurisdictions` (`src/lib/apikeys/scope.ts`) calls
it per ROW to filter a list to the caller's own reach — a decision the route-level declarative gate
cannot make, since it decides once per request, not once per credential. It stays, with its doc
comment clarified to say so (corrected during implementation — grep confirmed a real remaining
caller before deleting it).

`isApiKeyManagementEnabled()` is a release flag, not an authorization decision — originally kept as
a plain in-handler check in every route, with nothing to do with `RouteAuthz` or `authzDebt.ts`.

**Corrected during PR #778 review (Anusha):** the in-handler placement ran the flag check AFTER
`enforceRouteAuthz`, not before, so any caller without the relevant apikeys capability (any role,
in any environment where the feature is simply off) produced an `AccessDenied` audit event for a
state that is not an RBAC decision at all. Moved to a new `featureFlag?: () => boolean` option on
`RouteAuthz`'s `capability`/`byMethod` shapes, checked in `enforceRouteAuthz` right after the
session check and ahead of any capability/scope work — a disabled feature now answers 403 directly,
before the capability decision and before any `AccessDenied` log. Still not `RouteAuthz`'s policy
layer in the `authzDebt.ts` sense (it carries no capability/role semantics of its own), but it now
lives in the one place that decides whether a request reaches a route's business logic, instead of
nine separate in-handler copies.

### 5. Role narrowing

`_IZGOperationsAccess.ts`'s `apikeys` block (`canListApiKeys`, `canCreateApiKey`, `canRenewApiKey`,
`canRevokeApiKey`, `canCancelApiKey`) moves from all-`true` to all-`false`. Update the committed
role-matrix snapshot in the same commit.

### 6. Splitting `lifecycle.test.ts`'s authorization coverage into a new file

`src/__tests__/api/apikeys/lifecycle.test.ts` covers all five of `apikeys/index.ts`, `token.ts`,
`renew/index.ts`, `domains.ts`, and `verify-domain/index.ts` together, and mocks `withMiddleware`
as an identity pass-through at module scope so it can test each handler's business logic in
isolation. Its `role gate`, three `tenancy gate` blocks, and `multi-environment credentials
(admin only)` describe blocks exercise the in-handler `hasApiKeyPermission`/`requireApiKeyAccess`
calls this change removes — not a lost guarantee (the role/tenancy protections those blocks check
still exist after conversion, just moved into the declarative gate), but the file's own mock
disables the one place that protection now runs, so those blocks cannot pass through this harness
regardless of how a route is converted.

Jest's `jest.mock(...)` is module-scoped, not per-describe-block, so the replacement assertions
cannot land back in the same file without un-mocking it for every test there (which would also
need a `next-auth/jwt` `getToken` mock this file doesn't currently have, and would couple the
business-logic tests' `authedSession` role to the matrix narrowing in Decision 5). Resolution: a
new `src/__tests__/api/apikeys/authorization.test.ts`, carrying no middleware mock, grown
incrementally — each of groups 2-7 below adds that group's real-gate assertions there (same
`signIn`/`request`/`response` pattern already proven in `api-middleware-helper.test.ts`, now
pointed at the real route export) in the same step it deletes that group's now-obsolete describe
block from `lifecycle.test.ts`. No separate test-design pass; the content is "remove the stale
assertion, add its replacement for the same route," just landing in a file the real gate can
actually run in.

Alternative considered: un-mock `withMiddleware` for the whole `lifecycle.test.ts` file instead of
creating a new one. Rejected — ties ~40 unrelated business-logic tests to both a new mock
dependency and the Decision 5 role change, for a file whose own header states its purpose is
testing handlers in isolation from the middleware.

### 7. Scope resolves after the session check, and only when some held role could ever hold the capability

**Added during PR #778 review (Anusha).** `enforceRouteAuthz` resolved a route's `scope` extractor
(which may read the DB — e.g. `scopeFromCredentialSortKeyInBody` loading the credential) before
checking whether the request even had a valid session, and unconditionally, with no prefilter on
whether any held role could ever be granted the capability regardless of scope. So an expired
session, a caller with no apikeys role at all (e.g. IZG Support), or a request mid-DynamoDB-outage
all triggered 1-3 DynamoDB reads before being refused — and an outage during that read surfaced as
a 500 for a caller who was always going to be denied anyway.

Fixed by reordering `enforceRouteAuthz`: the session check (401) now runs before any `scope`
resolution, for both the top-level `capability` shape and the `byMethod` shape. Before resolving
`scope`, a new prefilter — `decideCapability(subject, ref)` for the single-ref case,
`refs.some(...)` for an any-of array, `decideCapability(subject, ref)` per method under
`byMethod` — asks whether ANY held role could grant the capability at all, ignoring destination
scope entirely (the same question `ANY_JURISDICTION` already answers via `findGrantingRole`). A
`false` answer denies immediately without ever calling `scope`. A `true` answer still resolves
`scope` and runs the full `grantingRoleForRoute` decision unchanged — the prefilter only
short-circuits the deny path, never the allow path, so it cannot grant anything the full decision
would have refused.

This mirrors the "skip the DynamoDB read for a caller that no held role could ever allow" guarantee
the removed in-handler `requireApiKeyAccess` used to provide (Decision 4), now expressed in the
shared gate instead of per-route.

## Risks / Trade-offs

- **[Risk]** `decideRouteCapability`'s new `hasScope` parameter touches the function every declared
  destination-scoped route already runs through. → **Mitigation:** behavior is unchanged whenever
  `hasScope` is true (today's only case in production); add a test asserting every route declaring
  a `REQUIRES_DESTINATION_SCOPE` capability also declares a `scope` extractor, so a future route
  can't silently land in the new `hasScope: false` branch by omission.
- **[Risk]** The four credential-lookup routes (`token.ts`, `renew/index.ts`, `verify-domain.ts`
  GET, `apikeysaudit/[sortKey].ts`) now resolve the credential once for the reach check and the
  handler re-reads it for the actual operation — two DynamoDB reads instead of one. →
  **Mitigation:** accepted; these are low-volume administrative operations, not a hot path.
- **[Risk]** IZG Operations loses real, currently-held access. → **Mitigation:** already accepted
  by the PO (Anusha's 2026-10-28 comment on the ticket); same shape of risk IGDD-3498 already
  shipped, with the same pre-provisioning expectation (affected users already in IZG Security
  before this lands).

## Migration Plan

1. Land the middleware extension (async `scope`, `hasScope` distinction) and its ratchet test
   first — pure addition, no route changes yet, so it can be verified with zero behavior change
   before anything depends on it.
2. Convert the seven routes one file at a time, each with its own test exercising both the
   capability-only and destination-scoped shapes — landed in
   `src/__tests__/api/apikeys/authorization.test.ts` (Decision 6), paired with deleting that
   route's now-obsolete authorization assertions from `lifecycle.test.ts` in the same step.
3. Remove the `isAdmin` multi-environment checks.
4. Narrow IZG Operations and update the role-matrix snapshot.
5. Close the seven `in-handler` rows in `authzDebt.ts` last, once source no longer contains any of
   them — the existing ratchet test enforces the count match.

Rollback is a plain revert; no data migration, no schema change.
