## Why

The `audit-log-user-identity` work attaches `sessionUser` to every log produced inside a `withMiddleware`-wrapped `/api/*` request, but several pages read data **directly from the database in `getServerSideProps`** (server-side page render), which runs outside `withMiddleware`. So when a user loads those pages, the data read is logged **without `sessionUser`** — an under-attribution gap for genuine, user-initiated reads. (Follow-up to IGDD-2223.)

## What Changes

- Establish the same `AsyncLocalStorage` request context around **`getServerSideProps`** so every server-side page-render log event (including downstream DB-layer logs) automatically carries `sessionUser`.
- **Extract a shared `buildRequestContext(req, res)` helper** from `withMiddleware` (the logic that builds the `Context` from `getServerSession` + `getToken`) and reuse it in both places, so the two paths cannot drift.
- **Add a `withRequestContext(getServerSideProps)` higher-order wrapper** (in `src/lib/requestContext.ts`) that builds the context and runs the whole handler inside `asyncRequestContext.run(...)`, passing the resolved `Context` to the handler. Applying this wrapper **uniformly to every page that defines `getServerSideProps`** means all current *and future* SSR pages are attributed by construction — no per-page boilerplate to copy and nothing to forget (removes the drift risk of hand-wiring each page).
- Apply the wrapper to **all six** SSR pages: the four that read directly server-side — **`manageconnections`**, **`changerequest/[...slug]`**, **`testreport`**, **`test/[...slug]`** (the connection test) — plus **`onboarding`** and **`passwordencryption`**. This also brings the connection-test logs into `sessionUser` coverage.
- **Additive** — existing identity fields on those lines (notably the connection test's `userContext`) are preserved; no existing field is changed.
- **Out of scope:** the Edge-runtime `Route Request` log (`src/middleware.ts`) remains anonymous — the Edge runtime cannot use the Node logger or `AsyncLocalStorage`; that is a separate, harder follow-up. Pages that have no `getServerSideProps` (client-side + `/api/*` only, e.g. Access Control) are already attributed via the API path and need no change.

## Capabilities

### New Capabilities
<!-- None. This extends an existing capability. -->

### Modified Capabilities
- `audit-log-user-identity`: extend where `sessionUser` is attached — the request context is now established by `withMiddleware` (API routes) **and** by every authenticated `getServerSideProps` (page server-side render), via the shared `withRequestContext` wrapper. Adds a requirement covering server-side page-load renders and updates the no-context behavior note so the page-SSR paths are covered (only Edge `Route Request` remains out of scope).

## Impact

- **Code:**
  - Shared helper `src/lib/requestContext.ts` — `buildRequestContext(req, res)` returning the `Context`, plus the `withRequestContext(getServerSideProps)` higher-order wrapper.
  - `src/pages/api/api-middleware-helper.ts` — refactor `withMiddleware` to use the shared helper (no behavior change).
  - All six SSR pages — `src/pages/manageconnections/index.tsx`, `src/pages/changerequest/[...slug].tsx`, `src/pages/testreport/index.tsx`, `src/pages/test/[...slug].tsx`, `src/pages/onboarding/index.tsx`, `src/pages/passwordencryption/index.tsx` — wrap `getServerSideProps` with `withRequestContext(...)` (onboarding also drops its now-redundant standalone `getServerSession` call, reusing the context's `session`).
- **Auth / security:** No change to authentication, authorization, jurisdiction scoping, or encrypted fields. No new data type or secret is logged — `sessionUser` is the same identity-only block already emitted on API logs (`jti`/`sessionId` are opaque references; raw JWT/access/ID tokens and session cookies are never logged). It attributes already-known users (each page resolves the session via the shared builder); it does not fabricate identity (no session → injector no-ops). Correctness items: context is scoped per request via `run()` (no cross-request bleed), same pattern as `withMiddleware`; and the wrapped pages (notably `passwordencryption`) must not log secret material next to identity — verified as part of this change.
- **Backward compatibility:** Additive only — existing fields (`userContext`, etc.) untouched; no breaking change to existing queries/mappings.
- **Observability:** `sessionUser` now appears on the server-side render logs for every SSR page (destinations, change requests, connection-test lines, onboarding page-load, password-encryption page-load). Pre-existing DB-layer log content is unchanged (only `sessionUser` is added). Note: this increases the volume — not the category — of user PII (name/email/IP) in the `izgw-config-console-*` indices; existing access/retention controls apply.
- **Scope:** Configuration Console only; follow-up to IGDD-2223.
