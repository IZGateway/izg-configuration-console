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

The migration is delivered as:

1. **`migrate/generate-batches.js`** — a Node.js script run once by a developer that
   reads the input CSVs and writes numbered batch JSON files in the format expected by
   `aws dynamodb batch-write-item`.

2. **Pre-generated batch files** committed to this branch:
   - `migrate/batches/onboarding/batch-NNN.json`
   - `migrate/batches/production/batch-NNN.json`

3. **`migrate/README.md`** — the exact AWS CLI commands to execute per environment,
   including the loop command and any prerequisites.

Operations staff runs the migration using only the AWS CLI — no Node.js, no SDK, no
application code. A developer generates the batch files once, reviews and commits them,
and operations executes against each environment.

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

### Execution Commands

**Run all batches for a given environment** (Windows cmd.exe):

```cmd
for %f in (migrate\batches\production\*.json) do ^
  aws dynamodb batch-write-item --request-items file://%f --region us-east-1
```

**Single batch (verification/testing):**

```cmd
aws dynamodb batch-write-item ^
  --request-items file://migrate\batches\onboarding\batch-001.json ^
  --region us-east-1
```

### AWS Credentials

The operator must have AWS credentials configured with `dynamodb:BatchWriteItem`,
`dynamodb:PutItem`, and `dynamodb:UpdateItem` on the `izgw-hub` table for the target
account. Note: `batch-write-item` only supports `PutRequest` and `DeleteRequest` —
`UpdateItem` calls for existing Jurisdiction records are executed as individual
`aws dynamodb update-item` commands, not as batch operations. The correct AWS
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
- `destinationId` = integer `jurisdictionId` resolved from `jurisdiction-table-current.csv`
  via the `prefix` column (e.g., `"az"` → `6` for Arizona)
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
| `destinationId` | numeric destId | |
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

## Destination ID Resolution

Access control pairs in the input CSVs use short identifiers (`az`, `nv`, etc.) derived
from jurisdiction names. The generator resolves these to integer `jurisdictionId` values
using the `prefix` column in `jurisdiction-table-current.csv`. This file is the
authoritative source of the integer key for every existing Jurisdiction record.

Entries whose short identifier cannot be resolved to a `jurisdictionId` are logged as
warnings and excluded from the batch output. The `AllowedUser` sort key uses the
resolved integer: `{environment}#{jurisdictionId}#{principal}`.

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