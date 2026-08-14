---
schema_version: '1.0'
change_request: api-key-data-migration
ticket: IGDD-3258
---
# Tasks — API Key Data Migration

## Phase 1: Generator Script (`migrate/generate-batches.js`)

- [ ] 1.1 Create `migrate/` directory and `generate-batches.js` scaffold
  - Entry point reads all input CSVs from `../openspec/changes/api-key-data-migration/`
  - Accepts `--env production` or `--env onboarding` flag (default: both)
  - Writes output to `migrate/batches/production/` and `migrate/batches/onboarding/`

- [ ] 1.2 Implement jurisdiction ID resolution map
  - Load `jurisdiction-table-current.csv`
  - Build `prefix → jurisdictionId` lookup (integer values)
  - Build `jurisdictionId → name` reverse lookup for reporting
  - Warn and skip any input row whose prefix cannot be resolved

- [ ] 1.3 Implement Jurisdiction `UpdateItem` command generation
  - Load `jurisdiction-allowed-use-types.csv`; skip rows flagged `SKIP`
  - For each jurisdiction with `allowedUseTypes`: generate `aws dynamodb update-item`
    command that sets `allowedUseTypes` (String Set) on the existing record
  - For jurisdictions also present as IIS senders (see 1.5): also set `useTypes: PUBLIC_HEALTH`
    in the same `UpdateItem` expression
  - Include prefix corrections: `hi` (id=14), `id` (id=16), `ne` (id=32) in the SET expression
  - Write commands to `migrate/jurisdiction-updates.sh` (one command per line)
  - CCUAT (id=64): generate a `PutItem` batch entry (new record, not update)

- [ ] 1.4 Implement Sender `PutItem` batch generation
  - Load `sender-organizations.csv`
  - For each of the 15 non-jurisdiction sender rows: produce a `PutRequest` item with
    `entityType=Jurisdiction`, `sortKey={sender_id}`, `jurisdictionId={sender_id}`,
    `jurisdictionName={canonical_name}`, `useTypes` as String Set
  - Batch into groups of 25; write to `migrate/batches/production/senders-batch-NNN.json`
    (same content for both environments — sender records are environment-agnostic)

- [ ] 1.5 Identify IIS-to-IIS sender jurisdictions
  - Load `iis-access-control-pairs.csv`; collect unique `sender_id` values (left-hand side)
  - These are the IIS jurisdictions that need `useTypes: PUBLIC_HEALTH` added
    (handled in task 1.3 — this task just produces the set for 1.3 to consume)
  - Exclude `dex` from this set (CDC is a destination, not an IIS sender jurisdiction)
  - Texas: must NOT be included even though Texas appears as a sender in the CSV
    (Texas→DEX only; not an IIS-to-IIS sender)

- [ ] 1.6 Implement AllowedUser `PutItem` batch generation — IIS pairs
  - Load `iis-access-control-pairs.csv`
  - For each row: resolve `sender_id` and `receiver_destid` to integer `jurisdictionId`
    via the ID map from 1.2
  - Sort key: `{environment}#{receiverJurisdictionId}#{senderCertCommonName}`
  - Cert common name: look up sender jurisdiction in `certificate-inventory.csv` by
    `jurisdiction` or `sender_id` column; a sender may have multiple certs (one row
    per cert, one AllowedUser per cert per destination)
  - Apply production DenyList: exclude 7 certs from production batches
  - Apply environment split: cert `environments` column drives which batch set receives the record
  - Set `validUntil` from cert expiry date in inventory
  - Write to `migrate/batches/{env}/iis-allowedusers-batch-NNN.json`

- [ ] 1.7 Implement AllowedUser `PutItem` batch generation — Provider pairs
  - Load `provider-access-control-pairs.csv`
  - For each row: resolve `receiver_destid` to integer `jurisdictionId`
  - Look up sender cert(s) from `certificate-inventory.csv` by `sender_id`
  - Apply same environment split and DenyList logic as 1.6
  - Write to `migrate/batches/{env}/provider-allowedusers-batch-NNN.json`

- [ ] 1.8 Implement execution report output
  - After generating all output, print summary:
    - Count of Jurisdiction UpdateItem commands generated
    - Count of CCUAT PutItem records
    - Count of Sender PutItem records
    - Count of AllowedUser PutItem records (production / onboarding)
    - List of any unresolved input rows (could not map to jurisdictionId or cert)
  - Write unresolved rows to `migrate/unresolved.txt` for ops review

## Phase 2: Pre-generated Batch Files

- [ ] 2.1 Run `node migrate/generate-batches.js` and review output
  - Verify counts match estimates in `design.md` (~37 batch files per environment)
  - Review `migrate/unresolved.txt` — resolve or document any unresolved entries
  - Spot-check 3–5 batch files against source CSVs for correctness

- [ ] 2.2 Commit pre-generated batch files to branch
  - `migrate/batches/production/` — all production batch JSON files
  - `migrate/batches/onboarding/` — all onboarding batch JSON files
  - `migrate/jurisdiction-updates.sh` — UpdateItem commands for existing jurisdictions
  - `migrate/unresolved.txt` — any unresolved rows for ops awareness

## Phase 3: Execution README

- [ ] 3.1 Write `migrate/README.md` with exact execution instructions
  - Prerequisites: AWS CLI installed, correct AWS profile active per environment
  - Required IAM permissions: `dynamodb:BatchWriteItem`, `dynamodb:PutItem`,
    `dynamodb:UpdateItem` on the `izgw-hub` table
  - Step 1: Run jurisdiction `UpdateItem` commands (from `jurisdiction-updates.sh`)
  - Step 2: Run sender and AllowedUser batch files with loop command
  - Onboarding execution commands (cmd.exe loop)
  - Production execution commands (cmd.exe loop)
  - Verification queries: sample `aws dynamodb get-item` calls to confirm key records
  - Rollback note: migration adds new fields/records only; no rollback script needed
    for the `allowedUseTypes`/`useTypes` additions; new Sender and AllowedUser records
    can be deleted if needed using their sort keys

## Phase 4: Validation

- [ ] 4.1 Run migration against onboarding environment; verify report output
  - Confirm at least one Jurisdiction record has `allowedUseTypes` set (e.g., Arizona)
  - Confirm VHA Sender record exists with `sender_id=114`, `useTypes=PROVIDER`
  - Confirm at least one AllowedUser record exists for a known IIS-to-IIS pair

- [ ] 4.2 Verify prefix corrections applied in onboarding
  - `aws dynamodb get-item` for Hawaii (id=14) → `prefix` should be `hi`
  - `aws dynamodb get-item` for Idaho (id=16) → `prefix` should be `id`
  - `aws dynamodb get-item` for Nebraska (id=32) → `prefix` should be `ne`

- [ ] 4.3 Confirm STChealth limitation documented and no JWT domains generated
  - Verify no `ApiKeyDomain` records are created by this migration (out of scope)
  - Confirm the 17 STC-managed jurisdictions each have an `AllowedUser` record using
    the shared STC certificate common name

- [ ] 4.4 Update Jira ticket IGDD-3258 with test results and migration report output