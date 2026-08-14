---
schema_version: '1.0'
created:
  date: '2026-08-13T14:36:59.034Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.79
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~e8f925b2-a3a7-4310-a5bb-c4d02c1eacc8
  summary: Access control spec for api-key-data-migration
updated:
  - date: '2026-08-13T15:01:54.252Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.79
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~b1f43f0d-c2c5-4a5f-8a8a-5765abe22463
    summary: >-
      Add Input Data section: directionality finding, Texas stale entry,
      production+onboarding scope, onboarding-only gap
change_request: api-key-data-migration
ticket: IGDD-3258
---
## Purpose

Specifies the required outcome of refreshing the access control records that govern
which Senders are authorized to send messages to which Jurisdictions via IZ Gateway,
replacing the initial population with current permissions derived from Salesforce
onboarding records.

## Input Data and Directionality

Access control permissions are derived from the **"List of Live IIS to IIS Data Exchange"**
column in the Salesforce Live Data Exchange export
(`Live Data Exchange-2026-08-10-11-17-22.xlsx`).

**Directionality:** The left-hand organization (row) is the **sender**; each entry in
the IIS-to-IIS column is a **receiver** (destination) that the sender is permitted to
reach. Confirmed by the Texas test case: Texas is legally prohibited from sending to
other IIS systems (governor COVID exception revoked), and Texas's row listing
"New Mexico" is a known stale entry from that exception. New Mexico correctly lists
Texas as a receiver, consistent with the current NM→TX direction being valid.

**Known stale entry to exclude:** `Texas → New Mexico` — this was added under the
COVID emergency exception and must NOT be written as an `AllowedUser` record.

**Environments in scope:** All permissions derived from this table apply to both
**production and onboarding** environments. Onboarding-only permissions (permissions
that exist in onboarding but not in production) are a known gap and are out of scope
for this migration; they will be addressed separately when that data is available.

**Provider-to-IIS access control** (the "List of Live Pro to IIS Data Exchange" column)
is a separate concern and is not addressed by this migration; those sender organizations
are covered by the sender-entities capability.

**CDC/DEX access control is in scope:** Jurisdictions that send IIS reports to CDC
require AllowedUser records with `dex` as the destination and `PUBLIC_HEALTH` as the
use type. These are included in `iis-access-control-pairs.csv`. Note: the `REPORTING`
use type extension for CDC data reporting is out of scope for the JWT token work; the
existing `PUBLIC_HEALTH` value is used for these records in this migration.

**Texas→DEX:** Texas sends reports to CDC and SHALL have one AllowedUser record with
`dex` as the destination. Texas is NOT an IIS-to-IIS sender (no AllowedUser records
with other jurisdictions as receivers).

## ADDED Requirements

### Requirement: AllowedUser records reflect current Salesforce onboarding data

The access control records (entityType `AllowedUser`) in DynamoDB SHALL be updated so
that every Sender-to-Destination authorization in the input data is represented,
reflecting the current set of permissions as recorded in Salesforce.

#### Scenario: Sender-Destination authorization present in input data

- **WHEN** the migration runs and the input data contains an authorization for a given
  Sender principal to send to a given Destination in a given environment
- **THEN** a corresponding `AllowedUser` record SHALL exist in DynamoDB after the
  migration completes

#### Scenario: Authorization already exists in DynamoDB

- **WHEN** the migration runs and an `AllowedUser` record already exists that matches
  an entry in the input data
- **THEN** that record SHALL be confirmed present and no duplicate SHALL be created

### Requirement: Stale access control records are flagged, not silently removed

The migration SHALL NOT automatically delete `AllowedUser` records that exist in
DynamoDB but are absent from the input data without explicit operator confirmation.

Records that are present in DynamoDB but not in the input data SHALL be reported as
candidates for removal so that an operator can review them before any deletions occur.

#### Scenario: AllowedUser record not in input data

- **WHEN** the migration runs and an `AllowedUser` record exists in DynamoDB that has
  no corresponding entry in the input data
- **THEN** that record SHALL remain in DynamoDB unchanged
- **AND** the migration SHALL include that record in a "candidates for removal" section
  of its output report

#### Scenario: Operator-confirmed removal mode

- **WHEN** the migration is invoked with an explicit flag authorizing removal of stale
  records
- **THEN** `AllowedUser` records present in DynamoDB but absent from the input data
  SHALL be removed
- **AND** each removed record SHALL be listed in the output report

### Requirement: Migration is idempotent

The migration script SHALL be safe to run more than once with the same input data
without creating duplicate `AllowedUser` records.

#### Scenario: Re-run with same input data

- **WHEN** the migration is run a second time with the same access control input data
- **THEN** no duplicate `AllowedUser` records SHALL be created
- **AND** the resulting DynamoDB state SHALL be identical to the state after the first run

### Requirement: Migration produces an execution report

Upon completion the migration SHALL emit a summary report identifying:
- the number of `AllowedUser` records created
- the number of `AllowedUser` records confirmed already present (no change needed)
- the number of DynamoDB records flagged as candidates for removal (absent from input)
- any records that could not be written, and the reason

#### Scenario: Successful run with stale records detected

- **WHEN** the migration completes and some DynamoDB records were not in the input data
- **THEN** the report SHALL include a "candidates for removal" section listing those records
- **AND** the exit status SHALL indicate success if no write errors occurred
