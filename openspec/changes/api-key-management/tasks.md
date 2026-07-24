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

- [ ] 1.1 Add `allowedUseTypes?: string[]` to `Jurisdiction` TypeScript type
- [ ] 1.2 Update DynamoDB reads for `Jurisdiction` to include `allowedUseTypes`
- [ ] 1.3 Add enum validation utility: reject any `allowedUseTypes` or credential
      `useTypes` value not in `['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH']`
- [ ] 1.4 Add `useTypes?: string[]` to `ApiKeyCredential` TypeScript type in
      `src/lib/type/ApiKeyCredential.ts`
- [ ] 1.5 Update `createApiKeyCredential` in `dynamo.ts` to persist `useTypes`
- [ ] 1.6 Add enforcement in `POST /api/apikeys/index.ts`: fetch target jurisdiction's
      `allowedUseTypes` and reject if the credential `useTypes` intersection is empty
- [ ] 1.7 Add `useTypes` to JWT claims in `POST /api/apikeys/token.ts`

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
- [ ] 3.5 Update `POST /api/apikeys/token.ts` JWT `env` claim: emit single string
      when `environments` has one entry; emit list when multiple
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

## 1. DNS Verification Corrections

- [ ] 1.1 Change TXT lookup target in `verify-domain/index.ts` from
      `_izg-verify.${domain}` to `${domain}` (the domain apex — no subdomain prefix)
- [ ] 1.2 Harden DNS bypass: replace the `NODE_ENV === 'development'` auto-bypass with
      an explicit `ALLOW_DNS_VERIFY_BYPASS` env flag check; block bypass unconditionally
      when `NODE_ENV === 'production'` *(Palak)*
- [ ] 1.3 Remove the `// REVERT BEFORE COMMITTING` comment in `verify-domain/index.ts`
      once bypass is properly gated *(Palak)*
- [ ] 1.4 Add cross-jurisdiction domain exclusivity check in the challenge initiation
      path: before creating a `pending_challenge` record, scan for any existing
      `ApiKeyDomain` record with the same `domain` and `env` under a **different**
      `jurisdictionId`; reject with a descriptive error if found
- [ ] 1.5 Apply the same exclusivity check when an existing authorized domain is
      selected for a new credential (`dnsChoice === 'existing'`): verify no other
      jurisdiction holds an authorized record for that domain in that environment

## 2. ApiKeyCredential Schema — environments List

- [ ] 2.1 Rename `env: string` to `environments: string[]` on `ApiKeyCredential`
      TypeScript type in `src/lib/type/ApiKeyCredential.ts`
- [ ] 2.2 Update `createApiKeyCredential` in `dynamo.ts` to write `environments`
      as a StringSet (or JSON array) rather than a single string
- [ ] 2.3 Update `getApiKeyCredential`, `revokeApiKeyCredential`,
      `supersedApiKeyCredential`, `markApiKeyCredentialViewed`, and all other
      DynamoDB operations that read or write the env field
- [ ] 2.4 Update `POST /api/apikeys/index.ts` to pass `environments: [envIdNum]`
      for standard single-environment credentials
- [ ] 2.5 Update `POST /api/apikeys/renew/index.ts` to copy `environments` from
      the old credential to the new credential
- [ ] 2.6 Update `POST /api/apikeys/token.ts` JWT `env` claim: emit a single string
      when `environments` has one entry; emit a list when it has multiple entries

## 3. Multi-Environment Credentials for Admin / Ops

- [ ] 3.1 Add role check in `POST /api/apikeys/index.ts`: if the caller has IZG
      Operations or Jurisdiction Operations role, accept an `envIds: number[]` body
      param; otherwise enforce a single environment
- [ ] 3.2 Store the full `environments` list on the created `ApiKeyCredential` record
- [ ] 3.3 Update credential listing (`GET /api/apikeys`) to display multi-environment
      credentials correctly (show all environments, not just one)

## 4. useTypes on ApiKeyCredential

- [ ] 4.1 Add `useTypes?: string[]` to `ApiKeyCredential` TypeScript type
- [ ] 4.2 Update `createApiKeyCredential` in `dynamo.ts` to persist `useTypes`
- [ ] 4.3 Add `useTypes` to JWT claims in `POST /api/apikeys/token.ts`
- [ ] 4.4 Add `useTypes` input to the credential creation form in the UI
      (multi-select or checkbox group: Patient, Provider, Public Health)

## 5. allowedUseTypes on Jurisdiction + Enforcement

- [ ] 5.1 Add `allowedUseTypes?: string[]` to `Jurisdiction` TypeScript type
- [ ] 5.2 Update DynamoDB reads for `Jurisdiction` to include `allowedUseTypes`
- [ ] 5.3 Add enforcement in `POST /api/apikeys/index.ts`: fetch the target
      jurisdiction's `allowedUseTypes` and reject if the credential's `useTypes`
      intersection is empty
- [ ] 5.4 Add enum validation: reject any `useTypes` or `allowedUseTypes` value
      not in `['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH']`

## 6. Jurisdiction Policy UI

- [ ] 6.1 Add `allowedUseTypes` display to the Jurisdiction detail view (read-only
      for Jurisdiction Operations, editable for IZG Operations)
- [ ] 6.2 Implement edit UI: checkbox group for `PATIENT`, `PROVIDER`,
      `PUBLIC_HEALTH` with human-readable labels
- [ ] 6.3 Add save handler: `PATCH /api/jurisdictions/:id` or equivalent, updating
      `allowedUseTypes` in DynamoDB; validate at least one value is selected
- [ ] 6.4 Wire RBAC: Jurisdiction Operations role may edit own jurisdiction only;
      IZG Operations role may edit any jurisdiction
- [ ] 6.5 Record `allowedUseTypes` changes in the audit trail

## 7. Revoke / Cancel Split

- [ ] 7.1 Add a distinct cancel code path (hard delete from DynamoDB, no reason
      field, available only from `ready_for_validation` status) separate from
      revoke *(Palak)*
- [ ] 7.2 Update `RevokeDialog` / cancel confirmation dialog submit handlers in
      `ApiKeyManagement/index.tsx` to call the correct endpoint for each action *(Palak)*
- [ ] 7.3 Hide cancel action for `active` / `grace` credentials; hide revoke action
      for `ready_for_validation` credentials *(Palak)*
- [ ] 7.4 Verify dashboard stat cards (Total / Active / Revoked) update correctly
      for both revoke and cancel paths *(Palak)*

## 8. Server-Side Filtering and Pagination

- [ ] 8.1 Extend `GET /api/apikeys` to accept `environment`, `status`,
      `organization`, `page`, and `pageSize` query parameters; preserve current
      full-list behavior when no params are supplied *(Palak)*
- [ ] 8.2 Apply RBAC scoping in the list handler: Jurisdiction Operations callers
      receive only their own jurisdiction's credentials regardless of any
      `organization` filter param
- [ ] 8.3 Update the Keys DataGrid to use server-side pagination instead of fetching
      the full table *(Palak)*
- [ ] 8.4 Implement the Filters button: open a filter panel for Environment, Status,
      and Organization; compose with the existing text search input *(Palak)*

## 9. Verification

- [ ] 9.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`); resolve all
      errors introduced by the schema changes
- [ ] 9.2 Run `npm run test`; update or add unit tests for: DNS apex lookup,
      bypass gating, domain exclusivity, environments list, useTypes enforcement,
      renewal expiry rule, revoke/cancel distinction
- [ ] 9.3 Smoke-test end-to-end: initiate domain challenge → verify DNS → create
      credential → view JWT → renew (verify grace period and new expiry) → revoke
- [ ] 9.4 Smoke-test cancel path: create pending credential → cancel → confirm
      record is deleted and stat card decrements
- [ ] 9.5 Smoke-test multi-env credential: create as IZG Operations user with
      multiple envIds → confirm JWT `env` claim contains the list
