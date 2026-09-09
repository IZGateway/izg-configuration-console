---
schema_version: '1.0'
created:
  date: '2026-07-24T03:41:39.014Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.73
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~5a117b29-ce82-48bf-964a-511cefd0dbae
  inputs:
    - design.md
  summary: 'Jurisdiction policy spec stub — data model settled, UI design pending'
updated:
  - date: '2026-07-24T04:03:01.900Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~fc55b626-c587-4945-9dd7-15a4f1ed3bb3
    summary: >-
      Add user story and UI scenarios for jurisdiction manager view/edit
      allowedUseTypes
change_request: api-key-management
ticket: IGDD-3106, IGDD-3140
---
# Spec: Jurisdiction Policy — izg-configuration-console

> **User Story:** As a Jurisdiction manager, I want to be able to specify which uses
> are permitted to access my Jurisdiction, so that I can ensure that access conforms
> to my jurisdiction's policies.
>
> This capability covers the management of `Jurisdiction.allowedUseTypes` — the
> per-jurisdiction policy that controls which categories of credential
> (`PATIENT`, `PROVIDER`, `PUBLIC_HEALTH`) the jurisdiction accepts. The data model
> and enforcement rules are settled (see `design.md`). UI design is in progress.

## ADDED Requirements

### Requirement: Jurisdiction manager can view and update their jurisdiction's allowed use types

A user with the Jurisdiction Operations role SHALL be able to view their jurisdiction's
current `allowedUseTypes` and update it to reflect their jurisdiction's access policies.
A jurisdiction MUST have at least one allowed use type — a jurisdiction that accepts no
use types SHALL NOT be created, as it would be unreachable by any credential.

#### Scenario: Jurisdiction manager views current allowed use types

- **WHEN** a user with the Jurisdiction Operations role views their jurisdiction's
  policy settings
- **THEN** the current `allowedUseTypes` values are displayed
- **AND** each value is shown using a human-readable label (`Patient`, `Provider`,
  `Public Health`)

#### Scenario: Jurisdiction manager updates allowed use types

- **WHEN** a user with the Jurisdiction Operations role selects a new set of allowed
  use types and saves
- **THEN** `Jurisdiction.allowedUseTypes` is updated to reflect the new selection
- **AND** the change is recorded in the audit trail

#### Scenario: Jurisdiction manager cannot save an empty allowed use types selection

- **WHEN** a user with the Jurisdiction Operations role attempts to save with no
  use types selected
- **THEN** the save MUST be rejected with an error indicating at least one use type
  is required

#### Scenario: IZG Operations staff can view and update allowed use types for any jurisdiction

- **WHEN** a user with the IZG Operations role views or updates a jurisdiction's
  policy settings
- **THEN** they have the same view and edit capability as the Jurisdiction Operations
  role, for any jurisdiction

---

### Requirement: allowedUseTypes controls which credential categories a destination accepts

`allowedUseTypes` is a property of the **destination** jurisdiction and MUST be enforced
by the Hub at **routing time**, NOT at credential issuance time in the console. It declares
which categories of credential that jurisdiction accepts for access to its IIS data.

A sender's credential is bound to the sender's own `jurisdictionId`, but a sender may
transmit to many destinations. The access decision therefore compares the credential's
`useTypes` against the **destination** jurisdiction's `allowedUseTypes` for the specific
message being routed — this is a different check from anything evaluated at issuance.
There is no issuance-time intersection check against the sender's own jurisdiction.

> Enum-validation of `allowedUseTypes` on write is a console concern (covered below).
> The intersection enforcement is Hub-side; it is also specified in the
> credential-lifecycle spec ("Hub enforces useTypes intersection at routing time") and
> implemented under the separate izgw-hub + izgw-core ticket.

#### Scenario: allowedUseTypes values are restricted to the defined enum

- **WHEN** a Jurisdiction record is created or updated
- **THEN** each entry in `allowedUseTypes` MUST be one of: `PATIENT`, `PROVIDER`,
  `PUBLIC_HEALTH`
- **AND** any value outside this set MUST be rejected

#### Scenario: Destination jurisdiction useTypes intersection is enforced at routing time

- **WHEN** the Hub routes a message from a sender to a destination
- **THEN** the credential's `useTypes` MUST intersect the **destination** jurisdiction's
  `allowedUseTypes`
- **AND** the message MUST be rejected if the intersection is empty
- **AND** this decision is made at routing time in the Hub, not at credential issuance

#### Scenario: Single-use-type destination jurisdiction rejects out-of-scope credentials

- **WHEN** a destination jurisdiction has `allowedUseTypes = ["PROVIDER"]`
- **THEN** a message from a credential with `useTypes = ["PATIENT"]` MUST be rejected
- **AND** a message from a credential with `useTypes = ["PROVIDER"]` MUST be accepted

#### Scenario: Multi-use-type destination jurisdiction accepts credentials for any listed category

- **WHEN** a destination jurisdiction has `allowedUseTypes = ["PATIENT", "PROVIDER", "PUBLIC_HEALTH"]`
- **THEN** a message from a credential with any non-empty subset of those values MUST be accepted
