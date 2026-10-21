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

#### Scenario: The console cannot send the request

- **WHEN** the console fails before it sends the submission
- **THEN** the console reports that no change request was created
- **AND** the console does not state that the server failed to respond
- **AND** the console invites the user to try again

#### Scenario: The server refuses the request

- **WHEN** the server refuses the submission because the session or the role does not allow it
- **THEN** the console shows an error message
- **AND** the console invites the user to try again
- **AND** the console does not report the outcome as unknown

### Requirement: The server reports only a failure it can prove

When a change request submission fails, the server SHALL report that no change request was created only when no ticket can exist. For any failure where a ticket may exist, the server SHALL report either that the ticket was created or that it cannot say what happened.

#### Scenario: The request never reached the ticket system

- **WHEN** the connection to the ticket system fails before the request is sent
- **THEN** the server reports that no change request was created

#### Scenario: The ticket system rejected the request

- **WHEN** the ticket system rejects the request
- **THEN** the server reports that no change request was created

#### Scenario: The ticket system accepted the request and its reply was unusable

- **WHEN** the ticket system accepts the request and its reply cannot be read
- **THEN** the server reports that the change request was created
- **AND** the server does not report that no change request was created

#### Scenario: The ticket system failed

- **WHEN** the ticket system answers with a failure of its own
- **THEN** the server reports that it cannot say what happened

#### Scenario: A failure the server cannot classify

- **WHEN** a submission fails in a way the server does not recognize
- **THEN** the server reports that it cannot say what happened

### Requirement: A confirmed failure is reported at once

When the server reports that no change request was created, the console SHALL report a failure immediately. The console SHALL NOT wait to confirm an outcome that the server already knows.

#### Scenario: The server reports that nothing was created

- **WHEN** a submission fails and the server reports that no change request was created
- **THEN** the console reports the failure at once
- **AND** the console does not look up the change request record
- **AND** the console invites the user to try again

#### Scenario: The server reports that the change request was created

- **WHEN** a submission fails and the server reports that the change request was created
- **THEN** the console reports at once that the outcome is uncertain
- **AND** the console tells the user where to verify it
- **AND** the console does not invite the user to try again
- **AND** the console does not look up the change request record

#### Scenario: The server cannot say what happened

- **WHEN** a submission fails and the server does not report whether a change request was created
- **THEN** the console looks up the change request record before it reports an outcome

### Requirement: The console confirms the outcome of a slow submission

When a submission ends without a usable response, and the server has not reported that no change request was created, the console SHALL look up the change request record for the destination before it reports an outcome. The console SHALL report a confirmed result when that record gains a new change request.

#### Scenario: The record gains a new change request

- **WHEN** a submission ends without a usable response
- **AND** the change request record for the destination gains a new ticket
- **THEN** the console states that the change request was created
- **AND** the console returns the user to the connection list

#### Scenario: The console blocks a retry while it confirms

- **WHEN** the console is confirming the outcome of a submission
- **THEN** the console rejects a further schedule action
- **AND** the console indicates that it is still working

### Requirement: An unconfirmed outcome is reported as unknown

When the console cannot confirm the outcome within a bounded wait, the console SHALL report the outcome as unknown rather than as a failure. The message SHALL tell the user where to verify whether a change request exists. The message SHALL remain until the user dismisses it.

#### Scenario: The wait ends with no new change request

- **WHEN** the console finishes its bounded wait
- **AND** the change request record shows no new ticket
- **THEN** the console states that the outcome is uncertain
- **AND** the console tells the user where to verify this before a retry
- **AND** the console does not state that the request failed

#### Scenario: The user does not read the message at once

- **WHEN** the console shows an unknown-outcome message
- **THEN** the message remains visible until the user dismisses it
- **AND** the message does not disappear on its own
- **AND** this holds on every screen that can show the message

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
