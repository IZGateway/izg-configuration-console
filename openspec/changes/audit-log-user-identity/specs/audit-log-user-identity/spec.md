## ADDED Requirements

### Requirement: User identity attached to user-initiated log events

Every log event generated while handling an authenticated user interaction SHALL include a standardized `user` identity block so the event can be traced back to the initiating user. The block SHALL have the shape:

```json
"user": { "name": "...", "userId": "...", "email": "...", "sessionId": "..." }
```

Identity SHALL be sourced from the active request context (the `AsyncLocalStorage` populated by `withMiddleware`) and injected automatically by the logging layer, not by each individual call site.

#### Scenario: Authenticated API request log carries identity

- **WHEN** an authenticated user invokes an API route wrapped by `withMiddleware` and any code in that request logs a message
- **THEN** the emitted log event includes a `user` block populated with the user's `name`, `userId`, `email`, and `sessionId`

#### Scenario: Identity injected without per-call-site changes

- **WHEN** existing code logs via the shared logger or a monkey-patched `console.*` method during an authenticated request
- **THEN** the `user` block is present on that event without the call site explicitly passing user fields

### Requirement: Session identifier is non-replayable and session-scoped

The `sessionId` field SHALL be captured at sign-in, persisted on the session token, and SHALL remain stable for the lifetime of a login session, with a new value on each new login. It SHALL be a non-secret identifier that cannot be replayed to gain access. The system SHALL also capture the token `auth_time` to support correlation with the Okta System Log. The system SHALL NOT log any raw JWT, access token, ID token, or session cookie value.

> The concrete source of `sessionId` is an open decision pending reporter confirmation (see design.md D2): the Okta `sid` claim (direct Okta-log correlation, requires an Okta SLO config change) or a CC-owned opaque session id (indirect correlation via `userId` + `auth_time` + source IP). The Okta ID token `jti` is explicitly excluded — it is not pivotable in the Okta System Log and identifies the token, not the session.

#### Scenario: Session identifier stable across a login session

- **WHEN** an authenticated user performs multiple actions within a single login session
- **THEN** every resulting log event reports the same `sessionId` value

#### Scenario: New login produces a new session identifier

- **WHEN** a user signs out and signs back in
- **THEN** log events for the new session report a different `sessionId` than the prior session

#### Scenario: No secret material is logged

- **WHEN** any log event is emitted with the `user` block
- **THEN** the event contains no raw JWT, access token, ID token, or session cookie value

### Requirement: Behavior when no authenticated context is present

Log events emitted outside an authenticated user request — including application startup, background tasks, and unauthenticated requests — SHALL be emitted without a populated `user` identity block rather than failing or emitting placeholder identity values.

#### Scenario: Startup log has no user block

- **WHEN** the application logs during startup before any request is handled
- **THEN** the log event is emitted successfully and omits the `user` identity block

#### Scenario: Unauthenticated request does not fabricate identity

- **WHEN** a request without an authenticated session produces a log event
- **THEN** the event does not report `name`, `userId`, `email`, or `sessionId` values belonging to any user

### Requirement: Page-navigation (Edge middleware) logs carry identity

The `Route Request` log emitted by the Edge middleware (`src/middleware.ts`) for authenticated page navigations SHALL include the user identity, sourced from the decoded next-auth token (`req.nextauth.token`) since the Edge runtime cannot access the Node request-context storage.

#### Scenario: Authenticated page navigation is attributed

- **WHEN** an authenticated user navigates to a protected page
- **THEN** the `Route Request` log event includes the user's `userId`, `email`, and `sessionId`

#### Scenario: Pre-binding or unauthenticated navigation is not falsely attributed

- **WHEN** a `Route Request` is logged for a navigation with no decoded next-auth token
- **THEN** the event omits user identity rather than reporting another user's values

### Requirement: Consistent identity shape across all log producers

All log producers that previously attached ad hoc user fields (the `API Request` middleware line and the Elasticsearch query handler) SHALL emit the standardized `user` block, replacing inconsistent representations such as a bare display-name string or a bare email string.

#### Scenario: Elasticsearch query log uses standardized block

- **WHEN** the Elasticsearch query handler logs a query event for an authenticated admin user
- **THEN** identity is reported as the standardized `user` block, not as a standalone `user` email string

#### Scenario: API Request log uses standardized block

- **WHEN** the `API Request` middleware line is emitted
- **THEN** identity is reported as the standardized `user` block consistent with all other log events
