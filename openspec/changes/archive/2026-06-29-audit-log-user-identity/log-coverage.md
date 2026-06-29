# Log Coverage: which log lines get `sessionUser` (and why)

Reference for the team discussion on `sessionUser` audit-log coverage (IGDD-2223).

## Governing principle

A log line gets the `sessionUser` block **only if it runs inside a `withMiddleware`-wrapped `/api/*` request.** That is the only place the per-request identity context (Node `AsyncLocalStorage`, set in `src/pages/api/api-middleware-helper.ts`) is established, and the logger format reads that context to attach `sessionUser`. Everything else has no context to read.

So the whole question reduces to: **"Is this code executing inside an `/api/*` request?"**

- Inside an `/api/*` request -> gets `sessionUser` (automatically, including all awaited downstream code: DB layer, audit writes, repositories, helpers).
- Outside it -> no `sessionUser` (though some of those lines already carry other identity fields).

## Coverage table

| Area of the app | Example log lines | sessionUser? | Why | Identity it has today |
|---|---|---|---|---|
| JSON API routes (`/api/*`) and all code they call (DB layer, audit writes, repositories) | `API Request /api/...`, `Deny list record deleted successfully`, `Elasticsearch query requested/successful/error`, DynamoDB operations | Yes | Wrapped by `withMiddleware`, which sets the `AsyncLocalStorage` context; it propagates through every `await` downstream | Full `sessionUser` |
| App startup / boot | `Config Console Service started`, first `DynamoDB connected`, `NEXT_MANUAL_SIG_HANDLE set to undefined` | No | Runs once at process start, before any request exists | None (no user involved) |
| Edge middleware (`src/middleware.ts`) | `Route Request {...}` (every page navigation and every API request) | No | Runs in the Next.js Edge runtime, which cannot use the Node logger or `AsyncLocalStorage` | None - but the same request's `/api/*` work is attributed |
| OIDC auth routes (`/api/auth/*`, `bind-session`) | sign-in / sign-out / callback, DPoP key binding | No (with one exception) | NextAuth / raw handlers, not wrapped by `withMiddleware` | Exception: the `jwt` callback hand-builds the `Session established` record, so login is captured |
| Server-rendered page code (`getServerSideProps`) - notably connection tests | `Starting connection tests`, `... test PASS/FAIL for '<dest>'`, `Connection Test Results` | No | `withMiddleware` only wraps `/api/*` routes; page server-side rendering runs outside it | Hand-built `userContext` / `userId` / `user` (operator still attributed) |
| Background / non-request work | swagger doc generation, any scheduled or boot-time tasks | No | Not triggered by an authenticated request | None |

### Server-rendered pages (`getServerSideProps`): two kinds

`withMiddleware` only wraps `/api/*` routes, so any data access inside a page's `getServerSideProps` runs without the context. But these pages are not all equal - what matters is *how* each one gets its data:

| Page (`getServerSideProps`) | Server-side data access | Through `/api/*` (attributed)? | Page-view gap? |
|---|---|---|---|
| `onboarding` | `fetch('/api/allowedusers/bydestination')` | Yes - calls the API route server-side | No - appears as an attributed `API Request` line* |
| `passwordencryption` | none (session check only) | n/a | No |
| `manageconnections` | direct DB: `fetchDestination`, `fetchDestinationChangeRequest...` | No - hits DynamoDB directly | Yes |
| `changerequest/[...slug]` | direct DB: `fetchDestinationChangeRequest...` | No | Yes |
| `testreport` | direct DB `fetchDestination` + `connectionTest` | No | Yes |
| `test/[...slug]` | direct DB `fetchDestination` + `connectionTest` | No | Yes (the connection test) |

\* assuming the auth cookie is forwarded on that server-side fetch, which is the normal pattern.

So the connection-test page is **not special** - it is one of a class: pages that read data **directly from the DB in `getServerSideProps`**. On those, viewing the page is a real data read (destinations, change requests, test results) that is not an `/api/*` call, produces DB-layer log lines with no `sessionUser`, and leaves only the anonymous `Route Request` as the record that the user hit that page.

**How to tell, for any page:** inspect its `getServerSideProps`.
- Direct data access (`DbClientFactory.getDbClient()`, repository/DB calls, `connectionTest`, decrypt) -> an unattributed page-view data read (gap).
- Data fetched via `/api/*` (a server-side `fetch` to an API route) -> attributed on the API line (no gap).
- No data access (renders only / client-side fetches) -> only "page viewed" is uncaptured, which is pure view-auditing.

## How to decide "should we care?" per row

For each "No", the question is: is it already attributed, and does it matter for audit?

- **API routes** - covered; nothing to decide.
- **Startup / background** - no user is involved, so there is nothing to attribute. Low concern.
- **Auth routes** - login/logout is already captured (the `Session established` record plus Okta's own System Log). Low concern.
- **Edge `Route Request`** - bare page-view lines (`path`/`method`/`ip`/`userAgent`, no business data). For pages whose data loads via `/api/*`, the data access is attributed on the API line, so the only uncaptured thing is "who viewed this page" (pure view-auditing). Decision: do we need bare page-view attribution? (Likely low value.)
- **Server-side page-load data reads (`getServerSideProps` direct DB)** - the real candidate. On `manageconnections`, `changerequest`, `testreport`, and `test` (connection test), viewing the page reads data directly from the DB with no `sessionUser`. The connection-test page additionally has a hand-built `userContext` (operator), but the others have no identity on those reads at all. This is the class most worth a conscious decision.

Net: the genuine judgment call is whether to attribute **server-side page-load data reads**. The connection test is just the most visible member of that class. The remaining "No" rows (startup, auth routes, background, and pure page-view `Route Request` lines for pages that fetch via `/api/*`) are either covered elsewhere or genuinely user-less.

## Options if we want to close the page-SSR gap (future follow-up)

This is a class (see the `getServerSideProps` table above), not just the connection test, and they share one root cause: page server-side code runs outside `withMiddleware`. Options:

- **Establish the request context in `getServerSideProps`** - wrap the data-access call in the same `AsyncLocalStorage` context `withMiddleware` builds (`asyncRequestContext.run(context, ...)`). This is the cleanest fit: it reuses the existing automatic injection, so every log line in those reads gets `sessionUser` with no logger or DB-layer changes. Ideally factor the context-builder out of `withMiddleware` into a shared helper so the two places do not drift. Applying it across the `getServerSideProps` pages closes the whole class uniformly.
- **Route the data access through `/api/*`** - have the pages fetch via existing/new API routes (already `withMiddleware`-wrapped) instead of direct DB calls. Larger change: it reworks each page's data flow (server render -> fetch), so it is more invasive.
- **Standardize the existing `userContext` onto `sessionUser`** (connection test only) - localized but manual and partial; does not help the other pages.

All are out of scope for the current change; they are options for a separate follow-up if the team decides the gap matters. The first option is the recommended approach because it generalizes and reuses the mechanism this change already relies on.
