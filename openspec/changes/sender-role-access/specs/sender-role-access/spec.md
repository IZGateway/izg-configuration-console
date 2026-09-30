## ADDED Requirements

### Requirement: `Sender Operations` is a recognized role with full API-key lifecycle access

A user whose Okta groups map to `Sender Operations` SHALL be assigned that role at sign-in, and
the access matrix SHALL grant it every `apikeys` capability
(`canListApiKeys`, `canCreateApiKey`, `canRevokeApiKey`, `canRenewApiKey`, `canCancelApiKey`).

#### Scenario: Sender group resolves to the role

- **WHEN** a user whose Okta groups include the group mapped to `Sender Operations` signs in
- **THEN** `session.user.roles` SHALL contain `Sender Operations`
- **AND** `session.user.jurisdictions` SHALL contain their organization's prefix, unchanged from
  today's behavior

#### Scenario: Full lifecycle permission on the sender's own organization

- **WHEN** a user holding only `Sender Operations` calls `GET`, `POST`, or the revoke/renew/cancel
  routes under `/api/apikeys/*` for a credential whose jurisdiction resolves to their own prefix
- **THEN** the request SHALL be authorized

### Requirement: `Sender Operations` has no access to IIS-only pages

`Sender Operations` SHALL NOT bypass jurisdiction scoping (`globalTenancy: false`), and every
IIS-only page block (`manageconnections`, `test`, `edit`, `changerequest`, `history`) SHALL deny
every capability for this role.

#### Scenario: No IIS page permission is granted

- **WHEN** the access matrix entry for `Sender Operations` is inspected
- **THEN** every capability under `manageconnections`, `test`, `edit`, `changerequest`, and
  `history` SHALL be `false`

#### Scenario: Cross-organization API-key access is denied

- **WHEN** a user holding only `Sender Operations` calls any `/api/apikeys/*` route for a
  credential outside their own organization's jurisdiction prefix (by `sortKey` or
  `jurisdictionId`)
- **THEN** the response SHALL be `403`, regardless of what the UI displays

### Requirement: Navigation and page access to IIS-only surfaces are matrix-driven, not ungated

Every IIS-only navigation entry and page SHALL be gated on an explicit access-matrix flag rather than shown unconditionally to any authenticated session. This applies to the "Manage Connections" and "Onboarding Senders" navigation entries and the `/manageconnections` page.

#### Scenario: Sender sees only what it can use

- **WHEN** a signed-in user holding only `Sender Operations` views the navigation menu
- **THEN** "API Key Management" SHALL be visible
- **AND** "Manage Connections" and "Onboarding Senders" SHALL NOT be visible

#### Scenario: Direct navigation is also gated, not just the nav entry

- **WHEN** a user holding only `Sender Operations` requests `/manageconnections` directly
- **THEN** the response SHALL redirect away rather than rendering connection data

#### Scenario: Existing roles are unaffected

- **WHEN** a user holding any of `IZG Operations`, `IZG Support`, `Jurisdiction Operations`, or
  `Jurisdiction Support` views the navigation menu or requests `/manageconnections`
- **THEN** visibility and page access SHALL be unchanged from before this change

### Requirement: The landing page routes a sender to a usable call-to-action

A user with no access to Manage Connections SHALL NOT be presented it as their primary
call-to-action on `/`.

#### Scenario: Sender lands on a usable call-to-action

- **WHEN** a signed-in user holding only `Sender Operations` lands on `/` after login
- **THEN** the page SHALL present an API Key Management call-to-action
- **AND** SHALL NOT present the Manage Connections call-to-action

#### Scenario: Existing roles keep their call-to-action

- **WHEN** a signed-in user holding a role with `canViewConnections`
- **THEN** the Manage Connections call-to-action SHALL still be presented, unchanged from before
  this change

### Requirement: Combining `Sender Operations` with a globally-scoped role does not grant global API-key access

The one-role-at-a-time evaluation rule established by `multi-role-authorization` SHALL hold for
`Sender Operations` specifically: a role with global jurisdiction reach but no API-key permission
SHALL NOT combine with `Sender Operations`'s permission to produce access beyond the sender's own
organization.

#### Scenario: IZG Support plus Sender Operations stays scoped

- **WHEN** a user holds both `IZG Support` (global reach, no API-key permissions) and
  `Sender Operations`
- **THEN** `GET /api/apikeys` SHALL return only that sender's own credentials
- **AND** every other organization's and jurisdiction's credentials SHALL be absent
