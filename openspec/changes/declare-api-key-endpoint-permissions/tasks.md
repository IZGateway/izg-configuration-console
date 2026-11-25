---
schema_version: '1.0'
created:
  date: '2026-11-07T21:50:09.773Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '5'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~6e558c72-6ecb-42ec-93d5-6fdafc23fe15
  summary: Write tasks.md for declare-api-key-endpoint-permissions (IGDD-3549)
updated:
  - date: '2026-11-09T19:50:01.499Z'
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
      Fix comments 12.3 and 12.4: per the user's standing rule, PR findings on
      an open CR go back into that CR rather than a separate follow-up piece of
      work. Implemented both fixes directly in enforceRouteAuthz (design.md
      Decision 7, Decision 4 correction) with new regression tests.; Add
      verification task 12.10 for the 12.3/12.4 fixes and drop the now-resolved
      follow-up item from Workflow follow-up.; Fix an arithmetic error in
      12.10's test-count description (recompute: 7 tests added, 4 removed, net
      +3, not the originally stated 5 net of 1).
  - date: '2026-11-09T19:25:35.341Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~636809c6-8a42-4e99-9010-ea586d3bf607
    summary: >-
      Correct invented E2E_RBAC_IZG_SEC_* env var names to the real
      E2E_RBAC_IZG_SECURITY_* convention already wired into
      playwright-nightly.yml and documented in e2e/rbac/README.md; drop the
      nonexistent _FULLNAME variant; correct the framing from a personal action
      item to a CI secret-value/Okta-provisioning gap tracked under IGDD-3600.;
      Correct the Okta test account follow-up item: the CI secret plumbing
      already exists, the open item is the underlying Okta account (IGDD-3600)
      and the secret values, not a personal .env.test action for the user.
  - date: '2026-11-09T18:51:19.421Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~21b5c7d5-d5cf-4b7e-b0a9-051d688cc922
    summary: >-
      Record PR #778 review round 2 (Anusha, 7 inline comments) triage and
      resolutions in tasks.md group 12
  - date: '2026-11-08T17:38:32.442Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~a05b0a69-b4df-4d3b-b687-26ddfc289ec7
    summary: Record /review findings and their triage/resolution in tasks.md 11.4
  - date: '2026-11-08T17:00:26.654Z'
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
      Mark tasks.md group 3 (apikeys/domains.ts conversion) complete; Mark
      tasks.md group 4 (apikeys/token.ts conversion) complete; Mark tasks.md
      group 5 (apikeys/renew/index.ts conversion) complete; Mark tasks.md group
      6 (apikeys/verify-domain/index.ts conversion) complete; Mark tasks.md
      group 7 (apikeysaudit conversion) complete; Mark tasks.md group 8
      complete; note the canActOnJurisdiction correction vs design.md; Mark
      tasks.md group 9 complete; document the UI isAdmin-gate fix and
      test-fixture updates required by the IZG Operations narrowing; Mark
      tasks.md group 10 (authzDebt closure) complete; Mark tasks.md group 11
      verification steps 11.1-11.3 complete
  - date: '2026-11-08T15:59:51.980Z'
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
      Point each route group's verify step at the new authorization.test.ts file
      and pair it with deleting the obsolete lifecycle.test.ts assertions; mark
      group 2's code tasks done, tests pending; Mark tasks.md group 2
      (apikeys/index.ts conversion) fully complete, code and tests
  - date: '2026-11-08T14:47:29.542Z'
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
      Mark tasks.md group 1 complete for declare-api-key-endpoint-permissions;
      Extend tasks.md group 2 with the missing PATCH/DELETE conversions for
      apikeys/index.ts
ticket: IGDD-3549
change_request: declare-api-key-endpoint-permissions
---
# Tasks

## 1. Extend the middleware for async, shared-capability scope declarations

- [x] 1.1 Change `scope`'s type on both the `capability` and `byMethod` shapes in `RouteAuthz` to
      allow `Promise<string | undefined>`; await it in `enforceRouteAuthz` (top-level and
      per-method). Verify: `tsc --noEmit` passes; every existing destId-scoped route's tests from
      the prior CR still pass unchanged. New tests added for an async extractor (resolves, and
      rejects) in `api-middleware-helper.test.ts`.
- [x] 1.2 Thread a `hasScope` boolean (whether `authz.scope`/`ref.scope` is present on the
      declaration, captured before calling it) into `decideRouteCapability`, so a route declaring
      a `REQUIRES_DESTINATION_SCOPE` capability with no `scope` property decides via
      `decideCapability` instead of the global-only fallback. Verify: new cases in
      `api-middleware-helper.test.ts` (through the real `enforceRouteAuthz` caller, not a direct
      unit test of `decideRouteCapability`) covering both branches — a jurisdiction-scoped role
      passes a no-scope declaration; a declared-but-unresolved scope still falls back to
      global-only. The pre-existing "fails closed without a destination" test's "no scope
      declared" cases were split out into their own describe block with the opposite expectation,
      since that is now the correct, intentional behavior.
- [x] 1.3 Add a ratchet test asserting every `REQUIRES_DESTINATION_SCOPE` declaration with no
      `scope` extractor is named on an explicit, reasoned allowlist (not a blanket "every
      declaration has scope" assertion — `apikeys.canListApiKeys` will deliberately have both
      shapes once groups 2/7 land, per Keith's decision on the ratchet-test nuance). Verify: new
      `accessregistry.test.ts` describe block, parsed via the TypeScript compiler API. Running it
      against current source surfaced one genuine pre-existing case design.md's "grep confirms no
      shipped route..." claim missed: `organizations/index.ts`'s any-of array includes
      `console.canViewConsole` with no scope. Verified safe (every role holding it also holds the
      same any-of's unguarded `onboarding.canViewOnboarding`, so no role's outcome changes) and
      added to the allowlist with that reasoning.
- [x] 1.4 Export `prefixOf` from `apiKeyAuthz.ts` (jurisdiction id → prefix, async DynamoDB read)
      for reuse by the route declarations in groups 2-7. Verify: `tsc --noEmit` passes.

## 2. Convert `apikeys/index.ts`

This file handles four methods, not two — PATCH (`canRevokeApiKey`) and DELETE
(`canCancelApiKey`) were missing from design.md's original mapping table and this group;
both are added below (fixed in the same session, before any of this group's code landed).

Every "Verify" below that says "new test" means: add it to
`src/__tests__/api/apikeys/authorization.test.ts` (new file, no `withMiddleware` mock — see
design.md Decision 6), and in the same step delete that method's now-obsolete assertions from
`src/__tests__/api/apikeys/lifecycle.test.ts`'s `role gate`/`tenancy gate`/`multi-environment
credentials` describe blocks (they tested the in-handler check this group removes; the
protection itself moved, it didn't disappear).

- [x] 2.1 Declare GET capability-only (`canListApiKeys`, no `scope`); remove the in-handler
      `hasApiKeyPermission` pre-check. Verified: existing `scopeToOwnedJurisdictions`
      row-filtering tests still pass; GET role-gate case moved to `authorization.test.ts` against
      the real export.
- [x] 2.2 Declare POST under `byMethod` with `canCreateApiKey` + an async `scope` resolving
      `jurisdictionId` (body) via `prefixOf`; remove the in-handler `requireApiKeyAccess` call.
      Verified: `authorization.test.ts` asserts a role without `canCreateApiKey`, and a role
      holding it but with no reach to the jurisdiction, are both denied by the declarative gate
      (403, handler not invoked); POST role-gate/tenancy-gate cases deleted from
      `lifecycle.test.ts`.
- [x] 2.3 Delete the `envIds.length > 1 && !session.user.isAdmin` check entirely, no replacement.
      Verified: the admin-only denial case deleted from `lifecycle.test.ts`'s multi-environment
      block; `authorization.test.ts` asserts a non-admin caller holding `canCreateApiKey` can
      create a multi-environment key.
- [x] 2.4 Declare PATCH under `byMethod` with `canRevokeApiKey` + an async `scope`: `sortKey`
      (body) → credential (`getApiKeyCredential`) → stored `jurisdictionId` → `prefixOf`; remove
      the in-handler `requireApiKeyAccess` call. Verified: `authorization.test.ts` asserts the
      existing IDOR protection (a caller cannot revoke another jurisdiction's credential) holds
      via the declarative gate; PATCH tenancy-gate cases deleted from `lifecycle.test.ts`'s three
      `tenancy gate` blocks.
- [x] 2.5 Declare DELETE under `byMethod` with `canCancelApiKey` + the same `sortKey` → credential
      → stored `jurisdictionId` → `prefixOf` scope shape; remove the in-handler
      `requireApiKeyAccess` call. Verified: same IDOR-protection test shape as 2.4, for cancel, in
      `authorization.test.ts`; DELETE tenancy-gate cases deleted from `lifecycle.test.ts`. This
      file's single `inHandler` declaration is now fully replaced by a `byMethod` map with no
      escape hatch left — group 10 closes its debt row. 87/87 tests pass across
      `lifecycle.test.ts` + `authorization.test.ts`; `tsc --noEmit` and `eslint` clean.

## 3. Convert `apikeys/domains.ts`

- [x] 3.1 Declare GET with `canListApiKeys` + an async `scope` resolving `jurisdictionId` (query)
      via `prefixOf`; remove the in-handler `requireApiKeyAccess` call. Verified: `authorization.test.ts`
      asserts destination-scoped allow/deny, same shape as 2.2's test but for `canListApiKeys` —
      this is the capability's *scoped* use; domains.ts's tenancy-gate case deleted from
      `lifecycle.test.ts`.
- [x] 3.2 Delete the `envIds.length > 1 && !session.user.isAdmin` check. Verified: domains.ts's
      admin-only case deleted from `lifecycle.test.ts`'s multi-environment block;
      `authorization.test.ts` asserts a non-admin caller holding the capability can query multiple
      environments. 89/89 tests pass across `lifecycle.test.ts` + `authorization.test.ts`; `tsc`
      and `eslint` clean.

## 4. Convert `apikeys/token.ts`

- [x] 4.1 Declare POST with `canCreateApiKey` + an async `scope`: resolve `sortKey` (body) →
      credential (`getApiKeyCredential`) → its *stored* `jurisdictionId` → `prefixOf`; remove the
      in-handler `requireApiKeyAccess` call. Verified: `authorization.test.ts` asserts a caller
      supplying another jurisdiction's real `sortKey` is still denied — the existing IDOR
      protection, now enforced declaratively instead of in-handler; token.ts's role-gate and
      tenancy-gate cases deleted from `lifecycle.test.ts` (one case's "before any DB read"
      assertion no longer holds — the `scope` extractor now reads the credential unconditionally
      to resolve its jurisdiction — so it became a plain denial assertion in the new file).
      90/90 tests pass; `tsc`/`eslint` clean.

## 5. Convert `apikeys/renew/index.ts`

- [x] 5.1 Declare POST with `canRenewApiKey` + an async `scope`: resolve `oldSortKey` (body) →
      `oldCredential` → its stored `jurisdictionId` → `prefixOf`; remove the in-handler
      `requireApiKeyAccess` call. Verified: `authorization.test.ts` asserts the body's
      `jurisdictionId` is ignored in favor of the stored one — same IDOR protection as today,
      preserved; renew.ts's tenancy-gate cases deleted from `lifecycle.test.ts`. 91/91 tests pass;
      `tsc`/`eslint` clean.

## 6. Convert `apikeys/verify-domain/index.ts`

- [x] 6.1 Declare `byMethod.GET` with `canCreateApiKey` + an async `scope`: `sortKey` (query) →
      credential → stored `jurisdictionId` → `prefixOf`. Verified: `authorization.test.ts` asserts
      IDOR protection preserved, matching token.ts's shape; verify-domain GET's tenancy-gate cases
      deleted from `lifecycle.test.ts`.
- [x] 6.2 Declare `byMethod.POST` with `canCreateApiKey` + an async `scope` resolving
      `jurisdictionId` (body) directly via `prefixOf` (no credential lookup, matching today's
      code); remove both in-handler `requireApiKeyAccess` calls. Verified: `authorization.test.ts`
      asserts denial for a role with no reach to the posted jurisdiction; verify-domain POST's
      role-gate and tenancy-gate cases deleted from `lifecycle.test.ts`. 95/95 tests pass;
      `tsc`/`eslint` clean.

## 7. Convert `apikeysaudit/index.ts` and `apikeysaudit/[sortKey].ts`

- [x] 7.1 Declare `apikeysaudit/index.ts` GET capability-only (`canListApiKeys`, no `scope`);
      remove the in-handler `hasApiKeyPermission` pre-check. Verified: existing row-filter
      behavior unchanged; capability-only case confirmed in new
      `src/__tests__/api/apikeysaudit/authorization.test.ts`.
- [x] 7.2 Declare `apikeysaudit/[sortKey].ts` GET with `canListApiKeys` + an async `scope`:
      `sortKey` (query) → credential → stored `jurisdictionId` → `prefixOf`; remove the in-handler
      `requireApiKeyAccess`/`hasApiKeyPermission` calls. Verified: this route's destination-scoped
      enforcement is correct *and* 7.1's capability-only enforcement is unaffected — the
      regression test for the shared-capability design decision. `NO_SCOPE_ALLOWLIST` in
      `accessregistry.test.ts` updated with both `apikeys/index.ts` GET and
      `apikeysaudit/index.ts` GET now that they're live. 5/5 new tests pass; `tsc`/`eslint` clean.

## 8. Remove now-dead code

- [x] 8.1 Grep confirmed `canActOnJurisdiction` still has a real caller (`src/lib/apikeys/scope.ts`'s
      `scopeToOwnedJurisdictions`, the per-row filter for the two capability-only list routes) —
      design.md's "delete both" was wrong about this one; kept, with its doc comment updated to
      say so explicitly. `requireApiKeyAccess`, `hasApiKeyPermission`, and `getApiKeyAccess` had
      zero real callers anywhere in `src` (confirmed by grep, including the `/apikeys` page, which
      only imports `isApiKeyManagementEnabled`) — all three deleted, along with the now-unused
      `ApiKeyAuthzResult` type and an orphaned doc comment left over from an earlier edit. Updated
      stale references in `accesshelper.ts` and `lifecycle.test.ts`'s comments. Verified:
      `tsc --noEmit` passes; grep confirms zero remaining references to the three deleted
      functions outside comments/the file itself.

## 9. Narrow IZG Operations

- [x] 9.1 Set `_IZGOperationsAccess.ts`'s `apikeys` block (`canListApiKeys`, `canCreateApiKey`,
      `canRenewApiKey`, `canRevokeApiKey`, `canCancelApiKey`) to all-`false`. Verified:
      `roleMatrixSnapshot.test.ts` failed first (expected), confirming exactly the 5 intended rows
      changed and nothing else.
- [x] 9.2 Update the committed role-matrix snapshot. Verified: `roleMatrixSnapshot.test.ts` passes.
      This surfaced two further fixes, both necessary consequences of the narrowing rather than new
      scope: (a) `policy.test.ts` and `lifecycle.test.ts` had fixtures asserting/relying on the
      *old* IZG Operations apikeys matrix (`IZG Operations canListApiKeys === true`, and several
      "fully authorized" test identities) — updated to IZG Security, the new full-access role;
      (b) `ApiKeyManagement/index.tsx`'s Create-key dialog gated the multi-environment picker on
      `session.user.isAdmin`, which is now completely decoupled from `canCreateApiKey` (IZG
      Operations held `isAdmin` but no longer holds the capability) — removed the gate entirely,
      since every caller who can open the dialog already holds `canCreateApiKey` and the server now
      accepts multi-env from any such caller (Anusha's 2026-10-28 resolution, same one the backend
      change implements). Leaving the UI gate in place would have silently defeated the policy
      change for real users. Verified: `tsc`/`eslint` clean; `lifecycle.test.ts`/`policy.test.ts`
      pass.

## 10. Close the authzDebt ledger

- [x] 10.1 Delete the seven `in-handler` rows for `apikeys/*`/`apikeysaudit/*` from
      `authzDebt.ts`. Verified: the existing "`inHandler` count in source equals debt row count"
      ratchet test, which had been failing since group 9 (9 rows vs. 2 remaining `{ inHandler }`
      declarations in source) now passes — all 98 `accessregistry.test.ts` tests green.

## 11. Full verification

- [x] 11.1 `npm run code-quality-check` (lint + typecheck) passes. Exit 0; 61 pre-existing
      warnings, none in touched files.
- [x] 11.2 `npm run build` passes (exit 0). All 7 converted routes compile into the route list.
- [x] 11.3 Run every test file touched in groups 1-10 together; confirm no regressions in
      `api-middleware-helper.test.ts`/`accessregistry.test.ts` (the shared-mechanism tests every
      other route's declaration also runs through). 487/487 real tests pass; the only failures are
      3 pre-existing, unrelated AWS-SDK ESM/CJS test-infra failures (confirmed present on
      unmodified `develop` tip too, nothing in this diff touches those files).
- [x] 11.4 Run `/review` on the full diff before pushing. 5 findings, all triaged with Keith:
      (1) *correctness* — a scoped role now gets 403 instead of 404 for a nonexistent sortKey,
      since the `scope` extractor's credential lookup runs before the handler's own 404 check.
      Accepted as-is for `apikeys/index.ts`, no fix. (2) *observability* — a throwing `scope`
      extractor (e.g. a DynamoDB outage) was silently folded into a 403 denial, indistinguishable
      from a legitimate deny in the audit trail. Fixed: `enforceRouteAuthz` now logs at error level
      and returns 500, not 403, for both the top-level and `byMethod` scope-resolution paths;
      `api-middleware-helper.test.ts` updated/extended accordingly. (3) *test-coverage* — no
      real-gate test for a jurisdiction row with a missing `prefix`. Declined — "testing data in
      the DB for correctness... other tests ensure is true," too edge-case. (4) *maintainability* —
      the `sortKey`/`jurisdictionId` extraction-then-resolve pattern was duplicated inline across
      9 declarations in 7 route files. Fixed: four shared `scopeFrom*` builder functions added to
      `apiKeyAuthz.ts` (`scopeFromCredentialSortKeyInBody/InQuery`,
      `scopeFromJurisdictionIdInBody/InQuery`), and every route's declaration now calls one instead
      of an inline lambda. (5) *efficiency* — `grant()` re-running the role-matching decision
      `satisfies()` already computed. Declined — "likely not worth worrying about." 489/489 real
      tests pass after both fixes; `tsc`/`eslint` clean.

## 12. PR #778 review — Anusha Kanuri (akanuri9), 7 inline comments

Reviewed against IGDD-3549 and the RBAC matrix; confirmed the ticket's acceptance criteria are met.
Also surfaced a Copilot bot-pushed fix (`ee872f5`, before this round): a credential whose stored
jurisdiction no longer resolves (orphaned) now denies every role including global ones, via a third
`scope` state (`null`, distinct from `undefined`) threaded through `decideRouteCapability`/
`grantingRoleForRoute`/all four `scopeFrom*` builders. Pulled and independently verified (Copilot's
sandbox couldn't run tests itself) before this round started.

- [x] 12.1 *Safety-net regression* — omitting `scope` now means "capability-only, any
      jurisdiction" for ANY `REQUIRES_DESTINATION_SCOPE` capability, not just apikeys'; a future
      route could forget `scope` and silently admit non-global roles, and the old unit test
      guarding that for `console.canViewConsole` was deleted. Resolved by reply, no code change:
      the `NO_SCOPE_ALLOWLIST` ratchet test added in group 1 already requires an explicit, reviewed
      allowlist entry for every such omission on disk today — arguably stronger than the deleted
      test, since it checks every route on disk for every listed capability, not one hardcoded
      scenario.
- [x] 12.2 *Plain-text 403/500 breaks the UI* — `ApiKeyManagement/index.tsx` had 4 `res.json()`
      call sites (lines 3123, 3163, 3992, 4055) with no `.catch()`, unlike every other call site in
      the file; a non-JSON denial body threw a JSON-parse error shown to the user instead of a real
      message. Fixed: added `.catch(() => ({}))` to match the existing pattern. Chose this over
      changing the shared middleware's response format, which would touch every other
      declaratively-gated route for uncertain benefit.
- [x] 12.3 *Scope resolves before the session check, no role-prefilter* — confirmed real
      (`authz.scope`/`ref.scope` ran before the `!session?.user` 401 check, and with no "does any
      held role have this capability at all" cheap prefilter, unlike the old `requireApiKeyAccess`).
      **Correction: fixed in this PR, not held for a follow-up** — PR findings on an open CR belong
      in that CR, not spun off. `enforceRouteAuthz` now checks the session before resolving `scope`
      (both the top-level `capability` shape and `byMethod`), and a new `decideCapability(...)`
      prefilter — per-ref for the single/any-of case, per-method under `byMethod` — skips `scope`
      entirely when no held role could ever grant the capability regardless of destination. See
      design.md Decision 7. New tests in `authorization.test.ts`: "skips the scope extractor's DB
      read for a role with no apikeys capability at all" (token.ts, renew/index.ts) and "401s
      before the scope extractor's DB read when there is no session" (token.ts).
- [x] 12.4 *Feature flag moved from the auth gate into in-handler checks* — confirmed real: the
      declarative gate denied (and logged AccessDenied) based on the real role matrix regardless of
      `isApiKeyManagementEnabled()`, so an environment where the feature hasn't launched produced
      AccessDenied noise for roles that would otherwise be authorized — the exact
      "feature-availability state logged as an RBAC rejection" `hasApiKeyPermission`'s own removed
      comment warned against. **Correction: fixed in this PR, not held for a follow-up** — same
      reason as 12.3. Added `featureFlag?: () => boolean` to `RouteAuthz`'s `capability`/`byMethod`
      shapes, checked in `enforceRouteAuthz` right after the session check, ahead of any
      capability/scope work and before any `AccessDenied` log; all seven routes now declare
      `featureFlag: isApiKeyManagementEnabled` and their nine in-handler copies of the check are
      removed. See design.md's corrected Decision 4. Moved the three kill-switch tests from
      `lifecycle.test.ts` (whose `withMiddleware` mock no longer exercises this, since the check
      left the handler) to a new `feature flag: FEATURE_API_KEY_MANAGEMENT_ENABLED` describe block
      in `authorization.test.ts`, against the real gate, plus the `AccessDenied`-suppression
      regression test carried forward.
- [x] 12.5 *Efficiency, `grant()` re-deriving `satisfies()`'s answer* — same finding as the first
      `/review` round's #5 (declined then as "likely not worth worrying about"), raised
      independently by Anusha with a simpler suggested fix (have the decision return the granting
      role once, reuse it, rather than stashing via a second `grantingRoleForRoute` call). Fixed:
      `satisfies`/`grant` collapsed into one `decide`/`firstGrantingRole` pair in
      `api-middleware-helper.ts`; every call site now computes the role once. The separate
      "credential read twice" trade-off (scope extractor + handler) remains accepted per
      design.md's Risks section — not part of this fix.
- [x] 12.6 *Doc/logging nits* — (a) the `findGrantingRole` extraction (group 1) had left
      `decideCapability`'s original JSDoc orphaned above the wrong function; reattached. (b) the
      `deny()` logger logged the resolved scope under `destId` even for `apikeys.*`, where it's a
      jurisdiction prefix, not a destination id — misleading in a query by actual destination.
      Investigated blast radius first (searched all of `eclipse-workspace` for any
      dashboard-as-code referencing `destId` on `AccessDenied`; found none, and the field is only
      days old) before fixing: `AccessDeniedEvent` already had an unused `jurisdictionId` field
      (orphaned when `requireApiKeyAccess` was deleted) built for exactly this — `deny()` now logs
      under `jurisdictionId` for `ref.page === 'apikeys'`, `destId` unchanged for every other
      `REQUIRES_DESTINATION_SCOPE` page. New regression test in `authorization.test.ts` locks in
      the field choice.
- [x] 12.7 *`currentGrantedBy` duplicated 4x* — `const grantedBy = () => asyncRequestContext
      .getStore()?.grantedBy` was copied verbatim into `apikeys/index.ts`, `token.ts`,
      `renew/index.ts`, `verify-domain/index.ts`. Fixed: one `currentGrantedBy()` export added to
      `Context.ts`, all four call sites updated. Declined the paired suggestion to also collapse
      the four `scopeFrom*` builders into one with two switches — four named functions read better
      at call sites than one with enum parameters.
- [x] 12.8 *Two e2e files break, not in this PR's diff* — `e2e/tests/apiKeyRbacScoping.spec.ts`
      created its target key as IZG Operations (now 403) and asserted on
      `requireApiKeyAccess`/`hasApiKeyPermission`'s exact removed message strings (now a non-JSON
      body). Fixed: target key now created via `E2E_RBAC_IZG_SECURITY_USERNAME`/`_PASSWORD` (IZG
      Security). **Correction (caught after the user questioned the original framing):** the first
      pass invented the env var names (`E2E_RBAC_IZG_SEC_*` plus a `_FULLNAME` variant) instead of
      checking for an existing convention. `playwright-nightly.yml` and `e2e/rbac/README.md` already
      define `E2E_RBAC_IZG_SECURITY_USERNAME`/`_PASSWORD` as the real convention, with no
      `_FULLNAME` for this role (the sign-in call passes `null` and skips the header name check,
      per README). Fixed to match; `expectAllDenied` asserts status 403 only, not a message.
      `e2e/rbac/matrix.ts`: removed the now-stale `'IZG Operations'` entry from
      `API_KEYS_MOVE_TO_SECURITY` (no longer a gap); corrected the `apikeys.write` probe's comment,
      which described a check order that no longer exists, and documented the probe's real
      remaining limitation (cannot distinguish "no capability" from "has capability, empty-body
      scope" for Jurisdiction Operations). **Neither e2e file could be run in this environment**
      (need live Okta accounts + a deployed console) — fixes are source-level only, unverified end
      to end. The GitHub Actions secret *names* for IZG Security already exist in
      `playwright-nightly.yml`; what's still open is the underlying Okta account itself
      (`e2e/rbac/roles.ts` lists it `status: 'pending'`, `tracking: IGDD-3600`) and populating the
      secret *values* once that account exists — a CI/ops task, not something requiring the user's
      personal Okta credentials.
- [x] 12.9 Full re-verification after all of 12.1-12.8: `tsc --noEmit` and `eslint` clean; 491/491
      real tests pass (489 + 2 new regression tests) across `accessregistry.test.ts`,
      `api-middleware-helper.test.ts`, the two `authorization.test.ts` files; same 3 pre-existing,
      unrelated crypto-suite failures as every prior run.
- [x] 12.10 Re-verification after 12.3/12.4's correction (scope-ordering fix + featureFlag option):
      `tsc --noEmit` and `eslint` clean (0 errors; same pre-existing warnings as before, unrelated).
      260/260 real tests pass across `apikeys/*`, `api-middleware-helper.test.ts`,
      `accessregistry.test.ts`, `accessDeniedAudit` — net +3 tests in the apikeys suite: 7 added to
      `authorization.test.ts` (2 DB-read-skip tests for token.ts/renew/index.ts, 1
      session-before-scope test, 4 in the new feature-flag describe block), 4 removed from
      `lifecycle.test.ts` (the in-handler feature-flag coverage that check's removal made
      unreachable through that file's middleware mock — superseded by the real-gate coverage above).

## Workflow follow-up

- Push the branch, open a PR against `develop`, request a Copilot review.
- Comment on IGDD-3549 with the PR link; move it through workflow statuses as CI and review
  complete.
- **New:** `apiKeyRbacScoping.spec.ts` now reads `E2E_RBAC_IZG_SECURITY_USERNAME`/`_PASSWORD` (task
  12.8, corrected from an invented name). The GitHub Actions secret *names* already exist in
  `playwright-nightly.yml`; CI will fail the spec, not silently skip it, until the underlying Okta
  account exists and the secret *values* are set — tracked as part of IGDD-3600
  (`e2e/rbac/roles.ts` lists IZG Security `status: 'pending'`), not a per-developer `.env.test`
  action item.
- **New:** reply to Anusha's 7 inline PR comments individually (resolution recorded in 12.1-12.8
  above) and resolve each review thread.
- Archive this OpenSpec change once the PR merges.
