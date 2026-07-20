## Why

IZ Gateway operations staff currently have no way to clear a tripped circuit
breaker for a single destination from Configuration Console — the only
existing lever is the admin-wide "reset all circuit breakers" action, a much
larger blast radius than clearing the one destination that actually needs it.
Anything narrower requires operations staff to go around Configuration
Console entirely. The Hub already tracks a per-destination circuit-breaker
state; Configuration Console (CC) just doesn't surface it or expose a
single-destination way to clear it.

**Scope note:** an earlier draft of this proposal framed this as
jurisdiction self-service (letting the destination's own jurisdiction clear
its own tripped breaker). That framing was narrowed during implementation —
`canResetCircuitBreaker` is granted to `IZG Operations` only, both in the UI
gate and enforced server-side in the API route. Jurisdiction users still see
the "circuit breaker tripped" status indicator, but do not get the reset
action itself.

## What Changes

- Show a distinct "circuit breaker tripped" indicator in the Manage
  Connections destination table's STATUS column when a destination's Hub
  status reports a tripped circuit breaker (currently indistinguishable from a
  generic "Not Connected" state).
- Add a **"Reset Circuit Breaker"** item to the existing per-row "..." action
  menu (`PopOverActionButtons`), visible only when that destination's circuit
  breaker is tripped and the acting user's role is permitted.
- Clicking it opens a confirmation dialog ("Are you sure you want to reset the
  circuit breaker for {jurisdiction} — {endpoint} ({environment})? This action
  will restore connectivity and log the reset.") with Confirm/Cancel.
- On confirm, CC calls a new jurisdiction-scoped API route that proxies a reset
  request to the Hub environment that owns that destination, then updates the
  row in place with the Hub's returned (cleared) status.
- The reset action is logged via the existing structured request logger, which
  already auto-attributes every log line to the acting user.
- New `canResetCircuitBreaker` access-control capability, granted to the
  `IZG Operations` role only — not `Jurisdiction Operations`, and not
  `Support` roles. Enforced both in the UI gate (`useRoleAccess()`) and
  server-side in the API route itself (`session.user.role !== 'IZG
  Operations'` → `401`), so the restriction cannot be bypassed by calling the
  route directly.

**Explicitly out of scope for this change:**
- The admin-wide "reset all circuit breakers" action (a separate, larger-blast-radius
  capability) — tracked separately.
- Any change to how/when the Hub *trips* a circuit breaker, or to
  cross-instance signaling. **Verified against the actual merged Hub
  implementation** (see `design.md`): the reset does *not* write to DynamoDB
  or any durable store — it only mutates an in-memory status cache on
  whichever single Hub instance handled the request. This change does not
  attempt to fix that; it is a known, accepted limitation inherited from the
  Hub's existing reset-all endpoint, not something introduced here.
- The Hub-side `POST /rest/reset/{destId}` endpoint itself, which lives in the
  separate `izgw-hub` repository. This change is a client of that contract.

## Capabilities

### New Capabilities
- `destination-circuit-breaker-reset`: jurisdiction-scoped visibility into a
  destination's circuit-breaker status in Manage Connections, and a
  confirm-gated, role-gated, single-destination reset action that calls the
  Hub and updates the UI in place.

### Modified Capabilities
<!-- None. No existing openspec/specs/ capability covers connection-status
     display or per-row actions on Manage Connections today. -->

## Impact

- **Code:**
  - `src/pages/api/status/reset/[...slug].ts` (new) — jurisdiction-checked API
    route proxying to the Hub, reusing `withMiddleware('checkAccessToDestIdSlug')`
    and `IZGHubStatusHistoryEndpoint`.
  - `src/components/ConnectionTable/index.tsx` — STATUS column tripped-state
    indicator.
  - `src/components/ConnectionTable/popOverActionButtons.tsx` — new menu item.
  - `src/components/ConnectionTable/resetCircuitBreakerDialog.tsx` (new) —
    confirmation dialog.
  - `src/lib/type/PageAccessControls.ts`,
    `src/lib/security/accessdefinitions/defaultaccesslevels.ts`,
    `_IZGOperationsAccess.ts` — `canResetCircuitBreaker` capability, `true`
    only for `IZG Operations` (default `false` everywhere else, including
    `_JurisdictionOperationsAccess.ts`, which is unmodified).
- **Auth / jurisdiction scoping:** The new API route reuses the existing
  `checkAccessToDestIdSlug` middleware and `hasAccessToDestId` jurisdiction
  check, plus an explicit role check inside the handler
  (`session.user.role !== 'IZG Operations'` → `401`) so the `IZG
  Operations`-only restriction is enforced server-side, not just hidden in
  the UI. No change to encrypted fields.
- **Cross-repo dependency — now resolved:** the Hub (`izgw-hub`) has merged
  `POST /rest/reset/{id}` (PR
  [#170](https://github.com/IZGateway/izgw-hub/pull/170), merged into
  `develop` 2026-07-20). Verified directly against that PR's diff: route
  shape, HTTP method, and response body (`IEndpointStatus` JSON, matching
  what `/rest/statushistory` already returns) all match what this change's
  API route already expects — no changes needed on the CC side. The Hub
  endpoint requires the caller's mTLS certificate to carry the `ADMIN` role
  (`@RolesAllowed(Roles.ADMIN)`); Configuration Console's certificate is
  already a permitted app on the Hub, so this is not a blocking dependency.
- **De-risked by the same lookup:** the tripped-state string this change keys
  off of, `"Circuit Breaker Thrown"`, is confirmed as a stable, public Hub
  interface constant (`IEndpointStatus.CIRCUIT_BREAKER_THROWN`) already used
  by the Hub's own `isCircuitBreakerThrown()` check — see `design.md` for
  citations.
- **Known, accepted limitation (not introduced by this change):** the Hub's
  reset — both the pre-existing reset-all and the new per-destination one —
  only mutates an in-memory status cache on whichever single Hub instance
  handled the request; it is not written to Elasticsearch, DynamoDB, or any
  other durable store, and is not visible to other Hub instances. See
  `design.md` Risks/Trade-offs for citations.
- **Observability:** adds one new `logger.info` line per reset action,
  automatically carrying the existing `sessionUser` attribution — no new log
  category or persisted audit table.
