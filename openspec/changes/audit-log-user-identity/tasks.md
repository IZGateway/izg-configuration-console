## 1. Capture session data and emit the per-session snapshot at sign-in

- [ ] 1.1 In `src/pages/api/auth/[...nextauth].ts` `jwt` callback (inside the existing `if (account)` block), set `token.sessionId = crypto.randomUUID()` and decode the Okta ID token to set `token.authTime` (`auth_time`) and `token.jti` (`jti`), wrapped in try/catch so a failure never breaks sign-in
- [ ] 1.2 In the same block, emit a single `Session established` log record containing the `sessionUser` identity (name, userId, email, sessionId, jti, authTime) plus `groups` (`profile.groups`) and resolved `role` (`_.intersection(profile.groups, roles)[0]`)
- [ ] 1.3 Extend the next-auth JWT type augmentation (`src/next-auth.d.ts`) so `sessionId`, `authTime`, and `jti` are typed (avoid `any` — `no-explicit-any` is an error)

## 2. Extend request context

- [ ] 2.1 Add optional `userId`, `email`, `sessionId`, `jti`, and `authTime` fields to the `Context` interface in `src/lib/Context.ts` (`user`, `sub`, `ipAddress`, `session` already exist)
- [ ] 2.2 In `withMiddleware` (`src/pages/api/api-middleware-helper.ts`), populate the new context fields from `session.user` and the decoded token (`userId` from `sub`, `email`, `sessionId`, `jti`, `authTime`). Do NOT modify `logApiRequest` or the existing `user`/`sub` assignments — this step is purely additive.

## 3. Auto-inject `sessionUser` into Winston logs

- [ ] 3.1 Add a context-aware Winston format in `logger.ts` that reads `asyncRequestContext.getStore()` and, when an authenticated context is present, sets `info.sessionUser = { name, userId, email, sessionId, jti, authTime, ip }` (camelCase; `ip` from `ipAddress`); place it in the `format.combine(...)` chain before `ecsFormat()`. It MUST write only to `sessionUser` and never touch `user`/`sub` or any other field.
- [ ] 3.2 Ensure the format is a no-op (no `sessionUser`, no throw) when the store is empty or unauthenticated (startup, background, unauthenticated paths)
- [ ] 3.3 Verify `ecsFormat` passes the `sessionUser` object through unchanged (unit test)

## 4. Tests

- [ ] 4.1 Unit test for the Winston context format: asserts the serialized event contains the expected `sessionUser` object when an authenticated context is set, omits it when the store is empty, and leaves a pre-existing `user` string field untouched
- [ ] 4.2 Unit test for the `jwt` callback: sign-in generates a `sessionId`, captures `authTime`/`jti`, and emits exactly one `Session established` record with `groups` + `role`; the same `sessionId` persists on subsequent (non-`account`) calls; a malformed/missing token does not throw
- [ ] 4.3 Test confirming `withMiddleware` populates `userId`, `email`, `sessionId`, `jti`, and `authTime` in the context (and leaves `user`/`sub` intact)

## 5. Verification

- [ ] 5.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve all findings
- [ ] 5.2 Run `npm run test` and confirm the suite passes (note: the pre-existing jsdom `ERR_REQUIRE_ESM` failure is unrelated to this change)
- [ ] 5.3 Run `npm run build && npm start`, sign in, exercise an API route, and confirm `logs/log.json` shows: one `Session established` record (with `groups` + `role`); `sessionUser` (with generated `sessionId`, `jti`, `authTime`, `ip`) on API logs; existing `user`/`sub` fields still present and unchanged; and startup logs with no `sessionUser`
- [ ] 5.4 Confirm no raw JWT, access token, ID token, or session cookie value appears anywhere in the log output, and that the Edge `Route Request` line is unchanged (still anonymous)
