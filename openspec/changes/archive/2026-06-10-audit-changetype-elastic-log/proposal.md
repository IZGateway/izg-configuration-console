## Why

When an Onboarding Senders (AllowedUser) record is created or updated, the database-layer log event shipped to Elastic — `"Successfully upserted AllowedUser"` (`src/lib/db/dynamo.ts`) — carries no indication of whether the operation was a **Create** or an **Update**. Operators inspecting Elastic cannot distinguish the two, which makes auditing access-control activity unreliable (the original concern raised by IGDD-2520). Every other Config Console audit log already records this via a `changeType` field ("Create" / "Update"), so the AllowedUser path is inconsistent with the established convention.

## What Changes

- The `upsertAllowedUser` log event in `src/lib/db/dynamo.ts` will emit a structured `changeType` field (`"Create"` or `"Update"`) and a message that names the operation, driven by the `isUpdate` value that function already computes. This makes the create-vs-update distinction both human-readable and filterable in Elastic.
- (Optional, in scope for consistency) Align the API-route log wording in `src/pages/api/allowedusers/index.ts` so both log events agree; that route already includes `changeType` in its metadata.
- **No change to the DynamoDB audit record.** The persisted `AllowedUserAudit` item already stores `changeType` correctly via `createAllowedUserAudit` → `createAuditRecord`. This change is purely about the log signal that reaches Elastic.

## Capabilities

### New Capabilities
- `allowed-user-audit-logging`: Defines the observable audit-logging behavior for AllowedUser (Onboarding Senders) create/update/delete operations — specifically that each operation emits a log event identifying its change type as a structured, queryable field consistent with other Config Console records.

### Modified Capabilities
<!-- None. No existing spec covers AllowedUser audit logging. -->

## Impact

- **Code:** `src/lib/db/dynamo.ts` (`upsertAllowedUser` log statement); optionally `src/pages/api/allowedusers/index.ts` (log wording alignment).
- **Observability:** Elastic log events for AllowedUser upserts gain a `changeType` field — improves access-control auditing; no schema migration or index change required (ECS structured fields are additive).
- **No impact** to authentication, jurisdiction scoping, encrypted fields, the DynamoDB audit record, API request/response contracts, or the data written to DynamoDB.
- **Security-sensitive context:** This supports access-control auditability (traceable to the IGDD-2520 spike) but does not alter authorization logic itself.
