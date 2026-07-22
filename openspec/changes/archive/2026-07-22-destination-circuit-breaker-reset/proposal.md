## Why

Jurisdiction Operations staff and IZ Gateway operations staff currently have
no way to clear a tripped circuit breaker for a single destination from
Configuration Console — the only existing lever is the admin-wide "reset all
circuit breakers" action, a much larger blast radius than clearing the one
destination that actually needs it. Anything narrower requires jurisdiction
staff to go around Configuration Console entirely and file a ticket with IZ
Gateway operations. The Hub already tracks a per-destination circuit-breaker
state; Configuration Console (CC) just doesn't surface it or expose a
single-destination way to clear it.

**Scope note:** an earlier draft of this proposal (mid-implementation)
temporarily narrowed the reset action to `IZG Operations` only, so that the
initial rollout had a smaller blast radius while the Hub-side endpoint was
still unverified. Now that the Hub's `POST /rest/reset/{id}` endpoint is
merged and verified end-to-end (see `design.md`), the scope has been restored
to the original ask: `canResetCircuitBreaker` is granted to both `IZG
Operations` and `Jurisdiction Operations`, mirroring how
`canScheduleMaintainance` is already scoped. A jurisdiction can self-serve a
reset only for destinations within its own jurisdiction (enforced via the
existing `hasAccessToDestId` jurisdiction check); `IZG Operations` remains
exempt from jurisdiction scoping, as it already is everywhere else in the
app.

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
- New `canResetCircuitBreaker` access-control capability, granted to
  `IZG Operations` and `Jurisdiction Operations` — not `Support` roles.
  Enforced both in the UI gate (`useRoleAccess()`) and server-side in the API
  route itself (rejecting any role other than those two with a `401`), so the
  restriction cannot be bypassed by calling the route directly. Jurisdiction
  scoping (which destinations a `Jurisdiction Operations` user may act on) is
  enforced separately and additionally, via the existing
  `checkAccessToDestIdSlug` middleware.

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
    `_IZGOperationsAccess.ts`, `_JurisdictionOperationsAccess.ts` —
    `canResetCircuitBreaker` capability, `true` for `IZG Operations` and
    `Jurisdiction Operations` (default `false` everywhere else, including
    `_JurisdictionSupportAccess.ts` and `_IZGSupportAccess.ts`).
- **Auth / jurisdiction scoping:** The new API route reuses the existing
  `checkAccessToDestIdSlug` middleware and `hasAccessToDestId` jurisdiction
  check, plus an explicit role check inside the handler (rejecting any role
  other than `IZG Operations`/`Jurisdiction Operations` with a `401`) so the
  capability restriction is enforced server-side, not just hidden in the UI.
  A `Jurisdiction Operations` user can still only reset destinations within
  their own assigned jurisdiction(s) — that scoping is unchanged and comes
  from `hasAccessToDestId`, independent of the capability check. No change to
  encrypted fields.
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
