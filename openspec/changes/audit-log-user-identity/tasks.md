## 1. Capture session identifier at sign-in

- [ ] 1.1 In `src/pages/api/auth/[...nextauth].ts` `jwt` callback (inside the existing `if (account)` block), decode the Okta ID token payload and set `token.sessionId = payload.jti` and `token.authTime = payload.auth_time`, wrapped in try/catch so a decode failure never breaks sign-in
- [ ] 1.2 Extend the next-auth type augmentation (JWT / Session types) so `sessionId` and `authTime` are typed (avoid `any` — `no-explicit-any` is an error)

## 2. Extend request context

- [ ] 2.1 Add optional `userId`, `email`, and `sessionId` fields to the `Context` interface in `src/lib/Context.ts`
- [ ] 2.2 In `withMiddleware` (`src/pages/api/api-middleware-helper.ts`), populate the new context fields from `session.user` and the decoded token (`userId` from `sub`, `email` from `session.user.email`, `sessionId` from `jwtToken.sessionId`)

## 3. Auto-inject identity into Winston logs

- [ ] 3.1 Add a context-aware Winston format in `logger.ts` that reads `asyncRequestContext.getStore()` and, when present, sets a nested `user` block (`name`, `id`/`userId`, `email`, `sessionId`); place it in the `format.combine(...)` chain before `ecsFormat()`
- [ ] 3.2 Ensure the format is a no-op (no `user` block, no throw) when the store is empty (startup, background, unauthenticated paths)
- [ ] 3.3 Verify `ecsFormat` passes the nested `user` object through unchanged; if it reserves/transforms `user`, set ECS-native `user.id/name/email` keys and carry `sessionId` under a custom key (per design D5)

## 4. Enrich Edge middleware Route Request log

- [ ] 4.1 In `src/middleware.ts`, build a `user` block from `req.nextauth.token` (`userId` from `sub`, plus `email`, `name`, `sessionId`) and include it in the `Route Request` `console.info` call
- [ ] 4.2 Omit the `user` block when `req.nextauth.token` is absent (unauthenticated / pre-binding) rather than emitting empty values

## 5. Normalize existing ad hoc identity logs

- [ ] 5.1 Update `logApiRequest` in `src/pages/api/api-middleware-helper.ts` so the `API Request` line relies on the standardized injected `user` block instead of passing a bare `user`/`sub`
- [ ] 5.2 Update `src/pages/api/elasticsearch/query.ts` so its log calls no longer pass `user` as a bare email string (now covered by the injected block)

## 6. Tests

- [ ] 6.1 Add a unit test for the Winston context format: asserts the serialized event contains the expected nested `user` block when a context is set, and omits it when the store is empty
- [ ] 6.2 Add a unit test for the `jti`/`auth_time` extraction in the `jwt` callback (valid token populates `sessionId`/`authTime`; malformed token does not throw and leaves them unset)
- [ ] 6.3 Add/extend a test confirming `withMiddleware` populates `userId`, `email`, and `sessionId` in the context

## 7. Verification

- [ ] 7.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve all findings
- [ ] 7.2 Run `npm run test` and confirm the suite passes (note: the pre-existing jsdom `ERR_REQUIRE_ESM` failure is unrelated to this change)
- [ ] 7.3 Run `npm run build && npm start`, sign in, exercise an API route and a page navigation, and confirm `logs/log.json` shows the `user` block (with `sessionId`) on API logs and the enriched `Route Request` line — and that startup logs have no `user` block
- [ ] 7.4 Confirm no raw JWT, access token, ID token, or session cookie value appears anywhere in the log output
