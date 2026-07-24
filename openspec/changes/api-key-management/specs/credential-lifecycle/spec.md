---
schema_version: '1.0'
created:
  date: '2026-07-24T03:23:33.597Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.73
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7c5f6eaf-a1ef-475b-af1b-b7abb0bdd0ce
  inputs:
    - IGDD-2707
    - IGDD-2709
    - IGDD-3106
    - openspec/changes/api-key-management-ui/specs/api-key-management/spec.md
  summary: Credential lifecycle spec for api-key-management CR
updated:
  - date: '2026-07-24T04:06:06.025Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~5adc769f-9c9c-4632-b77f-15924415ab72
    summary: Add full sender user story to credential-lifecycle spec intro
  - date: '2026-07-24T03:52:13.060Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f339070e-425d-4ae2-8b8e-eb0021641859
    summary: 365 days -> 1 year (date precision)
  - date: '2026-07-24T03:52:12.905Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f339070e-425d-4ae2-8b8e-eb0021641859
    summary: 365 days -> 1 year (date precision)
  - date: '2026-07-24T03:52:12.667Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f339070e-425d-4ae2-8b8e-eb0021641859
    summary: 365 days -> 1 year (date precision)
  - date: '2026-07-24T03:48:54.893Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7770ab33-efe7-4273-9afa-0cf49f0480ed
    summary: env claim is list for admin multi-env credentials
  - date: '2026-07-24T03:48:44.410Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7770ab33-efe7-4273-9afa-0cf49f0480ed
    summary: Multi-env credential scenario for admin/ops roles
change_request: api-key-management
ticket: IGDD-3140
---
# Spec: Credential Lifecycle — izg-configuration-console

> **User Story:** *As a sender, I need to be able to manage my credentials used to send
> data to IZ Gateway destinations. Manage in this context means create new credentials,
> and renew or revoke existing credentials. When I renew a credential, I need a grace
> period in which both the old and new credential still operate so that I can deploy the
> renewed credential to one or more systems without disruption of connected systems. When
> I revoke a credential, I want to be sure that it cannot be used after revocation so that
> a compromised credential cannot be used to act on my behalf without my permission, so
> that I can ensure the safety and confidentiality of patient data accessible through the
> IZ Gateway environment. I must be able to maintain multiple credentials so that I can
> be sure that different systems that I manage are appropriately identified and authorized
> to access IZ Gateway endpoints on my behalf, so that I can ensure separation of concerns
> between both credentials and systems responsible for different sets of patient data.*
>
> **As-built spec.** This document captures the implemented behavior of API key
> credential lifecycle management, plus planned additions for use-type policy and
> RBAC enforcement. Where behavior is already implemented, scenarios describe the
> code. Where behavior is a planned addition, it represents the agreed design in
> `design.md` and the IGDD-2709 acceptance criteria.
>
> **Sources:** IGDD-2707 (acceptance criteria), IGDD-2709 (RBAC + renewal expiry),
> IGDD-3106 (UI), Palak Patel `api-key-management-ui` CR (revoke/cancel, pagination).

## ADDED Requirements

### Requirement: Credential initiation creates a DynamoDB record before DNS validation

When an organization requests an API key for a new domain, an `ApiKeyCredential` record
SHALL be created immediately with `ready_for_validation` status. The JWT is not issued
until DNS validation succeeds and the credential is first viewed.

For admin and operational staff (IZG Operations, Jurisdiction Operations), the credential
MAY be issued spanning multiple environments. In this case `env` on the credential record
stores a list of environment IDs rather than a single value, and the JWT payload reflects
the full authorized environment set.

#### Scenario: New domain creates credential in ready_for_validation status

- **WHEN** `POST /api/apikeys` is called with `dnsChoice === 'other'` (a new domain)
- **THEN** an `ApiKeyCredential` record is created with:
  - `sortKey = {envId}#{jti}` where `jti = crypto.randomUUID()`
  - `status = 'ready_for_validation'`
  - `domain` set to the submitted UPN
  - `jurisdictionId` set to the caller's jurisdiction
- **AND** a corresponding `ApiKeyDomain` record at `sortKey = {envId}#{jurisdictionId}#{domain}`
  is created or refreshed with `status = 'pending_challenge'`
- **AND** the response includes the DNS challenge details and the new credential's
  `jti` and `sortKey`

#### Scenario: Admin or operational credential may be created for multiple environments

- **WHEN** `POST /api/apikeys` is called by a user with IZG Operations or Jurisdiction
  Operations role and multiple envIds are requested
- **THEN** the `ApiKeyCredential` record is created with an `env` value that covers
  all requested environments
- **AND** the resulting JWT is valid in each of those environments

#### Scenario: Existing authorized domain creates credential in active status immediately

- **WHEN** `POST /api/apikeys` is called with `dnsChoice === 'existing'` and the
  selected domain is authorized (`status = 'authorized'`) and its `authExpiresAt`
  is in the future
- **THEN** an `ApiKeyCredential` record is created with `status = 'active'`
- **AND** the response includes the new credential's `jti` and `sortKey`
- **AND** the JWT is NOT issued in this response; it is deferred to the first call to
  `POST /api/apikeys/token`

#### Scenario: Existing domain with expired authorization is rejected

- **WHEN** `POST /api/apikeys` is called with `dnsChoice === 'existing'` and the
  selected domain's `authExpiresAt` is in the past or its status is not `authorized`
- **THEN** the request MUST be rejected with a 400 error indicating the domain is
  not currently authorized

---

### Requirement: Credential status follows a defined state machine

`ApiKeyCredential.status` transitions are defined as follows:

- `ready_for_validation` → `active` (DNS verification succeeds)
- `active` → `grace` (renewal requested)
- `active` → `revoked` (revocation confirmed)
- `grace` → `revoked` (revocation confirmed during grace period)

Cancellation (hard delete) is available only from `ready_for_validation`.

#### Scenario: DNS verification transitions credential from ready_for_validation to active

- **WHEN** DNS verification succeeds for the domain associated with a
  `ready_for_validation` credential
- **THEN** that credential's status is updated to `active`
- **AND** `expiresAt` is set to 1 year from the activation date

#### Scenario: Renewal transitions active credential to grace

- **WHEN** a valid renewal request is processed for an `active` credential
- **THEN** the original credential's status is set to `grace`
- **AND** `graceExpiresAt` is set to 10 business days from the renewal date, computed
  using a business-day utility that excludes weekends and US federal holidays

#### Scenario: Revocation transitions active or grace credential to revoked

- **WHEN** a user with the appropriate RBAC role confirms revocation
- **THEN** the credential's status is set to `revoked`
- **AND** `revokedAt` is set to the current timestamp

#### Scenario: No lifecycle transition is valid from revoked status

- **WHEN** any lifecycle operation (renew, revoke) is attempted on a `revoked` credential
- **THEN** the request MUST be rejected

---

### Requirement: JWT is deterministically re-signed from stored claims and revealed on demand

The JWT is never persisted. It is regenerated on each token request by re-signing the
credential's stored claims (fixed at creation/activation) with HMAC-SHA256 and the
signing secret from AWS Secrets Manager.

#### Scenario: JWT is generated and returned on token view request

- **WHEN** `POST /api/apikeys/token` is called with a valid `sortKey` for an `active`
  credential
- **THEN** the JWT is signed with HS256 using the secret at
  `/izg/<env>/jwt/signing-secret` from AWS Secrets Manager
- **AND** the JWT payload includes: `jti`, `sub` (jurisdictionId), `upn` (domain),
  `env` (a single environment ID for standard credentials, or a list for multi-environment
  admin credentials), `iat` (issuedAt), `exp` (expiresAt)
- **AND** `viewedAt` is recorded on the credential record
- **AND** the JWT string is returned in the response body

#### Scenario: JWT reveal is refused for non-active credentials

- **WHEN** `POST /api/apikeys/token` is called for a credential whose status is not
  `active`
- **THEN** the endpoint MUST return a 4xx error and MUST NOT generate or return a JWT

#### Scenario: Repeated view requests return the same JWT

- **WHEN** `POST /api/apikeys/token` is called multiple times for the same `active`
  credential
- **THEN** the same JWT string is returned each time (HMAC-SHA256 is deterministic
  for identical inputs)
- **AND** `viewedAt` is updated on each call

---

### Requirement: Revoke and Cancel are distinct operations

Revoking an active or grace-period credential and cancelling a `ready_for_validation`
credential are distinct actions with different effects.

> **Source:** Palak Patel, `api-key-management-ui` CR, IGDD-2707.

#### Scenario: Cancel performs a hard delete on a ready_for_validation credential

- **WHEN** a user confirms cancellation of a credential in `ready_for_validation` status
- **THEN** the `ApiKeyCredential` record is deleted from DynamoDB (hard delete)
- **AND** no `revokedAt` is recorded and no status change is persisted

#### Scenario: Revoke sets status and timestamp on an active or grace credential

- **WHEN** a user confirms revocation of a credential in `active` or `grace` status,
  optionally supplying a reason
- **THEN** `ApiKeyCredential.status` is set to `revoked`
- **AND** `ApiKeyCredential.revokedAt` is set to the current timestamp
- **AND** the reason (if supplied) is recorded on the credential record

#### Scenario: Cancel is unavailable for active or grace credentials

- **WHEN** a credential is in `active` or `grace` status
- **THEN** only the revoke action is available; the cancel action MUST NOT be presented

#### Scenario: Revoke is unavailable for ready_for_validation credentials

- **WHEN** a credential is in `ready_for_validation` status
- **THEN** only the cancel action is available; the revoke action MUST NOT be presented

---

### Requirement: Credential renewal issues a new credential and transitions the old one to grace

Renewing an active credential SHALL create a new `ApiKeyCredential` and set the existing
credential to `grace` status with a computed `graceExpiresAt`. The new credential's
`expiresAt` depends on how close the renewal request is to the original expiry.

> **Source:** IGDD-2709 acceptance criteria.

#### Scenario: Renewal more than 30 days before expiry sets new expiry to 1 year from renewal date

- **WHEN** `POST /api/apikeys/:jti/renew` is called and the current date is more than
  30 days before the existing credential's `expiresAt`
- **THEN** a new `ApiKeyCredential` is created with `expiresAt` set to 1 year from
  the renewal request date
- **AND** the original credential's status is set to `grace`
- **AND** `graceExpiresAt` on the original credential is set to 10 business days from
  the renewal request date

#### Scenario: Renewal within 30 days of expiry sets new expiry to 1 year from old expiry

- **WHEN** `POST /api/apikeys/:jti/renew` is called and the current date is within
  30 days of (or past) the existing credential's `expiresAt`
- **THEN** a new `ApiKeyCredential` is created with `expiresAt` set to 1 year from
  the ORIGINAL credential's `expiresAt` date
- **AND** the original credential's status is set to `grace`
- **AND** `graceExpiresAt` on the original credential is set to 10 business days from
  the renewal request date

#### Scenario: Renewal of a non-active credential is rejected

- **WHEN** `POST /api/apikeys/:jti/renew` is called for a credential that is not in
  `active` status
- **THEN** the request MUST be rejected

---

### Requirement: Credential listing is filtered by the caller's RBAC role

Access to the credential list is restricted based on the caller's Okta group role,
as defined in the IZ Gateway access definitions.

> **Source:** IGDD-2709 acceptance criteria.

#### Scenario: IZG Operations role lists credentials for any jurisdiction

- **WHEN** `GET /api/apikeys` is called by a user with the IZG Operations role
- **THEN** credentials from all jurisdictions are eligible to be returned, subject
  to any filter parameters supplied

#### Scenario: Jurisdiction Operations role lists only their own jurisdiction's credentials

- **WHEN** `GET /api/apikeys` is called by a user with the Jurisdiction Operations role
- **THEN** only credentials whose `jurisdictionId` matches the caller's jurisdiction
  are returned, regardless of any organization filter parameter supplied

#### Scenario: Unauthenticated requests are rejected

- **WHEN** `GET /api/apikeys` is called without a valid session
- **THEN** the endpoint MUST return 401

---

### Requirement: Credential listing supports server-side filtering and pagination

`GET /api/apikeys` MUST accept query parameters for filtering and pagination and MUST
NOT return the entire table for client-side filtering.

> **Source:** Palak Patel, `api-key-management-ui` CR, IGDD-2707.

#### Scenario: Listing credentials with filters and pagination

- **WHEN** `GET /api/apikeys` is called with any combination of `environment`,
  `status`, `organization`, `page`, and `pageSize` query parameters
- **THEN** only matching rows for the requested page are returned

#### Scenario: Omitting all parameters preserves backward-compatible full-list behavior

- **WHEN** `GET /api/apikeys` is called with no query parameters
- **THEN** the full list of credentials visible to the caller's role is returned,
  preserving backward compatibility for existing callers

---

### Requirement: Credential declares its accepted use-type categories

An `ApiKeyCredential` SHALL declare its `useTypes`, representing the categories of
submitter the credential is valid for. This value MUST be a non-empty subset of the
issuing jurisdiction's `allowedUseTypes`.

#### Scenario: Credential useTypes must be a non-empty subset of jurisdiction allowedUseTypes

- **WHEN** a credential is created
- **THEN** each value in the credential's `useTypes` MUST appear in the issuing
  jurisdiction's `allowedUseTypes`
- **AND** the credential MUST be rejected if `useTypes` is empty or if the intersection
  with `allowedUseTypes` is empty

#### Scenario: useTypes values are restricted to the defined enum

- **WHEN** a credential is created
- **THEN** each entry in `useTypes` MUST be one of: `PATIENT`, `PROVIDER`, `PUBLIC_HEALTH`
- **AND** any value outside this set MUST be rejected

#### Scenario: Credential useTypes are included in JWT claims

- **WHEN** a JWT is generated for a credential that has `useTypes`
- **THEN** the `useTypes` values are included in the JWT payload
- **AND** the Hub uses these values for access enforcement at the destination
