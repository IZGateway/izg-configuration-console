## ADDED Requirements

### Requirement: AllowedUser upsert log identifies the change type

When an AllowedUser (Onboarding Senders) record is created or updated via the data layer
(`Dynamo.upsertAllowedUser`), the success log event SHALL include a structured `changeType`
field whose value is exactly `"Create"` (when no record previously existed for the
environment + destinationId + principal key) or `"Update"` (when a record already existed).
The `changeType` value SHALL be derived from the existence check the upsert already performs,
and SHALL use the same casing as other Config Console audit records (`AllowedUserAudit`,
`DestinationAudit`) and the `/api/allowedusers` route log.

Because logs are shipped to Elastic in ECS format, the `changeType` field MUST be a metadata
field on the log event (not encoded only within the human-readable message), so that it is
filterable and aggregatable in Elastic.

#### Scenario: Creating a new sender logs changeType "Create"
- **WHEN** an upsert is performed for an environment + destinationId + principal that does not yet exist
- **THEN** the success log event includes a `changeType` field equal to `"Create"`
- **AND** the field is present as queryable metadata on the event shipped to Elastic

#### Scenario: Updating an existing sender logs changeType "Update"
- **WHEN** an upsert is performed for an environment + destinationId + principal that already exists
- **THEN** the success log event includes a `changeType` field equal to `"Update"`
- **AND** the field is present as queryable metadata on the event shipped to Elastic

#### Scenario: Log message names the operation performed
- **WHEN** an upsert succeeds
- **THEN** the log message identifies whether the record was created or updated (rather than the
  ambiguous "Successfully upserted AllowedUser")

### Requirement: AllowedUser audit log change type is consistent across layers

The change type reported for an AllowedUser create/update SHALL be consistent between the data-layer
upsert log event and the `/api/allowedusers` route log event for the same operation, so that an
operator correlating the two events in Elastic sees the same `"Create"`/`"Update"` value.

#### Scenario: Route log and data-layer log agree on change type
- **WHEN** a single AllowedUser upsert request is processed end to end
- **THEN** the `changeType` reported by the `/api/allowedusers` route log and by the
  `Dynamo.upsertAllowedUser` log event are identical for that operation

### Requirement: Persisted audit record is unaffected

This change SHALL NOT alter the DynamoDB `AllowedUserAudit` record. The persisted audit item already
records `changeType` via the audit-creation path, and its content, keys, and structure SHALL remain
unchanged.

#### Scenario: AllowedUserAudit record content unchanged
- **WHEN** an AllowedUser create or update is performed after this change
- **THEN** the persisted `AllowedUserAudit` DynamoDB item is written exactly as before, with the same
  `changeType`, keys, and field values it produced prior to this change
