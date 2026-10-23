# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
