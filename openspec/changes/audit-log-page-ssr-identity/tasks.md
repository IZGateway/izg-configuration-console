## 1. Extract a shared request-context builder

- [ ] 1.1 Create `buildRequestContext(req, res)` in a shared module (e.g. `src/lib/requestContext.ts`) that returns the `Context` (user, ipAddress, sub, session, userId, email, sessionId, jti from `oktaJti`, authTime) using `getServerSession` + `getToken`. Guard against import cycles (pass `authOptions` in if needed).
- [ ] 1.2 Refactor `withMiddleware` (`src/pages/api/api-middleware-helper.ts`) to build its context via `buildRequestContext` — behavior-preserving, no field changes.

## 2. Wrap the page server-side reads in the request context

- [ ] 2.1 `src/pages/manageconnections/index.tsx` — build the context and wrap the `getServerSideProps` data read (`fetchDestination` / `fetchDestinationChangeRequest…`) in `asyncRequestContext.run(context, …)`.
- [ ] 2.2 `src/pages/changerequest/[...slug].tsx` — wrap its `getServerSideProps` DB read.
- [ ] 2.3 `src/pages/testreport/index.tsx` — wrap its `getServerSideProps` DB read + `connectionTest` call.
- [ ] 2.4 `src/pages/test/[...slug].tsx` — wrap its `getServerSideProps` DB read + `connectionTest` call; leave the existing `userContext` block intact (additive).
- [ ] 2.5 Ensure each wrap handles the no-session case gracefully (context with no identity → injector no-ops; no fabrication, no throw).

## 3. Tests

- [ ] 3.1 Unit test for `buildRequestContext`: given mocked `getServerSession` + `getToken`, returns a `Context` with `userId`, `email`, `sessionId`, `jti` (from `oktaJti`), `authTime`, and preserves `user`/`sub`.
- [ ] 3.2 Regression: confirm `withMiddleware` still populates the context (the existing `api-middleware-helper` test passes after the refactor).
- [ ] 3.3 Test that running a logging call inside `asyncRequestContext.run(buildRequestContext-style context, …)` yields `sessionUser` on the emitted event (representative of the `getServerSideProps` wrap).

## 4. Verification

- [ ] 4.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve all findings.
- [ ] 4.2 Run `npm run test` and confirm the suite passes (note: the pre-existing jsdom `ERR_REQUIRE_ESM` failure is unrelated to this change).
- [ ] 4.3 Run `npm run build && npm start`, sign in, and load each page (`manageconnections`, a change request, a test report, run a connection test); confirm `logs/log.json` shows `sessionUser` on the page-load DB-read lines and the connection-test lines, that the connection test still shows `userContext`, and that `/api/*` logs are unaffected by the refactor.
- [ ] 4.4 Confirm no raw JWT, access token, ID token, or session cookie value appears in the log output, and that the Edge `Route Request` line remains anonymous (out of scope).
