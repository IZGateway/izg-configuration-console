# Proposal: Log Redaction for OAuth Callback and Sensitive API Routes

## Status
Draft

## Applies To
- `izg-configuration-console`
- `izg-transformation-ui`

---

## Problem

Both applications use NextAuth.js with Okta as the identity provider. During the OAuth 2.0
authorization code flow, Okta redirects the browser to:

```
GET /api/auth/callback/okta?code=<authorization_code>&state=<state_token>
```

NGINX access logs record the **full request URI** by default, which means the **authorization
code** is written to disk in plaintext. Example log line:

```
1.2.3.4 - - [21/Apr/2026] "GET /api/auth/callback/okta?code=abc123xyz&state=xyz987 HTTP/1.1" 302 0
```

The authorization code is a short-lived credential that can be exchanged at Okta's token
endpoint for a valid `access_token` and `id_token`. An attacker who reads the log before the
code is consumed (or retrieves it from a log archive) can fully impersonate the affected user's
session.

Additional concerns exist at the application log layer:

- **`izg-configuration-console`:** When `LOG_LEVEL=debug`, `api-middleware-helper.ts` logs the
  full `req` object, which includes the session JWT stored in cookies. A `session` callback
  also copies `accessToken` into the session object, meaning debug logs may contain bearer
  tokens alongside user identity fields (`sub`, email, name).

- **`izg-transformation-ui`:** `logRequest` in `api-middleware-helper.ts` unconditionally logs
  the full `req` object at `debug` level, which includes the `next-auth.session-token` cookie.
  The middleware also decodes the JWT from that cookie and includes the user's email in every
  log entry. Additionally, the `getJurisdictions()` function in the NextAuth handler logs raw
  error objects that may contain access tokens in their stack traces.

Both apps ship logs to Elasticsearch/ECS via `@elastic/ecs-winston-format`. Any sensitive
values logged at `debug` or above propagate to the log aggregation pipeline and its retention
window, substantially outlasting the tokens' operational lifetime.

---

## Goals

1. Prevent OAuth authorization codes and state tokens from being persisted in NGINX access logs.
2. Prevent session JWTs and bearer tokens from appearing in application logs at any log level.
3. Prevent full `req`/`res` objects from being logged (they are vehicles for leaking cookies,
   authorization headers, and request bodies).
4. Ensure user identity fields logged for audit purposes are limited to non-sensitive identifiers
   (e.g., `sub` or a redacted email), never raw tokens.
5. Apply consistent redaction rules across both applications.

---

## Non-Goals

- Changing the authentication mechanism or session storage strategy.
- Modifying the Okta configuration or token lifetimes (those are worthwhile separately but
  outside scope here).
- Removing audit logging — legitimate identity and access audit events should still be logged,
  just without credential material.

---

## Proposed Solution

### 1. NGINX — Mask the OAuth callback query string

Define a custom `log_format` that redacts query parameters on `/api/auth/*` routes before
writing the access log entry. Both apps share the same NGINX/Docker deployment pattern, so this
change applies to both Dockerfiles / NGINX configs.

```nginx
map $request_uri $redacted_uri {
    ~^(/api/auth/[^?]+)  "$1?[REDACTED]";
    default              $request_uri;
}

log_format main '$remote_addr - $remote_user [$time_local] '
                '"$request_method $redacted_uri $server_protocol" '
                '$status $body_bytes_sent '
                '"$http_referer" "$http_user_agent"';
```

### 2. Application logs — Stop logging full `req`/`res` objects

Replace all `logger.*({ req, res, ... })` calls with structured objects containing only safe,
pre-extracted fields: `url`, `method`, `statusCode`, `user` (sub/email — not token), `ip`.

Create a shared helper `src/lib/logging/safeRequestLog.ts` (in each app) that extracts and
returns the safe subset, to be used in all middleware log calls.

### 3. `izg-configuration-console` — Remove `accessToken` from the session object

The `session` callback in `[...nextauth].ts` currently copies `token.accessToken` into
`session.accessToken`. This makes the bearer token available to client-side code and increases
its exposure surface. The access token is not consumed client-side; it should be removed from
the session payload.

### 4. `izg-transformation-ui` — Guard `logRequest` behind log-level check

The `logRequest` middleware currently logs at `debug` unconditionally. It should be guarded so
that even at `debug` level, cookie values and raw `req` objects are never included. The already-
decoded `session.email` is acceptable as a log field; the raw `sessionToken` string is not.

### 5. Both apps — Sanitize error logging in the `getJurisdictions` / `jwt` callback

Error objects caught during the `userinfo` fetch must be logged without including the
`access_token` from the enclosing scope. Use structured error logging (`errorMessage`,
`errorType`) rather than logging the raw error or its full stack.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| NGINX change breaks log parsing pipelines | Update ECS ingest pipeline field mappings to expect `$redacted_uri`; validate in dev before promoting |
| Removing `accessToken` from session breaks a consumer | Audit all `session.accessToken` usages; confirm none are client-side before removing |
| Redaction helper adds latency | Helper is purely synchronous string extraction; negligible overhead |

---

## References

- [OAuth 2.0 Security Best Current Practice — §4.1.1 Authorization Code in URI](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.1.1)
- [OWASP Logging Cheat Sheet — Sensitive Data](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude)
- NextAuth.js session callback docs
