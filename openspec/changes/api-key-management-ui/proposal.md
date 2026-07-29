## Why

IZ Gateway is replacing client-certificate authentication for Hub integrations with
API keys, so jurisdictions can onboard and rotate credentials without a cert-issuance
process. Most of the API Key Management screen (`src/components/ApiKeyManagement/index.tsx`)
and its supporting API routes/DB layer already exist on this branch, built directly
against the UI mockups for the create/renew/revoke/view-token flows. What remains is:
closing the gaps between the mockups and the current implementation (Filters button is
a non-functional stub, revoke and cancel share one endpoint/status transition with no
distinct audit trail), and hardening a known temporary shortcut in DNS verification
before this ships.

## What Changes

Scope grew during implementation (and as the IGDD-3140 design landed) beyond the original
four gap-closers. Delivered on this branch:

- **Filters button**: real filter menu (Environment, Status, Organization) composing with
  the search text filter. _(Interim: client-side.)_
- **Revoke vs. Cancel differentiation**: split into two distinct operations — `revoke`
  (`active`/`grace_period`, destructive, optional reason, sets `revoked`) and `cancel`
  (pending `ready_for_validation`). **Cancel is a soft-cancel** (sets `cancelled` +
  `cancelledBy`/`cancelledAt`, **retains** the record for audit, hidden from the default
  view) — revised from the initial "hard delete" plan; see design D1.
- **DNS verification hardening**: dev bypass gated behind `NODE_ENV !== 'production'`
  **and** an explicit `ALLOW_DNS_VERIFY_BYPASS` flag (default off, warns when active);
  "REVERT BEFORE COMMITTING" removed.
- **Use Types**: new `AllowedUseType` enum; required + enum-validated on create; stored as
  a DynamoDB List; carried through renew; multi-select in the create dialog.
- **Credential lifecycle**: expiry stamped at **issuance** (not record creation); a derived
  **`Expired`** status and grace-ended **`Revoked`**; renewal domain is fixed
  (prepopulated/read-only and server-authoritative).
- **Hub contract alignment**: grace status value `grace_period` and successor attribute
  `supersededBy`, matching the Hub's shared-table reads.
- **RBAC (UI gating)**: fixed the access-matrix page key, added `canCancelApiKey`, and gated
  Create/Revoke/Renew/Cancel via `useRoleAccess()` (deny-by-default; **UI only**).

**Deferred (not in this change):** server-side pagination/filtering on `GET /api/apikeys`;
server-side authorization + jurisdiction-ownership scoping; per-jurisdiction
`Jurisdiction.allowedUseTypes`; multi-env credentials; apex-TXT + cross-jurisdiction domain
exclusivity; Revoked → Renew; Hub-side useTypes/env enforcement and the sweeper
Expired-vs-Revoked split.

## Capabilities

### Modified Capabilities

- `api-key-management`: Splits revoke/cancel into distinct operations, hardens DNS
  verification, and adds server-side filtering/pagination to the existing dashboard,
  create/renew/revoke/view-token flows.

## Impact

- **Affected code**: `src/components/ApiKeyManagement/index.tsx`,
  `src/pages/api/apikeys/{index,renew/index,verify-domain/index,token}.ts`,
  `src/lib/db/{dynamo,DbClientFactory,ConfigConsoleMutateRepository}.ts`,
  `src/lib/type/ApiKeyCredential.ts`, `src/lib/type/PageAccessControls.ts`,
  `src/lib/security/{accesslevel,useRoleAccess}.ts` + `accessdefinitions/*`,
  `src/.env.template`.
- **New code**: `src/lib/type/AllowedUseType.ts`; `cancelApiKeyCredential` (soft cancel);
  `issuedAt` on the credential; `canCancelApiKey` in the access matrix; node-env tests
  (`pages/api/apikeys/lifecycle.test.ts`, `lib/db/dynamo.apikeyLifecycle.test.ts`).
- **Shared-table contract**: the console and the Hub (`izgw-hub`) read/write the same
  DynamoDB `ApiKeyCredential` rows. Status value `grace_period` and attribute
  `supersededBy` are contractual — changing them requires a coordinated Hub change.
- **Security**: DNS-verification bypass gating and the actor/timestamp captured on
  revoke/cancel are security-sensitive. **Role gating here is UI-only** — server-side
  authorization + jurisdiction-ownership scoping on the API routes remain to be done.
- **No breaking change** to the create/renew/view-token flows beyond the now-split
  revoke/cancel endpoints and the expiry-at-issuance stamping.
