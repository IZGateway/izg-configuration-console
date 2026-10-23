# Design

## Context

See `proposal.md` - Why for the motivation, and `specs/` for the requirements.

### The contract

The Hub returns two maps. One is for machines inside the trust boundary. One is for the
browser.

```json
POST /rest/reset
{
  "destinations": { ... },
  "hosts":   { "us-east-1:ip-10-9-93-145": "OK (Local)",
               "us-west-1:ip-10-161-101-98": "Timed Out" },
  "regions": { "us-east-1": "complete", "us-west-1": "partial" }
}

POST /rest/reset/{id}
{ ...existing fields unchanged..., "hosts": { ... }, "regions": { ... } }
```

| Member | Values | Console use |
|---|---|---|
| `hosts` | `OK (Local)`, `OK`, `Timed Out`, `No Queue`, `Send Failure` | Delete it. Read nothing. |
| `regions` | `complete`, `partial`, `failed` | Forward it unchanged. |
| `destinations` | One destination status for each identifier | Do not forward it. |

**`hosts` is not the only carrier of a private name.** Each entry in `destinations`
holds a `statusBy` field with the instance host name, such as
`ip-10-202-10-158.us-west-2.compute.internal`. The Hub author confirmed this on the dev
run of 2026-10-22. A rule written for `hosts` alone is therefore not the whole rule, and
the specs state the general form: no Hub host name reaches the browser, whichever member
holds it.

Each destination entry also serialises an empty `jurisdictionService` object. That is
pre-existing on every Hub endpoint that returns an `EndpointStatus`, including
`/rest/statushistory`. It is cosmetic and belongs to neither change.

The HTTP status is always 200, including on a partial failure. The maps carry the truth.

**Source of this contract.** The IGDD-3599 correction brief, received 2026-10-22. The
Hub OpenSpec change does not yet describe `regions`:
`izgw-hub/openspec/changes/igdd-3599-fleet-wide-circuit-breaker-reset/design.md` D5 still
shows `{ destinations, hosts }` only, and its `circuit-breaker-reset` spec still speaks
of an outcome for each instance. The Hub artifacts need the same correction. Until they
carry it, a reader of the Hub repository and a reader of this repository get two
different contracts.

### The code this change touches

`resetCircuitBreakersForBaseUrls` and `refreshHubsForBaseUrls` are near-identical copies
of each other. Both call `Promise.allSettled` over a list of Hub base URLs, count the
settled promises, and return `{ attempted, succeeded, failed }`. Those three numbers
count **Hub endpoints**, not Hub instances. The Admin Operations page always sends a
`destinationTypeId`, so the list holds exactly one URL in practice.

`src/pages/api/status/reset/[...slug].ts` is a separate route with its own axios call,
its own agent, and a 30000 ms timeout. It does not use the utility files. It already
deletes `statusBy` before it answers the browser, for the same reason this change must
delete `hosts`.

`src/components/ConnectionTable/resetCircuitBreakerDialog.tsx:53` spreads the whole Hub
body into the table row. Any new member of that body becomes a row field.

## Goals / Non-Goals

**Goals:**

- One shared rule that turns `regions` into a message level.
- A pass-through for `regions` with no transformation anywhere on the path.
- A Console release that is safe against the Hub release that precedes it and the Hub
  release that follows it.
- Unit tests that run today, measured against a recorded baseline rather than against
  zero failures.

**Non-Goals:**

- Any aggregation, count, or grouping built from `hosts`. The constraint forbids it, and
  a count discloses topology even without a host name.
- Merging the per-region status across Hub environments.
- Any change to the authorization path, the access matrices, or the audit records.
- Any new environment variable.
- A per-region display for the database refresh. See `proposal.md` - Out of scope.

## Decisions

### D1 - Two routes, two mechanisms, one outcome

No module reads `hosts`. The two routes keep it out of the browser in different ways,
and the difference is worth stating, because only one of them is a deletion.

| Route | Mechanism | Why it is safe |
|---|---|---|
| `POST /api/status/reset` | Allowlist, by construction | The route builds its own body, `{ success, message, result }`. It copies `regions` and nothing else. `hosts` and `destinations` are never read, so there is no key to delete. |
| `POST /api/status/reset/{destTypeId}/{destId}` | Denylist, by deletion | The route returns the Hub body itself. It deletes `hosts` on the line beside the existing `delete response.data?.statusBy`, under one comment that names both. The Hub body here is one destination status, so `destinations` does not arise. |

The allowlist is the stronger of the two and needs no maintenance. The denylist does:
each new member of the Hub body is a new line to write. That asymmetry is the reason
the spec states the general rule rather than naming two keys.

**A future hazard, recorded here rather than found later.** Nothing in the Console
surfaces the `destinations` block today. A developer who later renders destination
status on the Admin Operations page would forward `statusBy` with it, because the
hub-wide route's safety comes from not copying the block at all.

The earlier draft of this design logged the whole map server-side, so that support could
still see which host failed. That is dropped. The constraint reads "do not pass `hosts`
to the browser, and do not derive anything from it", and a design where exactly one
operation touches the map is the one that cannot drift. Nothing is lost: the Hub writes
the same per-host result into the same Elasticsearch cluster, at INFO, under
`eventType=SQS_SEND` with `targetHost` and `result`. The Hub record also carries the
operation `eventId`, which the Console record does not.

**What the Console does log.** Each route writes one entry that names the operation, the
destination, and the `regions` block. That keeps the Console-side trace, with the user
attribution that `withMiddleware` already supplies, and it holds no private address.

### D2 - One shared rule for the message level

`src/lib/utils/hubregionstatus.ts` holds the rule. Both the Admin Operations card and
the Manage Connections dialog import it, so the two screens cannot disagree.

```ts
export type HubRegionStatuses = Record<string, string>
export type HubOperationLevel = 'success' | 'warning' | 'error'

export const hubOperationLevel = (
  regions?: HubRegionStatuses
): HubOperationLevel | undefined => { /* ... */ }
```

| Input | Level |
|---|---|
| Every value is `complete` | `success` |
| Every value is `failed` | `error` |
| Any other combination | `warning` |
| Absent, empty, or not an object | `undefined` |

A value the function does not recognise is not `complete`, so it produces `warning`. The
rule fails closed. A later Hub release can add a status string that this release has
never seen, and counting it as a success would report a failure as a reset. The screen
renders the unknown value as the Hub wrote it, so the cause is visible at once.

**The vocabulary is closed at `complete`, `partial` and `failed`.** The fail-closed rule
has a price, and both sides agreed to it on 2026-10-22. Every deployed Console renders a
fourth word as a warning, whatever that word means. Adding one is therefore a
coordinated contract change across the two repositories, not a Hub-only edit. The Hub
records the same constraint in its design D5.

This function reads the block that the correction explicitly allows the Console to use.
It derives nothing from `hosts`.

**Alternative rejected:** the rule inline in each component. The two screens would then
drift, and the logic would only be testable under jsdom, which fails on `develop`.

### D3 - `regions` is forwarded, not rebuilt

The Console never constructs a region map. It takes the value from the Hub body and
places it in its own body. A missing block stays missing.

This is why the Console needs no redaction step for it. `regions` carries no host name
and no count, by the Hub's design. A Console-side transformation would add a second
place where that property has to hold.

### D4 - Only a single-endpoint call carries the block

`resetCircuitBreakersForEnvironment` calls one base URL and forwards the `regions` block
from that one response. `resetAllCircuitBreakers` can call several, so it forwards
nothing.

The Admin Operations card always sends a `destinationTypeId`, so the multi-endpoint path
is unreachable from the user interface. The cost of leaving it out is one absent field
on a path nothing calls.

**Why a merge is unsafe.** `getIZGHubURLs()` returns one URL for each configured
environment, which is dev, onboard and prod. A Hub instance does not know which
environment it serves. It knows only its region, so every environment answers with a
`us-east-1` key. Merging three responses into one object makes the last write win, and
prod reading `partial` disappears behind dev reading `complete`.

The alternative is to qualify each key on the Console side, as
`{ "prod": { "us-east-1": "partial" } }` or `"prod/us-east-1"`. Rejected for now. It
makes the Console build a region structure rather than forward one, which is the
property D3 protects, and it buys nothing on a path no caller uses. Pick it up if a
caller ever needs the no-body form.

The code carries this reason as a comment, not only this document. The risk is a later
developer who adds the obvious merge without knowing the keys collide.

### D5 - Response position

| Route | Position | Reason |
|---|---|---|
| `POST /api/status/reset` | `result.regions` | The route already nests the Hub outcome under `result`, beside `attempted`, `succeeded` and `failed`. |
| `POST /api/status/reset/{destTypeId}/{destId}` | top-level `regions` | The route returns the Hub body itself. The block keeps the place the Hub gave it. |

`CircuitBreakerResetResult` keeps `attempted`, `succeeded` and `failed` with their
present meaning: they count Hub endpoints. `regions` arrives as a separate optional
member. Folding the two together would make `succeeded: 1` mean "one Hub answered" in
one call and "one region completed" in another. The 502 rule at
`src/pages/api/status/reset/index.ts:50` reads those fields today.

### D6 - The hub-wide route changes its status code, the per-destination route does not

| Route | Every region `failed` | Reason |
|---|---|---|
| `POST /api/status/reset` | 502, body holds `result.regions` | Matches the existing rule at line 50: a total failure is an error. The body is a report, and no caller needs a 200. |
| `POST /api/status/reset/{destTypeId}/{destId}` | The Hub status code, unchanged | The body carries the destination status that the table row needs. A 502 would discard it and leave the row stale. |

A partial result returns 200 on both routes. The browser reads `regions` to choose the
message, so the status code never decides between success and a partial result.

An absent or empty `regions` block triggers no 502 from this rule. The existing rule for
an unreachable Hub endpoint is unchanged.

### D7 - A missing block produces today's behavior

`hubOperationLevel` returns `undefined` for `undefined`, for an empty object, and for a
value that is not an object. Each caller then falls back to `res.ok`, and every message
keeps the text it has today.

This matters for one release window. This change merges before the Hub change, so the
Console runs against a Hub that returns neither map. A 20000 ms timeout against a Hub
that answers at once is harmless. The reverse merge order makes the Console report
failures for resets that succeeded.

### D8 - 20000 ms, and the rest of the chain already allows it

The Hub wait is hardcoded at 15 seconds and the Hub change adds no property for it. The
Console timeout must stay above it, with margin for the TLS handshake and the reply.

| Hop | Limit | Source |
|---|---|---|
| Browser to nginx | 60 s | `run_and_monitor.sh:62`, `NGINX_READ_TIMEOUT` default |
| nginx to Next.js | the same value | `nginx.conf.template:83` |
| Next.js to Hub, reset-all | 5000 ms → **30000 ms** | `izghubcircuitbreakerreset.ts` |
| Next.js to Hub, refresh | 5000 ms → **30000 ms** | `izghubdbrefresh.ts:60` |
| Next.js to Hub, one destination | 30000 ms, unchanged | `[...slug].ts:106` |
| Hub wait for its instances | 15 s | Hub design D6 |

Production shows a 60 second nginx timeout, so 20 seconds needs no infrastructure
change. `iz-gateway-terraform` sets 180 seconds for the AWS environment. The archived
change `2026-10-21-fix-change-request-504-handling` records both values.

**Measured on dev, 2026-10-22, by the Hub author.**

| Case | Hub round trip | Source |
|---|---|---|
| Healthy, across both regions | 343 ms | Hub author, dev |
| One instance stopped, Hub-side | the full 15 s | Hub author, dev |
| One instance stopped, browser to Console to Hub | **16.86 s** | Console dev run, 2026-10-23 |

The old 5000 ms sits between the healthy case and the degraded one, which is the worst
place for it. A reset that cleared one region of two takes 16.86 seconds and reports a
total failure.

**Why 30000 and not 20000.** The first draft of this decision reasoned from the Hub's
15 second wait and set 20000, calling it a 5 second margin. The measured round trip is
16.86 seconds, so 20000 leaves 3.1 seconds, and that measurement is from a developer
machine to the dev Hub. Production adds Global Accelerator and an ALB.

The two failure directions are not equal. A timeout that fires early reports a total
failure for a reset that did clear the other region, which is the defect this change
exists to remove. A timeout that is generous costs an operator a few more seconds in a
case that is already degraded, and costs the healthy case nothing at 343 ms. 30000 also
matches the value `[...slug].ts` has used since before this change, so all three calls
from the Console to a Hub now carry one number.

**Alternative rejected:** an environment variable for the Console timeout. The Hub value
is hardcoded, so a variable can only break the relationship between the two. The Hub
design rejects the mirror-image proposal for the same reason.

### D9 - The card reads the block, not the HTTP status

The hub-wide route nests the block under `result`, so the card reads
`data.result.regions` and passes it to `hubOperationLevel`. An `undefined` level means
no block, and `res.ok` then decides, exactly as it does today.

The card holds the last block in state and renders one line per region under the
buttons. Each line names the region and its status. The card renders no number.

One theme trap, found on the dev run of 2026-10-23. `blueThemeOptions.ts:37` sets
`success.main` to `#025eaa`, which is the same value as `primary.main`. A `complete`
region rendered in it reads as a link, next to two blue buttons. The green in this
theme is `success.dark`, `#1E4D3B`. `warning.main` and `error.main` are already
distinct and need no such care.

A `warning` or an `error` also sets `persistent: true` on the alert. IGDD-3566 added
that member to the `Alert` type (`src/contexts/app.tsx:12`) for the same purpose: an
outcome the user must read does not disappear on a timer. Three screens already honour
it with the line `autoHideDuration={alert.persistent ? null : undefined}`
(`src/pages/manageconnections/index.tsx:52`, `AccessControl/index.tsx:637`,
`EditConnection/index.tsx:1043`). `AdminOperations/index.tsx` adds the same line, so the
page follows an established pattern rather than a new one.

Two type edits follow. `Alert.level` is already `string`, so the context needs no
change. The inline `level: 'success' | 'error'` union appears on the `onResult` prop of
each Admin Operations card and on `handleResult` at `AdminOperations/index.tsx:44`.
Those unions gain `'warning'` and the optional `persistent` member, or `tsc` rejects
them. `handleResult` already hands the whole object to `setAlert`, so nothing else
threads the new member through. `CustomSnackbar` takes an untyped `severity`, so it
needs no change.

**Alternative rejected:** the card panel alone, with no sticky snackbar. The panel is
below the fold on a narrow window, and a 6 second success-coloured snackbar above it
would contradict it.

### D10 - The dialog destructures the block out before the row merge

`resetCircuitBreakerDialog.tsx` reads the body, takes `regions` for the message, and
spreads the rest into the row:

```ts
const { regions, ...updatedStatus } = await response.json()
props.updateRow({ ...props.row, ...updatedStatus })
```

The row is a data-grid row. An unknown member on it is dead weight at best, and the grid
column definitions do not expect it.

### D11 - Two audiences, two levels of detail

The two screens that reset a circuit breaker are not reachable by the same
people, so they do not report the same amount.

| Screen | Gated on | Who holds it | What it reports |
|---|---|---|---|
| Admin Operations | `adminoperations.canResetHubCircuitBreakers` | `IZG Operations` only | One line per AWS region, with its status |
| Manage Connections | `manageconnections.canResetCircuitBreaker` | `IZG Operations` and `Jurisdiction Operations` | Success, or the failure message the dialog has always used |

`Jurisdiction Operations` is jurisdiction-scoped. A Maryland operator resets
the Maryland breaker and needs one fact: did it work. "us-west-2 is degraded
but us-east-1 is fine" is infrastructure they do not own, cannot act on, and
did not ask about. It invites a support ticket about the Hub fleet, and it
describes the deployment to an audience outside the operations team.

So the per-destination route collapses the per-region block into one boolean,
`resetComplete`, and the dialog reports anything other than a full success with
its existing failure text:

> Request to reset the circuit breaker for Maryland Production was not
> successful. Please try again later.

The defect this change exists to remove is still removed. The operator is no
longer told a partial reset succeeded. They are told it did not work, which is
the fact they can act on: retry, or raise it.

**The block is removed server-side, not merely left unrendered.** Keeping
`regions` in the body and declining to display it would still expose it in
developer tools or a proxy log. That is the exact state this codebase rejects
for `statusBy`, and this change rejects for `hosts`. The same reasoning applies
one level down, so `redactHubTopology` deletes all three.

**The row is not updated on that path either.** The `status` in the body
describes the instance that answered, and it can read `Connected` while another
instance still blocks traffic. Showing `Connected` beside "was not successful"
would contradict itself, so the row keeps its tripped indicator until the next
status refresh.

**Alternative rejected:** a vaguer sentence that still hints at scope, such as
"was not reset everywhere". It raises the same question in the operator's mind
without giving them anything to do with the answer.

**Alternative rejected:** gate the detail on the role inside the dialog. It puts
an authorization decision in a component, where `policy.ts` already warns the UI
layer is not a security boundary. Removing the data on the server needs no such
decision.

## Risks / Trade-offs

**An IZG Operations user resetting one destination from Manage Connections
loses the per-region detail too.** → Accepted. The route cannot tell the two
audiences apart without putting an authorization decision in the response
shape. The detail is one page away on Admin Operations, and the server log
holds the full per-host result. See D11.

**The browser can no longer tell a timeout from a missing queue.** → Accepted. Both
collapse into `partial`. The Hub excluded that detail from `regions` on purpose, because
the outcome labels sit beside the host names in the same map. An engineer reads the
per-host result in the Hub log, under `eventType=SQS_SEND` with `targetHost` and
`result`.

**An operator waits up to 30 seconds with no detail.** → The existing `Loader` covers
the card for the whole call. A healthy reset measured 343 ms across both regions on dev.
A reset with one instance stopped measured 16.86 seconds. The 30 seconds is a ceiling
that only a transport fault reaches, because the Hub bounds its own wait at 15 seconds.

**The Hub can miss an instance that has logged nothing yet.** → The Hub discovers
instances from Elasticsearch, over a three minute window. A region whose every known
instance answered reads `complete`, even when an unknown instance exists. The Console
cannot detect that and does not try. The limitation belongs to the Hub.

**A region name is still topology.** → Accepted, and settled by the contract. The Hub
decides what is browser-safe and the Console forwards it. An operator cannot act on a
failure without knowing the region.

**An unrecognised status value counts as not complete.** → A later Hub release that adds
a second success word would make the Console report a false partial result. The failure
direction is the safe one, and the value appears verbatim on screen, so the cause is
visible at once.

**The widened result type reaches three cards through one shared callback.** → Both new
members, `'warning'` and `persistent`, are additive. An absent `persistent` keeps the
present behavior, and only the Circuit Breaker Reset card sets either one.

**Two component suites already fail on `develop`.**
`resetCircuitBreakerDialog.test.tsx` and `popOverActionButtons.test.tsx` fail five tests
with "Found multiple elements with the text: Reset Circuit Breaker". The dialog is
`keepMounted`, so its title sits in the DOM beside the menu item of the same name. This
change edits one of those two files. → Task 5.1 carries the measured baseline, so the
implementer can tell a pre-existing failure from a new one. The jsdom environment itself
works here, despite the broader `ERR_REQUIRE_ESM` note in `CLAUDE.md`.

## Migration Plan

1. Merge and deploy this change first. The Hub still returns neither map, so D7 applies
   and every message keeps today's text. The two timeout corrections take effect at
   once, which repairs the pre-existing database refresh defect on its own.
2. Merge and deploy the Hub change in the same release.
3. Verify on dev: post a reset from the Admin Operations page and confirm that the card
   lists both regions with their status.
4. Verify on dev: stop one task, post a reset, and confirm a warning that names the
   region reading `partial`.
5. Verify on production: confirm that both regions report `complete`.
6. Confirm in the browser developer tools that no response body holds a host name.

**Rollback:** revert this change alone and the Hub keeps sending `hosts`. The reverted
Console passes the Hub body straight through at `[...slug].ts:117`, so the host names
reach the grid row. A Console-only rollback is therefore a disclosure regression. Revert
both deployments together, exactly as the Hub design states.

## Open Questions

None.
