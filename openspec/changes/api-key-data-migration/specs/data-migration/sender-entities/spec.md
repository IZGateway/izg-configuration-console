---
schema_version: '1.0'
created:
  date: '2026-08-13T14:36:58.595Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.79
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~e8f925b2-a3a7-4310-a5bb-c4d02c1eacc8
  summary: Sender entities spec for api-key-data-migration
updated:
  - date: '2026-08-14T02:48:12.072Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.79
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/claude-code/9edee8ca-3f1c-48f5-91cc-295c416b89e4/~d27b3e0a-7f0a-40de-8691-268ddfb7f2ad
    summary: >-
      Add Input Data section: sender CSV reference, VA consolidation rule,
      DOD/DOW note, MSH identity gap
change_request: api-key-data-migration
ticket: IGDD-3258
---
## Purpose

Specifies the required outcome of seeding Sender entity records in DynamoDB so that
each organization currently sending messages via IZ Gateway — including non-jurisdiction
senders such as commercial and federal entities — is represented with accurate
`useTypes` and identity information before the JWT API Token feature is enabled.

## Input Data

The set of non-jurisdiction Sender organizations is derived from the **"List of Live
Pro to IIS Data Exchange"** column in the Salesforce Live Data Exchange export
(`Live Data Exchange-2026-08-10-11-17-22.xlsx`). The canonical sender list with
`useTypes` is captured in:

**`openspec/changes/api-key-data-migration/sender-organizations.csv`**

**Consolidation rules applied:**
- `Veterans Administration (VistA)`, `Veterans Administration (Oracle Health)`, and
  `Veterans Administration` are three Salesforce name variants for the same organization.
  They SHALL be consolidated into **one Sender record**. The two sending infrastructures
  (VistA and Oracle Health/Cerner) will produce multiple MSH identities on that single record.
- `Department of Defense (DOD)` and the historical name `Department of War (DOW)` refer
  to the same entity and SHALL produce one Sender record.

This yields **10 unique Sender records**, all with `useTypes: PROVIDER`.

MSH-3/MSH-4 identity values for each sender are not available from Salesforce and must
be collected separately from Elasticsearch message history before the sender-entities
migration can be executed.

## ADDED Requirements

### Requirement: Non-jurisdiction senders are represented in the Jurisdiction table

Organizations that send messages via IZ Gateway but are not public health agencies
(e.g., commercial EHR vendors, federal agencies, health networks) SHALL each have a
record in the physical Jurisdiction table with `useTypes` set to reflect the use cases
they participate in.

Per the physical schema defined in `openspec/changes/api-key-management/design.md`,
Sender records are stored as Jurisdiction table entries; a record with `useTypes` acts
as a sender. A newly seeded sender SHALL be issued a unique ID that does not already
exist in the table (IDs are never reused across the shared namespace).

#### Scenario: New sender not yet in DynamoDB

- **WHEN** the migration runs and the input data contains a sender organization that
  has no existing record in DynamoDB
- **THEN** a new record SHALL be created in the Jurisdiction table with `useTypes`
  populated from the input data and a new unique ID assigned

#### Scenario: Sender already present in DynamoDB

- **WHEN** the migration runs and the input data contains a sender organization that
  already has a record in DynamoDB
- **THEN** the existing record SHALL be updated to reflect the `useTypes` from the
  input data
- **AND** the existing record's ID SHALL NOT change

### Requirement: Sender identity information is recorded

Each Sender record SHALL include the identifiers (such as MSH-3 and MSH-4 values from
HL7 message headers) that the Sender currently uses when submitting messages, as
collected from Elasticsearch message history provided in the input data.

#### Scenario: Sender with known MSH identifiers

- **WHEN** the migration runs and the input data includes MSH-3/MSH-4 values for a
  sender
- **THEN** those identity values SHALL be recorded on the Sender's record in DynamoDB

#### Scenario: Sender with no MSH identifiers in input data

- **WHEN** the migration runs and the input data does not include MSH identifiers for
  a sender
- **THEN** the Sender record SHALL be created or updated without identity values
- **AND** the migration SHALL note the missing identity in its output report

### Requirement: Migration is idempotent

The migration script SHALL be safe to run more than once against the same database
without producing duplicate sender records or corrupting existing data.

#### Scenario: Re-run with same input data

- **WHEN** the migration is run a second time with the same sender input data
- **THEN** no duplicate records SHALL be created
- **AND** the resulting DynamoDB state SHALL be identical to the state after the first run

### Requirement: Migration produces an execution report

Upon completion the migration SHALL emit a summary report identifying:
- the number of Sender records created
- the number of Sender records updated
- any senders in the input data that could not be written, and the reason

#### Scenario: Successful run

- **WHEN** the migration completes without write errors
- **THEN** the report SHALL list all created and updated sender records
- **AND** the exit status SHALL indicate success
