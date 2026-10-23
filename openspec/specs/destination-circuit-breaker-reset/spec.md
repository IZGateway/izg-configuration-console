# destination-circuit-breaker-reset Specification

## Purpose

Give Jurisdiction Operations and IZG Operations staff a self-service way to
clear a tripped circuit breaker for a single destination directly from
Manage Connections — visible status, a role- and jurisdiction-gated reset
action, explicit confirmation, attributable logging, and an in-place UI
update — without falling back to the larger-blast-radius admin-wide
"reset all circuit breakers" action or an out-of-band ticket to IZ Gateway
operations.

## Requirements

### Requirement: Circuit breaker status is visible in Manage Connections
The Manage Connections destination table SHALL visually distinguish a
destination whose circuit breaker is tripped from both the "Connected" and
generic "Not Connected" states, for any user who has jurisdiction access to
view that destination's row.

#### Scenario: Tripped destination is visually distinguished
- **WHEN** a user with jurisdiction access to a destination views Manage
  Connections and that destination's Hub status reports a tripped circuit
  breaker
- **THEN** the STATUS column shows a distinct "circuit breaker tripped"
  indicator for that row, instead of the generic "Not Connected" treatment

#### Scenario: Non-tripped destinations are unaffected
- **WHEN** a destination's Hub status is "Connected" or a non-circuit-breaker
  "Not Connected" state
- **THEN** the STATUS column continues to render exactly as it does today
  (no behavior change for those states)

### Requirement: Circuit breaker reset action is jurisdiction- and role-gated
Configuration Console SHALL offer a "Reset Circuit Breaker" action in a
destination row's action menu only when that destination's circuit breaker is
currently tripped, only to users whose role has the `canResetCircuitBreaker`
capability, and SHALL only allow the underlying reset call to succeed for a
destination within the acting user's assigned jurisdiction(s) (or for
`IZG Operations`/`IZG Support`, which are exempt from jurisdiction scoping,
consistent with existing jurisdiction checks elsewhere in the app).

Currently, both the `IZG Operations` and `Jurisdiction Operations` roles have
the `canResetCircuitBreaker` capability; `Jurisdiction Support` and `IZG
Support` do not. Capability and jurisdiction scoping are independent checks,
and both must pass for a reset to succeed: a `Jurisdiction Operations` user
has the capability but may only exercise it for a destination within their
own assigned jurisdiction(s), while `IZG Operations` is exempt from
jurisdiction scoping entirely (consistent with `hasAccessToDestId` elsewhere
in the app). This is enforced in two places: the UI gate (`useRoleAccess()`)
and, independently, a direct role check inside the API route itself, so the
capability restriction holds even for a request that bypasses the UI
entirely.

#### Scenario: Reset action appears only when tripped
- **WHEN** a permitted user opens the "..." action menu for a destination
  whose circuit breaker is tripped
- **THEN** the menu includes a "Reset Circuit Breaker" item

#### Scenario: Reset action is absent when not tripped
- **WHEN** a permitted user opens the "..." action menu for a destination
  whose circuit breaker is not tripped
- **THEN** the menu does not include a "Reset Circuit Breaker" item

#### Scenario: Reset action is hidden for roles without the capability
- **WHEN** a user whose role does not have `canResetCircuitBreaker` (e.g.
  `Jurisdiction Support` or `IZG Support`) opens the action menu for a
  tripped destination
- **THEN** the menu does not include a "Reset Circuit Breaker" item

#### Scenario: Reset is rejected server-side even if requested directly, for a role without the capability
- **WHEN** a `POST` request to reset a destination's circuit breaker is made
  by a user whose role does not have `canResetCircuitBreaker` (e.g.
  `Jurisdiction Support`)
- **THEN** the API rejects the request as unauthorized and no reset is
  performed

#### Scenario: Reset is rejected for a destination outside the user's jurisdiction
- **WHEN** a `Jurisdiction Operations` user requests a reset for a
  destination not in their assigned jurisdiction(s)
- **THEN** the API rejects the request as unauthorized and no reset is
  performed, even though their role has the `canResetCircuitBreaker`
  capability

### Requirement: Reset requires explicit confirmation
Clicking "Reset Circuit Breaker" SHALL show a confirmation dialog before any
reset request is sent to the Hub, and SHALL only send the request if the user
confirms.

#### Scenario: Confirmation dialog is shown before resetting
- **WHEN** a permitted user clicks "Reset Circuit Breaker" for a tripped
  destination
- **THEN** a dialog appears asking the user to confirm, naming the
  destination's jurisdiction, endpoint, and environment

#### Scenario: Canceling performs no reset
- **WHEN** the user dismisses the confirmation dialog via "Cancel"
- **THEN** no reset request is sent and the destination's status is unchanged

### Requirement: A successful reset is logged to the acting user
Every successful circuit breaker reset SHALL produce a log entry that can be
traced back to the user who performed it, using the same automatic
user-attribution mechanism already applied to other authenticated API
requests.

#### Scenario: Reset produces an attributable log entry
- **WHEN** a user successfully resets a destination's circuit breaker
- **THEN** a log entry is emitted identifying the destination and carrying the
  acting user's identity (via the existing request-context attribution used
  by other `/api/*` routes)

### Requirement: Manage Connections reflects the reset immediately
After a successful reset, the destination's row in Manage Connections SHALL
update to reflect the cleared circuit-breaker state without requiring a full
page reload, using the Hub's authoritative response to the reset call. The
Hub clears the breaker on every instance it runs. A reset that did not reach
every instance SHALL be reported as a failure, and SHALL NOT update the row.

#### Scenario: Row updates in place after a successful reset
- **WHEN** a circuit breaker reset request succeeds
- **THEN** the destination's row in the table updates to no longer show the
  "circuit breaker tripped" indicator, reflecting the status returned by the
  Hub

#### Scenario: A failed reset leaves status unchanged and surfaces an error
- **WHEN** a circuit breaker reset request fails (e.g. the Hub is unreachable
  or returns an error)
- **THEN** the destination's row keeps showing the tripped indicator and the
  user sees an error message; no success state is shown

#### Scenario: The reset did not reach every Hub instance
- **GIVEN** the Hub reports that it did not clear the breaker on every
  instance
- **AND** the Hub answers with a success status code
- **WHEN** the reset request returns
- **THEN** the user sees the same error message as a failed reset
- **AND** the destination's row keeps showing the tripped indicator
- **AND** no success state is shown

#### Scenario: The reset reached every Hub instance
- **GIVEN** the Hub reports that it cleared the breaker on every instance
- **WHEN** the reset request returns
- **THEN** the user sees the success message

### Requirement: The per-destination reset reports one verdict, not a breakdown
The response to a per-destination reset SHALL state whether the Hub cleared
the breaker on every instance, as a single value. It SHALL NOT describe which
parts of the Hub succeeded and which did not.

#### Scenario: The existing fields survive
- **WHEN** a per-destination reset returns
- **THEN** the destination identifier and the status hold their present names
  and meaning
- **AND** the verdict sits beside them

#### Scenario: The verdict is kept out of the table row
- **WHEN** the console merges the response into the destination's row
- **THEN** the verdict is not written into the row

#### Scenario: The Hub reports no per-instance outcome
- **GIVEN** a Hub release that reports no per-instance outcome
- **WHEN** a per-destination reset returns
- **THEN** the response carries no verdict
- **AND** the console reports the reset as it does today

### Requirement: The per-destination response describes no Hub infrastructure
Manage Connections is reachable by jurisdiction-scoped roles. The console
SHALL remove every description of Hub infrastructure from the per-destination
reset response before it answers the browser. This covers Hub host names and
AWS region names alike.

#### Scenario: Host names never reach the browser
- **GIVEN** the Hub reports a per-instance outcome keyed by region and host
  name
- **WHEN** the console answers the browser
- **THEN** the response holds no Hub host name

#### Scenario: Region names never reach the browser
- **GIVEN** the Hub reports a status for each AWS region
- **WHEN** the console answers the browser
- **THEN** the response names no AWS region
- **AND** the message shown to the user names no AWS region

#### Scenario: No instance count reaches the browser
- **WHEN** the console answers the browser
- **THEN** the response states no number of Hub instances

#### Scenario: The rule holds on an error response
- **GIVEN** the Hub answers with an error status and a body that describes its
  infrastructure
- **WHEN** the console answers the browser
- **THEN** that description is removed from the body first
