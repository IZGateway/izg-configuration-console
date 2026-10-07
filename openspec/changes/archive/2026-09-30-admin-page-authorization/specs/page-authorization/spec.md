## ADDED Requirements

### Requirement: Every page and every API route declares its authorization at its own definition site

Each file under `src/pages/` SHALL either declare how it is authorized, at the file itself, or
appear in an explicit allowlist carrying the reason it is exempt. A page declares by calling
`withPageAccess(pageKey)`; an API route declares by passing a `RouteAuthz` value as the first
argument to `withMiddleware`. No authorization decision SHALL be expressed as a path pattern
matched at request time.

#### Scenario: A route declares a capability

- **WHEN** an API route file calls `withMiddleware({ capability: { page, capability } }, …)`
- **THEN** a request to that route SHALL be authorized by `can()` against that page and
  capability before the handler runs

#### Scenario: A route that cannot yet declare a capability names its gap

- **WHEN** an API route's authorization is decided inside its own handler rather than by the
  wrapper
- **THEN** it SHALL declare `{ inHandler: <string> }`
- **AND** that string SHALL name a follow-up ticket, so an acknowledged gap is distinguishable
  from a settled decision

#### Scenario: Acknowledged gaps are declared once, with a ticket

- **WHEN** an authorization gap is knowingly left open — an ungated page, an unwrapped route, a
  handler-decided route, or a declared capability nothing reads
- **THEN** it SHALL be recorded as a row in a single typed debt table
- **AND** that row SHALL carry a ticket reference, required by the type rather than by
  convention
- **AND** exemptions that are permanently correct SHALL NOT be recorded there, so that a debt
  row never reads as a clearance

#### Scenario: Acknowledged gaps may shrink but never grow

- **WHEN** a change adds a new handler-decided declaration without adding a corresponding debt
  row
- **THEN** the test suite SHALL fail, because the count found in source no longer equals the
  count declared
- **AND** closing a gap SHALL mean replacing the declaration with a capability and deleting its
  row, with no separate ceiling to adjust

#### Scenario: A wrapper call with no declaration does not compile

- **WHEN** an API route file calls `withMiddleware()` with no `RouteAuthz` argument
- **THEN** the build SHALL fail

### Requirement: An undeclared page or route is a test failure

A CI test SHALL enumerate the page and API trees from disk and fail when a file neither declares
its authorization nor appears in an allowlist with a stated reason. This test, not the compiler,
is the guarantee: the filesystem defines the route table, the type system has no view of it, and
so nothing in the type system can force a newly added file to call anything at all.

#### Scenario: A new ungated page fails CI

- **WHEN** a file is added under `src/pages/` that neither references `withPageAccess` nor is
  listed in the allowlist
- **THEN** the page-coverage test SHALL fail

#### Scenario: A new route that bypasses the wrapper fails CI

- **WHEN** a file is added under `src/pages/api/` that does not call `withMiddleware` and is not
  one of the two allowlisted next-auth routes
- **THEN** the route-coverage test SHALL fail
- **AND** this SHALL hold regardless of the file's extension, since an API route may be named
  `.tsx`

#### Scenario: The coverage test cannot be silently emptied

- **WHEN** the route-coverage test runs
- **THEN** it SHALL assert that the number of enumerated route files is at least the count known
  at the time of this change, so a glob that matches nothing fails rather than passes

#### Scenario: Only routes live in the route tree

- **WHEN** a module under `src/pages/api/` is not an API route — a helper, a type, or shared
  middleware
- **THEN** it SHALL NOT live there, because the framework serves every file in that tree as a
  route regardless of intent
- **AND** in particular the module defining route authorization SHALL NOT itself be served as an
  unauthenticated route

#### Scenario: Gating a page and handling the denial are checked separately

- **WHEN** a page file references `withPageAccess`
- **THEN** it SHALL also reference the denial component, so a page cannot be gated while
  silently rendering nothing in the denied case

### Requirement: The navigation link and the page gate resolve to the same capability

The capability that gates entry to a page SHALL be declared exactly once, and both the
server-side page gate and the navigation-visibility predicate SHALL read that same declaration.
Adding a page key without an entry capability SHALL fail to compile.

#### Scenario: Link visibility and page access cannot disagree

- **WHEN** a user lacks the entry capability for a page
- **THEN** the navigation entry for that page SHALL be hidden
- **AND** a direct request to that page SHALL be denied
- **AND** neither behaviour SHALL be derivable from a separate, independently-editable value

#### Scenario: A new page key must declare its entry capability

- **WHEN** a page key is added to the access matrix without a corresponding entry in the
  page-entry map
- **THEN** the build SHALL fail

#### Scenario: Listing a page does not gate it

- **WHEN** a page key appears in the page-entry map but its page file does not call
  `withPageAccess`
- **THEN** the page SHALL remain ungated
- **AND** the page-coverage test SHALL require it to appear in the allowlist with a reason

### Requirement: Page access is decided server-side before any data is read

A page gate SHALL run in `getServerSideProps`, before the page's own data loading, and SHALL NOT
depend on client-side code having executed. It SHALL run for both a full page load and a
client-side navigation.

#### Scenario: The handler does not run for a denied user

- **WHEN** a user without the entry capability requests a gated page
- **THEN** the page's data-loading handler SHALL NOT be invoked
- **AND** no page data SHALL appear in the response

#### Scenario: Client-side navigation is gated too

- **WHEN** a user navigates to a gated page from within the application, so the framework
  requests the page's data endpoint rather than its URL
- **THEN** the same gate SHALL apply

#### Scenario: The recorded URL is the one the user sees

- **WHEN** a denial occurs during a client-side navigation
- **THEN** the audit event's `url` SHALL be the page path the browser shows, not the internal
  data-fetch path

### Requirement: A denied request displays a message rather than redirecting

A user who lacks access SHALL be told so in place. The application SHALL NOT redirect them
elsewhere, which hides the fact that access was denied and makes the outcome indistinguishable
from a broken link.

#### Scenario: Denial renders in place

- **WHEN** a signed-in user without the entry capability requests a gated page
- **THEN** the response SHALL render an access-denied message within the normal application
  chrome
- **AND** the response SHALL NOT contain a redirect
- **AND** the browser URL SHALL remain the requested page

#### Scenario: Denial explains the stale-session case

- **WHEN** the access-denied message is displayed
- **THEN** it SHALL state that group membership is captured at sign-in and that a newly granted
  role requires signing in again

#### Scenario: An unauthenticated request is not a denial

- **WHEN** a request arrives for a gated page with no session
- **THEN** the response SHALL redirect to sign-in
- **AND** no access-denied audit event SHALL be written

#### Scenario: A denied API request is a 403

- **WHEN** a request without the required capability reaches a declared API route
- **THEN** the response SHALL be `403`
- **AND** the handler SHALL NOT be invoked

#### Scenario: A route never resolves without responding

- **WHEN** a request is refused on authorization grounds at any route
- **THEN** the refusal SHALL be an explicit response
- **AND** no code path SHALL leave the request unanswered, which stalls the caller and produces
  no audit record of the refusal

#### Scenario: An authorization check is not an unbalanced conditional

- **WHEN** a handler's own code gates its body on an authorization condition
- **THEN** the negative branch SHALL be expressed, not left implicit
- **AND** where the condition maps onto an existing matrix capability, it SHALL be lifted into
  the route's declaration instead, so the wrapper answers before the handler runs

#### Scenario: A method not covered by a per-method declaration is rejected

- **WHEN** a request uses an HTTP method absent from a route's `byMethod` declaration
- **THEN** the response SHALL be `405` with an `Allow` header

### Requirement: A denied request writes exactly one queryable audit event

Every authorization denial SHALL produce exactly one `AccessDenied` event, carrying enough
structure to answer "who was denied what, where, and which roles did they hold" without reading
adjacent log lines.

#### Scenario: Page denial is attributable

- **WHEN** a page access denial occurs
- **THEN** exactly one `AccessDenied` event SHALL be written
- **AND** it SHALL carry the denial surface (`page`), the page key, the requested URL, the
  caller's identity, and the full set of roles they hold

#### Scenario: The permission is unambiguous

- **WHEN** an `AccessDenied` event names the permission that was missing
- **THEN** it SHALL be qualified by its page, because the same capability name exists on more
  than one page block

#### Scenario: An any-of denial names every alternative, not one of them

- **WHEN** a route declares several alternative capabilities and the caller holds none of them
- **THEN** the event SHALL list **all** of the alternatives
- **AND** it SHALL NOT report a single missing permission, because each alternative would have
  allowed the request on its own and naming one would misdirect the operator reading the log
- **AND** it SHALL NOT report a single page, because the alternatives may span different page
  blocks

#### Scenario: Page and API denials are separable and correlatable

- **WHEN** an operator searches the audit log
- **THEN** page denials SHALL be isolable from API denials by a single field
- **AND** a session's page denials SHALL be correlatable with its API denials by the session
  identifier already attached to every log line

#### Scenario: Existing audit consumers are unaffected

- **WHEN** the new fields are added to the access-denied event shape
- **THEN** they SHALL be optional
- **AND** every pre-existing call site and log search SHALL continue to work unchanged

### Requirement: A capability whose data path applies no jurisdiction filter additionally requires global tenancy

Holding such a capability SHALL NOT be sufficient on its own: the granting role SHALL also have
global tenancy reach. Some admin surfaces show data for every jurisdiction and carry no
jurisdiction in their URL, so they are authorized without a tenancy argument; without this rule,
granting one to a jurisdiction-scoped role would leak every other tenant's data as the result of
a one-line data edit.

#### Scenario: A scoped role holding the capability is still denied

- **GIVEN** a capability marked as requiring global tenancy
- **WHEN** a user holds it only through a role whose tenancy reach is not global
- **THEN** access SHALL be denied, at both the page and the API route
- **AND** an `AccessDenied` event SHALL be written

#### Scenario: A globally-scoped holder is allowed

- **WHEN** a user holds the same capability through a role with global tenancy reach
- **THEN** access SHALL be granted

#### Scenario: The guard cannot be satisfied by combining roles

- **WHEN** a user holds the capability through one role and global tenancy through a different
  role
- **THEN** access SHALL be denied, consistent with the existing rule that a permission and a
  reach check must be satisfied by the same role

#### Scenario: The guarded set is declared in one place

- **WHEN** a capability requires global tenancy
- **THEN** that fact SHALL be recorded once, centrally, and read by every enforcement point
- **AND** a declaration site SHALL NOT be able to opt a capability into or out of the guard,
  since the same capability is declared at more than one route and an omission at any one of
  them would be a silent bypass

#### Scenario: An any-of declaration evaluates the guard per alternative

- **GIVEN** a route declaring several acceptable capabilities, only some of which are guarded
- **WHEN** a caller holds only an unguarded alternative
- **THEN** the request SHALL be authorized on that alternative
- **AND** the guard on the other alternatives SHALL NOT be applied to the request as a whole

### Requirement: Adding a role, a page, or a capability is a data change with a compiler-enforced checklist

The authorization mechanism SHALL be generic over the set of roles, pages and capabilities. No
enforcement code SHALL require editing to add any of them, and the type system SHALL refuse to
compile an incomplete addition.

#### Scenario: A new role with one narrow capability

- **WHEN** a new role is added to the role vocabulary, the group mapping, the precedence order
  and the access matrix, with its own matrix file
- **THEN** no page gate, route declaration, or enforcement function SHALL require any edit
- **AND** the role SHALL be able to hold a single capability without gaining any other

#### Scenario: An incomplete role file does not compile

- **WHEN** a new role's matrix file omits any page block or any capability within a block
- **THEN** the build SHALL fail

#### Scenario: A new capability forces an explicit decision for every role

- **WHEN** a capability is added to a page's control type
- **THEN** the build SHALL fail until every role declares a value for it

#### Scenario: A page key matches the key derived from its route

- **WHEN** a page key is used in the access matrix
- **THEN** it SHALL equal the key derived from that page's route path, with no exceptions
