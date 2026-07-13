## 1. Extract a shared request-context builder

- [x] 1.1 Create `buildRequestContext(req, res)` in a shared module (e.g. `src/lib/requestContext.ts`) that returns the `Context` (user, ipAddress, sub, session, userId, email, sessionId, jti from `oktaJti`, authTime) using `getServerSession` + `getToken`. Guard against import cycles (pass `authOptions` in if needed).
- [x] 1.2 Refactor `withMiddleware` (`src/pages/api/api-middleware-helper.ts`) to build its context via `buildRequestContext` — behavior-preserving, no field changes.
- [x] 1.3 Add a `withRequestContext(getServerSideProps)` higher-order wrapper in `src/lib/requestContext.ts` that builds the context and runs the whole handler inside `asyncRequestContext.run(...)`, passing the resolved `Context` to the handler as a second argument. This is the single, reusable wrap point so all SSR pages (and future ones) are attributed without per-page boilerplate.

## 2. Wrap every `getServerSideProps` in the request context (via `withRequestContext`)

- [x] 2.1 `src/pages/manageconnections/index.tsx` — wrap `getServerSideProps` with `withRequestContext`; data read (`fetchDestination` / `fetchDestinationChangeRequest…`) now runs inside the context.
- [x] 2.2 `src/pages/changerequest/[...slug].tsx` — wrap its `getServerSideProps` DB read.
- [x] 2.3 `src/pages/testreport/index.tsx` — wrap its `getServerSideProps` DB read + `connectionTest` call.
- [x] 2.4 `src/pages/test/[...slug].tsx` — wrap its `getServerSideProps` DB read + `connectionTest` call; leave the existing `userContext` block intact (additive).
- [x] 2.5 `src/pages/onboarding/index.tsx` — wrap its `getServerSideProps`; drop the now-redundant standalone `getServerSession` call and reuse the context's `session` (its page-level warn/error logs now carry `sessionUser`).
- [x] 2.6 `src/pages/passwordencryption/index.tsx` — wrap its `getServerSideProps` (trivial `hasKeyName` read) so this sensitive-feature page-load is attributed.
- [x] 2.7 Ensure each wrap handles the no-session case gracefully (context with no identity → injector no-ops; no fabrication, no throw).

## 3. Tests

- [x] 3.1 Unit test for `buildRequestContext`: given mocked `getServerSession` + `getToken`, returns a `Context` with `userId`, `email`, `sessionId`, `jti` (from `oktaJti`), `authTime`, and preserves `user`/`sub`.
- [x] 3.2 Regression: confirm `withMiddleware` still populates the context (the existing `api-middleware-helper` test passes after the refactor).
- [x] 3.3 Test that running a logging call inside `asyncRequestContext.run(buildRequestContext-style context, …)` yields `sessionUser` on the emitted event (representative of the `getServerSideProps` wrap).
- [x] 3.4 Unit test for `withRequestContext`: the handler runs inside the request context (`asyncRequestContext.getStore()` returns the built context), receives the context as its second arg, its return value passes through, the context does not leak after the call, and the no-session case yields no identity fields.

## 4. Verification

- [x] 4.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve all findings. (Re-run after the `withRequestContext` refactor: 0 type errors; lint 0 errors — remaining "unused eslint-disable" warnings are a pre-existing repo baseline unrelated to this change.)
- [x] 4.2 Run the affected unit suites (`requestContext`, `logger.context`, `api-middleware-helper`) and confirm they pass after the refactor (note: the full `npm run test` still hits the pre-existing jsdom `ERR_REQUIRE_ESM` failure, unrelated to this change).
- [x] 4.3 Ran `npm run build && npm start`, signed in, and walked the app against `logs/log.json`. Confirmed `sessionUser` on the server-side render/DB-read lines for the wrapped SSR pages: `manageconnections` (destination + change-request reads), `changerequest/[...slug]`, `onboarding`, and `passwordencryption`. Also confirmed the `/api/*` path is unaffected — every `API Request …` and audit line for Access Control (access groups, deny list, ADS file types), Onboarding Senders (allowed-user CRUD), and Console carries `sessionUser`, while Edge `Route Request` lines remain anonymous. Notes: (a) `changerequest`'s success read is silent at `info` (`fetchDestination` only logs on miss), so it was re-verified at `LOG_LEVEL=debug`, where its `fetchDestinationChangeRequestById` lines carry `sessionUser`; (b) `testreport`/`test/[...slug]` were not re-exercised in this pass — identical wrapper, covered in the original change; (c) startup/no-context lines correctly emit without `sessionUser`.
- [x] 4.4 At `LOG_LEVEL=info`, secret-scanned the full walkthrough log — including the `passwordencryption` **encrypt** and **rotate** operations and their downstream `encryptionStatus` / `rotatekey` / `encrypt` paths. The additive `sessionUser` block is identity-only; destination/change-request password fields in the encrypt/rotate/audit lines are masked (`.........`); and no JWT, access token, ID token, session cookie, or Elastic key/host value was observed in the change's added or wrapped paths. Edge `Route Request` remains anonymous (out of scope).
