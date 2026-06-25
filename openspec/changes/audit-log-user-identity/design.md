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

### D2 — `sessionId` source: OPEN (pending reporter confirmation); `jti` ruled out

Whatever the source, `sessionId` is **stored on the next-auth token** at sign-in (so it is available cheaply in both runtimes — via `getToken()` in `withMiddleware` and `req.nextauth.token` in the Edge middleware) and `auth_time` is captured alongside it for time-based correlation. The remaining decision is *which value* `sessionId` holds.

**Ruled out — Okta ID token `jti`.** Although `jti` is opaque, present, non-replayable, and (given CC requests no `offline_access` and never refreshes) incidentally stable for our 30-minute session, it fails the requirement the field exists for: **the Okta System Log cannot be pivoted on `jti`.** Okta correlates on `authenticationContext.externalSessionId` / `rootSessionId`, `transaction.id`, and event `uuid` — none of which is `jti`. It also semantically identifies the *token*, not the session, so it would silently fragment if refresh were ever enabled. It looks authoritative in logs while being useless for the investigation it is meant to support.

**Candidate A — Okta `sid` claim (the correct field).** Stable across refresh and directly correlatable to the Okta System Log session. **Absent from this tenant's tokens today** (verified: `sid: null`); emitting it requires an Okta-side configuration change (enabling logout / SLO), confirmed with the Okta administrator. Adds an external dependency before implementation.

**Candidate B — CC-owned opaque session id (pragmatic).** Generate an opaque id (e.g. `crypto.randomUUID()`) in the `jwt` callback's `if (account)` block, persist as `token.sessionId`. Fully in our control, stable for the login session, non-replayable, and future-proof against refresh. Correlates to Okta indirectly via `userId` (`sub`) + `auth_time` + source IP — it honestly represents "one CC login session" rather than masquerading as an Okta-meaningful value.

**Gating question for the reporter (Keith):** is *direct* Okta-System-Log correlation a hard requirement (→ Candidate A, with the Okta config dependency) or "ideal but indirect-correlation-acceptable" (→ Candidate B, ships now)? Tracked in Open Questions; blocks task 1.1 only.

- **Alternative — `sub` (what the Hub design chose):** identifies the *user*, not the *login session*. We log `sub` as `userId` regardless, so it is present either way — but it is not a session identifier.

### D3 — Extend `Context` and populate it in `withMiddleware`

Add `userId?`, `email?`, and `sessionId?` to the `Context` interface. In `withMiddleware`, where `getServerSession` and `getToken` are already called, populate the new fields from `session.user` and the decoded token (`jwtToken.sessionId`). `name` maps from the existing `user` value, `userId` from `sub`, `email` from `session.user.email`.

### D4 — Edge middleware enrichment from `req.nextauth.token`

In `src/middleware.ts`, build the same `user` block from `req.nextauth.token` (`sub` → `userId`, `email`, `name`, `sessionId`) and include it in the `Route Request` `console.info` call. When the token is absent (unauthenticated / pre-binding), omit the block rather than emit empty values.

- Trade-off: Edge logs are plain `console.info` (not ECS-formatted by Winston), so their JSON shape is hand-built to match the nested `user` object. Documented as a known shape difference (see Risks).

### D5 — Field shape aligns with ECS where possible

Emit identity as a nested `user` object, matching the reporter's requested shape. `user.name`, `user.id`, `user.email` align with Elastic Common Schema's standard `user.*` fields (so map `userId → user.id`); `sessionId` is carried as `user.sessionId` (a custom sub-field). Confirm during implementation that `ecsFormat` passes the nested object through unchanged (as it does for `ConfigConsoleVersion`); if `ecsFormat` reserves/transforms `user`, fall back to setting ECS-native `user.*` keys directly.

## Risks / Trade-offs

- **`ecsFormat` may special-case the `user` field** → Verify with a unit test asserting the serialized output contains the expected `user` block; if it transforms it, set ECS-native `user.id/name/email` keys and carry `sessionId` under a custom key.
- **No request context on some paths** (`getServerSideProps`, startup, background tasks) → By design the `user` block is simply omitted; logging must never throw when the store is empty. Covered by spec scenarios.
- **Edge vs. Node log shape divergence** (Edge `Route Request` is not ECS-serialized) → Hand-build the nested `user` object in middleware to match; accept that other ECS envelope fields differ on those lines (already true today).
- **PII in logs** (email/name are personal data) → This is the intended audit behavior; the data already partially appears in logs today. No raw tokens/cookies are logged (only `jti`, which is a non-replayable identifier). Consistent with the public-repo policy since logs are runtime artifacts, not committed.
- **Indirect Okta correlation (Candidate B)** → If a CC-owned session id is chosen, correlation to the Okta System Log is via `userId` (`sub`) + `auth_time` + source IP rather than a direct session pivot. Candidate A (`sid`) avoids this but adds an Okta config dependency. See D2 and Open Questions.
- **Slight per-log overhead** from `asyncRequestContext.getStore()` on every event → negligible (a `Map` lookup); no measurable impact expected.

## Migration Plan

Purely additive and backward-compatible — no breaking changes.
1. Add `sessionId`/`authTime` extraction in the `jwt` callback (takes effect on next sign-in; existing sessions simply lack `sessionId` until re-login).
2. Extend `Context` and populate in `withMiddleware`.
3. Add the context-aware Winston format.
4. Enrich Edge `Route Request`.
5. Normalize the `API Request` and Elasticsearch handler logs.

Deploy as a normal release. New `user.*` fields auto-discover in the Kibana/Logstash index on first event; no mapping template change. **Rollback:** revert the change; logs return to prior behavior with no data-migration needed.

## Open Questions

- **`sessionId` source (blocks task 1.1).** Is direct Okta-System-Log session correlation a hard requirement? If yes → Candidate A (`sid`), which needs an Okta config change (logout/SLO) confirmed with the Okta administrator. If indirect correlation (`sub` + `auth_time` + IP) is acceptable → Candidate B (CC-owned opaque session id), which ships with no external dependency. To confirm with the reporter (Keith). `jti` is ruled out (see D2).
- Should any non-request-scoped logs (e.g., scheduled `izghubrefresh`) attempt to attribute a system identity, or remain identity-less? Current design leaves them identity-less.
