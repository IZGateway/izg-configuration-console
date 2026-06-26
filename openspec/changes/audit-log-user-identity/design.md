## Context

The Configuration Console logs through a single Winston instance (`logger.ts`) using `@elastic/ecs-winston-format`, with `console.*` monkey-patched to route through that logger. Shipped to Elasticsearch via the container's file logging in production.

Today, user identity is attached to only two places, inconsistently:
- `logApiRequest` in `src/pages/api/api-middleware-helper.ts` logs `user` as a display-name string plus `sub`.
- `src/pages/api/elasticsearch/query.ts` logs `user` as an email string.

Every other event — the Edge `Route Request` line, the many `No encryption key configured` warnings, connection-test logs, unhandled errors — carries no identity. There is no way to reliably trace a log event back to the user who caused it.

Two pieces of infrastructure already exist that make this tractable:
- **`asyncRequestContext`** (`src/lib/Context.ts`), an `AsyncLocalStorage<Context>` populated per API request inside `withMiddleware` with `{ user, ipAddress, sub, session }`. This is the Node-runtime analog of the Hub's SLF4J MDC.
- The **next-auth JWT** already persists the Okta ID token (`token.id_token` / `token.idToken`, set in the `jwt` callback of `src/pages/api/auth/[...nextauth].ts`).

Empirical finding (verified locally by decoding a live Okta ID token): the token carries `sub`, `email`, `name`, `preferred_username`, `groups`, `jti`, `auth_time`, `idp`, `amr` — but **no `sid` claim**. So a literal Okta session id is unavailable; `jti` is the closest session-scoped, non-replayable identifier.

Constraint: next-auth is pinned at v4 (Pages Router). The Edge middleware (`src/middleware.ts`) runs in the Edge runtime, where neither Winston nor Node's `AsyncLocalStorage` is available.

## Goals / Non-Goals

**Goals:**
- Attach a standardized `user: { name, userId, email, sessionId }` block to every Node-runtime log event produced during an authenticated user interaction, automatically (no per-call-site changes).
- Provide a `sessionId` that is stable within a login session, non-replayable, and not a secret.
- Enrich the Edge `Route Request` log with the same identity from the decoded next-auth token.
- Normalize the two existing ad hoc identity logs onto the standard block.

**Non-Goals:**
- Hub (`izgw-core`/`izgw-hub`) and Transformation Console logging — separate CRs.
- Persisting audit events to a database (the existing `allowed-user-audit-logging` / `auditHelper` DynamoDB records are a distinct concern, unchanged here).
- Changing what is logged beyond adding identity context; no new log statements, no log-level changes.
- Logging the credential under test in a connection test (that username is the `testResult` value, addressed by IGDD-2221). This change attaches the *operator's* identity, which it does automatically because connection tests run inside `withMiddleware`.

## Decisions

### D1 — Inject identity via a context-aware Winston format (not per-call-site, not child loggers)

Add a Winston format to the `format.combine(...)` chain in `logger.ts` (alongside the existing `versionFormat`) that calls `asyncRequestContext.getStore()` and, when a context is present, sets `info.user = { name, userId, email, sessionId }`. Because `console.*` is already monkey-patched to the logger, this covers both `logger.*` calls and legacy `console.*` calls with zero changes at the hundreds of call sites.

- **Alternative — thread `user` through function arguments:** rejected; invasive, touches every call site, and violates the existing layering convention (downstream code reads context from `AsyncLocalStorage`, not args).
- **Alternative — per-request child logger (`logger.child({ user })`):** rejected; child loggers must be created and passed down per request, which re-introduces the threading problem and doesn't capture `console.*`.

Place the new format **before** `ecsFormat()` in the combine chain so the injected fields are present when ECS serialization runs. The existing `versionFormat` already proves custom fields (`ConfigConsoleVersion`) survive `ecsFormat` passthrough.

### D2 — `sessionId` = CC-generated opaque id, with indirect Okta correlation (`jti` ruled out, `sid` deferred)

**Chosen approach (indirect correlation).** Generate an opaque session id (`crypto.randomUUID()`) in the `jwt` callback's `if (account)` block and persist it as `token.sessionId`. It is fully in our control, stable for the lifetime of a login session, non-replayable, not a secret, and future-proof against token refresh. It honestly represents "one CC login session" rather than masquerading as an Okta-meaningful value.

Because a CC-generated id does not appear in Okta's logs, correlation back to Okta is **indirect** — done by joining on the user and login event. To make that join possible, every user-initiated log event also carries:
- `userId` (= Okta `sub`) — already in the `user` block;
- `auth_time` — the Okta login timestamp, captured from the ID token in the `jwt` callback and persisted as `token.authTime`;
- **source IP** — already available in `Context.ipAddress`; ensured present on user-initiated log events.

`sessionId` and `authTime` are **stored on the next-auth token** so they are available cheaply in both runtimes (via `getToken()` in `withMiddleware` and `req.nextauth.token` in the Edge middleware) without re-decoding the ID token per request.

> **Pending team confirmation.** This approach assumes indirect correlation (user + `auth_time` + IP) is acceptable. The team is being asked whether a *direct* Okta-System-Log pivot is required. If it is, see the deferred `sid` option below — the field and all plumbing stay identical; only the source value changes, so adopting it later is a drop-in swap, not a redesign.

**Ruled out — Okta ID token `jti`.** Although `jti` is opaque, present, non-replayable, and (given CC requests no `offline_access` and never refreshes) incidentally stable for our 30-minute session, it fails the requirement the field exists for: **the Okta System Log cannot be pivoted on `jti`.** Okta correlates on `authenticationContext.externalSessionId` / `rootSessionId`, `transaction.id`, and event `uuid` — none of which is `jti`. It also semantically identifies the *token*, not the session, so it would silently fragment if refresh were ever enabled.

**Deferred — Okta `sid` claim (the only direct-correlation option).** `sid` is stable across refresh and directly correlatable to the Okta System Log session, but it is **absent from this tenant's tokens today** (verified: `sid: null`); emitting it requires an Okta-side configuration change (enabling logout / SLO). Deferred unless the team confirms a hard direct-pivot requirement. If adopted, `token.sessionId` simply sources from `sid` instead of a generated UUID.

- **Alternative — `sub` (what the Hub design chose):** identifies the *user*, not the *login session*. We log `sub` as `userId` regardless, so it is present either way — but it is not a session identifier.

### D3 — Extend `Context` and populate it in `withMiddleware`

Add `userId?`, `email?`, `sessionId?`, and `authTime?` to the `Context` interface (`ipAddress` already exists). In `withMiddleware`, where `getServerSession` and `getToken` are already called, populate the new fields from `session.user` and the decoded token (`jwtToken.sessionId`, `jwtToken.authTime`). `name` maps from the existing `user` value, `userId` from `sub`, `email` from `session.user.email`.

### D4 — Edge middleware enrichment from `req.nextauth.token`

In `src/middleware.ts`, build the same `user` block from `req.nextauth.token` (`sub` → `userId`, `email`, `name`, `sessionId`) and include it in the `Route Request` `console.info` call. When the token is absent (unauthenticated / pre-binding), omit the block rather than emit empty values.

- Trade-off: Edge logs are plain `console.info`, not processed by the Winston/ECS pipeline. In practice the Edge runtime renders the whole argument object (path, method, `user`, …) into a single formatted string, so on `Route Request` lines the identity ends up **inside the `message` string rather than as structured top-level `user.*` fields**. The identity is present and human-readable, but is not independently queryable/aggregatable in Elastic for those lines (see Risks).

### D5 — Field shape aligns with ECS where possible

Emit identity as a nested `user` object, matching the reporter's requested shape. `user.name`, `user.id`, `user.email` align with Elastic Common Schema's standard `user.*` fields (so map `userId → user.id`); `sessionId` is carried as `user.sessionId` (a custom sub-field). Confirm during implementation that `ecsFormat` passes the nested object through unchanged (as it does for `ConfigConsoleVersion`); if `ecsFormat` reserves/transforms `user`, fall back to setting ECS-native `user.*` keys directly.

## Risks / Trade-offs

- **`ecsFormat` may special-case the `user` field** → Verify with a unit test asserting the serialized output contains the expected `user` block; if it transforms it, set ECS-native `user.id/name/email` keys and carry `sessionId` under a custom key.
- **No request context on some paths** (`getServerSideProps`, startup, background tasks) → By design the `user` block is simply omitted; logging must never throw when the store is empty. Covered by spec scenarios.
- **Edge vs. Node log shape divergence** (Edge `Route Request` is not processed by the Winston/ECS pipeline) → Confirmed at runtime: the Edge runtime folds the argument object into the `message` string, so identity on `Route Request` lines is **text within `message`, not structured `user.*` fields** — present and readable, but not filterable/aggregatable in Kibana for those lines (Node API logs are fully structured). Accepted for this change. Making Route Request structured (e.g. emit a pre-serialized JSON line from middleware, or relocate that logging to the Node layer) is a possible follow-up, out of scope here.
- **PII in logs** (email/name are personal data) → This is the intended audit behavior; the data already partially appears in logs today. No raw tokens/cookies are logged — `sessionId` is a CC-generated opaque id, non-replayable and not a secret. Consistent with the public-repo policy since logs are runtime artifacts, not committed.
- **Indirect Okta correlation** → A CC-generated `sessionId` does not appear in Okta logs, so correlation is via `userId` (`sub`) + `auth_time` + source IP rather than a direct session pivot. Mitigation: always emit those three fields on user-initiated events. The `sid` option (deferred) would give a direct pivot at the cost of an Okta config change. See D2 and Open Questions.
- **Slight per-log overhead** from `asyncRequestContext.getStore()` on every event → negligible (a `Map` lookup); no measurable impact expected.

## Migration Plan

Purely additive and backward-compatible — no breaking changes.
1. Add `sessionId`/`authTime` extraction in the `jwt` callback (takes effect on next sign-in; existing sessions simply lack `sessionId` until re-login).
2. Extend `Context` and populate in `withMiddleware`.
3. Add the context-aware Winston format.
4. Enrich Edge `Route Request`.
5. Normalize the `API Request` and Elasticsearch handler logs.

Deploy as a normal release. New `user.*` fields auto-discover in the Kibana/Logstash index on first event; no mapping template change. **Rollback:** revert the change; logs return to prior behavior with no data-migration needed.

## Okta Correlation Recipe (indirect)

Because `sessionId` is CC-generated, it does not appear in Okta's logs. To pivot from a CC log line to the originating Okta session, an investigator uses the three correlation fields we emit (`userId`, `auth_time`, source IP) against the Okta System Log (Admin Console → Reports → System Log, or the `/api/v1/logs` API).

**Field mapping (CC log → Okta System Log):**

| CC log field | Okta System Log field | Role in the join |
|---|---|---|
| `userId` (= Okta `sub`, e.g. `00u…`) | `actor.id` (or email → `actor.alternateId`) | primary key |
| `auth_time` (Unix seconds) | bounds `since` / `until`; anchors the `user.session.start` event | time anchor |
| source IP | `client.ipAddress` | corroboration only (see caveat) |

**Step 1 — locate the sign-in event** using `sub` + an `auth_time` window:

```
GET /api/v1/logs
  ?since=<auth_time − a few seconds, ISO8601>
  &until=<auth_time + a few seconds, ISO8601>
  &filter=actor.id eq "00ugmlnknoC9fc5Ul1d7" and eventType eq "user.session.start"
```

(optionally `and client.ipAddress eq "<ip>"`)

**Step 2 — read `authenticationContext.externalSessionId` from that event, then expand to the full session:**

```
GET /api/v1/logs
  ?filter=authenticationContext.externalSessionId eq "<externalSessionId from step 1>"
```

So: `sub` + `auth_time` (+ IP) → find the sign-in → recover Okta's `externalSessionId` → pull all session activity.

**Caveats:**
- `auth_time` is Unix *seconds*; Okta timestamps are millisecond ISO8601 — bracket a small window, do not match exactly. It still lands on the `user.session.start` event.
- The IP CC logs is what the app sees (`x-forwarded-for` behind nginx/ALB); Okta logs the IP *it* saw at login. Usually the same public IP, but NAT/proxy/VPN can diverge — treat IP as corroboration, not a hard key.
- `authenticationContext.*`, `transaction.id`, and `uuid` are **Okta-side System Log fields only** — they are not claims in the id_token and are never received by CC.
- The direct alternative is the Okta `sid` claim (deferred, see D2): it equals `externalSessionId`, collapsing this two-step join into a single filter — at the cost of enabling Front-Channel SLO in Okta.

## Open Questions

- **Is indirect correlation acceptable? (confirm with team).** The chosen design uses a CC-generated `sessionId` correlated to Okta via `sub` + `auth_time` + IP. If the team instead requires a *direct* Okta-System-Log pivot, switch `sessionId` to the Okta `sid` claim — which needs an Okta config change (logout/SLO) confirmed with the Okta administrator. This is a drop-in source swap, not a redesign (see D2). `jti` is ruled out.
- Should any non-request-scoped logs (e.g., scheduled `izghubrefresh`) attempt to attribute a system identity, or remain identity-less? Current design leaves them identity-less.
