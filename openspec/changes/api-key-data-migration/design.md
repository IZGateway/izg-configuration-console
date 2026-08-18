---
schema_version: '1.0'
updated:
  - date: '2026-08-15T03:59:36.061Z'
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
      Update design to reference JSON files for jurisdiction updates; Fix
      AllowedUser sortKey example to use onboarding cert/domain; Fix operational
      note to reflect environment-specific scoping of AllowedUser records;
      Correct _test destId policy: onboarding AllowedUser records ARE generated
created:
  date: '2026-08-14T06:23:29.000Z'
  user: Keith W. Boone
---
# Design — API Key Data Migration

**Change:** api-key-data-migration
**Jira:** [IGDD-3258](https://izgateway.atlassian.net/browse/IGDD-3258)
**Reference:** [api-key-management design.md](../../api-key-management/design.md) — authoritative DynamoDB physical schema

---

## Overview

This migration populates three categories of DynamoDB records needed before the JWT
API Token feature (IGDD-3140) can be deployed to production:

1. **Jurisdiction records** — `UpdateItem` on all 63 existing records to add
   `allowedUseTypes`; IIS-that-are-also-senders also receive `useTypes`. A new record
   for CCUAT (ID 64) is inserted — DEVELOPMENT already exists as ID 1.
2. **Sender records** — new `PutItem` inserts for non-IIS sender organizations,
   assigned integer IDs starting at 100 (IDs 64–99 reserved as gap between jurisdictions
   and senders).
3. **AllowedUser records** — new `PutItem` inserts for access control pairs linking
   sender certificate common names to destination IDs, per environment.

The migration is **idempotent**: Jurisdiction `UpdateItem` calls are additive (they
only set the new fields); Sender and AllowedUser `PutItem` calls are safe to re-run
(overwrite with identical data). Running the migration twice produces the same result
as running it once.

---

## Execution Model

The migration is a **one-time ops task** executed manually by the hosting organization
before or during the deployment of the JWT API Token release. It is not integrated
into container startup.

The `batches/` directory contains everything needed to run the migration:

| Script | Description |
|---|---|
| `jurisdiction-updates.sh` | 62 `update-item` calls grouped by update pattern; 1 `put-item` for CCUAT |
| `prefix-corrections.json` | 3 `TransactWriteItems` for Hawaii/Idaho/Nebraska prefix fixes |
| `senders.sh` | Reads `denormalized/senders.csv`; one `put-item` per sender org |
| `iis-allowed-users.sh` | Reads `denormalized/allowed-users-iis.csv`; one `put-item` per IIS AllowedUser |
| `provider-allowed-users.sh` | Reads `denormalized/allowed-users-provider.csv`; one `put-item` per provider AllowedUser |
| `apikey-domains.sh` | Reads `denormalized/apikey-domains.csv`; one `put-item` per ApiKeyDomain |

Each script takes `--table <dynamodb-table-name>` and an optional `--profile <aws-profile>`.
No environment flag is needed — the denormalized CSVs contain rows for all environments,
and the CC DynamoDB table is shared across environments.

### Execution Order

Scripts MUST be run in the following order to satisfy the hub-safety requirement that
Jurisdiction `allowedUseTypes` are in place before AllowedUser records activate new
permissions:

1. `aws dynamodb transact-write-items --transact-items file://batches/prefix-corrections.json`
2. `batches/jurisdiction-updates.sh --table <table>`
3. `batches/senders.sh --table <table>`
4. `batches/iis-allowed-users.sh --table <table>`
5. `batches/provider-allowed-users.sh --table <table>`
6. `batches/apikey-domains.sh --table <table>`

Steps 4–6 MUST NOT run if steps 1–3 have not completed successfully.

### Required IAM Permissions

The operator's AWS credentials must have the following permissions on the target table:

- `dynamodb:PutItem` — insert Sender, AllowedUser, and ApiKeyDomain records
- `dynamodb:UpdateItem` — backfill Jurisdiction fields; prefix corrections
- `dynamodb:TransactWriteItems` — prefix corrections batch

---

## DynamoDB Table and Key Structure

All records are written to the `izgw-hub` DynamoDB table. The table uses a single-table
design with `entityType` as the partition key and `sortKey` as the sort key. See the
[Entity Quick Reference](../../api-key-management/design.md#entity-quick-reference) in
the api-key-management design for the full sortKey pattern per entity type.

### Jurisdiction Record

All 63 existing Jurisdiction records are **updated** (not replaced). Integer
`jurisdictionId` values come from `jurisdiction-table-current.csv`, which is the
canonical export of the live DynamoDB table. The `prefix` column in that file maps to
the short state abbreviation used throughout the input CSVs (e.g., `az`, `nv`).

**Write strategy:** `UpdateItem` with `SET allowedUseTypes = :v` (and `SET useTypes = :u`
for IIS-that-are-also-senders). No other fields are touched. This preserves all
existing attributes (name, prefix, msh3, msh4, etc.) managed by other processes.

Fields updated by this migration:

| Field | Source | Notes |
|---|---|---|
| `allowedUseTypes` | `jurisdiction-allowed-use-types.csv` | String Set (SS); added to existing record |
| `useTypes` | derived from `iis-access-control-pairs.csv` sender list | String Set (SS); only for IIS senders |

**CCUAT** does not exist in the current table and is inserted as a new record with
`jurisdictionId = 64`.

**ID resolution:** `jurisdiction-table-current.csv` `prefix` → `jurisdictionId` (integer).
The generator builds a lookup map from this file at startup. Short abbreviations in all
input CSVs resolve through this map.

### Sender Record

Non-IIS sender organizations do not exist in the Jurisdiction table and are **inserted**
as new items (`PutItem`). Integer IDs are assigned starting at **100**, with IDs 64–99
reserved as a gap between existing jurisdictions and senders.

ID assignment (fixed, committed to `sender-organizations.csv` `sender_id` column):

| sender_id | Organization | use_types |
|---|---|---|
| 100 | eHealth Exchange | PUBLIC_HEALTH |
| 101 | Docket | PATIENT |
| 102 | Security Risk Solutions (ops) | PUBLIC_HEALTH, PROVIDER, PATIENT |
| 103 | e-HealthSign (ops) | PUBLIC_HEALTH, PROVIDER, PATIENT |
| 104 | Audacious Inquiry operators | PUBLIC_HEALTH, PROVIDER, PATIENT |
| 105 | AZOVA | PROVIDER |
| 106 | DaVita Physician Solutions | PROVIDER |
| 107 | Department of Defense | PROVIDER |
| 108 | DocStation | PROVIDER |
| 109 | Fond du Lac | PROVIDER |
| 110 | Fresenius Medical Care | PROVIDER |
| 111 | Mayo Clinic | PROVIDER |
| 112 | RIISE | PROVIDER |
| 113 | VAMS | PROVIDER |
| 114 | Veterans Administration | PROVIDER |

Fields written by this migration:

| Field | Source | Notes |
|---|---|---|
| `entityType` | literal `"Jurisdiction"` | Same physical table |
| `sortKey` | sender_id (numeric string, e.g., `"100"`) | |
| `jurisdictionId` | same as sortKey | |
| `jurisdictionName` | from `sender-organizations.csv` | |
| `useTypes` | from `sender-organizations.csv` | String Set (SS) |

No `allowedUseTypes` is written — field absence signals sender-only. IIS records that
are also senders receive `useTypes` via `UpdateItem` on the existing Jurisdiction record
(handled in the Jurisdiction update step, not here).

### AllowedUser Record

Partition key: `AllowedUser`
Sort key: `{environment}#{destinationId}#{principal}`

Where:
- `environment` = `"production"` or `"onboarding"`
- `destinationId` = string prefix from `jurisdiction-table-current.csv`
  (e.g., `az` for Arizona, `md_c` for Maryland Provider Connect, `nyc` for NYC CIR)
- `principal` = TLS certificate common name from `certificate-inventory.csv`

Fields written:

| Field | Source | Notes |
|---|---|---|
| `entityType` | literal `"AllowedUser"` | |
| `sortKey` | `{env}#{destId}#{principal}` | |
| `principal` | cert common name | |
| `organizationName` | from cert inventory or sender CSV | |
| `useTypes` | from sender CSV or IIS useType rule | String Set (SS) |
| `validUntil` | cert expiry date from inventory | ISO-8601 date string |
| `destinationId` | string prefix from `jurisdiction-table-current.csv` (e.g., `az`, `md_c`) | |
| `environment` | `"production"` or `"onboarding"` | |

---

## Files and Their Roles

### Generator Script Input Files

The generator (`generate-batches.js`) reads these 3NF source files to produce all
outputs. They are preserved in git history via prior commits.

| File | Role |
|---|---|
| `jurisdiction-allowed-use-types.csv` | `allowedUseTypes` values per jurisdiction; `SKIP` rows excluded |
| `sender-organizations.csv` | Non-IIS sender names, IDs, and `useTypes` |
| `certificate-inventory.csv` | Maps cert common names → org, environment(s), sender/jurisdiction |
| `iis-access-control-pairs.csv` | IIS-to-IIS and IIS-to-DEX AllowedUser source rows |
| `provider-access-control-pairs.csv` | Provider-to-IIS AllowedUser source rows |
| `jurisdiction-table-current.csv` | Canonical Jurisdiction table export; provides integer `jurisdictionId` keyed by `prefix` |

### Migration Execution Inputs (in `batches/`)

These are the artifacts used directly during migration execution:

| File | Role |
|---|---|
| `prefix-corrections.json` | TransactWriteItems for Hawaii/Idaho/Nebraska prefix fixes |
| `jurisdiction-updates.sh` | 62 `update-item` calls grouped by update pattern; CCUAT `put-item` |
| `senders.sh` | Reads `denormalized/senders.csv` (15 rows); one `put-item` per sender |
| `iis-allowed-users.sh` | Reads `denormalized/allowed-users-iis.csv` (1,566 rows) |
| `provider-allowed-users.sh` | Reads `denormalized/allowed-users-provider.csv` (372 rows) |
| `apikey-domains.sh` | Reads `denormalized/apikey-domains.csv` (133 rows) |
| `denormalized/senders.csv` | Denormalized sender records for review and execution |
| `denormalized/jurisdiction-updates.csv` | Denormalized jurisdiction update records for review |
| `denormalized/allowed-users-iis.csv` | Denormalized IIS AllowedUser records for review and execution |
| `denormalized/allowed-users-provider.csv` | Denormalized provider AllowedUser records for review and execution |
| `denormalized/apikey-domains.csv` | Denormalized ApiKeyDomain records for review and execution |

---

## Execution Order

The migration MUST execute its write phases in the following order to satisfy the
hub-safety requirement that Jurisdiction `allowedUseTypes` are in place before
AllowedUser records activate new sender permissions:

1. **Prefix corrections** — `aws dynamodb transact-write-items --transact-items file://batches/prefix-corrections.json`
2. **Jurisdiction updates** — `batches/jurisdiction-updates.sh --table <table>` (backfill `allowedUseTypes`/`useTypes`; insert CCUAT)
3. **Sender records** — `batches/senders.sh --table <table>` (insert ids 100–114)
4. **IIS AllowedUsers** — `batches/iis-allowed-users.sh --table <table>`
5. **Provider AllowedUsers** — `batches/provider-allowed-users.sh --table <table>`
6. **ApiKeyDomains** — `batches/apikey-domains.sh --table <table>`

Steps 4–6 MUST NOT run if steps 1–3 have not completed successfully.

**Operational note:** AllowedUser records contain both production and onboarding rows
(scoped by envId in their sort key). Writing these records to the live table is an
immediate access control change — ops should be aware that once the AllowedUser scripts
run, the new sender principals can connect.

---

## Split-Endpoint Jurisdictions

Some jurisdictions operate two separate IZ Gateway endpoints scoped by use case.
The `destinationId` used in an AllowedUser sort key must match the endpoint that
corresponds to the sender's use type:

| State | destinationId | Use case | Sender type |
|---|---|---|---|
| Maryland | `md` | IIS-to-IIS data exchange | PUBLIC_HEALTH (IIS senders) |
| Maryland | `md_c` | Provider connect | PROVIDER senders |
| Virginia | `va_s` | IIS-to-IIS data exchange | PUBLIC_HEALTH (IIS senders) |
| Virginia | `va` | Provider connect | PROVIDER senders |

The use case is determined by the **sender**, not the receiver. A sender with
`useTypes=PUBLIC_HEALTH` (an IIS) routes to the IIS endpoint; a sender with
`useTypes=PROVIDER` routes to the provider connect endpoint.

The generator MUST apply this mapping when producing AllowedUser sort keys for
Maryland and Virginia destinations.

### New York Split Endpoints

New York State operates two endpoints split by message type:

| destId | Environment | Message type |
|---|---|---|
| `ny_vxu` | production + onboarding | VXU (immunization update) |
| `ny_qbp` | onboarding only | QBP (query by parameter) |

Any sender permitted to reach `ny_vxu` is also permitted to reach `ny_qbp`.
AllowedUser records for `ny_qbp` are generated for onboarding batches only.

The `_test` destIds (`ny_test`, `mi_test`, `nc_test`) are onboarding-only test
endpoints. They DO receive AllowedUser records, but only in the onboarding
environment batch — never in production.

---

## Destination ID Resolution

Access control pairs in the input CSVs use short state abbreviations (`az`, `nv`, etc.)
derived from jurisdiction names. These short strings ARE the `destinationId` — the string
prefix stored in `jurisdiction-table-current.csv` and used directly in the AllowedUser
sort key: `{environment}#{destinationId}#{principal}`.

The `jurisdiction-table-current.csv` `prefix` column is the authoritative mapping from
Salesforce jurisdiction name → `destinationId` string. The integer `jurisdictionId` is
used only for Jurisdiction and Sender record sort keys — it is NOT used in AllowedUser
sort keys.

Entries whose short identifier cannot be resolved via the prefix map are logged as
warnings and excluded from the batch output.

---

## Environment Splitting

The certificate inventory `environments` column contains `production`, `onboarding`,
or `production|onboarding`. The generator produces separate batch directories for
each environment. A cert with `production|onboarding` produces AllowedUser records
in both batch sets.

**Production DenyList:** The following principals are excluded from production batches
regardless of any other rule:

- `cicd.testing.izgateway.org`
- `dev.izgateway.org`
- `dev.xform.izgateway.org`
- `preprod-cc.phiz-project.org`
- `preprod.phiz-project.org`
- `preprod.xform.phiz-project.org`
- `test.izgateway.org`

---

## Known Limitations

### STChealth Shared Certificate

17 jurisdictions share a single TLS certificate (`izgateway.stchealthops.com`,
`izgateway2.stchealthops.com`, `epicenter.stchome.com`). For the purposes of
X.509 mTLS access control this works because the Hub identifies senders by
certificate common name alone. These jurisdictions will each receive an
`AllowedUser` record with the shared STC principal.

However, JWT API keys require a one-to-one relationship between a domain and an
organization. STC's shared certificate model is **incompatible with JWT key
issuance** for their hosted jurisdictions. This is a known limitation documented
in the sender-entities spec. No action is taken by this migration to resolve it;
it is a prerequisite for a future STC-specific migration when/if they move to
individual certificates.

### IIS-to-IIS Sender Records

IIS sender `useTypes` values are set on the same `Jurisdiction` record that already
holds `allowedUseTypes`. The generator uses `UpdateItem` for these to add `useTypes`
without overwriting the receiver fields. IIS records that appear in
`iis-access-control-pairs.csv` as senders but are not present in the endpoints
CSV (e.g., DEX/CDC, which is not a Hub destination) are handled as pure-sender
records with a newly allocated ID.

### Texas

Texas is a Jurisdiction (receiver) but not an IIS-to-IIS sender (legally prohibited).
Texas appears in `iis-access-control-pairs.csv` only as a destination and as the
sender for DEX/CDC reporting. The generator must not create an IIS `useTypes`
backfill for Texas.

---

## Estimated Record Counts

| Category | Approx. count |
|---|---|
| Jurisdiction `allowedUseTypes` updates | ~65 |
| New Sender records (non-IIS) | ~15 |
| IIS sender `useTypes` updates | ~45 |
| AllowedUser records (IIS-to-IIS + IIS-to-DEX) | ~647 |
| AllowedUser records (Provider-to-IIS) | ~136 |
| **Total write operations** | **~908** |
| **Migration scripts** | **6 (jurisdiction-updates.sh + 4 entity scripts + prefix-corrections.json)** |
