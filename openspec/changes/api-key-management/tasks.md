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
ticket: IGDD-3140
---
# Tasks: api-key-management

> Tasks marked with *(Palak)* originate from the `api-key-management-ui` CR on
> IGDD-2707 (authored by Palak Patel) and are carried forward here.
>
> Tasks marked with *(blocked: IGDD-3106)* require coordination with or completion
> of [IGDD-3106](https://izgateway.atlassian.net/browse/IGDD-3106) (Anusha Kanuri —
> create key UI) before they can be completed.
>
> **Jurisdiction Policy UI** (view/edit `allowedUseTypes` in the UI) is tracked in a
> separate CR. Backend work in Group 1 below can proceed independently.

## 1. Organizations — Jurisdiction Backend

- [ ] 1.1 Add `allowedUseTypes?: AllowedUseType[]` to `Jurisdiction` TypeScript type
      (use the union type defined in task 1.3)
- [ ] 1.2 Update DynamoDB reads for `Jurisdiction` to include `allowedUseTypes`
- [ ] 1.3 Define `AllowedUseType` as a TypeScript string union type
      (`'PATIENT' | 'PROVIDER' | 'PUBLIC_HEALTH'`) in `src/lib/type/AllowedUseType.ts`;
      use `AllowedUseType[]` for `allowedUseTypes` and `useTypes` fields (compile-time
      enforcement); add a runtime type guard `isValidUseType(v: string): v is AllowedUseType`
      for validating API request bodies and DynamoDB reads
- [ ] 1.4 Add `useTypes?: AllowedUseType[]` to `ApiKeyCredential` TypeScript type in
      `src/lib/type/ApiKeyCredential.ts` — `useTypes` is the sender's declared scope
      for this credential (e.g., PATIENT, PROVIDER, PUBLIC_HEALTH); it is set at
      issuance and embedded in the JWT; it is NOT scoped to a specific destination
- [ ] 1.5 Update `createApiKeyCredential` in `dynamo.ts` to persist `useTypes` as a
      DynamoDB `SS` (String Set) using `docClient.createSet(useTypes)` on write;
      before writing, validate: no duplicate values (deduplicate with
      `[...new Set(values)]` or reject), and at least one value present (DynamoDB
      rejects empty `SS`); on read, DocumentClient unmarshals `SS` → `string[]` —
      filter each value through `isValidUseType()` to narrow to `AllowedUseType[]`;
      `AllowedUseType[]` remains the TypeScript type throughout (not `Set<AllowedUseType>`
      — `Set` does not serialize to JSON). Apply the same pattern for
      `Jurisdiction.allowedUseTypes` in task 1.2.
- [ ] 1.6 Accept `useTypes: AllowedUseType[]` in the POST body of
      `POST /api/apikeys/index.ts`; validate each value with `isValidUseType()` (from
      task 1.3); reject with 400 if any value is invalid; pass to `createApiKeyCredential`
      — note: enforcement of `Sender.useTypes ∩ Jurisdiction.allowedUseTypes` at routing
      time is Hub-side logic (see Hub Enforcement section below)
- [ ] 1.7 Confirm `useTypes` is NOT added to the JWT payload — it is a server-side
      access control property in `ApiKeyCredential`, read by the Hub via `jti` lookup;
      storing it in the JWT would prevent mid-credential updates (e.g., eHealth Exchange
      expanding from PUBLIC_HEALTH to PROVIDER/PATIENT) without reissuance
- [ ] 1.8 Add `useTypes` multi-select input (Patient / Provider / Public Health) to the
      credential creation form in the UI *(blocked: IGDD-3106)*

## 2. ApiKey — Domain Authorization

- [ ] 2.1 Change TXT lookup target in `verify-domain/index.ts` from
      `_izg-verify.${domain}` to `${domain}` (apex — no subdomain prefix)
- [ ] 2.2 Harden DNS bypass: replace `NODE_ENV === 'development'` auto-bypass with
      explicit `ALLOW_DNS_VERIFY_BYPASS` env flag; block unconditionally when
      `NODE_ENV === 'production'` *(Palak)*
- [ ] 2.3 Remove the `// REVERT BEFORE COMMITTING` comment once bypass is gated *(Palak)*
- [ ] 2.4 Add cross-jurisdiction domain exclusivity check in challenge initiation:
      scan for any existing `ApiKeyDomain` record with the same `domain` + `env`
      under a different `jurisdictionId`; reject with a descriptive error if found
- [ ] 2.5 Apply the same exclusivity check when an existing authorized domain is
      selected (`dnsChoice === 'existing'`)

## 3. ApiKey — Credential Lifecycle

- [ ] 3.1 Rename `env: string` to `environments: string[]` on `ApiKeyCredential`
      TypeScript type
- [ ] 3.2 Update `createApiKeyCredential`, `revokeApiKeyCredential`,
      `supersedApiKeyCredential`, `markApiKeyCredentialViewed`, and all other
      DynamoDB operations that read or write the env field
- [ ] 3.3 Update `POST /api/apikeys/index.ts` to pass `environments: [envIdNum]`
      for standard single-environment credentials
- [ ] 3.4 Update `POST /api/apikeys/renew/index.ts` to copy `environments` from
      the old credential to the new one
- [ ] 3.5 Remove `env` from the JWT payload in `POST /api/apikeys/token.ts`; JWT
      carries identity claims only: `jti`, `sub`, `upn`, `iat`, `exp`; the Hub reads
      `environments` from `ApiKeyCredential` by `jti` at routing time — keeping it
      server-side allows environment scope changes without reissuance
- [ ] 3.6 Add multi-env credential creation for admin/ops roles: accept
      `envIds: number[]` body param when caller has IZG Operations or Jurisdiction
      Operations role *(blocked: IGDD-3106)*
- [ ] 3.7 Add a distinct cancel code path (hard delete, `ready_for_validation` only)
      separate from revoke *(Palak, blocked: IGDD-3106)*
- [ ] 3.8 Update `RevokeDialog` / cancel confirmation dialog submit handlers to call
      the correct endpoint per action *(Palak, blocked: IGDD-3106)*
- [ ] 3.9 Hide cancel action for `active`/`grace` credentials; hide revoke action
      for `ready_for_validation` credentials *(Palak, blocked: IGDD-3106)*
- [ ] 3.10 Verify stat cards (Total / Active / Revoked) update correctly for both
      revoke and cancel paths *(Palak, blocked: IGDD-3106)*

## 4. ApiKey — Filtering and Pagination

- [ ] 4.1 Extend `GET /api/apikeys` to accept `environment`, `status`,
      `organization`, `page`, and `pageSize` query parameters; preserve full-list
      behavior when no params supplied *(Palak)*
- [ ] 4.2 Apply RBAC scoping in list handler: Jurisdiction Operations callers receive
      only their own jurisdiction's credentials regardless of `organization` param
- [ ] 4.3 Update Keys DataGrid to use server-side pagination *(Palak)*
- [ ] 4.4 Implement Filters button: open filter panel for Environment, Status,
      Organization; compose with existing text search *(Palak, blocked: IGDD-3106)*

## 5. Verification

- [ ] 5.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`); resolve all
      errors introduced by schema changes
- [ ] 5.2 Run `npm run test`; update or add unit tests for: DNS apex lookup,
      bypass gating, domain exclusivity, `environments` list, `useTypes`
      enforcement, revoke/cancel distinction
- [ ] 5.3 Smoke-test: initiate domain challenge → verify DNS → create credential →
      view JWT → renew (verify grace and new expiry) → revoke
- [ ] 5.4 Smoke-test cancel: create pending credential → cancel → confirm record
      deleted and stat card decrements
- [ ] 5.5 Smoke-test multi-env: create as IZG Operations with multiple envIds →
      confirm JWT `env` claim contains the list *(blocked: IGDD-3106)*

## 6. Hub — useTypes Enforcement *(separate ticket — izgw-hub + izgw-core)*

> These tasks complete the system feature end-to-end but are implemented in `izgw-hub`
> and `izgw-core`, not in CC. A separate IGDD ticket should be created once CC
> tasks 1.4–1.6 are merged and `useTypes` + `environments` are live in `ApiKeyCredential`.

- [ ] 6.1 At message routing time, verify the sender's JWT signature and extract `jti`
      (authentication only — JWT carries no access control claims)
- [ ] 6.2 Fetch `ApiKeyCredential` by `jti` from DynamoDB; read `status`, `environments`,
      and `useTypes` — these are the authoritative server-side access control properties
- [ ] 6.3 Enforce all three access control checks: `status = active`, target environment
      ∈ `credential.environments`, and `credential.useTypes ∩ destination.allowedUseTypes ≠ ∅`;
      return an `izgw-core` `SecurityFault` with a new fault code specific to useTypes
      access denial
- [ ] 6.4 Log the enforcement decision (allowed or denied) including `useTypes`,
      destination jurisdiction, and environment for audit and operations visibility
