## Context

The API Key Management screen and its create/renew/view-token flows are already
implemented on this branch (`src/components/ApiKeyManagement/index.tsx`,
`src/pages/api/apikeys/*`, `src/lib/db/dynamo.ts`). This change closes the remaining
gaps between the UI mockups and the current state: a non-functional Filters button, a
single revoke/cancel transition that doesn't match the mockup's two distinct
destructive-vs-simple-confirmation modals, a temporary DNS verification bypass, and
client-side-only pagination/filtering.

## Goals / Non-Goals

**Goals:**
- Functional Filters button (Environment, Status, Organization)
- Distinct revoke (destructive, keeps record, sets Revoked status) vs. cancel (deletes
  pending record) operations
- Dev-only DNS bypass gated so it cannot run in production
- Server-side pagination/filtering on `GET /api/apikeys`

**Non-Goals:**
- Redesigning the create/renew/view-token flows (already implemented, working)
- Migrating away from the single-table DynamoDB design

## Decisions

### D1 — Cancel deletes the item; Revoke marks status Revoked

**Decision:** `cancel` (only valid from `Ready for Validation`/`Validation` status)
performs a hard delete of the `ApiKeyCredential` item. `revoke` (valid from
`Active`/`Grace Period`) sets `status: 'Revoked'` and `revokedAt`, keeping the record
for audit/history, matching the dashboard's "Revoked 2025-02-01" row display.

**Rationale:** Matches the mockup's two separate modals exactly — cancel is a simple
"this will delete the current API KEY" confirmation with no reason field, revoke is a
destructive-styled confirmation with an optional reason.
Reusing one PATCH transition for both (current state) loses this distinction and makes
"Total Keys" accounting ambiguous (a cancelled key was never really provisioned, but a
revoked key was).

### D2 — Dev DNS bypass gated by `process.env.NODE_ENV !== 'production'` AND an explicit flag

**Decision:** Wrap the bypass in `verify-domain/index.ts` with both a `NODE_ENV` check
and a dedicated env var (e.g. `ALLOW_DNS_VERIFY_BYPASS=true`), defaulting to disabled.

**Rationale:** `NODE_ENV` alone is not a reliable production guard in every deployment
config used by this repo; requiring an explicit opt-in flag means the bypass cannot be
silently active in a misconfigured environment.

## Risks / Trade-offs

**[Risk] Splitting revoke/cancel changes existing frontend call sites**
→ `CustomToolbar`/row actions in `ApiKeyManagement/index.tsx` currently call one PATCH
for both; update both call sites and the dialogs' submit handlers in the same PR to
avoid a broken intermediate state.

## Migration Plan

1. Split `PATCH /api/apikeys` revoke transition into `revoke` and `cancel` handlers;
   update frontend dialogs to call the correct one
2. Wire Filters button to a menu; extend `GET /api/apikeys` to accept
   environment/status/organization/page/pageSize query params
3. Gate the DNS verification bypass behind `NODE_ENV` + explicit flag; remove the
   inline "REVERT BEFORE COMMITTING" comment once resolved
4. Run `npm run code-quality-check` and `npm run test`

**Rollback:** Revert the PR; the existing single-endpoint revoke/cancel continues to
function as it does today.

## Open Questions

_None._
