---
schema_version: '1.0'
change_request: api-key-data-migration
ticket: IGDD-3258
updated:
  - date: '2026-08-18T12:57:53.436Z'
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
      Add tasks 1.8 and 1.9 for ApiKeyDomain seeding; Extend report to include
      ApiKeyDomain counts and STC exclusions; Extend Phase 2 verification
      checklist for ApiKeyDomain batches; Add ApiKeyDomain batches as step 6 in
      execution order; Add ApiKeyDomain validation check to Phase 5; Replace
      jurisdiction-updates.sh with per-record JSON files for update-item; Update
      Phase 2 commit list to reflect JSON files instead of .sh; Update Phase 3
      execution to use JSON file loop for jurisdiction updates; Update README
      task to mention individual JSON file re-run; Correct _test destId
      verification check in Phase 2; Mark task 1.1 complete; Move generator
      script to change directory, update task 1.1; Mark tasks 1.2, 1.3, 1.3a,
      1.4, 1.5, 1.6, 1.8 complete
created:
  date: '2026-08-14T06:34:51.000Z'
  user: Keith W. Boone
---
# Tasks — API Key Data Migration

## Phase 1: Generator Script (`generate-batches.js`)

- [x] 1.1 Create `generate-batches.js` in the change directory
  - Lives alongside the input CSVs in `openspec/changes/api-key-data-migration/`
  - Run with `node generate-batches.js` — no npm install, no application dependencies
  - Accepts `--env production` or `--env onboarding` flag (default: both)
  - Writes output to `batches/production/` and `batches/onboarding/` under the change directory

- [x] 1.2 Implement jurisdiction ID resolution map
  - Load `jurisdiction-table-current.csv`
  - Build `prefix → jurisdictionId` lookup (integer values)
  - Build `jurisdictionId → name` reverse lookup for reporting
  - Warn and skip any input row whose prefix cannot be resolved

- [x] 1.3 Implement Jurisdiction `update-item` JSON file generation
  - Load `jurisdiction-allowed-use-types.csv`; skip rows flagged `SKIP`
  - For each jurisdiction: generate a JSON file suitable for `aws dynamodb update-item
    --cli-input-json file://...` that sets `allowedUseTypes` (String Set) using a
    `SET` expression
  - For IIS-to-IIS senders (identified from `iis-access-control-pairs.csv`): also
    set `useTypes: PUBLIC_HEALTH` in the same expression
  - Texas: must NOT receive `useTypes` (not an IIS-to-IIS sender)
  - Write one JSON file per jurisdiction to
    `batches/jurisdiction-updates/{jurisdictionId}.json`
    (env-agnostic — same table in both environments)
  - CCUAT (id=64): generate a `PutRequest` entry in a separate batch file
    (new record, not an update)

- [x] 1.4 Generate prefix corrections as a separate batch file
  - The three Jurisdiction records with incorrect prefixes SHALL be written as a
    dedicated batch file `batches/prefix-corrections.json` (applies to
    both environments — same table)
  - Contents: `UpdateItem` for Hawaii (id=14, prefix=hi), Idaho (id=16, prefix=id),
    Nebraska (id=32, prefix=ne)
  - Keeping these separate from `allowedUseTypes` updates makes the correction
    auditable and independently verifiable

- [x] 1.5 Implement Sender `PutRequest` batch generation
  - Load `sender-organizations.csv`
  - For each of the 15 non-jurisdiction sender rows: produce a `PutRequest` item with
    `entityType=Jurisdiction`, `sortKey={sender_id}`, `jurisdictionId={sender_id}`,
    `jurisdictionName={canonical_name}`, `useTypes` as String Set
  - Batch into groups of 25; write to `batches/{env}/senders-batch-NNN.json`
    (same content for both environments — sender records are environment-agnostic)

- [x] 1.6 Implement AllowedUser `PutRequest` batch generation — IIS pairs
  - Load `iis-access-control-pairs.csv`
  - For each row: resolve `receiver_destid` short abbreviation to the string `prefix`
    (= `destinationId`) via `jurisdiction-table-current.csv`
  - Sort key: `{environment}#{destinationId}#{senderCertCommonName}`
  - Look up sender cert(s) from `certificate-inventory.csv`; one AllowedUser per cert
    per destination
  - `receiver_destid` values in the CSV already encode the correct endpoint
    (split-endpoint routing for MD/VA/NY is pre-resolved in the CSV data)
  - Apply production DenyList: exclude 7 certs from production batches
  - Apply environment split from cert `environments` column
  - Set `validUntil` from cert expiry date in inventory
  - Write to `batches/{env}/iis-allowedusers-batch-NNN.json`

- [x] 1.7 Implement AllowedUser `PutRequest` batch generation — Provider pairs
  - Load `provider-access-control-pairs.csv`
  - For each row: resolve `receiver_destid` to string `destinationId` (prefix)
  - Look up sender cert(s) from `certificate-inventory.csv` by `sender_id`
  - `receiver_destid` values in the CSV already encode the correct endpoint
  - Apply same environment split and DenyList logic as 1.5
  - Write to `batches/{env}/provider-allowedusers-batch-NNN.json`

- [x] 1.8 Add `validUntil` column to `certificate-inventory.csv`
  - Pull cert expiry dates from DigiCert for all active certs in the inventory
  - Add `validUntil` column (ISO 8601, e.g. `2026-11-15`) to each row where
    `sender_type` is `jurisdiction` or `sender`
  - Ops/infrastructure certs (`sender_type = ops`) may be left blank
  - Commit updated CSV before running generator

- [x] 1.9 Implement ApiKeyDomain `PutRequest` batch generation
  - Load `certificate-inventory.csv`; skip rows where `sender_type = ops` or
    `environment = exclude`
  - Skip STC Health shared certs (`izgateway.stchealthops.com`,
    `izgateway2.stchealthops.com`, `epicenter.stchome.com`); log to unresolved.txt
  - For `sender_type = jurisdiction`: resolve `jurisdiction_destid` to `jurisdictionId`
    integer via `jurisdiction-table-current.csv` prefix lookup
  - For `sender_type = sender`: resolve `organization` to `senderId` integer via
    `sender-organizations.csv` `salesforce_name_variants` matching
  - Map `environment` column to envId(s): `production`→[1], `onboarding`→[3], `any`→[1,3]
  - Apply production DenyList: exclude 7 deny-listed certs from envId=1 records
  - For each (envId, jurisdictionId/senderId, domain) tuple:
    - `entityType = ApiKeyDomain`
    - `sortKey = {envId}#{senderId}#{domain}`
    - `status = authorized`
    - `validatedAt` = migration run timestamp
    - `authExpiresAt` = `validUntil` from CSV, or migration timestamp + 1 year if blank
    - `requestedBy = migration`
  - Batch into groups of 25; write to
    `batches/{env}/apikey-domains-batch-NNN.json`

- [x] 1.10 Implement execution report output
  - After generating all output, print summary:
    - Count of Jurisdiction `update-item` commands generated
    - Count of CCUAT PutRequest records
    - Count of Sender PutRequest records
    - Count of AllowedUser PutRequest records (production / onboarding separately)
    - Count of ApiKeyDomain PutRequest records (production / onboarding separately)
    - List of any unresolved input rows (could not map to jurisdictionId, cert, or senderId)
    - List of STC Health shared cert exclusions with explanation
  - Write unresolved rows to `unresolved.txt` for ops review

## Phase 2: Pre-generated Batch Files

- [ ] 2.1 Run `node generate-batches.js` and review output
  - Verify counts match estimates in `design.md` (~37 batch files per environment)
  - Review `unresolved.txt` — resolve or document any unresolved entries
  - Spot-check 3–5 batch files against source CSVs for correctness
  - Verify split-endpoint routing in output:
    - IIS sender → Maryland uses `md`; provider sender → Maryland uses `md_c`
    - IIS sender → Virginia uses `va_s`; provider sender → Virginia uses `va`
    - New York `ny_vxu` present in both env batches; `ny_qbp` in onboarding only
    - `ny_test`, `mi_test`, `nc_test` entries present in onboarding batches only;
      absent from production batches
  - Verify ApiKeyDomain batch files present for both environments
  - Confirm no STC Health shared cert domains appear in ApiKeyDomain batches
  - Confirm `any`-environment certs appear in both production and onboarding batches

- [ ] 2.2 Commit pre-generated batch files to branch
  - `batches/production/` — all production batch JSON files
  - `batches/onboarding/` — all onboarding batch JSON files
  - `batches/jurisdiction-updates/` — one JSON file per jurisdiction
  - `batches/prefix-corrections.json` — prefix correction batch

## Phase 3: Startup Migration Script (`run-migration.sh`)

- [ ] 3.1 Write `run-migration.sh` — Event lock acquisition
  - Attempt `PutItem` on `Event#Migration#api-key-data-migration` with
    `ConditionExpression: attribute_not_exists(sortKey)`
  - Write: `entityType=Event`, `name=api-key-data-migration`, `started=<ISO>`,
    `reportedBy=<hostname>`, `status=IN_PROGRESS`
  - If `ConditionalCheckFailedException`: read existing record → branch on status:
    - `COMPLETED` → log "migration already done", exit 0
    - `IN_PROGRESS` → poll every 15 seconds up to 5 minutes; exit 0 on COMPLETED,
      log warning and exit 0 on timeout
    - `FAILED` → delete record, retry from lock acquisition
  - Define `POLL_INTERVAL_SECONDS=15` and `POLL_TIMEOUT_SECONDS=300` as
    tunable constants at top of script

- [ ] 3.2 Write migration execution block in `run-migration.sh`
  - Enforce execution order per hub-safety spec:
    1. Run `batches/prefix-corrections.json` (prefix fixes, env-agnostic)
    2. Run `batches/jurisdiction-updates/*.json` files via
       `for f in ...; do aws dynamodb update-item --cli-input-json file://$f; done`
    3. Run `batches/${ENV}/senders-*.json` batches
    4. Run `batches/${ENV}/iis-allowedusers-*.json` batches
    5. Run `batches/${ENV}/provider-allowedusers-*.json` batches
    6. Run `batches/${ENV}/apikey-domains-*.json` batches
  - Abort entire migration on first failure in any phase; do NOT proceed to AllowedUser
    batches if Jurisdiction or Sender phase fails
  - On any failure: `UpdateItem` sets `status=FAILED` on the Event record, exit 1
  - On full success: `UpdateItem` sets `status=COMPLETED`, `completed=<ISO>`, exit 0

- [ ] 3.3 Write `README.md` — manual fallback execution instructions
  - How to run `run-migration.sh` manually against onboarding or production
  - How to check Event lock record status with `aws dynamodb get-item`
  - How to reset a stuck FAILED or IN_PROGRESS lock for a retry
  - How to re-run individual jurisdiction update files manually
  - Sample verification queries (`get-item` for key records post-migration)

## Phase 4: Dockerfile Integration

- [ ] 4.1 Add `aws-cli` to the `apk add` line in the Dockerfile runner stage
  - Verify `aws` binary is available in the container after build

- [ ] 4.2 Copy migration directory into the runner image
  - Add `COPY --from=builder /app/migrate ./migrate` to Dockerfile runner stage
  - Make `run-migration.sh` and `jurisdiction-updates.sh` executable

- [ ] 4.3 Wire `run-migration.sh` into `run_and_monitor.sh`
  - Insert call after `replace-variable.sh` and before `next start`
  - Pass `ENV` variable (production/onboarding) derived from existing env vars
  - Log migration start/end to `run_and_monitor.log`
  - If `run-migration.sh` exits non-zero, exit the container (do not launch console
    with unmigrated data)

## Phase 5: Local DynamoDB Emulator Validation

Validate the migration against your local DynamoDB emulator using a copy of the
current table at a known state. No shared environments are touched.

- [ ] 5.1 Seed local DynamoDB instance with a copy of the current table
  - Export or seed the `izgw-hub` table into the local emulator
  - Confirm the table exists and is queryable before proceeding

- [ ] 5.2 Run `run-migration.sh` against local emulator
  - Set `AWS_ENDPOINT_URL` (or equivalent) to point to the local emulator
  - Run the script and capture the output

- [ ] 5.3 Verify key records in local emulator post-migration
  - Jurisdiction: confirm at least one record has `allowedUseTypes` set
  - Prefix corrections: `get-item` for Hawaii (id=14, prefix=`hi`), Idaho (id=16,
    prefix=`id`), Nebraska (id=32, prefix=`ne`)
  - Sender: confirm eHealth Exchange (id=100) exists with `useTypes=PUBLIC_HEALTH`
  - AllowedUser: confirm at least one IIS-to-IIS pair record exists
  - ApiKeyDomain: confirm at least one record with `status=authorized`

- [ ] 5.4 Verify Event lock record behavior
  - Confirm `status=COMPLETED`, `completed` timestamp present after first run
  - Run script a second time — confirm COMPLETED fast-path exits cleanly without
    re-running any batch writes

- [ ] 5.5 Calibrate timeout constants from observed local runtime
  - Record elapsed time for full migration run
  - Adjust `POLL_INTERVAL_SECONDS` and `POLL_TIMEOUT_SECONDS` in `run-migration.sh`
    if needed based on observed timing

## Phase 6: AWS Dev Environment Validation

Validate against the shared dev DynamoDB table in AWS. A backup must be taken before
any writes so the table can be fully restored if the migration produces unexpected results.

- [ ] 6.1 Take an on-demand DynamoDB backup of `izgw-hub` before migration
  - Via AWS Console: DynamoDB → Tables → `izgw-hub` → Backups → Create backup
  - Or via CLI:
    ```
    aws dynamodb create-backup \
      --table-name izgw-hub \
      --backup-name izgw-hub-pre-api-key-migration-$(date +%Y%m%d)
    ```
  - Confirm backup status is `AVAILABLE` before proceeding

- [ ] 6.2 Run `run-migration.sh` against AWS dev environment
  - Ensure `AWS_DEFAULT_REGION` and credentials are set for dev account
  - Run script and capture full output including the report block
  - Confirm exit code is 0

- [ ] 6.3 Verify key records in AWS dev post-migration
  - Repeat the verification checks from 5.3 against the live dev table
  - Confirm Event lock record is `COMPLETED`
  - Confirm Hub in dev logs no DynamoDB exceptions or marshalling errors after migration

- [ ] 6.4 Update Jira ticket [IGDD-3258](https://izgateway.atlassian.net/browse/IGDD-3258) with test results
  - Paste migration report output into ticket comment
  - Note any issues found and how they were resolved
  - Confirm backup ARN is recorded in the ticket for rollback reference
