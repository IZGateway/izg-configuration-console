## Context

The API Key Management screen and its create/renew/view-token flows were already
implemented on this branch (`src/components/ApiKeyManagement/index.tsx`,
`src/pages/api/apikeys/*`, `src/lib/db/dynamo.ts`). This change began as four gap-closers
(Filters, revoke/cancel split, DNS bypass hardening, server-side pagination) and grew, as
implementation progressed and the IGDD-3140 design landed, to also cover: **Use Types**
end-to-end, **credential-lifecycle** changes (expiry stamped at issuance, an `Expired`
status, renewal domain immutability), **RBAC UI gating**, and **alignment with the Hub's
DynamoDB contract** (status value + attribute names). The console and the Hub
(`izgw-hub`) share one DynamoDB table, so several decisions below are about matching the
Hub's read-time enforcement rather than the console acting alone.

## Goals / Non-Goals

**Goals:**
- Functional Filters (Environment, Status, Organization) — client-side interim.
- Distinct revoke vs. cancel operations.
- Dev-only DNS bypass that cannot run in production.
- Use Types captured, validated, and carried through renew.
- Expiry/`Expired`/`Grace Period`/`Revoked` semantics that match the Hub.
- UI actions gated by role (deny-by-default).

**Non-Goals (deferred / separate work):**
- Server-side pagination/filtering on `GET /api/apikeys` (still client-side — §3 of tasks).
- Server-side authorization + jurisdiction-ownership scoping on the API routes.
- Per-jurisdiction `useTypes` policy (`Jurisdiction.allowedUseTypes`), multi-env credentials,
  apex-TXT + cross-jurisdiction domain exclusivity — tracked separately.
- Hub-side enforcement of `useTypes`/env and the Expired-vs-Revoked sweeper split.

## Decisions

### D1 — Cancel is a SOFT cancel (record retained), Revoke marks status Revoked  *(REVISED)*

**Original decision:** `cancel` hard-deletes the pending `ApiKeyCredential`.
**Revised decision (2026-07-28, product):** `cancel` performs a **soft cancel** — sets
`status: 'cancelled'` + `cancelledBy`/`cancelledAt` and **retains the record** for audit.
Valid only from `ready_for_validation`, enforced atomically by a DynamoDB
ConditionExpression (`cancelApiKeyCredential`, `DELETE /api/apikeys`). Cancelled rows are
**hidden from the default Keys view** and surfaced only when the Status filter is set to
`Cancelled`. `revoke` still sets `status: 'revoked'` + `revokedAt`, valid from
`active`/`grace_period`.

**Rationale:** Cancellation is logged either way; retaining the record preserves a
developer/audit signal (and can defer building a separate credential-history page) at
negligible cost, while default-hiding keeps the list free of noise for vendors/staff who
manage many keys. The HTTP verb stays `DELETE` (it is still "the Cancel action").

### D2 — Dev DNS bypass gated by `NODE_ENV !== 'production'` AND an explicit flag

**Decision & implementation:** `DNS_VERIFY_BYPASS_ENABLED = NODE_ENV !== 'production' && ALLOW_DNS_VERIFY_BYPASS === 'true'`
in `verify-domain/index.ts`; default disabled, `logger.warn` emitted when active, flag
documented in `src/.env.template`. `NODE_ENV` alone is not a reliable production guard in
every deploy config, so the explicit opt-in is required.

### D3 — `useTypes` stored as a DynamoDB String Set (SS)  *(REVISED — aligned to IGDD-3140)*

**Decision:** persist `ApiKeyCredential.useTypes` as a deduped **DynamoDB String Set (`SS`)**
via `docClient.createSet`, matching the canonical IGDD-3140 storage decision. On read the
DocumentClient unmarshals the `SS` and values are validated via `filter(isValidUseType)`.
`useTypes` is a server-side property (Hub reads it by `jti`), **not** a JWT claim.

> **Superseded approach:** this branch originally persisted `useTypes` as a deduped **List**
> (the lib-dynamodb v3 DocumentClient returns Sets as native JS `Set`s with no
> unmarshal-to-array option, and the interim ER diagram showed `+List useTypes`). IGDD-3140
> makes `SS` canonical, so the shipped List implementation must be migrated to `SS`.

### D4 — Expiry (and JWT `iat`) are stamped at issuance, not at record creation

**Decision:** a `ready_for_validation` row carries **no expiry**; `verify-domain` stamps
`issuedAt` + `expiresAt = now + 1yr` when it flips the credential to `active`. The
existing-authorized-domain and renewal paths issue at create time, so they stamp then.
`token.ts` uses `issuedAt ?? createdOn` for the JWT `iat`, so the disclosed validity is
exactly one year from issuance. Renewal expiry: within 30 days of the old expiry →
`oldExpiry + 1yr`; otherwise `now + 1yr`.

### D5 — `Expired` / grace-ended `Revoked` are derived in the UI; the Hub owns authoritative status

**Decision:** the console derives display status from the stored dates rather than waiting
on the Hub sweeper. Effective grace end = `min(graceExpiresAt, exp)` (a token cannot outlive
its `exp`). Precedence: stored `revoked`/`cancelled` win (`expired` is derived-only, never
stored); then for a renewed key
`Grace Period` while `now < min(graceEnd, exp)`, else `Expired` if `exp <= graceEnd` else
`Revoked`; then a non-renewed key past `exp` → `Expired`. The **Hub's**
`GracePeriodRevocationScheduler` persists the authoritative status (and currently marks all
grace-swept keys `revoked` — the Expired-vs-Revoked split is a separate Hub story).

### D6 — Match the Hub's DynamoDB contract exactly

**Decision:** the console and Hub share the table, so the grace status value is
**`grace_period`** (Hub `isUsableStatus` + sweep both key on it; the interim `grace` broke
both) and the successor attribute is **`supersededBy`** (the Hub model field; the interim
`supersededByJti` left the sweep's audit reference null). `active`/`grace_period` are the
only Hub-usable statuses.

### D7 — RBAC is wired at the UI only in this change; server-side authz is deferred

**Decision:** fix the access-matrix page key (`apikeymanagement` → `apikeys`), add
`canCancelApiKey`, and gate Create + Revoke/Renew/Cancel via `useRoleAccess()`
(deny-by-default). **This is UI gating only — it is not a security boundary.** Server-side
authorization and jurisdiction-ownership scoping (IDOR) on the API routes are explicitly
out of scope here (see Non-Goals / Open Questions).

## Risks / Trade-offs

- **[Risk] UI role-gating is not enforcement.** Until server-side authz lands, any
  authenticated user can call the API routes directly. Tracked as a follow-up.
- **[Risk] Grace cutoff depends on the Hub sweeper being enabled.** With
  `apikey.grace-revocation.enabled=false`, an aged-out key stays Hub-usable until its JWT
  `exp`, while the console derives `Revoked`/`Expired` — a display-vs-reality divergence.
  Enabling the sweeper is a rollout prerequisite.
- **[Risk] Client-side filtering/paging** does not scale past small datasets — §3 remains open.

## Migration Plan

Shipped incrementally on this branch (lint + tsc + node-env tests green at each step).
**Rollback:** revert the PR; there is no destructive data migration (cancel now retains
records; grace/successor values are forward-compatible, with legacy `grace`/`superseded`
still accepted on revoke).

## Open Questions

Deferred to follow-up tickets (see the Config Console / Hub / DB breakdown):
server-side pagination + authorization + ownership scoping; `Jurisdiction.allowedUseTypes`
+ per-jurisdiction Use Types; multi-env credentials; apex-TXT + cross-jurisdiction domain
exclusivity; Revoked → Renew; and the Hub sweeper Expired-vs-Revoked split.
