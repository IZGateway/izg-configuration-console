# Spec Delta

## Purpose

Governs how the Configuration Console submits a destination change request and reports the result. Every submission must produce at most one change request and exactly one visible outcome.

## ADDED Requirements

### Requirement: One submission at a time

The console SHALL permit only one change request submission for a destination at a time. While a submission is in progress, the console SHALL reject a further schedule action for that destination.

#### Scenario: The user activates the schedule action repeatedly during a slow submission

- **WHEN** a submission is in progress and the user activates the schedule action again
- **THEN** the console does not send a second submission
- **AND** the server receives exactly one submission

#### Scenario: The user retries after a submission ends

- **WHEN** a submission ends with any outcome and the user activates the schedule action again
- **THEN** the console sends a new submission

### Requirement: Visible progress during a submission

The console SHALL indicate that a submission is in progress. The indication SHALL remain until the submission ends.

#### Scenario: The server is slow to respond

- **WHEN** a submission is in progress and the server has not responded
- **THEN** the console shows that the submission is in progress

### Requirement: Every outcome produces a visible message

The console SHALL present a visible message for every submission outcome. This applies to success, to rejection, and to failure. The console SHALL NOT end a submission without a message.

#### Scenario: The submission succeeds

- **WHEN** the server confirms that the change request was created
- **THEN** the console shows a success message that names the jurisdiction and the environment

#### Scenario: The server rejects a submitted value

- **WHEN** the server rejects the submission because a value is invalid
- **THEN** the console shows the reason that the server reported

#### Scenario: The server fails

- **WHEN** the server returns a failure status
- **THEN** the console shows an error message

#### Scenario: The browser cannot reach the server

- **WHEN** the submission fails before the server responds
- **THEN** the console shows an error message

### Requirement: A timeout reports an unknown outcome

When a submission ends in a gateway timeout, the console SHALL report the outcome as unknown rather than as a failure. The message SHALL tell the user to verify the change request history before a retry.

#### Scenario: The gateway times out before the server responds

- **WHEN** a submission ends with a gateway timeout
- **THEN** the console states that the request may still have been submitted
- **AND** the console directs the user to verify the change request history before a retry
- **AND** the console does not state that the request failed

### Requirement: The entered values survive a failed submission

When a submission does not succeed, the console SHALL keep the user on the scheduling step. The values that the user entered SHALL remain intact.

#### Scenario: The submission does not succeed

- **WHEN** a submission ends with a rejection or a failure
- **THEN** the console keeps the user on the scheduling step
- **AND** the entered values remain available for a retry

#### Scenario: The submission succeeds

- **WHEN** the server confirms that the change request was created
- **THEN** the console returns the user to the connection list

### Requirement: The console stays responsive after a failed submission

After a submission ends, the console SHALL continue to accept user input. A failed submission SHALL NOT stop the console from responding.

#### Scenario: The user acts after an error message appears

- **WHEN** a submission ends with a failure and the console shows the error message
- **THEN** the console accepts the next user action on the scheduling step
- **AND** the console does not re-render without end
