## ADDED Requirements

### Requirement: Server-side page-load renders carry sessionUser

Every authenticated page render in `getServerSideProps` SHALL execute inside the request context so its log events — including downstream DB-layer logs — carry the `sessionUser` object, the same way `/api/*` requests do. This SHALL be applied uniformly via a shared `withRequestContext(getServerSideProps)` wrapper so that every page defining `getServerSideProps` is covered — current pages (`manageconnections`, `changerequest/[...slug]`, `testreport`, `test/[...slug]`, `onboarding`, `passwordencryption`) and any page added later — without per-page wiring. Existing identity fields on those lines (for example the connection test's `userContext`) SHALL be preserved (additive).

#### Scenario: Page-load read is attributed

- **WHEN** an authenticated user loads a page whose `getServerSideProps` reads data server-side (e.g. Manage Connections reading destinations / change requests)
- **THEN** the resulting log events include the `sessionUser` object

#### Scenario: New SSR page is attributed by construction

- **WHEN** a new page is added that defines `getServerSideProps` wrapped with the shared `withRequestContext` helper
- **THEN** its authenticated server-side render logs include `sessionUser` without any additional per-page context wiring

#### Scenario: Connection test is attributed while preserving existing fields

- **WHEN** an authenticated user runs a connection test (the `test/[...slug]` page's `getServerSideProps`)
- **THEN** the connection-test log lines include `sessionUser` and still include the existing `userContext` block

#### Scenario: No session on a page read does not fabricate identity

- **WHEN** `getServerSideProps` runs without a resolvable authenticated session
- **THEN** no `sessionUser` identity values are emitted (the injector no-ops), consistent with the API path

## MODIFIED Requirements

### Requirement: Session identity attached to user-initiated log events

Every log event generated while handling an authenticated user interaction SHALL include a `sessionUser` object so the event can be traced back to the initiating user and login session. The object SHALL have the shape:

```json
"sessionUser": { "name": "...", "userId": "...", "email": "...", "sessionId": "...", "jti": "...", "authTime": 0, "ip": "..." }
```

`sessionUser` SHALL be sourced from the active request context (the `AsyncLocalStorage` in `src/lib/Context.ts`) and injected automatically by the logging layer, not by each individual call site. The request context SHALL be established both by `withMiddleware` (for `/api/*` routes) and by every authenticated `getServerSideProps` (page server-side render), wrapped uniformly via the shared `withRequestContext` helper, so server-side page renders are attributed the same way as API requests.

#### Scenario: Authenticated API request log carries sessionUser

- **WHEN** an authenticated user invokes an API route wrapped by `withMiddleware` and any code in that request logs a message
- **THEN** the emitted log event includes a `sessionUser` object populated with `name`, `userId`, `email`, `sessionId`, `jti`, `authTime`, and `ip`

#### Scenario: Injected without per-call-site changes

- **WHEN** existing code logs via the shared logger or a monkey-patched `console.*` method during an authenticated request
- **THEN** `sessionUser` is present on that event without the call site explicitly passing identity fields

### Requirement: Behavior when no authenticated context is present

Log events emitted outside an authenticated user request — including application startup, background tasks, and unauthenticated requests — SHALL be emitted without a populated `sessionUser` object rather than failing or emitting placeholder identity values.

#### Scenario: Startup log has no sessionUser

- **WHEN** the application logs during startup before any request is handled
- **THEN** the log event is emitted successfully and omits `sessionUser`

#### Scenario: Unauthenticated request does not fabricate identity

- **WHEN** a request without an authenticated session produces a log event
- **THEN** the event does not report `sessionUser` identity values belonging to any user

> Non-normative: the Edge-runtime `Route Request` log (`src/middleware.ts`, page navigations) remains anonymous and is **out of scope** — the Edge runtime cannot use the Node logger or `AsyncLocalStorage`; structuring it is a separate follow-up. Server-side page renders in `getServerSideProps` **are** attributed (see "Server-side page-load renders carry sessionUser"). Pages with no `getServerSideProps` (client-side + `/api/*` only) were already attributed via the API path.
