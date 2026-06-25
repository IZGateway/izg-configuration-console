## Why

Operations staff need an audit trail: when reviewing logs, they must be able to tell **which authenticated user initiated the action** that produced each log message. Today the Configuration Console attaches user identity to only a handful of log lines (the `API Request` middleware line and the Elasticsearch query handler), and even those disagree on shape — one logs `user` as a display-name string, the other as an email. The vast majority of log events (page navigations, database warnings, connection tests, errors) carry no identity at all, so an action cannot be reliably traced back to a user or login session. (IGDD-2223)

## What Changes

- Add a Winston log format that automatically injects a standardized `user` identity block into **every** Node-runtime log event when a request context is present — no per-call-site changes required. This is the Node analog of the Hub's SLF4J MDC + `LogstashEncoder` approach.
- Standardize the identity block shape across all logs:
  ```json
  "user": { "name": "...", "userId": "...", "email": "...", "sessionId": "..." }
  ```
- Introduce a **`sessionId`**, captured once at sign-in and persisted on the next-auth token, that is stable for the life of a login session, is not a secret, and cannot be replayed. Also capture `auth_time` for time-based correlation. **Source is an open decision pending reporter confirmation:** the Okta `sid` claim (requires an Okta SLO config change) for direct Okta-log correlation, or a CC-owned opaque session id for an indirect (`sub` + `auth_time` + IP) correlation that ships without an external dependency. The token `jti` is explicitly ruled out — it cannot be pivoted on in the Okta System Log.
- Extend the request `Context` (`AsyncLocalStorage`) and the next-auth token with `userId`, `email`, and `sessionId` so identity is available to both the API request pipeline and the Edge middleware without re-decoding the ID token per request.
- Enrich the Edge-runtime `Route Request` log (page navigations in `src/middleware.ts`) with the same identity, sourced from `req.nextauth.token`, so user-initiated page access is also part of the audit trail.
- Normalize the existing manual identity logging (`API Request`, Elasticsearch handler) onto the standardized block so there is a single, consistent representation.

## Capabilities

### New Capabilities
- `audit-log-user-identity`: Every log message generated during an authenticated user interaction carries a standardized `user` identity block (name, userId, email, sessionId), enabling logs to be traced back to the initiating user and login session. Covers how identity is sourced (Okta token claims), how it is injected (request-context-aware Winston format), and the behavior for unauthenticated / no-context events.

### Modified Capabilities
<!-- None. The existing `allowed-user-audit-logging` spec covers DynamoDB entity-change audit records — a separate concern from enriching log-message output, so its requirements are unchanged. -->

## Impact

- **Code:**
  - `logger.ts` — new request-context-aware format that injects the `user` block.
  - `src/lib/Context.ts` — extend `Context` with `userId`, `email`, `sessionId`.
  - `src/pages/api/api-middleware-helper.ts` — populate the new context fields; normalize the `API Request` log line.
  - `src/pages/api/auth/[...nextauth].ts` — capture the chosen `sessionId` value (Okta `sid` or a CC-generated id) and `auth_time` in the `jwt` callback and persist on the next-auth token.
  - `src/middleware.ts` — enrich the Edge `Route Request` log from `req.nextauth.token`.
  - `src/pages/api/elasticsearch/query.ts` — align with the standardized identity block.
- **Auth / security:** Reads an additional Okta ID-token claim (`auth_time`), plus either `sid` or a generated id depending on the chosen `sessionId` source; no change to authentication, authorization, jurisdiction scoping, or encrypted fields. `sessionId` is deliberately a non-replayable identifier — no raw JWT, access token, ID token, or session cookie value is ever logged.
- **Scope:** Configuration Console only. The Hub (`izgw-core`/`izgw-hub`) implements the equivalent via its own CR; Transformation Console is tracked separately.
- **Logging pipeline / observability:** New top-level `user.*` fields appear on log documents shipped to Elasticsearch; Kibana mappings auto-discover them on first event. No log-config (nginx/filebeat) changes required.
- **Open decision (blocks the sessionId task only):** whether direct Okta-System-Log session correlation is required (→ Okta `sid`, needs an Okta SLO config change) or indirect correlation via `sub` + `auth_time` + IP is acceptable (→ CC-owned session id). To confirm with the reporter (Keith) / Okta administrator.
