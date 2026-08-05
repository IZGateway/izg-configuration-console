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
  options come from the jurisdictions list

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

### Requirement: Use Types are captured and validated on the credential

A credential MUST record one or more submitter Use Types
(`PATIENT` / `PROVIDER` / `PUBLIC_HEALTH`) as a server-side property (not a JWT claim).

#### Scenario: Create requires valid Use Types

- **WHEN** `POST /api/apikeys` is called
- **THEN** it rejects (400) a missing/empty `useTypes` or any value outside the enum
- **AND** on success stores `useTypes` as a deduped DynamoDB String Set (`SS`)

#### Scenario: Renewal preserves Use Types

- **WHEN** a credential is renewed
- **THEN** the new credential inherits the previous credential's `useTypes`

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

### Requirement: Renewal preserves the credential's DNS domain

Renewal MUST NOT change the DNS domain (`upn`) of the credential.

#### Scenario: Renewal domain is fixed and server-authoritative

- **WHEN** a user renews a key
- **THEN** the domain is prepopulated and read-only in the dialog
- **AND** the `/renew` endpoint uses the domain stored on the credential being renewed,
  ignoring any client-supplied value

---

### Requirement: Grace-period contract matches the Hub

The values the console writes for a superseded credential MUST match what the Hub reads
from the shared DynamoDB table.

#### Scenario: Renewal writes Hub-compatible grace values

- **WHEN** a credential is superseded by a renewal
- **THEN** its status is set to `grace_period` (the value the Hub treats as usable and its
  grace-revocation sweep selects)
- **AND** the successor credential's id is written to the `supersededBy` attribute

---

### Requirement: API Key Management actions are role-gated in the UI

The screen MUST hide actions the current role is not permitted to perform, deny-by-default.

#### Scenario: Actions gated by role

- **WHEN** the screen renders for a role without a given permission
- **THEN** the corresponding control is hidden — Create (`canCreateApiKey`), Revoke
  (`canRevokeApiKey`), Renew (`canRenewApiKey`), Cancel (`canCancelApiKey`)
- **AND** this UI gating is not a security boundary; server-side authorization on the API
  routes is required separately

---

### Requirement: Keys list supports server-side filtering and pagination

`GET /api/apikeys` MUST accept filter and pagination query parameters instead of
always returning the entire table for client-side filtering.
_(Not yet implemented — filtering/paging is currently client-side; see tasks §3.)_

#### Scenario: Listing keys with filters and pagination

- **WHEN** `GET /api/apikeys` is called with `environment`, `status`, `organization`,
  `page`, and `pageSize` query parameters
- **THEN** only matching rows for the requested page are returned
- **AND** omitting all parameters preserves the current behavior of returning the
  full list (backward compatible for any existing callers)
