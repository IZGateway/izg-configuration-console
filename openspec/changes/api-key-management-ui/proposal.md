## Why

IZ Gateway is replacing client-certificate authentication for Hub integrations with
API keys, so jurisdictions can onboard and rotate credentials without a cert-issuance
process. Most of the API Key Management screen (`src/components/ApiKeyManagement/index.tsx`)
and its supporting API routes/DB layer already existed on this branch, built directly
against the UI mockups for the create/renew/revoke/view-token flows. What remained was:
closing the gaps between the mockups and the implementation (Filters button was a
non-functional stub, revoke and cancel shared one endpoint/status transition with no
distinct audit trail), hardening a known temporary shortcut in DNS verification, and —
as the IGDD-3140 design review landed — reconciling the credential/JWT model, adding
server-side authorization, and building out the use-type/domain-policy work the Hub
depends on.

## What Changes

Scope grew well beyond the original four gap-closers. Delivered on this branch:

### Original gap-closers
- **Filters button**: real filter menu (Environment, Status, Organization) composing
  with the search text filter. _(Client-side; see Non-Goals.)_
- **Revoke vs. Cancel differentiation**: split into two distinct operations — `revoke`
  (`active`/`grace_period`, destructive, optional reason, sets `revoked`) and `cancel`
  (pending `ready_for_validation` only). **Cancel is a soft-cancel** (sets `cancelled` +
  `cancelledBy`/`cancelledAt`, **retains** the record for audit, hidden from the default
  view) — revised from the initial "hard delete" plan; see design D1.
- **DNS verification hardening**: dev bypass gated behind `NODE_ENV !== 'production'`
  **and** an explicit `ALLOW_DNS_VERIFY_BYPASS` flag (default off, warns when active);
  "REVERT BEFORE COMMITTING" removed.

### Use-type policy (IGDD-3140)
- New `AllowedUseType` enum (`PATIENT | PROVIDER | PUBLIC_HEALTH`); required +
  enum-validated on create; stored as a DynamoDB List; carried through renew.
- Create-dialog Use Types picker narrows to the selected organization's registered
  `useTypes`, falling back to the full enum when unseeded (so creation isn't broken
  where senders haven't been backfilled yet).
- Create-dialog Organization dropdown is filtered to **senders only** (rows with a
  non-empty `useTypes`) — a submitter credential can't be issued to a destination-only
  jurisdiction.

### Credential/JWT model reconciliation (IGDD-3140)
- Credential re-keyed from `{env}#{jti}` to bare **`{jti}`** — the Hub reads a
  credential directly by `jti` at routing time.
- `env` (string) replaced by **`environments`** (List); admin-only (IZG Operations)
  multi-environment credential creation, server-enforced.
- JWT reduced toward identity-only: the `env` claim is removed (environment
  authorization is a server-side property the Hub reads by `jti`). `roles` is
  retained for now, pending confirmation that nothing in izgw-hub/izgw-core reads it.
- DNS ownership challenge moved to the **domain apex** (DigiCert-style), not a
  `_izg-verify.` subdomain.
- **Global domain exclusivity**: a domain belongs to exactly one jurisdiction across
  every environment, enforced via a race-safe conditional claim
  (`ApiKeyDomainOwner`) at the point a domain is newly authorized, plus an early,
  non-authoritative check at credential-creation time so a caller isn't sent through
  the DNS challenge for a domain another jurisdiction already owns.

### Server-side authorization (closes IDOR)
- New `src/lib/security/apiKeyAuthz.ts`: `hasApiKeyPermission` (role gate) +
  `ownsJurisdiction`/`requireApiKeyAccess` (tenancy gate). Applied to **every**
  `/api/apikeys/*` route — list (ownership-filtered), create, revoke, cancel, renew,
  token reveal (gated as a mint operation), verify-domain, and domain lookup.
  Previously these routes only checked that a session existed.
- Nav visibility for the API Key Management page now follows the same
  `canListApiKeys` permission (any role with real access can find the page), rather
  than the narrower `isAdmin` flag that hid it from Jurisdiction Operations despite
  their having full server-side access.

### Product guardrails
- **Duplicate-scope warning**: creating a key whose (environment + use types) exactly
  matches an existing active key for the same organization/domain warns and steers to
  Renew, but does not block (soft, overridable).
- **Expired-key re-issue**: an expired key gets a re-issue action — a Renew-styled
  dialog (prefilled, read-only) that issues a fresh key (no grace overlap, `now + 1yr`)
  and routes through the DNS challenge first if the domain's own authorization has
  also lapsed. The old expired key is left untouched.

### Data-integrity and correctness hardening
- `GET /api/apikeys` now pages through `LastEvaluatedKey` (previously silently
  truncated past DynamoDB's 1MB page limit) and resolves each distinct jurisdiction
  once instead of once per credential.
- Token "view exactly once" is now atomic (`markApiKeyCredentialViewed` conditions on
  `attribute_not_exists(viewedAt)`) rather than relying on a stale pre-read check.
- `revokeApiKeyCredential` and `supersedeApiKeyCredential` (renamed from the
  misspelled `supersedApiKeyCredential`) now use atomic status-conditioned writes,
  matching the pattern already used by cancel/activate.
- The `verify-domain` "already authorized" fast path now also checks `authExpiresAt`,
  so a stale authorization can no longer activate a credential without re-proving DNS.
- The Keys grid sorts by created-time descending by default (a new key no longer gets
  buried); a malformed/legacy row missing `jurisdictionId` no longer crashes the
  search filter (falls back to a displayable placeholder).
- Type-only imports (`import type`) for interface/type-only symbols across the DB
  layer, avoiding unnecessary runtime imports.

### RBAC (UI + server)
- Fixed the access-matrix page key (`apikeymanagement` → `apikeys`), added
  `canCancelApiKey`, and gated Create/Revoke/Renew/Cancel via `useRoleAccess()` on the
  client — now backed by the equivalent server-side checks above, not UI-only.

## Deferred (not in this change)

- Server-side pagination on `GET /api/apikeys` — evaluated and **decided against** for
  current scale (bounded organization count, already ownership-scoped); the real
  correctness/perf issues were fixed directly instead (see above).
- `useTypes` as a grid column; the Audit Log tab (still a stub).
- Server-side enforcement that `credential.useTypes ⊆ sender.useTypes` — deliberately
  held so the real break-point (unseeded sender data) stays visible.
- Removing the JWT `roles` claim — pending confirmation nothing in izgw-hub/izgw-core
  reads it.
- US-federal-holiday awareness in the grace-period business-day calculation (weekends
  only, this release).
- Explicit access mapping for the three unmapped roles (IZG Program, CDC Program, CDC
  CISO) — currently deny-by-default, which is already secure.
- **Hub-side enforcement** of the `useTypes ∩ allowedUseTypes` routing-time
  intersection and the new `izgw-core` SecurityFault — separate izgw-hub ticket.
- **Production data seeding** (`Jurisdiction.allowedUseTypes` backfill, sender
  registration) — separate ops ticket; a seeding script is the tracked deliverable.
- Backfilling legacy `{env}#{jti}`-keyed rows and legacy singular `env` attributes —
  read paths already tolerate both via fallback; a real migration is a separate ops
  task if/when the Hub starts reading exclusively by bare `jti`.

## Capabilities

### Modified Capabilities

- `api-key-management`: Splits revoke/cancel into distinct operations, hardens DNS
  verification (bypass gating + apex TXT + domain exclusivity), adds server-side
  authorization and jurisdiction-ownership scoping, reconciles the credential/JWT
  model with IGDD-3140 (re-key, `environments`, identity-only JWT), and adds
  use-type policy, duplicate-scope, and expired-key re-issue behavior to the existing
  dashboard/create/renew/revoke/view-token flows.

## Impact

- **Affected code**: `src/components/ApiKeyManagement/index.tsx`,
  `src/pages/api/apikeys/{index,renew/index,verify-domain/index,token,domains}.ts`,
  `src/lib/db/{dynamo,DbClientFactory,ConfigConsoleMutateRepository,ConfigConsoleFetchRepository}.ts`,
  `src/lib/type/{ApiKeyCredential,Jurisdiction}.ts`, `src/lib/apikeys/jwt.ts`,
  `src/lib/type/PageAccessControls.ts`,
  `src/lib/security/{accesslevel,useRoleAccess}.ts` + `accessdefinitions/*`,
  `src/components/Navigation/{index,menuItems}.tsx`, `src/.env.template`.
- **New code**: `src/lib/type/AllowedUseType.ts`; `src/lib/security/apiKeyAuthz.ts`
  (role + tenancy gate); `claimDomainOwnership`/`getDomainOwner` (global domain
  exclusivity); `cancelApiKeyCredential` (soft cancel); `issuedAt` on the credential;
  `canCancelApiKey` in the access matrix; node-env tests
  (`pages/api/apikeys/lifecycle.test.ts`, `lib/db/dynamo.apikeyLifecycle.test.ts`,
  61 tests total across the two files).
- **Shared-table contract**: the console and the Hub (`izgw-hub`) read/write the same
  DynamoDB `ApiKeyCredential`/`ApiKeyDomain` rows. Status value `grace_period`,
  attribute `supersededBy`, the bare-`{jti}` sort key, and the `environments` List are
  all contractual — reconciled with the Hub's own IGDD-3140 OpenSpec update
  (izgw-hub PR #177).
- **Security**: closes a real IDOR — every apikey route now requires both role and
  jurisdiction ownership, not just an authenticated session (previously any
  authenticated user could revoke/renew/cancel/reveal-token for another
  jurisdiction's credentials, or enumerate the full credential list).
- **No breaking change** to the create/renew/view-token flows beyond the credential
  re-key, the split revoke/cancel endpoints, and the expiry-at-issuance stamping —
  existing rows are read via fallback (legacy `env` attribute, legacy `{env}#{jti}`
  keys still resolve).
