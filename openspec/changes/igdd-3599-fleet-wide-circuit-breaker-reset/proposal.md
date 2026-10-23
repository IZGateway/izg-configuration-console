# Proposal

## Why

IGDD-3599 changes the Hub so that `POST /rest/reset` and `POST /rest/reset/{id}` clear
circuit breakers on every Hub instance in every region. Production runs four tasks, two
in `us-east-1` and two in `us-west-1`. Today the Reset All button reaches one of the
four. The Hub sends one SQS message per instance and waits up to 15 seconds for the
replies. The Hub change and this change ship in the same release under one ticket. This
change merges first.

Three problems follow for the Configuration Console.

**The Console gives up before the Hub answers.** `izghubcircuitbreakerreset.ts` sets an
axios timeout of 5000 ms. After the Hub change, any reset that waits on a slow instance
exceeds that limit. The route then reports a failure for a reset that succeeded, and the
operator retries an operation that already ran.

**The same defect exists today in the database refresh.** `izghubdbrefresh.ts:60` sets
5000 ms against `refresh?all=true`, which already waits 15 seconds for the same SQS
replies. That button already reports failure whenever one host is slow. This is a
pre-existing bug and reproduces on `develop`.

**The Console reports a partial failure as a success.** The Hub answers 200 even when an
instance fails, because the maps in the body carry the truth. The Console reads the HTTP
status only. It therefore shows "circuit breakers were reset" when one instance of four
timed out. The operator believes that traffic recovered everywhere. It did not.

## What Changes

- **Wait longer than the Hub waits.** The axios timeout in
  `src/lib/utils/izghubcircuitbreakerreset.ts` and in
  `src/lib/utils/izghubdbrefresh.ts` changes from 5000 ms to 30000 ms. The Hub wait is
  hardcoded at 15 seconds, and a measured round trip with one instance stopped is
  16.86 seconds, so 30 seconds holds a real margin and matches the value the
  per-destination route already uses. nginx permits it: `proxy_read_timeout` defaults
  to 60 seconds (`run_and_monitor.sh:62`).
- **Forward the Hub's `regions` block unchanged.** The Hub returns
  `{ "us-east-1": "complete", "us-west-1": "partial" }`. The Console passes that value
  through to the browser. It builds nothing, counts nothing, and renames nothing.
- **Delete the `hosts` map on the way out.** `hosts` is keyed by private AWS DNS name.
  Each route deletes it beside the existing `delete response.data?.statusBy`. No code
  reads it, and no code derives a value from it.
- **Report the level from `regions`, not from the HTTP status.** Every region `complete`
  reports a success. Every region `failed` reports an error. Anything else reports a
  warning that names the region.
- **Show the per-region status on the Admin Operations page.** The Circuit Breaker Reset
  card renders one line per region under the buttons. A partial or failed result keeps
  its message on screen until the operator dismisses it.
- **Stop the per-destination dialog from claiming full success.** `status: Connected` in
  the `/rest/reset/{id}` body describes the answering instance only. The dialog reports
  success only when every region reads `complete`. It also removes `regions` from the
  object before it merges the body into the table row.
- **Tolerate a Hub that sends neither map.** This change merges before the Hub change,
  so the Console runs against the old Hub for one release window. A response with no
  `regions` member produces no per-region display, and every message keeps its present
  text.

No breaking change. No change to any role, capability, jurisdiction check, or encrypted
field. The authorization path is untouched: `canResetHubCircuitBreakers` still gates
`/api/status/reset`, and `can(..., 'manageconnections', 'canResetCircuitBreaker', destId)`
still gates the per-destination route.

## Capabilities

### New Capabilities

- `hub-administrative-operations`: How the Configuration Console sends an administrative
  operation to a Hub environment and reports the result. The capability owns the rules
  that hold for every such operation: the Console waits longer than the Hub waits, it
  reports the per-region status the Hub returns, it never reports an unconfirmed
  operation as successful, and it never sends a Hub host name to the browser. It covers
  the hub-wide circuit breaker reset and the database refresh on the Admin Operations
  page. No existing spec covers these two operations. `admin-page-access` covers who may
  reach them, not what they report.

### Modified Capabilities

- `destination-circuit-breaker-reset`: the requirement "Manage Connections reflects the
  reset immediately" states that the row updates from the Hub's authoritative response.
  That response now covers four instances rather than one, and it can report a reset
  that succeeded on some of them. The requirement gains the partial case, and gains the
  rule that the Hub host names are removed before the body reaches the browser.

## Impact

### Code

- `src/lib/utils/izghubcircuitbreakerreset.ts` — timeout, and the `regions` block read
  from the Hub response.
- `src/lib/utils/izghubdbrefresh.ts` — timeout only.
- `src/lib/utils/hubregionstatus.ts` (new) — the shared rule that turns the `regions`
  block into a message level.
- `src/pages/api/status/reset/index.ts` — forward `regions`, and the rule for 502.
- `src/pages/api/status/reset/[...slug].ts` — delete `hosts`, forward `regions`.
- `src/components/AdminOperations/CircuitBreakerCard.tsx` — read `regions`, pick the
  level, render the per-region lines.
- `src/components/AdminOperations/index.tsx` — widen the result type and keep a
  partial-failure message on screen, through the `persistent` alert member that
  IGDD-3566 added.
- `src/components/ConnectionTable/resetCircuitBreakerDialog.tsx` — partial-success
  message, and drop `regions` before the row merge.
- The `@swagger` block on both reset routes, so the documented response matches.
- Jest tests for the shared rule, both API routes, and both components.

### Interfaces

- `POST /api/status/reset` response body gains `result.regions`. The route already nests
  the Hub outcome under `result`. No field is removed or renamed.
- `POST /api/status/reset/{destTypeId}/{destId}` response body gains a top-level
  `regions`. The Hub's `hosts` member is removed. Every field the route returns today is
  unchanged.

### Dependencies

- `izgw-hub` IGDD-3599. The Hub PR adds `hosts` and `regions` to both reset responses.
  This change degrades safely without them, so the two merge in order inside one
  release.

### Security

- The `hosts` keys are private AWS DNS names, such as `ip-10-9-93-145.ec2.internal`.
  They disclose internal addressing, the region layout, and the instance count. The
  Console deletes the map server-side, which matches the treatment of `statusBy`
  (`src/pages/api/status/reset/[...slug].ts:113` and
  `src/lib/services/fetchEndpointStatus.ts:60`).
- The Hub to Console hop is mTLS between two of our own services, so host names are
  acceptable on it. The Console to browser hop is not.
- `regions` carries no host name and no instance count. The count was excluded on
  purpose, because a count still discloses topology. The Console must not reintroduce
  one by counting the keys of either map.
- No new authorization decision and no new audit event.

### Out of scope

- A per-region display for the database refresh. Item 2 of the correction asks for the
  timeout only.
- The Hub-side fan-out, logging, and SQS work. That is the `izgw-hub` PR.
