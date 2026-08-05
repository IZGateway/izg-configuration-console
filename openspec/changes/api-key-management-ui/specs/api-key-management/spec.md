# Spec: API Key Management — izg-configuration-console

## ADDED Requirements

### Requirement: Filters button applies real filters to the Keys table

The "FILTERS" button on the Keys tab MUST open a functional filter control, not a
non-interactive stub.

#### Scenario: User filters by environment, status, or organization

- **WHEN** a user opens the Filters control and selects one or more of Environment,
  Status, or Organization
- **THEN** the Keys table shows only rows matching the selected filters
- **AND** the filters compose with the existing search-by-key-ID-or-jurisdiction text input
- **AND** Environment options are scoped to the current deployment, and Organization
  options come from the full jurisdictions list (not filtered to senders — see the
  Create-dialog requirement below for that distinction)

---

### Requirement: Revoke and Cancel are distinct operations

Revoke (active/grace-period) and cancel (pending `ready_for_validation`) MUST be distinct
operations with different effects and confirmation modals.

#### Scenario: Cancel soft-cancels a pending key and retains the record

- **WHEN** a user confirms cancellation of a key in `ready_for_validation` status
- **THEN** the credential's status is set to `cancelled` with `cancelledBy`/`cancelledAt`,
  and the record is **retained** for audit (not deleted)
- **AND** the transition is permitted only from `ready_for_validation` (guarded atomically),
  and the cancellation is logged
- **AND** the confirmation dialog and success message accurately describe this as
  "cancelled" (hidden from the default list, record retained) — not "removed"

#### Scenario: Cancelled keys are hidden from the default view but filterable

- **WHEN** the Keys table is shown without an explicit Status filter
- **THEN** `cancelled` rows are excluded from the list
- **AND** selecting Status = `Cancelled` surfaces them

#### Scenario: Revoke marks an active or grace-period key as Revoked

- **WHEN** a user confirms revocation of a key in `active` or `grace_period` status,
  optionally supplying a reason
- **THEN** the credential's status is set to `revoked` with a revocation timestamp
- **AND** the Active count decrements and the Revoked count increments

#### Scenario: Cancel is not available on active or grace-period keys

- **WHEN** a key is in `active` or `grace_period` status
- **THEN** only the revoke action is available for that row, not cancel

#### Scenario: Revoke and supersede are atomic against a concurrent status change

- **WHEN** `revokeApiKeyCredential` or `supersedeApiKeyCredential` is invoked
- **THEN** the underlying write is conditioned on the credential's current status
  (revoke: the caller's revocable-status list via `#status IN (...)`; supersede:
  `status = 'active'`), not merely on the row existing
- **AND** a concurrent status change that invalidates the operation causes the write to
  fail (`ConditionalCheckFailedException`) rather than silently applying
- **AND** the calling route surfaces this failure as the same error it returns for the
  synchronous (pre-checked) case

---

### Requirement: DNS verification bypass cannot run in production

The dev-only bypass in DNS domain-ownership verification MUST NOT be reachable unless
explicitly enabled outside production.

#### Scenario: Bypass disabled by default

- **WHEN** `POST /api/apikeys/verify-domain` is called without `ALLOW_DNS_VERIFY_BYPASS=true`
- **THEN** the endpoint performs a real DNS TXT record lookup regardless of `NODE_ENV`

#### Scenario: Bypass requires explicit opt-in outside production

- **WHEN** `ALLOW_DNS_VERIFY_BYPASS=true` and `NODE_ENV !== 'production'`
- **THEN** the real DNS lookup is skipped and a warning is logged
- **AND** if `NODE_ENV === 'production'`, the bypass is ignored and a real lookup is performed

---

### Requirement: DNS ownership is proven at the domain apex

The TXT-record ownership challenge MUST be placed at the domain apex, not a
`_izg-verify.` subdomain, matching DigiCert's domain-validation convention.

#### Scenario: Challenge instructions reference the apex domain

- **WHEN** a new-domain (`dnsChoice: 'other'`) credential request is created
- **THEN** the returned challenge instructs the caller to add a TXT record at the
  domain itself (e.g. `example.gov`), value `izg-challenge=<uuid>`
- **AND** `verify-domain`'s DNS lookup queries that same apex hostname

#### Scenario: One challenge authorizes every pending environment

- **WHEN** a multi-environment credential has some environments already authorized for
  a domain and others still pending
- **THEN** a single successful TXT lookup authorizes every environment still pending
  (DNS ownership is env-independent), without requiring a separate lookup per
  environment

---

### Requirement: A domain belongs to exactly one jurisdiction, globally

A domain MUST NOT be authorized for more than one jurisdiction at a time, across any
environment.

#### Scenario: First jurisdiction to verify a domain owns it

- **WHEN** a jurisdiction's DNS TXT challenge for a domain succeeds
- **THEN** the domain is claimed for that jurisdiction via a race-safe conditional
  write, before any `ApiKeyDomain` row is marked `authorized` or any credential
  activated

#### Scenario: A second jurisdiction cannot claim an already-owned domain

- **WHEN** a different jurisdiction's DNS TXT challenge for the same domain also
  succeeds (e.g. they too added a valid TXT record)
- **THEN** the claim is refused (409) even though the DNS check passed
- **AND** no `ApiKeyDomain` row is authorized and no credential is activated for that
  request

#### Scenario: Re-verifying your own domain is idempotent

- **WHEN** a jurisdiction that already owns a domain re-verifies it (e.g. to add
  authorization for a new environment)
- **THEN** the claim succeeds again for that same jurisdiction (idempotent), and
  proceeds to authorize the newly pending environment(s)

#### Scenario: Creating a key for an already-claimed domain is refused early

- **WHEN** `POST /api/apikeys` is called with `dnsChoice: 'other'` for a domain already
  owned by a different jurisdiction
- **THEN** the request is refused (409) immediately — no credential is created and no
  DNS challenge is issued — rather than only failing later at verification time

#### Scenario: An expired authorization does not bypass DNS re-verification

- **WHEN** `verify-domain`'s already-authorized fast path evaluates a domain record
  whose `authExpiresAt` has passed
- **THEN** that record is treated as NOT authorized (falls through to requiring a
  valid pending challenge), even though its `status` is still `authorized`

---

### Requirement: Credentials are identified by a bare `jti`, and may span multiple environments

The credential's DynamoDB sort key MUST be the bare credential `jti`, with environment
membership stored as a list attribute rather than encoded in the key.

#### Scenario: New credentials are keyed by bare jti

- **WHEN** a credential is created via any path (new-domain challenge, existing-domain,
  or renewal/re-issue)
- **THEN** its `sortKey` equals its `jti` exactly, with no environment prefix

#### Scenario: Standard credentials are single-environment

- **WHEN** a non-admin role creates a credential
- **THEN** the credential's `environments` list contains exactly one environment ID

#### Scenario: Only IZG Operations may create a multi-environment credential

- **WHEN** `POST /api/apikeys` is called requesting more than one environment
- **THEN** the request succeeds only if the caller is IZG Operations (`isAdmin`);
  otherwise it is rejected (403) even if the caller can otherwise create keys
- **AND** for an authorized multi-environment request, the domain must be authorized
  (or successfully challenged) in every requested environment

---

### Requirement: The JWT carries identity only

The API-key JWT MUST NOT carry access-control properties that the Hub can instead read
from the credential record by `jti` at routing time.

#### Scenario: No environment claim in the token

- **WHEN** a token is issued or re-signed via `POST /api/apikeys/token`
- **THEN** its payload does not include an `env` claim
- **AND** the Hub is expected to read the credential's `environments` list from
  DynamoDB by `jti` instead

---

### Requirement: Use Types are captured and validated on the credential

A credential MUST record one or more submitter Use Types
(`PATIENT` / `PROVIDER` / `PUBLIC_HEALTH`) as a server-side property (not a JWT claim).

#### Scenario: Create requires valid Use Types

- **WHEN** `POST /api/apikeys` is called
- **THEN** it rejects (400) a missing/empty `useTypes` or any value outside the enum
- **AND** on success stores `useTypes` as a deduped DynamoDB String Set (`SS`)

#### Scenario: Renewal and re-issue preserve Use Types

- **WHEN** a credential is renewed or re-issued
- **THEN** the new credential inherits the previous credential's `useTypes`

#### Scenario: The Create form narrows Use Types to the selected organization's registration

- **WHEN** a user selects an organization in the Create dialog and that organization
  has a non-empty `useTypes` on its Jurisdiction-table row
- **THEN** the Use Types picker offers only that organization's registered use types
- **AND** if the organization has no registered `useTypes` (not yet seeded), the
  picker falls back to the full enum so creation is not blocked

#### Scenario: The Create dialog's Organization list is limited to senders

- **WHEN** the Create Key dialog's Organization dropdown is populated
- **THEN** only rows with a non-empty `useTypes` (senders, including dual-role
  sender+jurisdiction rows) are offered
- **AND** pure destination jurisdictions (only `allowedUseTypes`, no `useTypes`) are
  excluded, since a submitter credential cannot be issued to a destination-only
  organization

---

### Requirement: Credential expiry is computed at issuance

A credential's expiry MUST be anchored to when the key is issued (becomes usable), not
to when the request record was created.

#### Scenario: DNS-challenge credential is stamped at activation

- **WHEN** a `ready_for_validation` credential passes DNS verification
- **THEN** `issuedAt` and `expiresAt = issuedAt + 1 year` are stamped at that moment
- **AND** before activation the pending record carries no expiry
- **AND** the JWT `iat` reflects the issuance instant (`issuedAt`, falling back to `createdOn`)

---

### Requirement: Credential status reflects Expired and grace-period outcomes

The Keys view MUST distinguish `Grace Period`, `Expired`, and `Revoked`, consistent with
the JWT `exp` ceiling and the credential's grace window.

#### Scenario: Status derived from expiry and grace dates

- **WHEN** a credential's dates are evaluated (effective grace end = `min(graceExpiresAt, exp)`)
- **THEN** a renewed key shows `Grace Period` until the effective grace end, then `Expired`
  if expiry came on/before the grace end, otherwise `Revoked`
- **AND** a non-renewed key past its own `exp` shows `Expired`
- **AND** a persisted terminal status (`revoked`/`cancelled`) takes precedence
  (`expired` is derived-only, never persisted)

---

### Requirement: Renewal preserves the credential's DNS domain, jurisdiction, and environments

Renewal MUST NOT change the DNS domain (`upn`), jurisdiction, or environment scope of
the credential being renewed.

#### Scenario: Renewal domain is fixed and server-authoritative

- **WHEN** a user renews a key
- **THEN** the domain is prepopulated and read-only in the dialog
- **AND** the `/renew` endpoint uses the domain, jurisdiction, and `environments`
  stored on the credential being renewed, ignoring any client-supplied value for those
  fields

---

### Requirement: An expired credential can be re-issued, but is never renewed

Renewal (the `active → grace_period` transition) MUST remain valid only from `active`;
an expired credential MUST instead be offered re-issuance — a new credential, not a
lifecycle transition on the old one.

#### Scenario: Re-issue creates a fresh credential with no grace overlap

- **WHEN** a user re-issues an expired key
- **THEN** a new credential is created with a fresh `jti`, `expiresAt = now + 1 year`,
  and the same organization/environment(s)/use types as the expired key
- **AND** the expired key is left completely unmodified (no grace period, no status
  change)

#### Scenario: Re-issue re-runs DNS verification if the domain authorization lapsed

- **WHEN** a user re-issues an expired key whose domain's `authExpiresAt` has also
  passed
- **THEN** the user is routed through the DNS TXT challenge before the new credential
  is activated
- **AND** if the domain is still authorized, the new credential is issued immediately
  without a DNS step

#### Scenario: Revoked and cancelled credentials remain fully terminal

- **WHEN** a credential's status is `revoked` or `cancelled`
- **THEN** no renew, re-issue, or other lifecycle action is offered for it

---

### Requirement: Creating a duplicate-scope key warns but does not block

Creating a new key whose scope exactly matches an existing active key for the same
organization and domain MUST warn the user and steer them toward Renew, without
preventing creation.

#### Scenario: Exact scope match triggers a dismissible warning

- **WHEN** a user attempts to create a key whose environment(s) and use types exactly
  match an existing `active` credential for the same organization and domain
- **THEN** a warning is shown recommending Renew instead
- **AND** the user may proceed anyway on a second confirmation ("Create Anyway")

#### Scenario: A narrower or different scope does not warn

- **WHEN** the new key's environment(s) or use types are not an exact match to any
  existing active credential's scope for that organization/domain
- **THEN** no duplicate-scope warning is shown

---

### Requirement: Grace-period contract matches the Hub

The values the console writes for a superseded credential MUST match what the Hub reads
from the shared DynamoDB table.

#### Scenario: Renewal writes Hub-compatible grace values

- **WHEN** a credential is superseded by a renewal
- **THEN** its status is set to `grace_period` (the value the Hub treats as usable and
  its grace-revocation sweep selects)
- **AND** the successor credential's id is written to the `supersededBy` attribute

---

### Requirement: A token can be revealed exactly once, atomically

`POST /api/apikeys/token` MUST NOT allow a token to be successfully retrieved by more
than one request, even under concurrent calls.

#### Scenario: First reveal succeeds and marks the credential viewed

- **WHEN** `POST /api/apikeys/token` is called for an `active` credential that has
  never been viewed
- **THEN** the token is returned and the credential is atomically marked viewed
  (`viewedAt` set only if it was not already set)

#### Scenario: A second, concurrent reveal request is refused

- **WHEN** two requests to reveal the same token race, and the underlying atomic write
  can only succeed for one of them
- **THEN** the losing request receives the same 410 "already viewed" response as a
  request made after the fact — not a generic server error

---

### Requirement: API Key Management actions are enforced server-side, not just gated in the UI

Every `/api/apikeys/*` route MUST enforce both a role check and a jurisdiction-ownership
check; a valid session alone MUST NOT grant access to another jurisdiction's credentials
or to an action the caller's role does not permit.

#### Scenario: UI hides actions the current role cannot perform

- **WHEN** the screen renders for a role without a given permission
- **THEN** the corresponding control is hidden — Create (`canCreateApiKey`), Revoke
  (`canRevokeApiKey`), Renew (`canRenewApiKey`), Cancel (`canCancelApiKey`)

#### Scenario: The server rejects a role-disallowed action regardless of the UI

- **WHEN** any `/api/apikeys/*` route is called directly by a caller whose role lacks
  the required permission
- **THEN** the request is rejected (403), independent of what the UI would have shown

#### Scenario: The server rejects a cross-jurisdiction action regardless of the UI

- **WHEN** a non-global role (e.g. Jurisdiction Operations) calls revoke, cancel,
  renew, token-reveal, or verify-domain for a credential or jurisdiction it does not
  own
- **THEN** the request is rejected, and ownership is checked before any status check
  so a non-owner learns nothing about the target credential's state

#### Scenario: The credential list is scoped to owned jurisdictions

- **WHEN** `GET /api/apikeys` is called
- **THEN** the response contains only credentials for jurisdictions the caller owns
  (all of them, for a global role like IZG Operations)

#### Scenario: Navigation visibility follows the same permission as the routes

- **WHEN** the main navigation is rendered for a role with `canListApiKeys` access
- **THEN** the API Key Management link is shown, regardless of whether that role is
  also flagged `isAdmin`

---

### Requirement: Keys list supports server-side filtering and pagination

_(Superseded — see design D8.)_ `GET /api/apikeys` continues to return the full list
visible to the caller's role, filtered/paginated client-side. Server-side pagination
was evaluated and deliberately not built for the current scale; the correctness issues
that would otherwise compound at scale (result truncation past DynamoDB's page limit,
redundant per-row jurisdiction lookups) were fixed directly instead — see the
requirement below.

#### Scenario: The full credential list is never silently truncated

- **WHEN** `GET /api/apikeys` is called and the underlying table scan spans more than
  one DynamoDB page
- **THEN** the response includes every credential visible to the caller's role, not
  just the first page
