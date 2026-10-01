# admin-page-access Specification

## Purpose

Bring the four administrative surfaces — Access Control, Admin Operations, the admin
log search at `/console`, and the Swagger API documentation — under the role matrix,
together with Onboarding and the API routes behind all of them.

The seeded role values reproduce exactly the access `isAdmin` granted before this
capability existed, so the change only ever removes access and never adds it. Where the
ratified target matrix disagrees with those seeds, the divergence is recorded row by row
with its reason, so a later reader can tell a deliberate deferral from an oversight.

## Requirements

### Requirement: The admin surfaces have matrix capabilities

The access matrix SHALL define four admin page blocks — `accesscontrol`, `adminoperations`,
`console`, `api-doc` — each with a capability gating entry to the page, plus one capability per
independently-mutable resource on it.

#### Scenario: The capability set

- **WHEN** the access matrix is inspected
- **THEN** `accesscontrol` SHALL define `canViewAccessControl`, `canManageAccessGroups`,
  `canManageDenyList`, `canManageAdsFileTypes`
- **AND** `adminoperations` SHALL define `canViewAdminOperations`,
  `canManagePasswordEncryption`, `canResetHubCircuitBreakers`, `canRefreshHubDatabase`
- **AND** `console` SHALL define `canViewConsole`
- **AND** `api-doc` SHALL define `canViewApiDoc`

#### Scenario: The hub-wide circuit-breaker reset is a distinct capability

- **WHEN** a role holds `manageconnections.canResetCircuitBreaker`, which authorizes the
  per-destination reset
- **THEN** it SHALL NOT thereby be authorized for the hub-wide reset
- **AND** the hub-wide reset SHALL be gated by `adminoperations.canResetHubCircuitBreakers`

#### Scenario: Capabilities over unfiltered data paths are identified

- **WHEN** the set of capabilities requiring global tenancy is inspected
- **THEN** it SHALL contain `console.canViewConsole`, whose message-traffic query applies no
  jurisdiction filter
- **AND** it SHALL contain every `accesscontrol` capability, because the deny-list and
  access-group reads take no jurisdiction argument at all
- **AND** membership SHALL follow from whether the data path filters by jurisdiction, not from
  which page the capability happens to sit on

#### Scenario: `/console` means the admin log search

- **WHEN** `console.canViewConsole` is granted
- **THEN** it SHALL authorize the admin log search at `/console` only
- **AND** it SHALL NOT be interpreted as authorizing the status-report widget on the landing
  page, which is a separate surface

### Requirement: Seed values reproduce today's access exactly

The role→capability values introduced by this change SHALL grant precisely the access that
`isAdmin` grants today, and no more. No role SHALL gain access it does not currently have.

#### Scenario: Today's holder keeps everything

- **WHEN** a user holding `IZG Operations` is evaluated against any new admin capability
- **THEN** it SHALL be granted

#### Scenario: Every other role holds nothing new

- **WHEN** a user holding any of `IZG Support`, `Jurisdiction Operations`,
  `Jurisdiction Support`, or `Sender Operations` is evaluated against any new admin capability
- **THEN** it SHALL be denied

#### Scenario: Seeds are marked provisional

- **WHEN** a new admin block is read in the matrix file of the role that holds it
- **THEN** it SHALL carry a comment identifying the ticket, stating that the values reproduce
  pre-existing access, and citing the target-matrix row it diverges from and why

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

#### Scenario: The password-encryption page shares the Admin Operations capability

- **WHEN** access to `/passwordencryption` is evaluated
- **THEN** it SHALL use the `adminoperations` page key rather than a page key of its own, because
  it duplicates the Admin Operations password card

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

### Requirement: Onboarding is gated on its capability at the page and at every route behind it

`canViewOnboarding` SHALL gate the `/onboarding` page and all three allowed-user routes, not
only the navigation entry. A role without it SHALL NOT be able to read, add, edit or delete
sender records by any path.

#### Scenario: A role without the capability cannot reach the page

- **WHEN** a signed-in user without `canViewOnboarding` requests `/onboarding` by URL
- **THEN** an access-denied message SHALL be rendered in place
- **AND** an `AccessDenied` audit event SHALL be written

#### Scenario: The write endpoint is closed, not just the page

- **WHEN** such a user calls the allowed-users route directly with `POST` or `DELETE`
- **THEN** the response SHALL be `403`
- **AND** this SHALL hold for the by-destination and audit routes as well

#### Scenario: Roles that use onboarding today are unaffected

- **WHEN** a user holding `canViewOnboarding` uses the page
- **THEN** every action available to them before this change SHALL remain available, since the
  capability gating reads and writes is the one they already hold

#### Scenario: Read and write are not yet separated

- **WHEN** the onboarding capabilities are inspected
- **THEN** a single capability SHALL gate both viewing and mutating
- **AND** separating them SHALL be deferred, because no current value distinguishes the two and
  inventing one would be a policy decision rather than a reproduction of today's access

### Requirement: A user may view an admin page without being able to change it

Within-page granularity SHALL be real: entry to a page SHALL NOT imply permission to mutate
anything on it, and controls for operations the user cannot perform SHALL be hidden.

#### Scenario: View without mutate on Access Control

- **GIVEN** a user holding `canViewAccessControl` and none of the three manage capabilities
- **WHEN** they open the page
- **THEN** all tabs SHALL render and their contents SHALL be readable
- **AND** the add, edit and delete controls for access groups, deny-list entries and ADS file
  types SHALL be absent
- **AND** calling the corresponding routes directly SHALL be `403`

#### Scenario: View without mutate on Admin Operations

- **GIVEN** a user holding `canViewAdminOperations` and none of the three action capabilities
- **WHEN** they open the page
- **THEN** the page SHALL render
- **AND** the password-encryption, circuit-breaker-reset and database-refresh controls SHALL be
  absent

#### Scenario: Controls render on permission, never hide on its absence

- **WHEN** permission state has not yet resolved on the client
- **THEN** permission-gated controls SHALL be absent rather than present, so the loading state
  fails closed

### Requirement: The target role matrix is reconciled, not silently adopted

The divergence between the seeded values and the target matrix SHALL be recorded, row by row,
with the reason for each divergence, so that a later reader can tell a deliberate deferral from
an oversight.

#### Scenario: Rows whose target holder does not exist keep today's value

- **WHEN** a target-matrix row assigns a capability to a role that has no entry in the role
  vocabulary
- **THEN** the seed SHALL keep today's holder
- **AND** the divergence SHALL be recorded with the absent role named

#### Scenario: Rows that would grant new access are deferred

- **WHEN** a target-matrix row would grant a capability to a role that does not hold the
  equivalent access today
- **THEN** it SHALL NOT be applied by this change
- **AND** it SHALL be recorded as a follow-up, so that this change only ever removes access

#### Scenario: Tenancy reach already agrees

- **WHEN** the tenancy reach of the four roles common to both models is compared
- **THEN** the matrix values SHALL match the target, and SHALL NOT be changed by this change

#### Scenario: Target rows are mapped to page-qualified capabilities

- **WHEN** the role matrix is ratified
- **THEN** each target-matrix row SHALL be mapped to the `page.capability` pair that implements
  it, and that mapping SHALL be recorded here rather than re-derived, because the target model is
  keyed by capability alone and several of its rows straddle page blocks

### Requirement: Permission flags that nothing enforces are labelled as such

A declared capability that no code reads SHALL NOT be presented as a guarantee. Each SHALL be
recorded in an allowlist naming its enforcement state and the ticket that would close it.

#### Scenario: Unenforced flags are enumerated

- **WHEN** the unenforced-permission allowlist is inspected
- **THEN** every capability that no code reads SHALL appear in it
- **AND** each entry SHALL carry its enforcement state and a ticket reference

#### Scenario: Enforcement states use the shared vocabulary

- **WHEN** an enforcement state is recorded
- **THEN** it SHALL use the same terms as the target matrix — `Enforced`, `UI-only`,
  `Not enforced`, `Unconfirmed` — so that the code and the role matrix can be diffed directly
  rather than re-audited
