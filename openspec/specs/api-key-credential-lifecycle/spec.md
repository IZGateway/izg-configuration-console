# api-key-credential-lifecycle Specification

## Purpose

Let a sender manage the credentials it uses to send data to IZ Gateway destinations:
create a credential, reveal its token once, renew it with a grace period so connected
systems can cut over without disruption, revoke it when it is compromised, and cancel a
request that was never completed. A sender may hold several credentials at once, so that
separate systems carry separate identities.

This specification covers what the **Configuration Console** writes and enforces. The Hub
reads `environments` and `useTypes` from the credential record by `jti` at routing time
and enforces them there (IGDD-3257). Those are deliberately server-side properties rather
than JWT claims, so a sender's scope can change without reissuing the token.

> **Provenance.** Synthesized on 2026-09-30 from two archived changes:
> `2026-09-30-api-key-management` (capabilities `credential-lifecycle`,
> `jurisdiction-policy`) and `2026-09-30-api-key-management-ui` (capability
> `api-key-management`). Where the two disagreed, the later `api-key-management-ui` spec
> was preferred, because it was reconciled against shipped code. Six claims from the
> earlier spec were corrected against the implementation, and each correction is noted at
> the requirement it affects.

## Requirements

### Requirement: Credential creation records the request before DNS validation

An `ApiKeyCredential` record SHALL be created immediately when an organization requests a
key. For a new domain the record carries `ready_for_validation` status and no expiry. The
token is not issuable until DNS ownership is proven.

#### Scenario: A new domain creates a pending credential

- **WHEN** `POST /api/apikeys` is called with `dnsChoice: 'other'` for a domain that is
  not already authorized
- **THEN** an `ApiKeyCredential` record is created with `status = 'ready_for_validation'`,
  the submitted domain, and the caller's `jurisdictionId`
- **AND** an `ApiKeyDomain` record at `sortKey = {envId}#{jurisdictionId}#{domain}` is
  created or refreshed with `status = 'pending_challenge'`
- **AND** the response carries the DNS challenge details together with the new
  credential's `jti` and `sortKey`

#### Scenario: An already-authorized domain issues an active credential at once

- **WHEN** `POST /api/apikeys` is called for a domain whose `ApiKeyDomain` record is
  `authorized` with `authExpiresAt` in the future, in every requested environment
- **THEN** an `ApiKeyCredential` record is created with `status = 'active'`
- **AND** the token is NOT returned in that response, but deferred to the first call to
  `POST /api/apikeys/token`
- **AND** this SHALL hold whether the domain was picked from the authorized list
  (`dnsChoice: 'existing'`) or typed in (`dnsChoice: 'other'`), so re-entering a known
  domain does not start a redundant challenge

#### Scenario: An expired authorization is rejected rather than reused

- **WHEN** `POST /api/apikeys` is called with `dnsChoice: 'existing'` and the selected
  domain's `authExpiresAt` has passed, or its status is not `authorized`
- **THEN** the request SHALL be rejected with an error naming the environment whose
  authorization is missing

### Requirement: Credentials are identified by a bare `jti`, and may span multiple environments

The credential's DynamoDB sort key SHALL be the bare `jti`, with environment membership
held in an `environments` attribute rather than encoded in the key, because the Hub reads
a credential directly by `jti`.

#### Scenario: New credentials are keyed by bare jti

- **WHEN** a credential is created by any path — new-domain challenge, existing domain,
  renewal, or re-issue
- **THEN** its `sortKey` SHALL equal its `jti` exactly, with no environment prefix

#### Scenario: Environment membership is a deduped set

- **WHEN** `environments` is persisted
- **THEN** it SHALL be written as a DynamoDB Number Set (`NS`), so duplicate environment
  ids cannot accumulate
- **AND** on read it SHALL be presented as a list of numbers, falling back to a single
  legacy `env` value so credentials written before this model keep their environment

#### Scenario: Standard credentials are single-environment

- **WHEN** a non-administrator creates a credential
- **THEN** the credential's `environments` SHALL contain exactly one environment id

#### Scenario: Only an administrator may create a multi-environment credential

- **WHEN** `POST /api/apikeys` is called requesting more than one environment
- **THEN** the request SHALL succeed only if the caller is an administrator, and SHALL be
  rejected with `403` otherwise, even for a caller who may create single-environment keys
- **AND** the domain SHALL be authorized, or successfully challenged, in every requested
  environment

> **Corrected against the implementation.** The earlier `credential-lifecycle` spec
> described this gate as "IZG Operations or Jurisdiction Operations". The route gates on
> `session.user.isAdmin`, which is IZG Operations only. It also validates each requested
> environment id as a number in the range 1–5.

### Requirement: Credential status follows a defined state machine

`ApiKeyCredential.status` SHALL follow only these transitions:

- `ready_for_validation` → `active` (DNS verification succeeds)
- `ready_for_validation` → `cancelled` (cancellation confirmed; a soft delete)
- `active` → `grace_period` (renewal requested)
- `active` → `revoked` (revocation confirmed)
- `grace_period` → `revoked` (revocation confirmed during the grace period)

#### Scenario: DNS verification activates a pending credential

- **WHEN** DNS verification succeeds for the domain bound to a `ready_for_validation`
  credential
- **THEN** that credential's status SHALL become `active`

#### Scenario: A terminal credential accepts no further transition

- **WHEN** any lifecycle operation is attempted on a credential whose status is `revoked`
  or `cancelled`
- **THEN** the request SHALL be rejected, and no renew, re-issue or other lifecycle
  action SHALL be offered for it

#### Scenario: Activation is bound to the verified domain

- **WHEN** DNS verification succeeds for one domain
- **THEN** only a credential bound to that same domain SHALL be activated
- **AND** a credential bound to a different domain SHALL be refused

#### Scenario: `expired` is derived, never persisted by the Console

- **WHEN** a credential passes its expiry
- **THEN** the Console SHALL NOT write an `expired` status
- **AND** expiry SHALL be presented as a derived display status, so the stored record
  stays the Hub's and the sweeper's to own

### Requirement: Credential expiry is computed at issuance

A credential's expiry SHALL be anchored to the moment the key becomes usable, not to when
the request record was created.

#### Scenario: A DNS-challenge credential is stamped at activation

- **WHEN** a `ready_for_validation` credential passes DNS verification
- **THEN** `issuedAt` SHALL be stamped at that moment, and `expiresAt` SHALL be set to
  one year after it
- **AND** before activation the pending record SHALL carry no expiry
- **AND** the token's `iat` SHALL reflect the issuance instant, falling back to
  `createdOn` for a credential issued at creation time

### Requirement: Displayed status never asserts a stored status the Console cannot see

The credential list SHALL distinguish `Grace Period`, `Expired`, `Revoked` and
`Cancelled`. Where a status depends on a transition that a background sweeper owns, the
display SHALL report what it can prove and flag that the stored record has not caught up,
rather than naming a status the database does not hold.

#### Scenario: A stored terminal status always wins

- **WHEN** a credential's stored status is `revoked`, `cancelled` or `expired`
- **THEN** that status SHALL be displayed, without further derivation

#### Scenario: A renewed credential inside its grace window

- **WHEN** a credential carries a `graceExpiresAt` and the current time is before the
  effective grace end, which is the earlier of `graceExpiresAt` and the token's expiry
- **THEN** the status SHALL display as `Grace Period`

#### Scenario: The token expires before the grace window ends

- **WHEN** the effective grace end has passed and the token's expiry fell on or before
  `graceExpiresAt`
- **THEN** the status SHALL display as `Expired`, because the token itself can no longer
  be used whatever the stored status says

#### Scenario: The grace window elapses before the token expires

- **WHEN** the grace window has structurally elapsed but the token has not yet expired
- **THEN** the status SHALL remain `Grace Period` and SHALL additionally be flagged as
  awaiting the sweeper
- **AND** it SHALL NOT display as `Revoked`, because no revocation has been recorded and
  claiming one would describe a database state that does not exist

> **Corrected against the implementation.** The earlier `api-key-management-ui` spec ended
> this algorithm with "otherwise `Revoked`". `computeDisplayStatus` never derives
> `Revoked`; it returns `Grace Period` with a pending-sweeper flag. The change was made
> because a derived `Revoked` told operators a key had been revoked when the record said
> otherwise. Verified by release QA on 2026-09-03 (IGDD-3184, retest item 4).

#### Scenario: A non-renewed credential past its expiry

- **WHEN** a credential carries no `graceExpiresAt` and the current time is at or past
  its expiry
- **THEN** the status SHALL display as `Expired`

### Requirement: Renewal issues a new credential and moves the old one to grace_period

Renewing an active credential SHALL create a new credential and move the existing one to
`grace_period`, so both work while connected systems cut over. Renewal SHALL NOT change
the credential's domain, jurisdiction or environment scope.

#### Scenario: Renewal is valid only from active

- **WHEN** renewal is requested for a credential whose status is not `active`
- **THEN** the request SHALL be rejected with `409`

#### Scenario: The renewed credential inherits its identity from the record

- **WHEN** a credential is renewed
- **THEN** the new credential SHALL take its domain, jurisdiction, `environments` and
  `useTypes` from the credential being renewed
- **AND** any value for those fields supplied in the request SHALL be ignored, so a
  renewal cannot redirect a credential to a domain that was never proven
- **AND** a credential with no domain, or no environments, on record SHALL be refused
  with `409` rather than renewed into an ambiguous state

#### Scenario: Expiry more than thirty days out runs one year from today

- **WHEN** renewal is requested more than thirty days before the existing credential's
  expiry
- **THEN** the new credential's `expiresAt` SHALL be one year from the renewal date

#### Scenario: Expiry within thirty days extends the original date

- **WHEN** renewal is requested within thirty days of the existing credential's expiry,
  or after it
- **THEN** the new credential's `expiresAt` SHALL be one year from the **original**
  expiry date, so repeated renewals do not erode the anniversary

#### Scenario: The grace values match what the Hub reads

- **WHEN** a credential is superseded by a renewal
- **THEN** its status SHALL be set to `grace_period`, the value the Hub treats as usable
  and its grace-revocation sweep selects
- **AND** `graceExpiresAt` SHALL be set ten business days from the renewal date
- **AND** the successor's `jti` SHALL be written to the old credential's `supersededBy`
  attribute, which is the only on-record link from a renewed credential to its replacement

#### Scenario: Concurrent renewals cannot both succeed

- **WHEN** two renewal requests for the same credential race
- **THEN** the supersede write SHALL be conditioned on the old credential still being
  `active`, so only one request creates a successor
- **AND** the losing request SHALL receive the same `409` as a renewal attempted on an
  already-renewed credential

> **Business days means weekends only.** The ten-day grace window excludes Saturdays and
> Sundays. It does **not** exclude US federal holidays. The earlier `credential-lifecycle`
> spec claimed it excluded both. A holiday calendar was considered and deferred as not
> worth the effort for a window this short (IGDD-3184, 2026-09-08).

> **Known limitation — renewal does not re-verify domain authorization.** The earlier
> `credential-lifecycle` spec carried a scenario requiring renewal to confirm the
> credential's domain is still an `authorized`, unexpired `ApiKeyDomain`. That check was
> never implemented. Renewal reads the domain from the stored credential and does not
> re-read the authorization record, so a renewal can extend a credential whose domain
> authorization has since lapsed. The original risk — a renewal accepting an unproven
> domain — is closed, because the domain never comes from the request. Re-issue **does**
> carry this gate, so the two paths differ. Recorded in
> `~/Downloads/izg-cc-openspec-archive.md`, section 1. No ticket owns it yet.

### Requirement: An expired credential can be re-issued, but is never renewed

The `active → grace_period` transition SHALL remain valid only from `active`. An expired
credential SHALL instead be offered re-issuance, which produces a new credential rather
than a transition on the old one.

#### Scenario: Re-issue creates a fresh credential with no grace overlap

- **WHEN** an expired credential is re-issued
- **THEN** a new credential SHALL be created with a fresh `jti` and an expiry one year
  out, for the same organization, environments and use types
- **AND** the expired credential SHALL be left otherwise untouched, with no grace period
  and no status change, because an expired key has nothing to overlap with

#### Scenario: Re-issue happens at most once per credential

- **WHEN** re-issue is attempted for a credential that has already been re-issued
- **THEN** the request SHALL be rejected with `409`
- **AND** the marker recording the successor SHALL be written under a condition that no
  successor already exists, so two concurrent attempts cannot both succeed
- **AND** that marker SHALL NOT be written when the re-issue subsequently fails, so a
  failed attempt leaves nothing dangling

#### Scenario: Re-issue re-runs DNS verification if the domain authorization lapsed

- **WHEN** an expired credential is re-issued and its domain's `authExpiresAt` has also
  passed
- **THEN** the request SHALL be routed through the DNS TXT challenge before the new
  credential becomes active
- **AND** where the domain is still authorized, the new credential SHALL be issued at once
  with no DNS step

#### Scenario: Re-issue across jurisdictions is refused

- **WHEN** re-issue names a credential belonging to a different jurisdiction from the one
  in the request
- **THEN** the request SHALL be rejected with `403`

### Requirement: Revoke and cancel are distinct operations

Revoking an `active` or `grace_period` credential and cancelling a `ready_for_validation`
request SHALL be distinct operations, with different effects, different endpoints and
different confirmation wording.

#### Scenario: Cancel is a soft delete that retains the record

- **WHEN** cancellation is confirmed for a credential in `ready_for_validation`
- **THEN** its status SHALL be set to `cancelled` with `cancelledBy` and `cancelledAt`,
  and the record SHALL be retained for audit rather than deleted
- **AND** no `revokedAt` SHALL be recorded
- **AND** the confirmation dialog and success message SHALL describe the outcome as
  cancelled with the record retained, not as removed

#### Scenario: Cancelled credentials are hidden by default but filterable

- **WHEN** the credential list is shown with no explicit status filter
- **THEN** `cancelled` rows SHALL be excluded
- **AND** selecting the `cancelled` status SHALL surface them

#### Scenario: Revoke records who and why

- **WHEN** revocation is confirmed for a credential in `active` or `grace_period`,
  optionally with a reason
- **THEN** its status SHALL be set to `revoked` with a revocation timestamp, the actor,
  and the reason where one was given

#### Scenario: Each action is offered only from its own statuses

- **WHEN** the action controls are rendered for a credential
- **THEN** a credential in `active` or `grace_period` SHALL offer revoke and not cancel
- **AND** a credential in `ready_for_validation` SHALL offer cancel and not revoke

#### Scenario: Both writes are atomic against a concurrent status change

- **WHEN** a revoke, cancel or supersede write is issued
- **THEN** it SHALL be conditioned on the credential's current status, not merely on the
  row existing
- **AND** a concurrent status change that invalidates the operation SHALL cause the write
  to fail rather than silently apply
- **AND** the route SHALL surface that failure as the same error it returns for the
  already-checked case, so a lost race and a stale request look alike to the caller

### Requirement: A token can be revealed exactly once, atomically

`POST /api/apikeys/token` SHALL NOT allow a token to be retrieved successfully by more
than one request, even under concurrent calls.

#### Scenario: The first reveal succeeds and marks the credential viewed

- **WHEN** the token is requested for an `active` credential that has never been viewed
- **THEN** the token SHALL be returned, and the credential SHALL be marked viewed under a
  condition that it was not already viewed
- **AND** the actor who performed the reveal SHALL be recorded, so the record shows to
  whom a live bearer credential was handed out

#### Scenario: A second or concurrent reveal is refused

- **WHEN** the token is requested again, or two requests race and only one atomic write
  can succeed
- **THEN** the losing request SHALL receive `410`, the same response as a request made
  after the fact, rather than a generic server error

#### Scenario: Reveal is refused for a credential that is not active

- **WHEN** the token is requested for a credential whose status is not `active`
- **THEN** the request SHALL be rejected and no token SHALL be generated or returned

> **Corrected against the implementation.** The earlier `credential-lifecycle` spec
> carried a scenario stating that repeated reveals return the same token and update
> `viewedAt` on each call. The implemented behavior is reveal-exactly-once: a second
> request receives `410`. The token is still deterministic for identical input, but it is
> no longer served twice.

### Requirement: The JWT carries identity claims only, and is re-signed on demand

The token SHALL NOT be persisted. It SHALL be regenerated on each reveal by re-signing
the credential's stored claims, and it SHALL carry no access-control property that the
Hub can instead read from the credential record.

#### Scenario: The claim set is identity only

- **WHEN** a token is signed
- **THEN** its payload SHALL carry `iss`, `sub` (the jurisdiction id), `jti`, `upn` (the
  domain), `iat` and `exp`, and nothing else
- **AND** it SHALL NOT carry an `env` claim, a `useTypes` claim, or a `roles` claim

#### Scenario: The signature identifies its secret version

- **WHEN** a token is signed
- **THEN** it SHALL use HMAC-SHA256 with the signing secret held in AWS Secrets Manager
- **AND** its header SHALL carry a `kid` identifying the secret version used, so the Hub
  can select the matching version to verify the signature

### Requirement: Use types are captured and validated on the credential

A credential SHALL record one or more submitter use types — `PATIENT`, `PROVIDER` or
`PUBLIC_HEALTH` — as a server-side property rather than a token claim.

#### Scenario: Create requires valid use types

- **WHEN** `POST /api/apikeys` is called
- **THEN** it SHALL reject with `400` a missing or empty `useTypes`, or any value outside
  the enumeration
- **AND** on success it SHALL store `useTypes` as a deduped DynamoDB String Set (`SS`)
- **AND** on read each value SHALL be filtered through the enumeration guard, so an
  unrecognized stored value cannot reach the rest of the application

#### Scenario: Renewal inherits use types from the record

- **WHEN** a credential is renewed
- **THEN** the new credential SHALL take its `useTypes` from the credential being
  renewed, not from the request

#### Scenario: Re-issue takes use types from the request, pre-filled from the old credential

- **WHEN** an expired credential is re-issued
- **THEN** the new credential's `useTypes` SHALL come from the request body, which the
  Create dialog pre-fills from the expired credential
- **AND** the values SHALL be validated against the enumeration as for any create

> **Corrected against the implementation.** The earlier `api-key-management-ui` spec
> stated that both renewal and re-issue inherit use types. Only renewal reads them from
> the record. Re-issue reads them from the request, so the two paths are specified
> separately above.

#### Scenario: The Create dialog narrows use types to the organization's registration

- **WHEN** an organization is selected in the Create dialog and its row carries a
  non-empty `useTypes`
- **THEN** the picker SHALL offer only that organization's registered use types
- **AND** where the organization carries none, because it is not yet seeded, the picker
  SHALL fall back to the full enumeration so creation is not blocked

#### Scenario: The Create dialog's organization list holds senders only

- **WHEN** the organization dropdown is populated
- **THEN** only rows carrying a non-empty `useTypes` SHALL be offered, which includes
  rows acting as both sender and jurisdiction
- **AND** destination-only jurisdictions, which carry `allowedUseTypes` and no
  `useTypes`, SHALL be excluded, because a submitter credential cannot be issued to one

> **Known limitation — the narrowing is not enforced server-side.** The create route
> validates `useTypes` against the enumeration only. It does not check the requested
> values against the selected organization's own `useTypes`, so a direct API call can
> declare a broader scope than the organization is registered for. The narrowing in the
> dialog is presentation. This was deferred deliberately, to keep unseeded sender data
> visible rather than masked by a tolerant check, and that reason expires once IGDD-3258
> seeds sender rows. Recorded in `~/Downloads/izg-cc-openspec-archive.md`, section 4.

### Requirement: A credential's use types are visible in the keys list

The keys list SHALL display the use types recorded on each credential. Use types decide
which data populations a credential can submit, so an operator MUST be able to read them
from the list itself, without an action on the row.

The keys list renders as a grid on a wide viewport and as one card per key on a narrow one.
Both forms SHALL display the use types the same way.

#### Scenario: Each key displays its use types by label

- **WHEN** the keys list renders a credential that carries one or more use types
- **THEN** the grid row or card SHALL display each of those use types by its human-readable
  label — `PATIENT` as "Patient", `PROVIDER` as "Provider", `PUBLIC_HEALTH` as "Public
  Health"
- **AND** the labels SHALL appear in the canonical enumeration order, `PATIENT` then
  `PROVIDER` then `PUBLIC_HEALTH`, because storage is an unordered String Set and stored
  order is therefore not a stable thing to display
- **AND** the values SHALL pass through the enumeration guard first, so a stored value
  outside the enumeration cannot reach the display

#### Scenario: Use types wrap rather than clip

- **WHEN** a credential's use types do not fit on one line of the cell
- **THEN** they SHALL wrap onto further lines, and no label SHALL be clipped
- **AND** the row SHALL grow to fit its content, as every row in the keys grid does

#### Scenario: Only two or more hidden use types collapse behind a count

- **WHEN** showing every use type would leave two or more beyond the first two
- **THEN** the cell SHALL display the first two labels in canonical order, followed by a
  count of the remainder
- **AND** the complete list SHALL be reachable from that count, by pointer or by keyboard,
  without navigation away from the list
- **AND** when only one use type lies beyond the first two, it SHALL be shown as its own
  label rather than as a count, because a count of one takes as much room as the label it
  hides

> The enumeration holds three use types today, so no credential reaches the count. Every
> credential therefore shows every label. The rule is stated so that a fourth use type does
> not change the display without a decision.

#### Scenario: A credential with no recorded use types still renders

- **WHEN** a credential carries no use types
- **THEN** the grid row or card SHALL display "None" rather than an empty cell
- **AND** the list SHALL NOT fail to render that credential

> Every credential created through the Console carries at least one use type, because the
> Create dialog rejects an empty selection. This scenario covers a malformed or legacy row:
> `useTypes` is an optional property and the store is schemaless, so absence is reachable.

#### Scenario: The use types column sorts on its labels

- **WHEN** the operator sorts the keys grid by the use types column
- **THEN** rows SHALL order by their use-type labels taken in canonical order
- **AND** rows with no use types SHALL group together rather than scatter through the list

> The column sorts on a derived string, so rows with no use types carry the em dash as
> their sort key. The grid compares that string with the platform collation, which places
> punctuation before letters. Those rows therefore group at the start in ascending order
> and at the end in descending order. The requirement is that their position is
> predictable, not that it is the last position.

#### Scenario: The use types column is in the default column view

- **WHEN** the keys grid renders in its default column view, or the operator restores that
  view
- **THEN** the use types column SHALL be visible
- **AND** it SHALL sit between the DNS and STATUS columns

### Requirement: The dialogs that act on a credential state its use types

A dialog that reports an existing credential's recorded scope SHALL state that credential's
use types, read-only. The operator MUST be able to read the scope at the moment of acting on
the key, and MUST NOT be able to change it there.

#### Scenario: The Renew dialog states the use types it will carry over

- **WHEN** the Renew dialog opens for a credential
- **THEN** it SHALL display that credential's use types, by label and in canonical order,
  alongside the Jurisdiction, Environment and Domain it already carries over
- **AND** the field SHALL be read-only, because renewal takes use types from the record and
  not from the request
- **AND** the operator SHALL NOT be offered any control that changes them

#### Scenario: The Re-issue dialog states the use types it will request

- **WHEN** the Re-issue dialog opens its confirmation step for an expired credential
- **THEN** it SHALL display that credential's use types, read-only, alongside the
  Jurisdiction and Environment

> This states behaviour that already exists. This change only routes the field through the
> shared helper, so that its order is canonical. It is written down because nothing
> specified it, and an unspecified display is free to disappear in a refactor.

#### Scenario: The one-time token reveal does not state the use types

- **WHEN** the one-time token reveal dialog opens
- **THEN** it SHALL display the key expiry and the token string, and SHALL NOT display the
  use types
- **AND** this is deliberate: that dialog hands over a secret that is shown once and never
  again, so its content stays minimal and its reader stays on the one task

#### Scenario: Every surface uses the same labels and the same order

- **WHEN** any surface displays a credential's use types — the grid, a card or any dialog
- **THEN** it SHALL use the same human-readable labels and the same canonical order
- **AND** it SHALL apply the same enumeration guard, so no surface shows a value that
  another surface drops

> The empty value is the one place the surfaces differ. The grid and the cards show "None".
> A dialog field shows an em dash, like every other empty read-only field in those dialogs.

### Requirement: The keys list can be narrowed by use type

An operator SHALL be able to reduce the keys list to the credentials carrying a given use
type, both by an explicit filter and by free-text search.

#### Scenario: The filter selects every credential carrying the chosen use type

- **WHEN** the operator chooses a use type in the keys-list filter
- **THEN** the list SHALL show every credential that carries that use type, whether or not it
  carries others as well
- **AND** a credential carrying none SHALL be excluded
- **AND** it SHALL compose with the other filters and with the text search, as the
  requirement "The credential list is returned whole and filtered client-side" requires

#### Scenario: The filter is reported and cleared like its neighbours

- **WHEN** a use-type filter is active
- **THEN** the active-filter count SHALL include it
- **AND** the control that clears all filters SHALL clear it

#### Scenario: Free-text search matches a use-type label

- **WHEN** the operator types text that matches a use-type label, case-insensitively and as a
  substring
- **THEN** the list SHALL include every credential carrying that use type
- **AND** search SHALL match the human-readable labels, not the stored enumeration values,
  because the stored forms appear nowhere an operator can read them

### Requirement: Every route enforces role and jurisdiction ownership server-side

Every `/api/apikeys/*` route SHALL enforce both a role check and a jurisdiction-ownership
check. A valid session alone SHALL NOT grant access to another jurisdiction's credentials,
nor to an action the caller's role does not permit.

#### Scenario: The server rejects a role-disallowed action whatever the UI showed

- **WHEN** a route is called by a caller whose role lacks the required permission
- **THEN** the request SHALL be rejected with `403`, independent of what the interface
  would have rendered

#### Scenario: The server rejects a cross-jurisdiction action

- **WHEN** a jurisdiction-scoped caller calls revoke, cancel, renew, token reveal or
  verify-domain for a credential or jurisdiction it does not own
- **THEN** the request SHALL be rejected
- **AND** ownership SHALL be checked before any status check, so a non-owner learns
  nothing about the target credential's state

#### Scenario: Ownership compares the jurisdiction prefix

- **WHEN** a caller's ownership of a jurisdiction is evaluated
- **THEN** it SHALL compare the jurisdiction's short code against the caller's Okta
  jurisdiction membership
- **AND** it SHALL NOT compare the jurisdiction's display name or numeric id, which do
  not correspond to Okta group membership

#### Scenario: A global role reaches every jurisdiction

- **WHEN** a caller holding a global role acts on any credential
- **THEN** the ownership restriction SHALL NOT apply, and the action SHALL proceed subject
  to the status rules for that action

#### Scenario: The credential list is scoped to owned jurisdictions

- **WHEN** the credential list is requested
- **THEN** the response SHALL contain only credentials for jurisdictions the caller owns,
  which is all of them for a global role
- **AND** the same scoping SHALL be shared with the audit-log list route, so the two can
  never disagree about what a caller may see

#### Scenario: Unauthenticated requests are refused without an audit event

- **WHEN** any of these routes is called with no session
- **THEN** the response SHALL be `401`
- **AND** no access-denied audit event SHALL be written, because an absent session is not
  a permission failure

#### Scenario: Navigation visibility follows the same permission as the routes

- **WHEN** the main navigation is rendered
- **THEN** the API Key Management link SHALL be shown on the same permission that gates
  the list route, rather than on a separate administrator flag

### Requirement: The credential list is returned whole and filtered client-side

`GET /api/apikeys` SHALL return the full list visible to the caller's role, and filtering
and pagination SHALL happen in the browser.

Server-side filtering and pagination were evaluated and deliberately not built for the
current scale: the organization count is bounded and the list is already ownership-scoped.
The correctness problems that would otherwise compound at scale were fixed directly
instead.

#### Scenario: The list is never silently truncated

- **WHEN** the credential list is requested and the underlying table scan spans more than
  one DynamoDB page
- **THEN** the response SHALL include every credential visible to the caller, not just the
  first page

#### Scenario: Jurisdiction labels are resolved once per jurisdiction

- **WHEN** the list is assembled
- **THEN** each distinct jurisdiction SHALL be resolved once, not once per credential

#### Scenario: Filters compose with the text search

- **WHEN** a user selects any combination of environment, status, organization and use type
  in the filter panel
- **THEN** the table SHALL show only matching rows
- **AND** those filters SHALL compose with the existing text search

> **Corrected against the implementation.** The earlier `credential-lifecycle` spec
> required `GET /api/apikeys` to accept `environment`, `status`, `organization`, `page`
> and `pageSize` query parameters and stated it "MUST NOT return the entire table for
> client-side filtering". No such parameters were built, and the route returns the full
> scoped list. This requirement describes what shipped. Revisit if the credential count
> per caller grows enough for the full-list response to matter.

### Requirement: Creating a duplicate-scope key warns but does not block

Creating a credential whose scope exactly matches an existing active credential for the
same organization and domain SHALL warn the user and steer them toward renewal, without
preventing creation.

#### Scenario: An exact scope match warns

- **WHEN** a create request's environments and use types exactly match those of an
  existing `active` credential for the same organization and domain
- **THEN** a warning SHALL recommend renewal instead
- **AND** the user MAY proceed on a second confirmation

#### Scenario: A different scope does not warn

- **WHEN** the environments or use types are not an exact match to any existing active
  credential for that organization and domain
- **THEN** no duplicate-scope warning SHALL be shown
