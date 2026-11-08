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

## Workflow follow-up

- Push the branch, open a PR against `develop`, request a Copilot review.
- Comment on IGDD-3549 with the PR link; move it through workflow statuses as CI and review
  complete.
- Archive this OpenSpec change once the PR merges.
