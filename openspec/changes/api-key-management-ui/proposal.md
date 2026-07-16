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

- **Filters button**: Wire the existing `CustomToolbar` "FILTERS" button to a real
  filter menu (Environment, Status, Organization) that composes with the existing
  search-by-key-ID-or-jurisdiction text filter.
- **Revoke vs. Cancel differentiation**: Split the single `PATCH /api/apikeys`
  transition into two distinct operations — `revoke` (active/grace key, destructive,
  requires confirmation copy from the mockup) and `cancel` (pending
  `Ready for Validation`/`Validation` key, deletes the record rather than marking it
  Revoked) — so the dashboard stats reflect the correct semantics.
- **DNS verification hardening**: Remove or properly gate the dev-only bypass in
  `src/pages/api/apikeys/verify-domain/index.ts` (flagged inline as
  "REVERT BEFORE COMMITTING") behind an explicit non-production environment check
  rather than being reachable by default.
- **Pagination/filtering**: Move `GET /api/apikeys` from "fetch entire table, filter
  client-side" to accepting filter/pagination query params, so the dashboard scales
  past the current small fixture data.

## Capabilities

### Modified Capabilities

- `api-key-management`: Splits revoke/cancel into distinct operations, hardens DNS
  verification, and adds server-side filtering/pagination to the existing dashboard,
  create/renew/revoke/view-token flows.

## Impact

- **Affected code**: `src/components/ApiKeyManagement/index.tsx`,
  `src/pages/api/apikeys/index.ts`, `src/pages/api/apikeys/verify-domain/index.ts`,
  `src/lib/db/dynamo.ts`, `src/lib/db/DbClientFactory.ts`,
  `src/lib/db/ConfigConsoleMutateRepository.ts`, `src/lib/type/ApiKeyCredential.ts`.
- **New code**: a `cancel` code path distinct from `revoke`.
- **Security**: Revoke/cancel reasons and DNS-verification bypass gating are
  security-sensitive — the dev bypass must not be reachable in production, and
  revoke/cancel actions must capture actor/timestamp via the existing
  `AsyncLocalStorage` context (`getAuditUserString()`), consistent with the rest of the app.
- **No breaking change** to the existing create/renew/view-token flows, which are
  already implemented and out of scope here except where they call the now-split
  revoke/cancel endpoint.
