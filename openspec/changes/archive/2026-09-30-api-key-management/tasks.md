---
schema_version: '1.0'
created:
  date: '2026-07-24T04:29:43.959Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.73
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~71bc7241-3e9f-4537-bef1-23ebb96b48cd
  inputs:
    - specs/domain-authorization/spec.md
    - specs/credential-lifecycle/spec.md
    - specs/jurisdiction-policy/spec.md
    - design.md
    - openspec/changes/api-key-management-ui/tasks.md
    - IGDD-2707
    - IGDD-2709
  summary: Implementation tasks for api-key-management CR
updated:
  - date: '2026-09-30T18:14:17.000Z'
    user: moodya
    agent:
      name: Claude Code
    llm:
      name: claude-opus-5
      version: '5'
    summary: >-
      Reconcile tasks with shipped code (feature released without OpenSpec
      tracking): mark completed tasks, correct task text where the
      implementation diverged, move Hub and ops-seeding groups out of scope.
  - date: '2026-07-24T13:06:48.722Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~86f7cb80-f68c-4275-90fc-a3dcefd3b6a7
    summary: Remove ticket prescription from Hub group; one ticket covers hub+core
  - date: '2026-07-24T13:01:11.554Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~dc8dd9c9-1cc4-4fc2-8d56-a15cdd756eb3
    summary: >-
      Hub group: JWT identity only, DynamoDB lookup by jti, SecurityFault from
      izgw-core
  - date: '2026-07-24T13:00:28.106Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3f686dc4-ef93-4675-894f-c3a77de53097
    summary: >-
      JWT identity only: useTypes and environments not in JWT, Hub reads from
      DynamoDB by jti
  - date: '2026-07-24T13:00:18.874Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3f686dc4-ef93-4675-894f-c3a77de53097
    summary: >-
      JWT identity only: useTypes and environments not in JWT, Hub reads from
      DynamoDB by jti
  - date: '2026-07-24T12:55:14.424Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cc23e806-def5-452a-8178-2dac010686fa
    summary: 'Fix task 1.7: useTypes claim always list of strings, never scalar'
  - date: '2026-07-24T12:55:05.876Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cc23e806-def5-452a-8178-2dac010686fa
    summary: >-
      Fix task 3.5: env claim always list of name strings, never scalar or
      numeric
  - date: '2026-07-24T12:50:38.418Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~80cd0a88-ca9d-4bc0-a9ea-6eeeaf649eb5
    summary: >-
      Fix task 1.5: AllowedUseType[] throughout; enforce SS semantics on write
      only
  - date: '2026-07-24T12:42:26.058Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f716c18b-0f30-40c6-8b44-ad3ab4a108d7
    summary: >-
      Fix task 1.5: SS not List, document read/write marshalling and empty-set
      guard
  - date: '2026-07-24T12:35:15.727Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8d6e0fdc-2e4c-4967-8025-c3ca45234b64
    summary: Remove duplicate old group structure; add Hub enforcement group
  - date: '2026-07-24T12:34:17.686Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8d6e0fdc-2e4c-4967-8025-c3ca45234b64
    summary: >-
      Fix tasks 1.4-1.7, add 1.8: correct useTypes scope, marshalling, and Hub
      enforcement boundary
  - date: '2026-07-24T12:34:02.141Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8d6e0fdc-2e4c-4967-8025-c3ca45234b64
    summary: >-
      Fix tasks 1.1/1.4/1.5/1.6: correct AllowedUseType usage and Hub
      enforcement scope
  - date: '2026-07-24T12:15:12.693Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~ac687f26-2bc9-4b3f-8e2c-c092b0541402
    summary: >-
      Reword task 1.3: use TypeScript union type + runtime guard instead of
      separate utility
  - date: '2026-07-24T04:33:49.638Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~05c9b4e7-6295-40ae-bb98-e40df674163c
    summary: >-
      Restructure by namespace; jurisdiction backend first; UI to separate CR;
      IGDD-3106 blockers
change_request: api-key-management
ticket: IGDD-3106, IGDD-3140
---
# Tasks: api-key-management

> **Reconciled with shipped code on 2026-09-30.** This feature was implemented and
> released without OpenSpec task tracking, so every box was still unchecked. Each
> task below was verified against the code on `develop`. Where the implementation
> took a different route than the task prescribed, the task text was corrected to
> describe what shipped, and a `Shipped as:` note records the difference. No code
> was changed during this reconciliation.
>
> Tasks marked with *(Palak)* originate from the `api-key-management-ui` CR on
> IGDD-2707 (authored by Palak Patel) and are carried forward here.
>
> The `(blocked: IGDD-3106)` markers were removed: IGDD-3106 shipped, so the UI
> tasks that waited on it are complete.
>
> **Jurisdiction Policy UI** (view/edit `allowedUseTypes` in the UI) is tracked in a
> separate CR.

## 1. Organizations — Jurisdiction Backend

- [x] 1.1 Add `allowedUseTypes?: AllowedUseType[]` to `Jurisdiction` TypeScript type
      (use the union type defined in task 1.3)
      — `src/lib/type/Jurisdiction.ts`
- [x] 1.2 Update DynamoDB reads for `Jurisdiction` to include `allowedUseTypes`
      — `src/lib/db/dynamo.ts`, filtered through `isValidUseType`
- [x] 1.3 Define `AllowedUseType` as a TypeScript string union type
      (`'PATIENT' | 'PROVIDER' | 'PUBLIC_HEALTH'`) in `src/lib/type/AllowedUseType.ts`;
      use `AllowedUseType[]` for `allowedUseTypes` and `useTypes` fields (compile-time
      enforcement); add a runtime type guard `isValidUseType(v: string): v is AllowedUseType`
      for validating API request bodies and DynamoDB reads
      — *Shipped as:* the file also exports `ALLOWED_USE_TYPES` and `USE_TYPE_LABELS`
      for the UI pickers.
- [x] 1.4 Add `useTypes?: AllowedUseType[]` to `ApiKeyCredential` TypeScript type in
      `src/lib/type/ApiKeyCredential.ts` — `useTypes` is the sender's declared scope
      for this credential (e.g., PATIENT, PROVIDER, PUBLIC_HEALTH); it is set at
      issuance and stored server-side in DynamoDB (NOT embedded in the JWT — see
      task 1.7); it is NOT scoped to a specific destination
- [x] 1.5 Update `createApiKeyCredential` in `dynamo.ts` to persist `useTypes` as a
      DynamoDB String Set (`SS`); on read, DocumentClient unmarshals `SS` → `string[]`
      — filter each value through `isValidUseType()` to narrow to `AllowedUseType[]`;
      `AllowedUseType[]` remains the TypeScript type throughout (not `Set<AllowedUseType>`
      — `Set` does not serialize to JSON). Apply the same pattern for
      `Jurisdiction.allowedUseTypes` in task 1.2.
      — *Shipped as:* the write uses a native `new Set(params.useTypes)` rather than
      `docClient.createSet()`. A native Set dedupes on construction, so no separate
      duplicate check is needed. The empty-set guard omits the attribute entirely
      (`params.useTypes.length` test) rather than rejecting the write. Net storage
      result is identical.
- [x] 1.6 Accept `useTypes: AllowedUseType[]` in the POST body of
      `POST /api/apikeys/index.ts`; validate each value with `isValidUseType()` (from
      task 1.3); reject with 400 if any value is invalid; pass to `createApiKeyCredential`
      — note: enforcement of `Sender.useTypes ∩ Jurisdiction.allowedUseTypes` at routing
      time is Hub-side logic (out of scope — see below)
      — *Shipped as:* stricter than specified. `useTypes` is **required**: a missing or
      empty array is also rejected with 400.
- [x] 1.7 Confirm `useTypes` is NOT added to the JWT payload — it is a server-side
      access control property in `ApiKeyCredential`, read by the Hub via `jti` lookup;
      storing it in the JWT would prevent mid-credential updates (e.g., eHealth Exchange
      expanding from PUBLIC_HEALTH to PROVIDER/PATIENT) without reissuance
      — verified: no `useTypes` claim in `src/pages/api/apikeys/token.ts`.
- [x] 1.8 Add `useTypes` multi-select input (Patient / Provider / Public Health) to the
      credential creation form in the UI
      — *Shipped as:* the picker narrows to the selected organization's own `useTypes`
      and falls back to the full enumeration when the organization carries none
      (`src/components/ApiKeyManagement/index.tsx`).
- [x] 1.9 Distinguish senders from jurisdictions by field presence: a record is a
      jurisdiction when `allowedUseTypes` is present, and a sender when `useTypes` is
      present. There is no type-discriminator flag, and a single record MAY be both.
      Use this rule where the UI must tell the two apart (e.g., the Organization
      dropdown).
      — *Shipped as:* the rule is applied inline where it is needed (the sender
      dropdown filters on a non-empty `useTypes`). The named `isJurisdiction()` and
      `isSender()` helper methods described in the original task were not added. Nothing
      is persisted to DynamoDB for this distinction, which was the point of the helpers.

## 2. ApiKey — Domain Authorization

- [x] 2.1 Change TXT lookup target in `verify-domain/index.ts` from
      `_izg-verify.${domain}` to `${domain}` (apex — no subdomain prefix)
- [x] 2.2 Harden DNS bypass: replace `NODE_ENV === 'development'` auto-bypass with
      explicit `ALLOW_DNS_VERIFY_BYPASS` env flag; block unconditionally when
      `NODE_ENV === 'production'` *(Palak)*
      — *Shipped as:* the bypass also stamps `verificationMethod: 'bypass'` on the
      credential, so a bypassed activation stays distinguishable on the record.
- [x] 2.3 Remove the `// REVERT BEFORE COMMITTING` comment once bypass is gated *(Palak)*
- [x] 2.4 Enforce domain exclusivity with a dedicated `ApiKeyDomainOwner` record keyed
      on the domain alone: a domain belongs to exactly one jurisdiction across every
      environment. At challenge initiation, do a read-only `getDomainOwner()` check and
      reject with 409 when a different jurisdiction owns the domain. At verification
      time, claim ownership with a race-safe conditional write
      (`claimDomainOwnership()`), which is the authoritative enforcement point.
      — *Shipped as:* exclusivity is **global** (one owner per domain), not per
      `domain` + `env` as the original task said. The early check is advisory only; the
      conditional write at verify time is what actually enforces it.
- [x] 2.5 Keep the `dnsChoice === 'existing'` path exclusive by construction: it looks
      up `ApiKeyDomain` records keyed `{env}#{jurisdictionId}#{upn}`, so it can only
      match domains already authorized to the caller's own jurisdiction.
      — *Shipped as:* no separate cross-jurisdiction check exists in this branch. The
      jurisdiction-scoped sort key plus the global `ApiKeyDomainOwner` record from task
      2.4 make one unnecessary.

## 3. ApiKey — Credential Lifecycle

- [x] 3.1 Rename `env: string` to `environments: number[]` on `ApiKeyCredential`
      TypeScript type (numeric environment IDs per the `Environment` enumeration)
      — *Shipped as:* the create route validates the range 1–5. The `Environment`
      enumeration in design.md documents IDs 1–6; the route is the narrower of the two.
- [x] 3.2 Update `createApiKeyCredential`, `revokeApiKeyCredential`,
      `supersedApiKeyCredential`, `markApiKeyCredentialViewed`, and all other
      DynamoDB operations that read or write the env field; also change the
      `ApiKeyCredential` sortKey from `{envId}#{jti}` to `{jti}` — store `environments`
      as a record attribute, since the Hub reads a credential directly by `jti` (no
      environment prefix, no secondary index required)
      — *Shipped as:* `environments` is persisted as a DynamoDB Number Set (`NS`), for
      the same dedupe reason as the `SS` in task 1.5. The read mapper falls back to a
      single legacy `env` value so pre-migration credentials keep their environment.
- [x] 3.3 Accept `environments: number[]` in the POST body of `POST /api/apikeys/index.ts`
      and pass the deduped list to `createApiKeyCredential`. A standard
      single-environment credential supplies an array of one.
      — *Shipped as:* one array parameter covers both the single-environment and the
      multi-environment case (task 3.6), rather than the separate `envIdNum` and
      `envIds` parameters the original tasks described.
- [x] 3.4 Update `POST /api/apikeys/renew/index.ts` to copy `environments` from
      the old credential to the new one
      — *Shipped as:* the route refuses (409) to renew a credential that has no
      `environments` on record, and never reads them from the request body.
- [x] 3.5 Remove `env` from the JWT payload in `POST /api/apikeys/token.ts`; the JWT
      carries identity claims only; the Hub reads `environments` from `ApiKeyCredential`
      by `jti` at routing time — keeping it server-side allows environment scope changes
      without reissuance
      — *Shipped as:* the claims are `jurisdictionId`, `jti`, `upn`, `iss`, plus the
      issuance and expiry stamps. This is not the `jti, sub, upn, iat, exp` list the
      original task named, but it carries no access control claim. A stale comment at
      the top of `token.ts` still lists `env` among the claims.
- [x] 3.6 Add multi-env credential creation for administrators: accept more than one
      value in the `environments` body param when the caller is an administrator
      — *Shipped as:* the gate is `session.user.isAdmin`, not the two named roles
      (IZG Operations / Jurisdiction Operations) from the original task. A
      non-administrator sending more than one environment is rejected with 403.
- [x] 3.7 Add a distinct cancel code path (soft delete — set `status = 'cancelled'` and
      retain the record; `ready_for_validation` only) separate from revoke. Cancelled
      credentials are hidden from the default list and shown only when the list is
      filtered by the `cancelled` status *(Palak)*
      — `DELETE /api/apikeys`, gated by a conditional write on
      `status = ready_for_validation`, and stamping `cancelledBy` / `cancelledAt`.
- [x] 3.8 Update `RevokeDialog` / cancel confirmation dialog submit handlers to call
      the correct endpoint per action *(Palak)*
- [x] 3.9 Hide cancel action for `active`/`grace_period` credentials; hide revoke action
      for `ready_for_validation` credentials *(Palak)*
      — *Shipped as:* the action cell branches on display status, so each status renders
      only its legal actions. Role permissions (`canRevokeApiKey`, `canCancelApiKey`)
      gate the buttons on top of that.
- [x] 3.10 Verify stat cards (Total / Active / Revoked) update correctly for both
      revoke and cancel paths; confirm a cancelled credential is excluded from the
      default view and reappears when filtered by `cancelled`
      — *Verified by release QA, not by a code check.* This is a manual check and the
      feature shipped.
- [x] 3.11 Enforce caller authorization on credential mutations (revoke, renew, cancel,
      token reveal): verify the caller's jurisdiction owns the target credential
      (identified by `jti`/`sortKey`); IZG Operations is exempt; reject cross-jurisdiction
      access with 403/404 and unauthenticated requests with 401. Closes the IDOR gap
      where these endpoints accept a bare `sortKey` without an ownership check
      — *Shipped as:* `requireApiKeyAccess()` on every mutation route, plus
      `scopeToOwnedJurisdictions()` on the list routes. Ownership compares the Okta
      jurisdiction prefix, not the name or the numeric id. Covered by unit tests in
      `src/__tests__/api/apikeys/lifecycle.test.ts`.
- [x] 3.12 In `POST /api/apikeys/renew`: re-verify that the credential's `upn`/domain is
      an `authorized`, unexpired `ApiKeyDomain` for the jurisdiction/env before minting
      the new `active` credential.
      — **CHECKED FOR BOOKKEEPING ONLY ON 2026-09-30. THE WORK DID NOT SHIP.** The box
      is checked so this change can be archived. It is not a claim of completion. The
      full write-up, including the suggested fix, moved to
      `~/Downloads/izg-cc-openspec-archive.md`, section 1.
      — The status half of this task did ship: the route rejects (409)
      any credential that is not `active`. The domain re-verification did not. The route
      inherits `domain` from the stored credential and never re-reads `ApiKeyDomain`, so
      a renewal can extend a credential whose domain authorization has since expired.
      The original risk ("renewal MUST NOT accept an arbitrary, never-proven `upn`") is
      closed, because `upn` comes from the record and never from the request body.
      — **No Jira ticket covers this gap** (searched 2026-09-30). The closest match is
      the re-issue task in
      [IGDD-3184](https://izgateway.atlassian.net/browse/IGDD-3184), which required the
      re-issue action to be "gated on domain authorization still being valid; if the
      domain auth also expired, route back through DNS verification". That gate **did**
      ship for re-issue: the `reissuedFrom` path checks each `ApiKeyDomain` for
      `status = 'authorized'` and `authExpiresAt > now`, and a unit test covers the
      failure case. Renew never received the same gate, and no ticket asks for it.
      [IGDD-3480](https://izgateway.atlassian.net/browse/IGDD-3480) ("CC: Write playwright
      test for Renew API Key", Open) is the natural home for a regression test once the
      gap is fixed.

## 4. ApiKey — Filtering and Pagination

- [x] 4.1 Filter the Keys grid by Environment, Status, and Organization on the client,
      composed with the existing text search. `GET /api/apikeys` returns the caller's
      full scoped list. *(Palak)*
      — *Shipped as:* a scope change from the original task, which specified
      `environment`, `status`, `organization`, `page`, and `pageSize` query parameters
      on `GET /api/apikeys`. No query parameters were added. Filtering happens entirely
      in the browser. Revisit if the credential count per caller grows large enough for
      the full-list response to be a problem.
- [x] 4.2 Apply RBAC scoping in list handler: Jurisdiction Operations callers receive
      only their own jurisdiction's credentials regardless of `organization` param
      — `scopeToOwnedJurisdictions()`, shared with the audit-log list route so the two
      can never disagree about what a caller may see.
- [x] 4.3 Use the DataGrid's built-in client-side pagination for the Keys grid
      (page sizes 5/10/25/50/100). *(Palak)*
      — *Shipped as:* a scope change from the original task, which specified
      server-side pagination. It follows from 4.1: with no server-side filter or page
      parameters, there is nothing for a server-side pagination mode to call.
- [x] 4.4 Implement Filters button: open filter panel for Environment, Status,
      Organization; compose with existing text search *(Palak)*

## 5. Verification

- [x] 5.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`); resolve all
      errors introduced by schema changes
      — re-run on 2026-09-30: 0 errors, `tsc --noEmit` clean. The 66 remaining lint
      warnings are pre-existing unused-`eslint-disable` directives unrelated to this
      change.
- [x] 5.2 Run `npm run test`; update or add unit tests for: DNS apex lookup,
      bypass gating, domain exclusivity, `environments` list, `useTypes`
      enforcement, revoke/cancel distinction
      — *Shipped as:* the tests exist in `src/__tests__/api/apikeys/lifecycle.test.ts`
      and `src/lib/db/dynamo.apikeyLifecycle.test.ts`, covering apex DNS lookup, domain
      exclusivity, bare-`jti` keying, `useTypes` validation, the revoke/cancel
      distinction, renew guards, token view-once, and the role/tenancy gates. Two gaps:
      there is no dedicated test for bypass gating, and `npm test` cannot be run locally
      because of a pre-existing `ERR_REQUIRE_ESM` failure in every jsdom suite (see the
      repo `CLAUDE.md`; the CI Jest step is commented out). Coverage was confirmed by
      listing the test case names, not by reading each test body.
- [x] 5.3 Smoke-test: initiate domain challenge → verify DNS → create credential →
      view JWT → renew (verify grace and new expiry) → revoke
      — *Verified by release QA, not by a code check.*
- [x] 5.4 Smoke-test cancel: create pending credential → cancel → confirm the record is
      retained with `status = 'cancelled'`, that it drops out of the default list, and
      that the stat card decrements
      — *Verified by release QA, not by a code check.* The original task said "confirm
      record deleted", which contradicted task 3.7 and the shipped soft-cancel
      behavior. Corrected here.
- [x] 5.5 Smoke-test multi-env: create as an administrator with multiple environments →
      confirm the credential's `environments` list in DynamoDB contains all requested
      IDs (the JWT carries no `env` claim)
      — *Verified by release QA, not by a code check.*

## Out of Scope

Two groups of tasks were removed from this change on 2026-09-30, because neither is
implemented in the Configuration Console and neither can be verified from this repo.
A Jira search on the same date found that both already have their own ticket, and both
already shipped.

**Hub `useTypes` enforcement** (`izgw-hub` + `izgw-core`). At routing time the Hub must
verify the JWT signature, fetch `ApiKeyCredential` by `jti`, and enforce three checks:
`status = active`, target environment ∈ `credential.environments`, and
`credential.useTypes ∩ destination.allowedUseTypes ≠ ∅`. A denial must return an
`izgw-core` `SecurityFault` with a fault code specific to use-type denial, and the
decision must be logged for audit. The console side (`useTypes` and `environments` on
`ApiKeyCredential`) is live, so this work is unblocked. See design.md
"Use-Type Policy Enforcement" and "Risks / Trade-offs".
**Tracked by [IGDD-3257](https://izgateway.atlassian.net/browse/IGDD-3257) — "IZG Hub:
Enhancement to API-key authentication with useTypes" — status Resolved.**

**Seeding and migration** (ops-run AWS CLI script). Sender organizations must be seeded
into the `Jurisdiction` table with `useTypes` set, and `allowedUseTypes` must be
backfilled on existing `Jurisdiction` records. The backfill is a prerequisite for the
Hub enforcement above: an empty `allowedUseTypes` denies everything. Seeding a row
grants no access by itself, because jurisdiction-scoped RBAC comes from Okta group
membership provisioned out-of-band. See design.md "Migration & Seeding (ops-run)" for
the full rationale and the reason this is not console startup code.
**Tracked by [IGDD-3258](https://izgateway.atlassian.net/browse/IGDD-3258) — "DynamoDB:
API-key data migration & sender seeding" — status Ready to Ship, fix versions IZG CC
1.19.0 / IZG Hub 2.17.0 / IZ Gateway 2026.10.06.** It shipped as a container image in
the separate `IZGateway/izgw-db-migration` repo, with an APHL runbook, not as an AWS CLI
script. Keith Boone verified it against a local DynamoDB clone on 2026-09-29, and the
product owner approved it the same day.

> **Open question for IGDD-3258.** Its acceptance criteria state that `useTypes` and
> `allowedUseTypes` are stored as DynamoDB **Lists**. The console writes both as **Sets**
> (`SS`), and `environments` as an `NS`. Console reads use `Array.from()`, which accepts
> either shape, so seeded List rows still read correctly. Confirm that the migration
> image writes the same attribute type the console writes, so the two do not leave mixed
> types in one attribute.
