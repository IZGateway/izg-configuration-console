## Context

`POST /api/allowedusers` (Onboarding Senders create/update) flows through the API route
(`src/pages/api/allowedusers/index.ts`) into `Dynamo.upsertAllowedUser`
(`src/lib/db/dynamo.ts`). Two log events are emitted on success:

1. API route (`index.ts:297`) — message `"Successfully upserted allowed user"`, **already**
   includes `changeType` in its metadata object.
2. DB layer (`dynamo.ts:1726`) — message `"Successfully upserted AllowedUser"`, metadata is
   only `{ allowedUser: params.Item }`. **No `changeType`.**

Logs are emitted via winston in Elastic ECS format (`@elastic/ecs-winston-format`, `logger.ts`),
so the `message` string and any metadata keys become indexed/queryable fields in Elastic.
The reporter (IGDD-2853) observed event #2 in Elastic and could not tell Create from Update.

`upsertAllowedUser` already determines the operation type at `dynamo.ts:1700`
(`const isUpdate = !!existing.Item`), but only uses it to preserve `createdBy`/`createdOn`.
The value is never surfaced in the log.

The DynamoDB `AllowedUserAudit` record is a separate, correct path
(`createAllowedUserAudit` → `createAuditRecord`, which writes `changeType`); it is out of scope.

## Goals / Non-Goals

**Goals:**
- Make the DB-layer upsert log event in Elastic state whether the operation was a Create or an
  Update, as a structured field consistent with the existing `changeType` convention
  (`DestinationAudit`, `AllowedUserAudit`, and the sibling API-route log).
- Reuse the already-computed `isUpdate` — no new lookups or DB calls.

**Non-Goals:**
- No change to the DynamoDB `AllowedUserAudit` record (already records `changeType`).
- No change to API request/response contracts.
- No change to authorization, jurisdiction scoping, or encrypted fields.
- No Elastic index/mapping migration (ECS structured fields are additive).

## Decisions

**Decision 1 — Add `changeType` as a structured metadata field and make the message explicit.**
In `upsertAllowedUser`, derive `changeType = isUpdate ? 'Update' : 'Create'` and log it both as a
metadata field and via an operation-specific message, e.g.
`logger.info(\`Successfully ${isUpdate ? 'updated' : 'created'} AllowedUser\`, { changeType, allowedUser: params.Item })`.
- *Rationale:* The metadata field is what Elastic filters/aggregates on; the message keeps human
  readability. Mirrors the `changeType` already present on the API-route log and audit records.
- *Alternatives considered:* (a) Encode the type in the message string only — rejected, not cleanly
  filterable in Elastic and inconsistent with the field-based convention. (b) Change only the API-route
  log — rejected, the reporter keyed off the DB-layer event and that event remains the gap.

**Decision 2 — Keep the change in the DB layer where `isUpdate` is authoritative.**
The DB layer's `GetCommand` is the source of truth for existence at write time. Logging `changeType`
there avoids relying on the API route's separate `fetchAllowedUser` result, which is computed earlier
and could in principle diverge.
- *Alternatives considered:* Pass `changeType` down from the API route — rejected, redundant since the
  DB layer already knows, and it would thread state the layer already has.

**Decision 3 — Align the API-route log wording (in scope, low cost).**
Optionally normalize the API-route message so both events are easy to correlate. The route already
carries `changeType`, so this is wording-only and may be deferred without losing the core fix.

## Risks / Trade-offs

- [Existing Elastic dashboards/alerts match the literal string `"Successfully upserted AllowedUser"`]
  → Changing the message could break saved searches. Mitigation: confirm with whoever owns the
  Elastic queries; if message stability matters, keep the message text unchanged and add only the
  `changeType` metadata field (the field alone satisfies the auditing requirement).
- [Inconsistent casing/values for `changeType` across the codebase] → Use exactly `'Create'` /
  `'Update'` to match `AllowedUserAudit` and the API-route log; do not introduce new casing.

## Migration Plan

No data or schema migration. Deploy is a standard code release; the new `changeType` field appears on
new log events going forward. Rollback is a straight revert with no residual state.

## Open Questions

- Do existing Elastic saved searches / alerts depend on the exact current message string? If yes,
  prefer the field-only variant (Decision 1, message unchanged) per the risk mitigation above.
- Is the API-route wording alignment (Decision 3) wanted in this change, or deferred?
