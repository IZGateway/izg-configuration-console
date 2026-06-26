## 1. Capture session identifier and correlation data at sign-in

- [x] 1.1 In `src/pages/api/auth/[...nextauth].ts` `jwt` callback (inside the existing `if (account)` block), set `token.sessionId = crypto.randomUUID()` and `token.authTime` from the decoded Okta ID token `auth_time` claim, wrapped in try/catch so a failure never breaks sign-in
- [x] 1.2 Extend the next-auth type augmentation (JWT / Session types) so `sessionId` and `authTime` are typed (avoid `any` — `no-explicit-any` is an error)

> Assumes indirect Okta correlation (confirming with team). If a direct Okta pivot is later required, source `token.sessionId` from the Okta `sid` claim instead (requires Okta SLO config) — no other task changes. `jti` is ruled out (see design.md D2).

## 2. Extend request context

- [x] 2.1 Add optional `userId`, `email`, `sessionId`, and `authTime` fields to the `Context` interface in `src/lib/Context.ts` (`ipAddress` already exists)
- [x] 2.2 In `withMiddleware` (`src/pages/api/api-middleware-helper.ts`), populate the new context fields from `session.user` and the decoded token (`userId` from `sub`, `email` from `session.user.email`, `sessionId` from `jwtToken.sessionId`, `authTime` from `jwtToken.authTime`)

## 3. Auto-inject identity into Winston logs

- [x] 3.1 Add a context-aware Winston format in `logger.ts` that reads `asyncRequestContext.getStore()` and, when present, sets a nested `user` block (`name`, `id`/`userId`, `email`, `sessionId`) plus the correlation fields `auth_time` and source IP (e.g. ECS `client.ip` from `ipAddress`); place it in the `format.combine(...)` chain before `ecsFormat()`
- [x] 3.2 Ensure the format is a no-op (no `user` block, no throw) when the store is empty (startup, background, unauthenticated paths)
- [x] 3.3 Verify `ecsFormat` passes the nested `user` object through unchanged; if it reserves/transforms `user`, set ECS-native `user.id/name/email` keys and carry `sessionId` under a custom key (per design D5)

## 4. Enrich Edge middleware Route Request log

- [x] 4.1 In `src/middleware.ts`, build a `user` block from `req.nextauth.token` (`userId` from `sub`, plus `email`, `name`, `sessionId`) and include it in the `Route Request` `console.info` call
- [x] 4.2 Omit the `user` block when `req.nextauth.token` is absent (unauthenticated / pre-binding) rather than emitting empty values

## 5. Normalize existing ad hoc identity logs

- [x] 5.1 Update `logApiRequest` in `src/pages/api/api-middleware-helper.ts` so the `API Request` line relies on the standardized injected `user` block instead of passing a bare `user`/`sub`
- [x] 5.2 Update `src/pages/api/elasticsearch/query.ts` so its log calls no longer pass `user` as a bare email string (now covered by the injected block)

## 6. Tests

- [x] 6.1 Add a unit test for the Winston context format: asserts the serialized event contains the expected nested `user` block when a context is set, and omits it when the store is empty
- [x] 6.2 Add a unit test for the `jwt` callback: sign-in generates a `sessionId` and captures `authTime` from `auth_time`; the same `sessionId` persists on subsequent (non-`account`) calls; a malformed/missing token does not throw
- [x] 6.3 Add/extend a test confirming `withMiddleware` populates `userId`, `email`, `sessionId`, and `authTime` in the context

## 7. Verification

- [x] 7.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve all findings
- [x] 7.2 Run `npm run test` and confirm the suite passes (note: the pre-existing jsdom `ERR_REQUIRE_ESM` failure is unrelated to this change)
- [x] 7.3 Run `npm run build && npm start`, sign in, exercise an API route and a page navigation, and confirm `logs/log.json` shows the `user` block (with generated `sessionId`) plus `auth_time` and source IP on API logs and the enriched `Route Request` line — and that startup logs have no `user` block
- [x] 7.4 Confirm no raw JWT, access token, ID token, or session cookie value appears anywhere in the log output
