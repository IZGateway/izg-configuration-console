## ADDED Requirements

### Requirement: A user holds every recognized role their Okta groups grant

The session SHALL expose all roles a user holds, not one. Role resolution SHALL be deterministic
and independent of the order in which Okta returns group membership. A singular role field SHALL
NOT be exposed on the session.

#### Scenario: User belongs to two recognized groups

- **WHEN** a user whose Okta groups include both `IZG Support` and `Jurisdiction Operations`
  signs in
- **THEN** `session.user.roles` SHALL contain both roles

#### Scenario: Group order does not affect the outcome

- **WHEN** the same user signs in and Okta returns their groups in a different order
- **THEN** the resolved role set SHALL be identical to the previous sign-in

#### Scenario: Singular role field is absent

- **WHEN** any authenticated session is inspected
- **THEN** `session.user.role` SHALL NOT exist

### Requirement: Only roles present in the access matrix may be resolved

A group SHALL resolve only to roles that have an access-matrix entry. A group that maps to no
role SHALL contribute nothing and SHALL NOT prevent another group from granting its role.

#### Scenario: Unmapped group alongside a working group

- **WHEN** a user belongs to both `CDC Program` (which maps to no role) and
  `Jurisdiction Operations`
- **THEN** the user SHALL receive the full `Jurisdiction Operations` permissions

#### Scenario: Only unmapped groups

- **WHEN** a user belongs solely to groups that map to no role
- **THEN** the resolved role set SHALL be empty and every permission check SHALL deny

#### Scenario: Unrecognized Okta group

- **WHEN** a user belongs to an Okta group unrelated to the Console
- **THEN** sign-in SHALL succeed, the group SHALL contribute no role, and no error SHALL be raised

### Requirement: Permissions combine as a union across held roles

The user SHALL be allowed an action if any held role permits it, for checks that concern only
whether the action is permitted and involve no specific organization's data.

#### Scenario: Union grants what neither role grants alone

- **WHEN** a user holds `Jurisdiction Support` (no API-key permissions) and
  `Jurisdiction Operations` (full API-key permissions)
- **THEN** the user SHALL be able to list, create, revoke, renew and cancel API keys

#### Scenario: Navigation reflects the union

- **WHEN** any held role grants `canListApiKeys`
- **THEN** the API Key Management navigation entry SHALL be visible

#### Scenario: Role-only route gate

- **WHEN** a route permits a fixed set of roles and the user holds at least one of them
- **THEN** the request SHALL be authorized

### Requirement: A permission and a jurisdiction check MUST be satisfied by the same role

For any decision that pairs a permission with a specific jurisdiction, the decision SHALL be
evaluated per role and allowed only if a single role grants both the permission and reach to
that jurisdiction. A permission held by one role SHALL NOT combine with jurisdiction reach held
by a different role.

#### Scenario: Global reach from one role does not carry another role's permission

- **WHEN** a user holds `IZG Support` (global jurisdiction reach, no API-key permissions) and a
  jurisdiction-scoped role that can list API keys for `az`
- **THEN** `GET /api/apikeys` SHALL return only `az` credentials
- **AND** every other organization's credentials SHALL be absent

#### Scenario: Mutating routes reject cross-jurisdiction requests for the same user

- **WHEN** that user calls any `/api/apikeys/*` mutating route targeting a credential outside
  `az`
- **THEN** the response SHALL be `403`

#### Scenario: Scoped role acts within its own jurisdiction

- **WHEN** that user acts on a credential belonging to `az`
- **THEN** the request SHALL be authorized

#### Scenario: Globally scoped role with the permission

- **WHEN** a user holds a role that has both global reach and the required permission
- **THEN** the request SHALL be authorized for any jurisdiction

### Requirement: Jurisdiction prefixes match exactly

Jurisdiction comparison SHALL be an exact match on a whole prefix value, case-insensitively.
Substring or partial matching SHALL NOT be used.

#### Scenario: Shorter prefix does not match a longer one

- **WHEN** a user is assigned jurisdiction `az` and requests a credential whose jurisdiction
  prefix is `azova`
- **THEN** the request SHALL be denied

#### Scenario: Longer prefix does not match a shorter one

- **WHEN** a user is assigned jurisdiction `azova` and requests a credential whose jurisdiction
  prefix is `az`
- **THEN** the request SHALL be denied

#### Scenario: Case differences still match

- **WHEN** a user assigned `az` requests a credential whose jurisdiction prefix is `AZ`
- **THEN** the request SHALL be authorized

### Requirement: Global jurisdiction reach is declared per role in the access matrix

Whether a role bypasses jurisdiction scoping SHALL be a property of that role's access-matrix
entry, declared explicitly for every role. It SHALL be evaluated per role and SHALL NOT be
combined across roles.

#### Scenario: Every role declares its reach

- **WHEN** the access matrix is loaded
- **THEN** every role entry SHALL declare a boolean global-tenancy value

#### Scenario: Reach is not pooled across roles

- **WHEN** a user holds one role with global reach and one scoped role
- **THEN** the scoped role's permissions SHALL remain limited to that role's assigned
  jurisdictions

### Requirement: Existing single-role users retain their current access

Introducing multi-role support SHALL NOT change the effective permissions of any user who holds
exactly one recognized role.

#### Scenario: Each existing role is unchanged

- **WHEN** a user holding exactly one of `IZG Operations`, `IZG Support`,
  `Jurisdiction Operations` or `Jurisdiction Support` signs in
- **THEN** their page permissions and jurisdiction scope SHALL match the behaviour prior to this
  change

#### Scenario: Sessions issued before deployment continue to work

- **WHEN** a session established before this change is used after deployment
- **THEN** roles SHALL resolve correctly without requiring the user to sign in again

### Requirement: Authorization decisions are attributable and fail loudly

An allowed decision SHALL identify the role that granted it so it can be recorded. A failure to
resolve a jurisdiction SHALL deny the request and SHALL be logged distinguishably from an
ordinary denial.

#### Scenario: Granting role is reported

- **WHEN** a permission check succeeds
- **THEN** the decision SHALL identify which held role authorized it

#### Scenario: Login records the full role set

- **WHEN** a user signs in
- **THEN** exactly one authorization snapshot SHALL be logged containing the merged group list
  and the complete set of resolved roles

#### Scenario: Jurisdiction lookup fails

- **WHEN** the jurisdiction lookup for an authorization check raises an error
- **THEN** the request SHALL be denied
- **AND** an error-level log entry SHALL be emitted

#### Scenario: Jurisdiction has no prefix

- **WHEN** a credential's jurisdiction record carries no prefix
- **THEN** the request SHALL be denied
- **AND** a warning-level log entry SHALL be emitted
