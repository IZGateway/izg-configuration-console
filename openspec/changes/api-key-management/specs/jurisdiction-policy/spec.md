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
ticket: IGDD-3140
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

### Requirement: allowedUseTypes controls which credential categories are accepted

The `allowedUseTypes` field enforces at credential issuance time that the credential's
`useTypes` are within the jurisdiction's declared policy.

#### Scenario: allowedUseTypes values are restricted to the defined enum

- **WHEN** a Jurisdiction record is created or updated
- **THEN** each entry in `allowedUseTypes` MUST be one of: `PATIENT`, `PROVIDER`,
  `PUBLIC_HEALTH`
- **AND** any value outside this set MUST be rejected

#### Scenario: Credential useTypes must intersect jurisdiction allowedUseTypes at issuance

- **WHEN** a credential is created for a jurisdiction
- **THEN** each value in the credential's `useTypes` MUST appear in the jurisdiction's
  `allowedUseTypes`
- **AND** credential creation MUST be rejected if the intersection is empty

#### Scenario: Single-use-type jurisdiction rejects out-of-scope credentials

- **WHEN** a jurisdiction has `allowedUseTypes = ["PROVIDER"]`
- **THEN** a credential with `useTypes = ["PATIENT"]` MUST be rejected
- **AND** a credential with `useTypes = ["PROVIDER"]` MUST be accepted

#### Scenario: Multi-use-type jurisdiction accepts credentials for any listed category

- **WHEN** a jurisdiction has `allowedUseTypes = ["PATIENT", "PROVIDER", "PUBLIC_HEALTH"]`
- **THEN** a credential with any non-empty subset of those values MUST be accepted
