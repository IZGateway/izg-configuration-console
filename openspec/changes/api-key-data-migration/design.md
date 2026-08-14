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

The migration runs automatically at container startup via `run_and_monitor.sh`, the
bash script that is the container `CMD`. The migration block is inserted in
`run_and_monitor.sh` after `replace-variable.sh` completes and before `next start`
launches the Node application — ensuring the database is ready before the application
begins serving requests.

The AWS CLI (`aws-cli` package) must be added to the `apk add` line in the runner
stage of the Dockerfile.

### Startup Sequence

```
run_and_monitor.sh
  ├── start filebeat / metricbeat (if configured)
  ├── generate SSL / configure nginx / start nginx
  ├── replace-variable.sh
  ├── [NEW] run-migration.sh       ← this migration
  └── start node (next start)
```

### Migration Lock Protocol (Event entity)

The migration uses DynamoDB's `attribute_not_exists` conditional write as a distributed
lock. The `Event` entity (managed by `izgw-hub`) serves as the lock and audit record.

**Fixed sort key:** `Migration#api-key-data-migration`
This key is deterministic so any instance can locate it with a `GetItem`.

**Lock lifecycle:**

| Status | Meaning |
|---|---|
| Record absent | Migration has never been attempted — claim it |
| `IN_PROGRESS` | Another instance is running the migration — wait and poll |
| `COMPLETED` | Migration finished successfully — skip, proceed to launch |
| `FAILED` | Previous attempt failed — delete record and retry |

**Claim step:** `PutItem` with `ConditionExpression: attribute_not_exists(sortKey)`.
Written fields: `entityType=Event`, `sortKey`, `name=api-key-data-migration`,
`started=<ISO timestamp>`, `reportedBy=<hostname>`, `status=IN_PROGRESS`.

If the conditional write fails (`ConditionalCheckFailedException`), another instance
owns the lock — this instance reads the existing record and follows the status table above.

**Polling:** While status is `IN_PROGRESS`, poll every 15 seconds. Give up (log warning,
proceed to launch) after 5 minutes. Timeout value is a configurable constant in
`run-migration.sh`.

**On migration success:** `UpdateItem` sets `status=COMPLETED`, `completed=<ISO timestamp>`.

**On migration failure:** Script catches the error, sets `status=FAILED`, exits non-zero.
The container will restart (ECS restart policy). Next startup attempt sees `FAILED`,
deletes the lock record, and retries from the beginning.

### Batch Format

Each batch file contains up to 25 `PutRequest` items in the format required by
`aws dynamodb batch-write-item`:

```json
{
  "izgw-hub": [
    {
      "PutRequest": {
        "Item": {
          "entityType": { "S": "AllowedUser" },
          "sortKey":    { "S": "production#az#azova.com" },
          ...
        }
      }
    }
  ]
}
```

### Required IAM Permissions

The ECS task role must have the following permissions on the `izgw-hub` table:

- `dynamodb:GetItem` — read lock record and check migration status
- `dynamodb:PutItem` — claim lock, insert Sender and AllowedUser records
- `dynamodb:UpdateItem` — backfill Jurisdiction fields, update lock status
- `dynamodb:DeleteItem` — remove FAILED lock record before retry
- `dynamodb:BatchWriteItem` — bulk insert of Sender and AllowedUser records

Note: `batch-write-item` only supports `PutRequest` and `DeleteRequest` —
`UpdateItem` calls for existing Jurisdiction records run as individual
`aws dynamodb update-item` commands outside the batch loop. The correct AWS
profile (onboarding vs. production account) must be active before executing.

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

## Input Files and Their Roles

| File | Role |
|---|---|
| `jurisdiction-allowed-use-types.csv` | `allowedUseTypes` values per jurisdiction; `SKIP` rows excluded |
| `sender-organizations.csv` | Non-IIS sender names, IDs, and `useTypes` |
| `certificate-inventory.csv` | Maps cert common names → org, environment(s), sender/jurisdiction |
| `iis-access-control-pairs.csv` | 647 IIS-to-IIS and IIS-to-DEX AllowedUser source rows |
| `provider-access-control-pairs.csv` | 136 Provider-to-IIS AllowedUser source rows |
| `jurisdiction-table-current.csv` | Canonical Jurisdiction table export; provides integer `jurisdictionId` keyed by `prefix` |
| `prod_endpoints.csv` | Secondary reference for CCUAT record and environment-specific destId verification |
| `onboarding_endpoints.csv` | Secondary reference for onboarding-only destinations |

---

## Execution Order

The migration MUST execute its three write phases in the following order to satisfy
the hub-safety requirement that Jurisdiction `allowedUseTypes` are in place before
AllowedUser records activate new sender permissions:

1. **Jurisdiction `UpdateItem` commands** (`jurisdiction-updates.sh`) — backfill
   `allowedUseTypes` and `useTypes` on existing records; insert CCUAT.
2. **Sender `PutItem` batches** — insert new Sender records (ids 100–114).
3. **AllowedUser `PutItem` batches** — insert access control records; by this point
   both the receiver Jurisdiction's `allowedUseTypes` and the sender's record exist.

`run-migration.sh` MUST enforce this sequence. AllowedUser batches MUST NOT run if
either of the preceding phases fails.

**Operational note:** AllowedUser records scoped to `production#...` sort keys take
effect on the **next Hub cache refresh** after they are written. Writing these records
to the live production table is an immediate access control change. Ops should be aware
that once Phase 3 runs against production, the new sender principals can connect.

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
| **Batch files (25 per batch)** | **~37 per environment** |