# hub-administrative-operations Specification

## Purpose

Governs how the Configuration Console sends an administrative operation to a Hub
environment and reports the result to the operator. A Hub environment runs several
instances across two AWS regions, and one operation can succeed in one region and fail
in another. This capability keeps that result honest, keeps the wait long enough to
observe it, and keeps the private addressing of those instances out of the browser.

## Requirements

### Requirement: The Console waits longer than the Hub waits

An administrative request to a Hub environment SHALL use a request timeout greater than
the time the Hub waits for its instances to answer. The Hub waits 15 seconds. This
applies to the hub-wide circuit breaker reset and to the database refresh.

#### Scenario: One instance is slow

- **GIVEN** a Hub environment with four instances
- **AND** one instance answers the Hub after 12 seconds
- **WHEN** an operator starts a hub-wide circuit breaker reset
- **THEN** the Console receives the Hub response
- **AND** the Console does not report a timeout

#### Scenario: The database refresh waits the same time

- **GIVEN** a Hub environment where one instance answers the Hub after 12 seconds
- **WHEN** an operator starts a database refresh
- **THEN** the Console receives the Hub response
- **AND** the Console does not report a timeout

#### Scenario: The Hub itself does not answer

- **GIVEN** a Hub environment that sends no response
- **WHEN** an operator starts a hub-wide circuit breaker reset
- **THEN** the Console reports a failure after its own timeout
- **AND** the Console does not leave the operator without a message

### Requirement: The Console forwards the Hub per-region status unchanged

The Hub reports a status for each AWS region. The Console SHALL pass that value to the
browser as the Hub returned it. The Console SHALL NOT rename a region, change a status
value, add a value, or remove a region from the block.

#### Scenario: Two regions, both complete

- **GIVEN** the Hub reports `complete` for `us-east-1` and `complete` for `us-west-1`
- **WHEN** an operator starts a hub-wide circuit breaker reset
- **THEN** the response carries the same two regions with the same two values

#### Scenario: One region is partial

- **GIVEN** the Hub reports `complete` for `us-east-1` and `partial` for `us-west-1`
- **WHEN** an operator starts a hub-wide circuit breaker reset
- **THEN** the response carries `partial` for `us-west-1`
- **AND** the response carries `complete` for `us-east-1`

### Requirement: The Console derives nothing from the per-instance map

The Hub also reports a per-instance outcome keyed by region and host name. The Console
SHALL treat that map as a value to remove. The Console SHALL NOT read it, count it,
group it, or report any value computed from it.

#### Scenario: The map is removed before the response is sent

- **GIVEN** a Hub response that carries a per-instance outcome map
- **WHEN** the Console answers the browser
- **THEN** the response holds no Hub host name
- **AND** the response holds no value computed from that map

#### Scenario: No instance count reaches the browser

- **GIVEN** a Hub environment with four instances
- **WHEN** the Console answers the browser
- **THEN** the response states no number of instances
- **AND** the operator cannot read the instance count from the response

### Requirement: No Hub host name reaches the browser, from any member

A Hub administrative response carries a host name in more than one member. The Console
SHALL send no Hub host name to the browser, whichever member holds it. A rule written
for one member SHALL NOT be treated as the whole rule.

#### Scenario: The per-instance map holds host names in its keys

- **GIVEN** a Hub response whose per-instance outcome is keyed by region and host name
- **WHEN** the Console answers the browser
- **THEN** the response holds no Hub host name

#### Scenario: A destination status holds a host name in a field

- **GIVEN** a Hub response whose destination entries each carry the host that recorded
  the status
- **WHEN** the Console answers the browser
- **THEN** the response holds no Hub host name
- **AND** the destination entries are not forwarded

#### Scenario: A member added by a later Hub release

- **GIVEN** a Hub response that carries a member this release does not know
- **WHEN** the Console answers the browser
- **THEN** the Console forwards only the members it names
- **AND** the unknown member does not reach the browser

### Requirement: The Console reports the level from the per-region status

The Console SHALL decide the message level from the per-region status, not from the HTTP
status code. A Hub response of HTTP 200 SHALL NOT, by itself, produce a success message.

#### Scenario: Every region is complete

- **GIVEN** every region reports `complete`
- **WHEN** the Console reports the outcome
- **THEN** the Console reports a success

#### Scenario: One region is partial

- **GIVEN** one region reports `partial`
- **AND** the Hub answers HTTP 200
- **WHEN** the Console reports the outcome
- **THEN** the message states that the reset did not reach every instance
- **AND** the message is not a success message

#### Scenario: Every region failed

- **GIVEN** every region reports `failed`
- **WHEN** the Console reports the outcome
- **THEN** the Console reports an error
- **AND** the Console does not report a success

#### Scenario: Several Hub environments are reset at once

- **GIVEN** a request that names no environment, so every configured Hub is
  called
- **AND** each Hub answers with a success status code
- **AND** at least one of them reports that a region did not complete
- **WHEN** the Console reports the outcome
- **THEN** the Console does not report a success
- **AND** the Console reaches that conclusion without combining the per-region
  statuses of different environments

#### Scenario: One Hub environment cannot be reached

- **GIVEN** a request that names no environment, so every configured Hub is
  called
- **AND** one Hub reports that every region completed
- **AND** another Hub cannot be reached at all
- **WHEN** the Console reports the outcome
- **THEN** the Console does not report a success
- **AND** the message states that a Hub could not be reached
- **AND** a Hub that was never reached is not treated as a Hub that answered

#### Scenario: A status value the Console does not recognise

- **GIVEN** the Hub reports a status value that the Console does not recognise
- **WHEN** the Console reports the outcome
- **THEN** the Console does not report a success
- **AND** the Console shows the value as the Hub wrote it

### Requirement: The operator can see the status of each region

After a hub-wide operation ends, the Admin Operations page SHALL show one line for each
region the Hub reported. A message that reports a partial or failed result SHALL stay on
screen until the operator dismisses it.

#### Scenario: The page shows a line for each region

- **GIVEN** a reset where `us-west-1` reports `partial`
- **WHEN** the operation ends
- **THEN** the page shows a line for `us-east-1` and a line for `us-west-1`
- **AND** each line names the region and its status

#### Scenario: A partial result waits for the operator

- **GIVEN** a reset where one region reports `partial`
- **WHEN** the Console shows the message
- **THEN** the message stays on screen until the operator dismisses it

#### Scenario: A new operation clears the previous result

- **GIVEN** the page shows the result of a reset for one environment
- **WHEN** the operator starts a reset for another environment
- **THEN** the page no longer shows the previous result

### Requirement: The Console works with a Hub that reports no regions

The Console SHALL accept an administrative response that carries no per-region status.
In that case the Console SHALL report the operation exactly as it does before this
change, and SHALL NOT report an error for the missing block.

#### Scenario: The Hub release is older than the Console release

- **GIVEN** a Hub that reports no per-region status
- **WHEN** an operator starts a hub-wide circuit breaker reset
- **AND** the Hub answers HTTP 200
- **THEN** the Console reports a success
- **AND** the page shows no per-region line

#### Scenario: The per-region status is empty

- **GIVEN** a Hub that reports an empty per-region status
- **WHEN** the Console builds the response
- **THEN** the Console reports the operation from the HTTP status alone
- **AND** the page shows no per-region line
