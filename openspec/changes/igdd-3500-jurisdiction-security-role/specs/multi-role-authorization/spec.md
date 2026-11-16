## ADDED Requirements

### Requirement: Jurisdiction Security holds API key management, for its own jurisdictions only

The `Jurisdiction Security` Okta group SHALL resolve to the `Jurisdiction Security` role. That
role SHALL be scoped to the jurisdictions in the user's `jurisdictions` claim and SHALL hold the
full API key lifecycle there. `Jurisdiction Operations` SHALL NOT hold any API key capability.
Every other role's API key access SHALL be unchanged.

#### Scenario: The Jurisdiction Security group resolves to its role

- **WHEN** a user belongs to the Okta group `Jurisdiction Security`, spelled with any
  capitalization or with `-` or `_` in place of the space
- **THEN** the resolved role set SHALL contain `Jurisdiction Security`
- **AND** that role SHALL have an access-matrix entry that does not declare global tenancy

#### Scenario: Jurisdiction Security manages API keys in its own jurisdiction

- **WHEN** a user holding only `Jurisdiction Security`, with `az` in their jurisdictions claim,
  lists, creates, renews, revokes or cancels an API key for jurisdiction `az`
- **THEN** the request SHALL be authorized

#### Scenario: Jurisdiction Security cannot act on another jurisdiction's keys

- **WHEN** the same user acts on an API key for a jurisdiction outside their claim
- **THEN** the request SHALL be denied

#### Scenario: Jurisdiction Operations no longer manages API keys

- **WHEN** a user holding only `Jurisdiction Operations` opens API Key Management or calls an API
  key route, even for their own jurisdiction
- **THEN** the navigation entry SHALL be hidden and the request SHALL be denied

#### Scenario: Only the Security roles approve a change request

- **WHEN** the access matrix is evaluated for `edit.canApproveChangeRequest`
- **THEN** only `IZG Security` and `Jurisdiction Security` SHALL hold it

## MODIFIED Requirements

### Requirement: Permissions combine as a union across held roles

The user SHALL be allowed an action if any held role permits it, for checks that concern only
whether the action is permitted and involve no specific organization's data.

#### Scenario: Union grants what neither role grants alone

- **WHEN** a user holds `Jurisdiction Support` (no API-key permissions) and
  `Jurisdiction Security` (full API-key permissions)
- **THEN** the user SHALL be able to list, create, revoke, renew and cancel API keys

#### Scenario: Navigation reflects the union

- **WHEN** any held role grants `canListApiKeys`
- **THEN** the API Key Management navigation entry SHALL be visible

#### Scenario: Role-only route gate

- **WHEN** a route permits a fixed set of roles and the user holds at least one of them
- **THEN** the request SHALL be authorized
