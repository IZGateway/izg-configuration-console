## 1. Implement changeType in the data-layer upsert log

- [x] 1.1 In `src/lib/db/dynamo.ts`, within `upsertAllowedUser`, derive `changeType` from the existing `isUpdate` value (`isUpdate ? 'Update' : 'Create'`).
- [x] 1.2 Update the success `logger.info` call (currently `'Successfully upserted AllowedUser'`) to include `changeType` as a structured metadata field and to use a message that names the operation (created vs updated). Keep the existing `allowedUser: params.Item` metadata.
- [x] 1.3 Confirm the value casing is exactly `'Create'` / `'Update'` to match `AllowedUserAudit`, `DestinationAudit`, and the `/api/allowedusers` route log.

## 2. Cross-layer consistency

- [x] 2.1 Update the `/api/allowedusers` route success log (`src/pages/api/allowedusers/index.ts:297`) message to name the operation (created vs updated), matching the DB-layer message style, so both events read consistently. It already carries the `changeType` field — keep it.
- [x] 2.2 Confirm no change is made to `createAllowedUserAudit` / `createAuditRecord` — the persisted `AllowedUserAudit` DynamoDB record must remain unchanged.

## 3. Tests

- [x] 3.1 Add/extend a Jest unit test for `upsertAllowedUser` asserting the success log includes `changeType: 'Create'` when no existing record is found.
- [x] 3.2 Add/extend a Jest unit test asserting the success log includes `changeType: 'Update'` when an existing record is found.
- [x] 3.3 Assert the persisted audit write (`createAllowedUserAudit`) is unchanged by the new logging (record content/keys identical).

## 4. Verification

- [x] 4.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve any issues.
- [x] 4.2 Run `npm run test` and confirm all tests pass.
- [x] 4.3 Manually confirm in a running/dev environment (or via captured log output) that a create and an update each emit a log event with the correct `changeType` field as it would appear in Elastic (ECS format).

## 5. Resolved decisions

- [x] 5.1 No Elastic saved searches/alerts reference the literal string `"Successfully upserted AllowedUser"` — the message text is free to change.
- [x] 5.2 API-route wording alignment is **in scope** (Option 2): update the route message to name the operation so both log events read consistently (task 2.1).
