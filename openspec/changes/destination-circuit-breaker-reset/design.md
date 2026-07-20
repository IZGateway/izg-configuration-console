## Context

Manage Connections (`src/pages/manageconnections/index.tsx` →
`src/components/ConnectionTable/index.tsx`) already renders a per-destination
STATUS column and a per-row "..." action menu
(`src/components/ConnectionTable/popOverActionButtons.tsx`) with History and
Maintenance actions. The Hub's per-destination connection status already
flows into that table as an untyped `status` string (via
`src/lib/services/fetchEndpointStatus.ts`, which polls every configured Hub
using `IZGHubStatusHistoryEndpoint`) — there is no `CircuitBreaker` type
anywhere in this CC repo today.

**Verified against the Hub source** (the `izgw-hub`/`izgw-core` repos are
checked out locally as siblings of this repo, at `../izgw-hub` and
`../izgw-core`): a tripped breaker is reported as the exact literal string
`"Circuit Breaker Thrown"` — this is a public interface constant,
`IEndpointStatus.CIRCUIT_BREAKER_THROWN`
(`izgw-core/src/main/java/gov/cdc/izgateway/model/IEndpointStatus.java:140`),
set via `status.setStatus(IEndpointStatus.CIRCUIT_BREAKER_THROWN)`
(`izgw-hub/src/main/java/gov/cdc/izgateway/hub/service/StatusCheckerService.java:285`).
`AbstractEndpointStatus.isCircuitBreakerThrown()` itself does
`CIRCUIT_BREAKER_THROWN.equalsIgnoreCase(status)`
(`izgw-core/.../model/AbstractEndpointStatus.java:173-175`) — the same
case-insensitive comparison this design uses — and that `status` field is
exactly what's serialized to JSON as `"status"`
(`@JsonPropertyOrder({..., "status", ...})`,
`AbstractEndpointStatus.java:27`), i.e. the same field CC already consumes via
`/rest/statushistory`. This is no longer an assumption carried over from the
companion design doc's pseudocode — it's confirmed against the actual Hub
model class.

**Also verified — the per-destination reset endpoint has since been built
and merged in `izgw-hub`.** At the time this design was first written,
`StatusController.java` only had `@GetMapping("/reset")` calling
`endpointStatusService.resetCircuitBreakers()` (plural, no `destId`). That
gap has since been closed: `izgw-hub` PR
[#170](https://github.com/IZGateway/izgw-hub/pull/170) ("feat: add circuit
breaker reset functionality for Endpoint statuses") merged into `develop` on
2026-07-20, adding `@PostMapping("/reset/{id}")` →
`resetCircuitBreakerById(id)` in `StatusController.java`, backed by a new
`resetCircuitBreakerById(String id)` method on `EndpointStatusRepository`.
Verified directly against that PR's diff:
- Route shape (`POST /rest/reset/{id}`), method, and response body
  (`IEndpointStatus` JSON, same `@JsonPropertyOrder` shape as
  `/rest/statushistory`) all match what this change's API route
  (`src/pages/api/status/reset/[...slug].ts`) already sends and expects — no
  changes needed on the CC side.
- The new endpoint requires `@RolesAllowed(Roles.ADMIN)`, checked against the
  caller's mTLS client certificate (`AccessControlValve.isUserInRole`).
  Configuration Console's certificate is already a permitted/allow-listed
  app on the Hub, so this is not treated as an open risk.
- **The reset is not durably persisted.** The active production repository,
  `ElasticStatusRepository.resetCircuitBreakerById()`
  (`izgw-hub/src/main/java/gov/cdc/izgateway/elastic/ElasticStatusRepository.java`,
  added in PR #170), only mutates an in-memory `cache` map on whichever
  single Hub instance handled the request — there is no write to
  Elasticsearch, DynamoDB, or any other durable store anywhere in that
  method. The DynamoDB-backed `dynamodb.repository.EndpointStatusRepository`
  also received the same method in that PR, but that class's own header
  comment still reads "NOTE: This class is presently incomplete and not
  used," and it is never instantiated anywhere in `izgw-hub` (confirmed by
  searching for `new EndpointStatusRepository(` — no matches outside its own
  constructor). See Risks/Trade-offs below.

Jurisdiction scoping is already enforced two ways: `fetchEndpointStatus`
narrows *which* destinations a non-operations user's SSR page load returns,
and `hasAccessToDestId` (`src/lib/accesshelper.ts`), wired in via
`withMiddleware('checkAccessToDestIdSlug')`
(`src/pages/api/api-middleware-helper.ts`), enforces jurisdiction ownership on
mutating API routes keyed by `{destTypeId}/{destId}` (e.g.
`src/pages/api/statushistory/[...slug].ts`). This change reuses both
mechanisms rather than inventing new authorization logic.

Mockups (provided separately) confirm the exact placement and copy: "Reset
Circuit Breaker" is another item in the existing "..." menu below
History/Disable Maintenance, opening a Confirm/Cancel dialog reading "Are you
sure you want to reset the circuit breaker for {jurisdiction} — {endpoint}
({environment})? This action will restore connectivity and log the reset."

## Goals / Non-Goals

**Goals:**
- Make a tripped circuit breaker visually distinct in the STATUS column, for
  any user who can see the destination.
- Let `IZG Operations` clear a single destination's tripped breaker, with
  confirmation, via the existing action-menu pattern — a narrower-blast-radius
  alternative to the existing admin-wide "reset all" action.
- Log the action with existing attribution machinery — no new plumbing.
- Reuse existing jurisdiction/role-gating and Hub-connectivity patterns
  exactly; add no new authorization primitive beyond a direct role check.

**Non-Goals:**
- Jurisdiction self-service reset. An earlier draft of this design scoped the
  reset action to `Jurisdiction Operations` as well as `IZG Operations`
  (mirroring `canScheduleMaintainance`). That was narrowed during
  implementation to `IZG Operations` only — see Decision D3. Jurisdiction
  users still get the status *visibility* goal above, not the reset action.
- The admin-wide "reset all" action (separate, larger blast radius; tracked
  separately).
- Any change to Hub-side circuit-breaker trip logic, or to cross-Hub-instance
  signaling/persistence. **Verified against the merged Hub implementation**
  (see Context above): the reset is not written to DynamoDB or any durable
  store — it only affects the in-memory state of whichever single Hub
  instance handled the request. Fixing that is Hub-side work, out of scope
  for this change; see Risks/Trade-offs.
- A persisted DynamoDB audit trail entity for this specific action (the
  existing structured-log attribution is judged sufficient — see Decision D5).
- The Hub's `POST /rest/reset/{id}` endpoint implementation itself (lives in
  `izgw-hub`, a different repository — already merged, see Context above).

## Decisions

### D1 — Detect "tripped" via the existing free-text `status` field
No typed `CircuitBreaker` enum exists in this CC codebase (confirmed by
searching `src/` and `src/lib/services/fetchEndpointStatus.ts`'s handling of
the Hub payload as untyped JSON). Rather than introduce one, both the table
and the action menu will do
`params.row.status?.toLowerCase() === 'circuit breaker thrown'` — the same
case-insensitive comparison style already used for `isConnected`
(`ConnectionTable/index.tsx`'s existing
`status?.toLowerCase() === 'connected'`), and, per the Context section above,
now verified to match the Hub's actual `IEndpointStatus.CIRCUIT_BREAKER_THROWN`
constant and its own case-insensitive `isCircuitBreakerThrown()` check. This
keeps the change additive and consistent with how every other status value is
already handled — no schema change, no new type.

**Alternative considered:** introduce a `CircuitBreakerStatus` type/enum
shared between the Hub payload and CC. Rejected for this change — it would
require coordinating a contract change with `izgw-hub` beyond what's needed to
ship self-service reset, and no other status value in this table is typed
today either; the magic-string risk this would otherwise carry is addressed
by the source-verified citation above instead.

### D2 — Reset action lives in the existing "..." menu, not the STATUS cell
Confirmed by the provided mockups and by the user's explicit choice: "Reset
Circuit Breaker" is a new conditional `MenuItem` in
`popOverActionButtons.tsx`, gated by
`accessLevels.canResetCircuitBreaker && isCircuitBreakerTripped`, positioned
after the existing Maintenance item — mirroring exactly how
"Maintenance"/"Cancel Maintenance" is already conditionally shown there based
on `props.hasActiveMaintenance`. The STATUS column itself stays read-only;
it only gains the new visual indicator (D1).

**Alternative considered:** an inline reset icon directly in the STATUS cell.
Rejected — inconsistent with how every other row-mutating action in this
table already lives in the "..." menu, and the mockups confirm the menu
placement.

### D3 — New capability flag `canResetCircuitBreaker`, granted to `IZG Operations` only, enforced server-side too
Add `canResetCircuitBreaker: boolean` to `ManageConnectionsPageAccessControl`
(`src/lib/type/PageAccessControls.ts`), default `false`
(`defaultaccesslevels.ts`), set to `true` only in `_IZGOperationsAccess.ts`.
`useRoleAccess()` (`src/lib/security/useRoleAccess.ts`) resolves this the same
way as every other per-role capability flag — no new access-control
mechanism.

**Revised from an earlier draft:** this was initially scoped like
`canScheduleMaintainance` — `true` for both `_JurisdictionOperationsAccess.ts`
and `_IZGOperationsAccess.ts`, matching the original user story's
"Jurisdiction Operations Staff" framing. That was narrowed to `IZG
Operations` only; `_JurisdictionOperationsAccess.ts` is unmodified and
inherits the `false` default.

Because the capability check now differs from the jurisdiction-ownership
check `checkAccessToDestIdSlug` already enforces (a `Jurisdiction Operations`
user can legitimately own a destination and would pass jurisdiction scoping),
the UI-only gate is not sufficient on its own — a direct API call would still
succeed for such a user. The API route
(`src/pages/api/status/reset/[...slug].ts`) therefore also checks the
session's role directly: `context.session.user.role !== 'IZG Operations'` →
`401`, read from the server-validated session via `asyncRequestContext`
(the same context `buildRequestContext`/`getServerSession` already populate
for every API route), layered on top of `checkAccessToDestIdSlug` rather than
replacing it.

### D4 — New API route reuses `withMiddleware('checkAccessToDestIdSlug')` and the statushistory URL-derivation pattern
New route `src/pages/api/status/reset/[...slug].ts`, route shape
`/api/status/reset/{destTypeId}/{destId}` (`slug[0]`/`slug[1]`, matching what
`checkAccessToDestIdSlug` already expects at
`api-middleware-helper.ts:82-88`). `export default
withMiddleware('checkAccessToDestIdSlug')(handler)` gets jurisdiction
enforcement for free via `hasAccessToDestId` — no new authorization code.

To reach the Hub's reset endpoint without adding a new environment variable,
derive it the same way `src/lib/utils/izghubrefresh.ts:27-28` already derives
the sibling `refresh` endpoint: resolve the configured statushistory URL via
`new IZGHubStatusHistoryEndpoint(process.env.IZG_STATUS_ENDPOINT_URL).getIZGHubURL(destTypeId)`,
truncate to the `/rest/` prefix, append `reset/${destId}`. Build the mTLS
`https.Agent` inline exactly as `statushistory/[...slug].ts` and
`izghubrefresh.ts` both already do, from `IZG_ENDPOINT_CRT_PATH` /
`IZG_ENDPOINT_KEY_PATH` / `IZG_ENDPOINT_PASSCODE`.

**Alternative considered:** the companion `circuit-breaker-management-design.md`
sketches a `hubHeaders(req)` helper forwarding the caller's session to the
Hub. That helper does not exist anywhere in this codebase — every existing
Hub call authenticates via mTLS client certificate, never forwarded headers.
This design corrects that mismatch rather than inventing a new auth
mechanism inconsistent with the rest of the app.

### D5 — Logging only; no new persisted audit entity
A `logger.info('Circuit breaker reset', { destId, destTypeId })` call inside
the new route is automatically enriched with `sessionUser` by the existing
winston format (`logger.ts`'s `injectUserContext`, sourced from the
`AsyncLocalStorage` context that `withMiddleware` already establishes) — no
call-site changes needed to attribute the log to the acting user. This
satisfies the requirement that a resettable action is traceable to its user.

**Alternative considered:** a new persisted `CircuitBreakerResetAudit`
DynamoDB entity (new repository method + `dynamo.ts` implementation +
`DbClientFactory` wiring), matching the pattern used for allowed-user/access-
group/deny-list mutations. Explicitly deferred — the user confirmed a
structured log is sufficient for this change; a durable audit trail can be
added later as a follow-up if a real reporting need emerges, without
reworking this design.

### D6 — Trust the Hub's reset response instead of re-fetching
Unlike `statushistory/[...slug].ts` (which swallows Hub errors into a fake
200 with an empty body), the new route propagates the Hub's actual response
status/body, and returns a real error status (502) on network failure. The
frontend's confirm dialog uses that response directly to call
`props.updateRow(...)` with the Hub's returned status fields — no second
round-trip to re-fetch status after reset.

**Revised justification:** this was originally justified by the (incorrect)
assumption that DynamoDB is the authoritative `EndpointStatus` store and the
Hub's POST response reflects durably-written state. That's been disproven
against the merged Hub implementation (see Context/Risks) — the reset is
in-memory-only on a single Hub instance. D6 still stands, but for a narrower
reason: the Hub's response is simply the freshest state CC can get without an
extra round-trip, and CC has no more authoritative source to re-fetch from
anyway (a second call would hit the same single-instance in-memory cache,
not a durable store). The known limitation is that this freshest state can
still drift from what other Hub instances, or that same instance after its
next scheduled refresh, are enforcing — see Risks/Trade-offs.

## Risks / Trade-offs

- **[Resolved] The Hub's `POST /rest/reset/{destId}` endpoint did not exist
  yet in `izgw-hub`** — implemented and merged in PR #170 (2026-07-20);
  route shape, method, and response body all verified to match this change's
  expectations. See Context.
- **[Considered, not a risk] The Hub's new endpoint requires the caller's
  mTLS certificate to carry the `ADMIN` role.** Configuration Console's
  certificate is already a permitted/allow-listed app on the Hub, so this is
  not treated as a blocking dependency.
- **[Risk] The reset is not durably persisted or cross-instance visible.**
  Verified against the merged Hub implementation (see Context):
  `ElasticStatusRepository.resetCircuitBreakerById()` only mutates an
  in-memory cache on whichever single Hub instance handled the request — not
  Elasticsearch, not DynamoDB. Practical implications: (1) if the Hub runs
  multiple instances behind a load balancer, a reset is only visible on the
  instance that handled it, not the others; (2) that same instance's next
  scheduled status refresh recomputes status from raw Elasticsearch
  transaction telemetry and can silently re-trip the breaker if the
  destination is still actually failing, independent of the reset having
  "succeeded." → **Mitigation:** none on the CC side — CC's job is to proxy
  and trust the Hub's response (D6), and that stays correct regardless of how
  Hub persists things. This is an accepted, known limitation inherited from
  the Hub's pre-existing reset-all endpoint, not introduced by this change;
  fixing it is Hub-side work and out of scope here.
- **[Risk] Relying on a magic string (`'Circuit Breaker Thrown'`) instead of a
  typed contract** → **Mitigation:** downgraded from a real risk to a
  documented convention — the string is a public Hub interface constant
  (`IEndpointStatus.CIRCUIT_BREAKER_THROWN`), verified directly against the
  `izgw-core` source (see Context), and matches the existing untyped-status
  convention for every other value in this column today. If the Hub ever
  renames the constant, only the one comparison in D1 needs to change
  (isolated).
- **[Risk] Structured-log-only attribution (D5) is less durable/queryable than
  a persisted audit table** → **Mitigation:** explicitly accepted trade-off
  per user direction; the existing logs already ship to Elastic with full
  user attribution, which is enough to trace who reset what and when.
- **[Accepted trade-off] Narrower than the original user story.** The
  original ask was jurisdiction self-service; the shipped scope is `IZG
  Operations`-only (see D3, Non-Goals). Jurisdictions still see the status
  indicator but must go through operations staff to clear a trip, same as
  today. Accepted as the final scope for this change.

## Migration Plan

Purely additive: new route, new menu item, new capability flag (defaulted
`false` everywhere except `_IZGOperationsAccess.ts`). No data migration,
no breaking change to any existing API or component prop. **Rollback:** revert
the change — the STATUS column and action menu return to their current
behavior; no destination's on-disk state is affected either way, since the
"reset" itself is a Hub-side write CC never owns.

## Open Questions

- None blocking. The Hub-availability dependency called out in earlier drafts
  is resolved (PR #170 merged). The remaining non-persistence limitation
  (Risks/Trade-offs) is accepted, not blocking, and not something this change
  can resolve from this repo.
