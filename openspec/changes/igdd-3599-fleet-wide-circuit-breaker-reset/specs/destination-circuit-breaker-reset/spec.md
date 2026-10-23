# Spec Delta

## MODIFIED Requirements

### Requirement: Manage Connections reflects the reset immediately
After a successful reset, the destination's row in Manage Connections SHALL
update to reflect the cleared circuit-breaker state without requiring a full
page reload, using the Hub's authoritative response to the reset call. The
Hub clears the breaker on every Hub instance, and the status in that response
describes the answering instance only. The console SHALL report success only
when the Hub reports every region as complete, and SHALL report a partial
reset otherwise.

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

#### Scenario: One region did not complete
- **GIVEN** the Hub reports one region as partial
- **WHEN** the reset request returns
- **THEN** the message states that the reset did not reach every instance
- **AND** the message names the region
- **AND** the message is not a success message
- **AND** the destination's row still updates from the status the Hub
  returned, which describes the answering instance only

#### Scenario: Every region completed
- **GIVEN** the Hub reports every region as complete
- **WHEN** the reset request returns
- **THEN** the user sees the success message

## ADDED Requirements

### Requirement: The per-destination reset reports the per-region status
The response to a per-destination reset SHALL carry the per-region status
that the Hub returned, unchanged. The block SHALL NOT replace or rename any
field that the response carries today.

#### Scenario: The existing fields survive
- **WHEN** a per-destination reset returns
- **THEN** the destination identifier and the status hold their present names
  and meaning
- **AND** the per-region status sits beside them

#### Scenario: The per-region status is kept out of the table row
- **WHEN** the console merges the response into the destination's row
- **THEN** the per-region status is not written into the row

#### Scenario: The Hub reports no regions
- **GIVEN** a Hub release that reports no per-region status
- **WHEN** a per-destination reset returns
- **THEN** the response carries no per-region status
- **AND** the console reports the reset as it does today

### Requirement: The per-destination response carries no Hub host name
The console SHALL remove the Hub per-instance outcome map from the
per-destination reset response before it answers the browser, in the same way
it already removes the `statusBy` field. The console SHALL NOT read that map
and SHALL NOT report any value computed from it.

#### Scenario: Host names never reach the browser
- **GIVEN** the Hub reports a per-instance outcome keyed by region and host
  name
- **WHEN** the console answers the browser
- **THEN** the response holds no Hub host name

#### Scenario: No instance count reaches the browser
- **WHEN** the console answers the browser
- **THEN** the response states no number of Hub instances
