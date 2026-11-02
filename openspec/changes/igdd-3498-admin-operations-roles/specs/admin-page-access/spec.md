## RENAMED Requirements

- FROM: `### Requirement: Seed values reproduce today's access exactly`
- TO: `### Requirement: Admin capability holders follow the ratified role matrix`

## MODIFIED Requirements

### Requirement: Admin capability holders follow the ratified role matrix

The admin capability values SHALL follow the ratified target matrix ("Role Based Access Control
for IZ Gateway", Confluence 1006043137, version 13) for every role, except on rows that another
ticket owns. Those rows SHALL be recorded as divergences at the role block that diverges.

#### Scenario: IZG Security holds every admin capability

- **WHEN** a user holding only `IZG Security` is evaluated against any `accesscontrol`,
  `adminoperations`, `console` or `api-doc` capability
- **THEN** it SHALL be granted, in every jurisdiction

#### Scenario: The four IZG roles may run the hub-wide corrective actions

- **WHEN** a user holding only one of `IZG Security`, `IZG Operations`, `IZG Support` or
  `IZG Program` is evaluated against `adminoperations.canViewAdminOperations`,
  `canResetHubCircuitBreakers` or `canRefreshHubDatabase`
- **THEN** each SHALL be granted

#### Scenario: Password encryption belongs to IZG Security alone

- **WHEN** any role other than `IZG Security` is evaluated against
  `adminoperations.canManagePasswordEncryption`
- **THEN** it SHALL be denied

#### Scenario: IZG Operations reads all of Access Control and changes all but Access Groups

- **WHEN** a user holding only `IZG Operations` is evaluated against the `accesscontrol`
  capabilities
- **THEN** `canViewAccessControl`, `canManageDenyList` and `canManageAdsFileTypes` SHALL be
  granted
- **AND** `canManageAccessGroups` SHALL be denied

#### Scenario: IZG Operations cannot approve a change request

- **WHEN** a user holding only `IZG Operations` is evaluated against
  `edit.canApproveChangeRequest`
- **THEN** it SHALL be denied

#### Scenario: Access Control stays with IZG Security and IZG Operations

- **WHEN** a user holding only `IZG Support`, `IZG Program`, `Jurisdiction Operations`,
  `Jurisdiction Support` or `Sender Operations` is evaluated against any `accesscontrol`
  capability
- **THEN** it SHALL be denied

#### Scenario: Jurisdiction-tier roles hold no Admin Operations capability

- **WHEN** a user holding only `Jurisdiction Operations`, `Jurisdiction Support` or
  `Sender Operations` is evaluated against any `adminoperations` capability
- **THEN** it SHALL be denied

#### Scenario: A permission change is visible in review

- **WHEN** any role's capability values change
- **THEN** the difference SHALL appear as an explicit line in a committed, generated
  representation of the role matrix
- **AND** a reviewer SHALL NOT have to infer the effect from edits to individual role files

#### Scenario: Changing a grant requires no code change

- **WHEN** the role matrix is later ratified and a capability must move to a different role
- **THEN** the change SHALL be an edit to matrix data only, with no edit to any enforcement
  function, page gate, or route declaration

### Requirement: Admin pages deny users who lack the entry capability

`/accesscontrol`, `/adminoperations`, `/console` and `/passwordencryption` SHALL be gated
server-side. Reaching them by typing the URL SHALL be denied for a user without the capability,
not merely hidden from navigation.

#### Scenario: Direct URL access is denied

- **WHEN** a signed-in user without the relevant entry capability requests any of those four
  pages by URL
- **THEN** an access-denied message SHALL be rendered in place
- **AND** exactly one `AccessDenied` audit event SHALL be written
- **AND** no page data SHALL be loaded or returned

#### Scenario: Admin Operations data is not fetched for a denied user

- **WHEN** a user without `canViewAdminOperations` requests `/adminoperations`
- **THEN** the hub-environment lookup SHALL NOT be performed

#### Scenario: The password-encryption page shares the Admin Operations block but not its entry capability

- **WHEN** access to `/passwordencryption` is evaluated
- **THEN** it SHALL use the `adminoperations` page key rather than a page key of its own, because
  it duplicates the Admin Operations password card
- **AND** its entry capability SHALL be `adminoperations.canManagePasswordEncryption`, not
  `canViewAdminOperations`

#### Scenario: Only IZG Security may open the password-encryption page

- **GIVEN** a user who holds `canViewAdminOperations` but not `canManagePasswordEncryption`, such
  as one holding only `IZG Operations`, `IZG Support` or `IZG Program`
- **WHEN** they request `/passwordencryption`
- **THEN** an access-denied message SHALL be rendered in place
- **AND** exactly one `AccessDenied` audit event SHALL be written, naming
  `adminoperations.canManagePasswordEncryption`
- **AND** the page SHALL NOT render the password-encryption card, so the encryption-status route
  SHALL NOT be called

#### Scenario: A stricter entry capability is allowed only on a page with no navigation link

- **WHEN** a page's server-side gate names an entry capability other than its page key's
  `PAGE_ENTRY` value
- **THEN** that page SHALL have no navigation link
- **AND** a test SHALL fail if such a page gains one, so that a link can never render for users
  the page refuses

#### Scenario: `/api-doc` hides its interface but is not a secured page

- **WHEN** a user without `canViewApiDoc` loads `/api-doc`
- **THEN** the documentation interface SHALL be hidden after hydration
- **AND** the specification endpoint behind it SHALL separately deny the request and write an
  audit event
- **AND** this page SHALL NOT be counted as server-side gated, because it exports static props
  and cannot be

### Requirement: Administrative API routes are gated by capability, not by session presence alone

Every API route backing an admin surface SHALL require the capability corresponding to the
operation it performs. Presence of a session SHALL NOT be sufficient for any mutating
administrative operation.

#### Scenario: Encryption-key operations require their capability

- **WHEN** a request without `canManagePasswordEncryption` calls the key-rotation, encrypt, or
  encryption-status routes
- **THEN** the response SHALL be `403`
- **AND** an `AccessDenied` event SHALL be written

#### Scenario: Hub-wide status operations require their capabilities

- **WHEN** a request without `canResetHubCircuitBreakers` calls the hub-wide circuit-breaker
  reset, or a request without `canRefreshHubDatabase` calls the database refresh
- **THEN** the response SHALL be `403`

#### Scenario: Holding the capability is sufficient, without OPERATIONS_GROUP membership

- **GIVEN** a user holding `canResetHubCircuitBreakers` or `canRefreshHubDatabase` who is not a
  member of the Okta group named by `OPERATIONS_GROUP`, such as one holding only `IZG Support`
- **WHEN** they call the corresponding hub-wide status route
- **THEN** the request SHALL be authorized
- **AND** no API route SHALL be gated on `OPERATIONS_GROUP` membership through middleware; the
  `checkAdmin` middleware SHALL NOT exist

#### Scenario: Access Control resources are gated per resource and per method

- **WHEN** a user holds `canViewAccessControl` but not the corresponding manage capability
- **THEN** reading access groups, the deny list, and ADS file types SHALL be authorized
- **AND** creating, updating, or deleting any of them SHALL be `403`
- **AND** this SHALL hold where a single route file serves both a read and a write method

#### Scenario: Change-request actions require their capability, not merely reach

- **GIVEN** a role with global jurisdiction reach that does not hold `canCancelRequest` or
  `canRescheduleRequest`
- **WHEN** it calls the change-request routes to cancel or reschedule any destination's request
- **THEN** the response SHALL be `403`
- **AND** this SHALL hold regardless of the caller's jurisdiction reach, because reach without
  capability is not authorization

> **Known limitation, raised by review on PR #700.** On these routes the capability and the
> destination reach are checked in two places — the capability by the route declaration, the
> reach by `hasAccessToDestId` inside the handler — and both are evaluated against the whole
> subject rather than one role. A user holding a scoped role that grants the capability *and* a
> separate global role that grants no capability can therefore combine the two halves and act
> outside the granting role's jurisdiction. `Jurisdiction Operations` plus `IZG Support` is a
> live example with today's roles.
>
> This is **narrower than the behaviour it replaces** — before this change these routes checked
> reach alone and no capability at all, so the same user could already act everywhere — but it
> does not yet meet the same-role rule stated in `page-authorization`. Closing it needs the
> capability and the destination resolved in one role-local decision, which means plumbing the
> destination id (carried in the body on one of these routes) into the declaration. Tracked as
> `AUTHZ_DEBT`; deliberately not attempted here, because it changes a helper shared with six
> routes beyond this change's scope.

#### Scenario: A shared lookup route accepts any of its legitimate callers

- **WHEN** the organizations lookup is called
- **THEN** it SHALL be authorized for a user holding any one of the capabilities of the surfaces
  that call it, rather than requiring a single one of them

#### Scenario: Maintenance scheduling is gated on both capability and tenancy

- **WHEN** a request calls the maintenance-update route
- **THEN** it SHALL require `manageconnections.canScheduleMaintainance`
- **AND** it SHALL additionally require that the caller's jurisdiction reach covers the target
  destination
- **AND** a caller failing the capability check SHALL receive `403`
- **AND** a caller failing the reach check SHALL receive `401`

> The two halves answer with different status codes, and this scenario says so rather than
> stating the intent. `403` is the correct code for both — a reach failure is an authorization
> failure — but the reach half is enforced by a middleware that predates this change and is
> shared with five other routes. Changing its status code affects all six and can alter client
> retry behaviour, so it is deliberately left to its own ticket. An earlier draft of this
> scenario required `403` for both and therefore described behaviour the implementation does not
> have; a specification that is not met is worse than one that records the gap. Raised by review
> on PR #700.

### Requirement: The target role matrix is reconciled, not silently adopted

The divergence between the role values and the target matrix SHALL be recorded, row by row,
with the reason for each divergence, so that a later reader can tell a deliberate deferral from
an oversight.

#### Scenario: Every remaining divergence names the ticket that owns it

- **WHEN** the value of `IZG Security`, `IZG Operations` or `IZG Support` for a capability differs
  from the target matrix
- **THEN** the role block SHALL carry a comment citing the target-matrix row, the ticket that owns
  the decision, and why the value is not yet applied
- **AND** for `IZG Operations` this SHALL cover `apikeys` (IGDD-3549) and `api-doc.canViewApiDoc`
  (IGDD-3550)

#### Scenario: No divergence is justified by an absent role or a deferred grant

- **WHEN** the role blocks for `IZG Security`, `IZG Operations` and `IZG Support` are read
- **THEN** no comment SHALL justify a value by a target role being absent from the role
  vocabulary, or by a grant being deferred to keep a change removal-only

#### Scenario: Tenancy reach already agrees

- **WHEN** the tenancy reach of the four roles common to both models is compared
- **THEN** the matrix values SHALL match the target, and SHALL NOT be changed by this change

#### Scenario: Target rows are mapped to page-qualified capabilities

- **WHEN** the role matrix is ratified
- **THEN** each target-matrix row SHALL be mapped to the `page.capability` pair that implements
  it, and that mapping SHALL be recorded here rather than re-derived, because the target model is
  keyed by capability alone and several of its rows straddle page blocks
