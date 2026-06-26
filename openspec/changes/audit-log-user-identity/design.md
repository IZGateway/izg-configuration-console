## Context

The Configuration Console logs through a single Winston instance (`logger.ts`) using `@elastic/ecs-winston-format`, with `console.*` monkey-patched to route through that logger. Shipped to Elasticsearch via the container's file logging in production.

Today, user identity is attached to only a few places, as **bare string fields**:
- `logApiRequest` (`api-middleware-helper.ts`) logs `user` (display name) + `sub`.
- `elasticsearch/query.ts` logs `user` (email).
- Several access-group / denylist handlers log `user` (email).

Most events — the Edge `Route Request` line, the many `No encryption key configured` warnings, connection-test logs, unhandled errors — carry no identity. There is no reliable way to trace a log event back to the user who caused it.

Two pieces of infrastructure make this tractable:
- **`asyncRequestContext`** (`src/lib/Context.ts`), an `AsyncLocalStorage<Context>` populated per API request inside `withMiddleware`. This is the Node-runtime analog of the Hub's SLF4J MDC.
- The **next-auth JWT** already persists the Okta ID token (`token.id_token`/`token.idToken`, set in the `jwt` callback).

Empirical finding (verified by decoding a live Okta ID token): the token carries `sub`, `email`, `name`, `preferred_username`, `groups`, `jti`, `auth_time`, `idp`, `amr` — but **no `sid` claim**.

**Backward-compatibility constraint (the key driver of this design):** `user` is already an established **string** field across many existing log statements, and there may be Kibana queries/views and an Elasticsearch index mapping that depend on it. We must **not** change how anything is logged today — a field cannot be both a string and an object, so we cannot repurpose `user` into an identity object without risking broken queries and a mapping conflict (likely the root of IGDD-2540). Therefore the new identity is carried under a **new** field, `sessionUser`, and nothing existing is touched.

Constraint: next-auth is pinned at v4 (Pages Router). The Edge middleware (`src/middleware.ts`) runs in the Edge runtime, where neither Winston nor Node's `AsyncLocalStorage` is available.

## Goals / Non-Goals

**Goals:**
- Attach a `sessionUser` object — `{ name, userId, email, sessionId, jti, authTime, ip }` — to every Node-runtime log event during an authenticated interaction, automatically, **without changing any existing logged field**.
- Provide a `sessionId` that is stable within a login session, non-replayable, and not a secret; record the Okta `jti` alongside.
- Support indirect Okta correlation (`userId` + `authTime` + `ip`).
- Capture a point-in-time authorization snapshot (`groups` + resolved `role`) once per login.

**Non-Goals:**
- Modifying, removing, or renaming any field logged today (explicitly additive).
- Enriching the Edge `Route Request` log (left anonymous; see D4).
- Attaching `sessionUser` to server-side code that runs outside `withMiddleware` — notably the connection-test page's server execution. Those logs already carry operator identity via pre-existing fields (`userContext` on per-test lines, `userId`/`user` on the start/summary lines), so they remain attributable; standardizing them onto `sessionUser` is a possible follow-up (see Risks).
- Pursuing the Okta `sid` / Front-Channel-SLO direct-correlation path now (documented future option).
- Hub / Transformation Console logging (separate CRs); persisting audit events to a database (the existing `auditHelper` DynamoDB records are a distinct concern).

## Decisions

### D1 — Inject `sessionUser` via a context-aware Winston format (additive)

Add a Winston format to the `format.combine(...)` chain in `logger.ts` (alongside `versionFormat`) that calls `asyncRequestContext.getStore()` and, when an authenticated context is present, sets `info.sessionUser = { name, userId, email, sessionId, jti, authTime, ip }`. Because `console.*` is already monkey-patched to the logger, this covers both `logger.*` and legacy `console.*` calls with zero per-call-site changes.

It writes **only** to the new `sessionUser` key — it never touches `user`, `sub`, or any other field. Existing `user`/`sub` fields therefore remain on the lines that already emit them, now accompanied by `sessionUser`.

Place the format **before** `ecsFormat()` so the field is present at serialization. `versionFormat` already proves custom fields (`ConfigConsoleVersion`) survive `ecsFormat` passthrough; `sessionUser` is a plain custom object and is expected to pass through likewise (verified by unit test, see Risks).

- **Alternatives rejected:** threading identity through function args (invasive, violates the AsyncLocalStorage layering convention); per-request child loggers (re-introduces threading, doesn't capture `console.*`).

### D2 — `sessionId` (CC-generated) + `jti` (token reference); indirect correlation

In the `jwt` callback's `if (account)` block: generate `token.sessionId = crypto.randomUUID()`, and decode the Okta ID token to capture `token.authTime` (`auth_time`) and `token.jti` (`jti`). Persisting on the token makes all three available cheaply via `getToken()` without re-decoding per request.

- **`sessionId`** (UUID) is the stable, CC-owned per-login correlator: non-replayable, not a secret, future-proof against token refresh.
- **`jti`** is logged as a token reference (`sessionUser.jti`). It is *not* the session correlator — the Okta System Log cannot be pivoted on `jti`, and it identifies the token, not the session — but it is harmless to log and useful as a reference.
- **Indirect Okta correlation** uses `userId` (`sub`) + `authTime` + `ip` (all in `sessionUser`); see the Correlation Recipe below.

**Not pursued — Okta `sid`.** `sid` is absent from this tenant's tokens (`sid: null`) and emitting it requires enabling Front-Channel SLO + "Include user session details" in Okta. The team chose **not** to pursue it now. If later required for a direct one-step pivot, `token.sessionId` simply sources from `sid` instead of a UUID — a drop-in source swap, no other change.

### D3 — Extend `Context` and populate it in `withMiddleware`

Add `userId?`, `email?`, `sessionId?`, `jti?`, `authTime?` to `Context` (`ipAddress`, `user`, `sub`, `session` already exist). In `withMiddleware`, populate the new fields from `session.user` and the decoded token (`userId` from `sub`, `email`, `sessionId`, `jti`, `authTime`). The existing `user`/`sub`/`ipAddress`/`session` assignments are unchanged, and `logApiRequest` is **not** modified.

### D4 — Edge `Route Request` is intentionally left unchanged

`src/middleware.ts` runs in the Edge runtime and cannot use Winston or `AsyncLocalStorage`. More importantly, the team decided page-navigation lines do not need separate attribution: every meaningful data access happens via `/api/*` routes, which are fully structured with `sessionUser`. So the `Route Request` line stays anonymous exactly as today — **no change to `middleware.ts`**.

This is a deliberate scoping choice, not an oversight. (If structured page-view attribution is wanted later, the middleware would need to hand-roll and emit a pre-serialized JSON line, since the Edge runtime otherwise folds console arguments into the `message` string rather than into structured fields — a possible follow-up.)

### D5 — Per-session authorization snapshot (`Session established`)

Okta group membership is mutable, so reconstructing "what was this user authorized to do at the time" from Okta later is impractical. To capture point-in-time authorization, emit a single `Session established` log record in the `jwt` callback's `if (account)` block (runs once per login). It contains the `sessionUser` identity (minus `ip`, which is per-request and unavailable in the callback) plus `groups` (the Okta memberships) and the resolved `role` (`_.intersection(groups, roles)[0]`, as the session callback computes).

Ordinary per-line events carry `sessionUser` but **not** `groups`/`role` — keeping the large, more-sensitive group list to one record per session (data minimization, IGDD-2795) while still enabling recovery for any line via `sessionUser.sessionId`. This record is built explicitly (the auth route is not wrapped by `withMiddleware`, so the D1 format does not auto-inject there).

### D6 — Field shape & naming

`sessionUser` is a custom (non-ECS) field, deliberately chosen to avoid colliding with ECS's reserved `user` object **and** with the existing `user` string field. camelCase sub-fields: `name`, `userId`, `email`, `sessionId`, `jti`, `authTime`, `ip`.

## Risks / Trade-offs

- **`ecsFormat` could transform a known field** → `sessionUser` is a custom key (not ECS-reserved), so passthrough is expected; verified by a unit test asserting the serialized output contains the `sessionUser` object.
- **No request context on some paths** (`getServerSideProps`, startup, background) → `sessionUser` is simply omitted; the format must never throw on an empty store. Covered by spec scenarios.
- **`groups`/`role` are authorization metadata** → logged only once per session (not per line) and only in a record that should be access-controlled like any identity-bearing log. Not a credential; not replayable.
- **PII in logs** (email/name) → intended audit behavior; already partially present today. No raw tokens/cookies logged; `sessionId` is an opaque CC id.
- **Indirect Okta correlation** → a CC-generated `sessionId` is not in Okta's logs, so correlation is a two-step join on `userId` + `authTime` + `ip` (see recipe). The `sid` option (not pursued) would make it one step at the cost of an Okta config change.
- **Slight per-log overhead** from `asyncRequestContext.getStore()` → negligible (a `Map` lookup).
- **Non-`withMiddleware` server paths lack `sessionUser`** → Verified at runtime: the connection-test flow executes outside `withMiddleware` (via the connection-test page's server-side path, not the `/api/tests` route), so its logs (`Starting connection tests`, the per-test `… PASS/FAIL` lines, `Connection Test Results`) carry no `sessionUser`. They already carry operator identity via pre-existing fields (`userContext`/`userId`/`user`), so they remain attributable. Same class of limitation as the Edge `Route Request`. Standardizing these onto `sessionUser` is a possible follow-up, out of scope here.

## Migration Plan

Purely additive and backward-compatible — no breaking changes, no existing field altered.
1. `jwt` callback: generate `sessionId`, capture `authTime`/`jti`, emit `Session established` (groups + role). Takes effect on next sign-in; existing sessions lack `sessionUser` until re-login.
2. Extend `Context`; populate in `withMiddleware`.
3. Add the context-aware Winston format writing `sessionUser`.

New `sessionUser.*` fields auto-discover in the Kibana/Logstash index on first event; no mapping template change, and the existing `user` mapping is untouched. **Rollback:** revert the change; logs return to prior behavior with no data migration.

## Okta Correlation Recipe (indirect)

Because `sessionId` is CC-generated, it does not appear in Okta's logs. To pivot from a CC log line to the originating Okta session, use the three correlation fields in `sessionUser` against the Okta System Log (Admin Console → Reports → System Log, or `/api/v1/logs`).

**Field mapping (CC `sessionUser` → Okta System Log):**

| CC field | Okta System Log field | Role in the join |
|---|---|---|
| `sessionUser.userId` (= Okta `sub`, e.g. `00u…`) | `actor.id` (or email → `actor.alternateId`) | primary key |
| `sessionUser.authTime` (Unix seconds) | bounds `since`/`until`; anchors `user.session.start` | time anchor |
| `sessionUser.ip` | `client.ipAddress` | corroboration only (see caveat) |

**Step 1 — locate the sign-in event:**

```
GET /api/v1/logs
  ?since=<authTime − a few seconds, ISO8601>
  &until=<authTime + a few seconds, ISO8601>
  &filter=actor.id eq "00ugmlnknoC9fc5Ul1d7" and eventType eq "user.session.start"
```

**Step 2 — read `authenticationContext.externalSessionId` from that event, then expand to the full session:**

```
GET /api/v1/logs
  ?filter=authenticationContext.externalSessionId eq "<externalSessionId from step 1>"
```

**Caveats:**
- `authTime` is Unix *seconds*; Okta timestamps are millisecond ISO8601 — bracket a window, don't match exactly. It still lands on `user.session.start`.
- `sessionUser.ip` is what the app sees (`x-forwarded-for` behind nginx/ALB); Okta logs the IP it saw at login. Usually the same public IP, but NAT/proxy/VPN can diverge — treat as corroboration, not a hard key.
- `authenticationContext.*`, `transaction.id`, `uuid` are **Okta-side System Log fields only** — never present in the id_token or received by CC.
- The direct alternative (`sid`, not pursued) equals `externalSessionId`, collapsing this to a single filter — at the cost of enabling Front-Channel SLO in Okta.

## Open Questions

- None blocking. Future option: adopt Okta `sid` for a one-step Okta pivot (requires Front-Channel SLO config) — drop-in source swap for `sessionId`. Future option: structured `sessionUser` on Edge `Route Request` lines (requires hand-rolled JSON in middleware).
