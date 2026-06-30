## Why

The `audit-log-user-identity` work attaches `sessionUser` to every log produced inside a `withMiddleware`-wrapped `/api/*` request, but several pages read data **directly from the database in `getServerSideProps`** (server-side page render), which runs outside `withMiddleware`. So when a user loads those pages, the data read is logged **without `sessionUser`** — an under-attribution gap for genuine, user-initiated reads. (Follow-up to IGDD-2223.)

## What Changes

- Establish the same `AsyncLocalStorage` request context around the **server-side data reads in `getServerSideProps`** so their log events (including downstream DB-layer logs) automatically carry `sessionUser`.
- **Extract a shared `buildRequestContext(req, res)` helper** from `withMiddleware` (the logic that builds the `Context` from `getServerSession` + `getToken`) and reuse it in both places, so the two paths cannot drift.
- Apply the wrap to the four pages that read data directly server-side: **`manageconnections`**, **`changerequest/[...slug]`**, **`testreport`**, and **`test/[...slug]`** (the connection test). This also brings the connection-test logs into `sessionUser` coverage.
- **Additive** — existing identity fields on those lines (notably the connection test's `userContext`) are preserved; no existing field is changed.
- **Out of scope:** the Edge-runtime `Route Request` log (`src/middleware.ts`) remains anonymous — the Edge runtime cannot use the Node logger or `AsyncLocalStorage`; that is a separate, harder follow-up. Pages whose data loads via `/api/*` (e.g. `onboarding`) are already attributed and unchanged.

## Capabilities

### New Capabilities
<!-- None. This extends an existing capability. -->

### Modified Capabilities
- `audit-log-user-identity`: extend where `sessionUser` is attached — the request context is now established by `withMiddleware` (API routes) **and** by authenticated `getServerSideProps` data reads (page server-side reads). Adds a requirement covering server-side page-load reads and updates the no-context behavior note so the page-SSR paths are covered (only Edge `Route Request` remains out of scope).

## Impact

- **Code:**
  - New shared helper (e.g. `src/lib/requestContext.ts`) — `buildRequestContext(req, res)` returning the `Context`.
  - `src/pages/api/api-middleware-helper.ts` — refactor `withMiddleware` to use the shared helper (no behavior change).
  - `src/pages/manageconnections/index.tsx`, `src/pages/changerequest/[...slug].tsx`, `src/pages/testreport/index.tsx`, `src/pages/test/[...slug].tsx` — wrap the `getServerSideProps` data access in `asyncRequestContext.run(context, …)`.
- **Auth / security:** No change to authentication, authorization, jurisdiction scoping, or encrypted fields. No new data type or secret is logged — `sessionUser` is the same block already emitted on API logs (raw tokens never logged). It attributes already-known users (each page already calls `getServerSession`); it does not fabricate identity (no session → injector no-ops). Main correctness item: scope the context per request (no cross-request bleed), same `run()` pattern as `withMiddleware`.
- **Backward compatibility:** Additive only — existing fields (`userContext`, etc.) untouched; no breaking change to existing queries/mappings.
- **Observability:** `sessionUser` now appears on the page-load read logs (destinations, change requests, connection-test lines) for the four pages. Pre-existing DB-layer log content is unchanged (only `sessionUser` is added).
- **Scope:** Configuration Console only; follow-up to IGDD-2223.
