---
schema_version: '1.0'
created:
  date: '2026-08-14T07:06:00.000Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.79
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/6b36fcb8-6019-41de-8218-f2e836b132e7/~hub-safety-spec
  summary: Hub safety spec for api-key-data-migration
change_request: api-key-data-migration
ticket: IGDD-3258
---
## Purpose

Specifies the safety constraints that the data migration must satisfy with respect to
the live `izgw-hub` service. The DynamoDB table is a **shared asset** — the same table
serves both the onboarding and production environments, and is read continuously by the
Hub. The migration writes to this table while Hub instances are running. No Hub restart
or maintenance window is available or required; the migration must be safe to execute
against a live table.

## Background — Verified Hub Marshalling Behavior

The following findings were established by code inspection of `izgw-hub` and `izgw-core`
prior to writing these requirements. They form the evidentiary basis for the safety
assertions below.

### DynamoDB Marshalling

The Hub uses the **AWS DynamoDB Enhanced Client** with `@DynamoDbBean` annotations and
`TableSchema.fromBean()` in a generic repository (`izgw-core/.../DynamoDbRepository.java`).
This marshaller **silently ignores** DynamoDB attributes that have no corresponding
`@DynamoDbAttribute`-annotated getter in the Java bean. Unknown attributes do not throw
exceptions.

### Jurisdiction Entity

The Hub's `Jurisdiction` Java class (`izgw-hub/.../Jurisdiction.java`) currently defines:
`jurisdictionId`, `name`, `description`, `prefix`, `vendor`.

It does **not** define `allowedUseTypes` or `useTypes`. Both fields will be written by
this migration as new DynamoDB attributes. Because the Enhanced Client ignores unmapped
attributes, the Hub will read existing Jurisdiction records without error both before
and after the migration writes these fields.

### Jurisdiction Loading

The Hub loads Jurisdiction records via `jurisdictionRepository.findAll()`, which issues
a **query on the table partition key** — not a full table scan
(`izgw-core/.../DynamoDbRepository.java`). New Sender records (ids 100–114) will be
returned by this query since they share the `Jurisdiction` entity type. The Hub caches
these by `jurisdictionId`. No Hub code currently references `useTypes` or
`allowedUseTypes`, so new records with only `useTypes` set (and no `prefix`) are
cached but have no effect on Hub behavior.

### AllowedUser Entity

The Hub's `AllowedUser` Java class (`izgw-hub/.../AllowedUser.java`) is also mapped via
`@DynamoDbBean`. Its cache load (`izgw-hub/.../NewModelHelper.java`) reads all
AllowedUser records for the current environment and indexes them by `destinationId`.
New AllowedUser records written by the migration are immediately visible to the Hub
after the write completes. This is intentional — the migration's AllowedUser records
represent current permissions and should take effect as soon as they are written.

### prefix Field

The `prefix` field on Jurisdiction records is used by the Hub for routing. Sender
records (ids 100–114) do not have a `prefix` attribute. No Hub code was found that
assumes `prefix` is non-null on every Jurisdiction table row; the field is used only
when routing to a destination, and Sender-only records are not routing destinations.

## ADDED Requirements

### Requirement: Migration does not remove or overwrite existing Hub-managed fields

The migration SHALL NOT delete, overwrite, or corrupt any field on an existing
Jurisdiction or AllowedUser record that is currently read and used by the Hub
(`jurisdictionId`, `name`, `description`, `prefix`, `vendor`, `destinationId`,
`principal`, `environment`, `sortKey`).

The `UpdateItem` expressions used for Jurisdiction backfill SHALL use `SET` only on
the new fields (`allowedUseTypes`, `useTypes`, `prefix` corrections). No existing
field SHALL be included in the SET expression unless it is one of the three confirmed
prefix corrections (id=14 `hi`, id=16 `id`, id=32 `ne`).

#### Scenario: Jurisdiction record updated by migration

- **WHEN** the migration runs an `UpdateItem` on an existing Jurisdiction record
- **THEN** only `allowedUseTypes`, `useTypes` (where applicable), and the three
  confirmed prefix corrections SHALL be modified
- **AND** all other fields on that record SHALL remain unchanged

### Requirement: New fields on Jurisdiction records are invisible to the current Hub

The `allowedUseTypes` and `useTypes` fields written by this migration are not defined
in the Hub's current `Jurisdiction` Java bean. The Hub's DynamoDB Enhanced Client
marshaller SHALL ignore these fields when reading Jurisdiction records, producing no
errors, no exceptions, and no behavioral change in the Hub.

#### Scenario: Hub reads a migrated Jurisdiction record

- **WHEN** the Hub reads a Jurisdiction record that has been updated with
  `allowedUseTypes` or `useTypes` by this migration
- **THEN** the Hub SHALL unmarshal the record without error
- **AND** the Hub's cached `Jurisdiction` object SHALL contain the same field values
  as before the migration (the new fields are not present in the Java bean and are
  silently dropped)

### Requirement: New Sender records do not disrupt Hub Jurisdiction loading

New Sender records (ids 100–114) are inserted into the same DynamoDB table partition
as Jurisdiction records. The Hub queries this partition on startup and when refreshing
its cache.

#### Scenario: Hub loads Jurisdiction cache after Sender records are inserted

- **WHEN** the Hub queries the Jurisdiction partition after the migration has inserted
  Sender records with ids 100–114
- **THEN** those records SHALL be loaded into the Hub's Jurisdiction cache without error
- **AND** the absence of a `prefix` field on Sender records SHALL NOT cause a
  NullPointerException or other failure in the Hub's Jurisdiction loading code
- **AND** the Hub's routing behavior for existing jurisdictions SHALL be unaffected

### Requirement: New AllowedUser records take effect immediately

AllowedUser records written by this migration are scoped by environment in their sort
key (`{environment}#{destinationId}#{principal}`). They are immediately visible to a
running Hub instance on next cache refresh.

#### Scenario: Hub reads AllowedUser cache after migration

- **WHEN** the Hub refreshes its AllowedUser cache after the migration has written new
  records for a given environment
- **THEN** those new AllowedUser records SHALL be present in the cache
- **AND** the Hub SHALL begin enforcing the new access permissions on subsequent
  connection attempts by the corresponding principals

### Requirement: Migration order minimizes authorization disruption

Jurisdiction `allowedUseTypes` backfill must complete before AllowedUser records are
written, so that the Hub's use-type intersection check can be satisfied as soon as
sender principals begin to appear in the AllowedUser cache.

#### Scenario: Migration execution order

- **WHEN** the migration runs
- **THEN** Jurisdiction `UpdateItem` commands SHALL execute before AllowedUser
  `PutItem` batch commands
- **AND** Sender `PutItem` inserts SHALL execute before AllowedUser records that
  reference those sender IDs