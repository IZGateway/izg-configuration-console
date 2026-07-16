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

---

### Requirement: Revoke and Cancel are distinct operations

Revoking an active/grace-period key and cancelling a pending
(`Ready for Validation`/`Validation`) key MUST be distinct operations with different
effects, matching their separate confirmation modals.

#### Scenario: Cancel deletes a pending key record

- **WHEN** a user confirms cancellation of a key in `Ready for Validation` or
  `Validation` status
- **THEN** the credential record is deleted (not marked Revoked)
- **AND** the Total Keys count decrements

#### Scenario: Revoke marks an active or grace-period key as Revoked

- **WHEN** a user confirms revocation of a key in `Active` or `Grace Period` status,
  optionally supplying a reason
- **THEN** the credential record's status is set to `Revoked` with a revocation
  timestamp
- **AND** the Active count decrements and the Revoked count increments

#### Scenario: Cancel is not available on active or grace-period keys

- **WHEN** a key is in `Active` or `Grace Period` status
- **THEN** only the revoke action is available for that row, not cancel

---

### Requirement: DNS verification bypass cannot run in production

The dev-only bypass in DNS domain-ownership verification MUST NOT be reachable unless
explicitly enabled outside production.

#### Scenario: Bypass disabled by default

- **WHEN** `POST /api/apikeys/verify-domain` is called without the explicit bypass
  flag enabled
- **THEN** the endpoint performs a real DNS TXT record lookup regardless of `NODE_ENV`

#### Scenario: Bypass requires explicit opt-in outside production

- **WHEN** the bypass flag is enabled
- **THEN** the endpoint MUST also confirm `NODE_ENV !== 'production'` before skipping
  the real DNS lookup
- **AND** if `NODE_ENV === 'production'`, the bypass MUST be ignored and a real
  lookup MUST be performed

---

### Requirement: Keys list supports server-side filtering and pagination

`GET /api/apikeys` MUST accept filter and pagination query parameters instead of
always returning the entire table for client-side filtering.

#### Scenario: Listing keys with filters and pagination

- **WHEN** `GET /api/apikeys` is called with `environment`, `status`, `organization`,
  `page`, and `pageSize` query parameters
- **THEN** only matching rows for the requested page are returned
- **AND** omitting all parameters preserves the current behavior of returning the
  full list (backward compatible for any existing callers)
