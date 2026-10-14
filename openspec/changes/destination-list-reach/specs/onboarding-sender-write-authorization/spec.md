# Spec Delta

## Purpose

Decide which roles may mutate the onboarding sender list, as distinct from viewing it.
Folded into this change from the backlog ticket that owns it (IGDD-3546), after the team
decided to ship it alongside the destination-reach fix rather than as a separate follow-up.
See `proposal.md` — "Scope expansion: IGDD-3546 folded in" for why.

## ADDED Requirements

### Requirement: Viewing the onboarding sender list requires a different capability than mutating it

The onboarding sender routes SHALL authorize GET separately from POST and DELETE. A role
that holds only the view capability SHALL NOT be authorized to add, edit, promote, demote
or delete a sender, even though it can see the list those actions would change.

#### Scenario: A view-only role can list senders

- **GIVEN** a user whose only onboarding capability is `canViewOnboarding`
- **WHEN** the user calls `GET /api/allowedusers`
- **THEN** the response status SHALL be `200`

#### Scenario: A view-only role is refused on write

- **GIVEN** the same user
- **WHEN** the user calls `POST /api/allowedusers` or `DELETE /api/allowedusers`
- **THEN** the request SHALL be refused with status `403`
- **AND** an `AccessDenied` audit entry SHALL be written naming the role, the method and the
  permission that was missing

#### Scenario: A role holding both capabilities is unaffected

- **GIVEN** a user whose onboarding capabilities include both `canViewOnboarding` and
  `canManageSenders`
- **WHEN** the user calls GET, POST or DELETE on `/api/allowedusers`
- **THEN** every call SHALL behave exactly as it did before this capability existed

#### Scenario: A read-only route with no write method needs no split

- **GIVEN** a route that only ever serves GET (`/api/allowedusers/bydestination`,
  `/api/allowedusersaudit/*`)
- **WHEN** deciding whether it needs a `byMethod` capability split
- **THEN** `canViewOnboarding` alone SHALL remain its correct and complete gate, because
  there is no write method to separate

### Requirement: The write capability is granted per role in the access matrix, not guessed

The seed value for `onboarding.canManageSenders` SHALL be set per the matrix owner's
confirmed grant, not inferred by whoever implements the split.

#### Scenario: Operations roles may write, Support roles may not

- **GIVEN** the confirmed grant: IZG Operations and Jurisdiction Operations hold
  `canManageSenders`; IZG Support, Jurisdiction Support and Sender Operations do not
- **WHEN** the access matrix is read for any of these five roles
- **THEN** the role's `canManageSenders` value SHALL match that grant exactly

### Requirement: Mutating controls in the UI are hidden for a caller who cannot write

The onboarding screen SHALL render its add, edit, connect/disconnect, promote/demote and
delete controls only for a caller holding `canManageSenders`, following this codebase's
render-on-true convention so a permission that is still loading fails closed.

#### Scenario: A view-only role sees the list but not the mutating controls

- **GIVEN** a signed-in user who holds `canViewOnboarding` but not `canManageSenders`
- **WHEN** the user opens the onboarding page
- **THEN** the sender list SHALL load
- **AND** the add, edit, connect/disconnect, promote/demote and delete controls SHALL be
  absent

#### Scenario: A write-capable role sees the page unchanged

- **GIVEN** a signed-in user who holds `canManageSenders`
- **WHEN** the user opens the onboarding page
- **THEN** the page SHALL behave exactly as it did before this capability existed

### Requirement: Mutating a sender is also scoped by the caller's jurisdiction reach

`canManageSenders` SHALL decide *whether* a role may mutate the onboarding sender list.
It SHALL NOT be treated as deciding *which* destination's senders a role may mutate.
`POST`/`DELETE /api/allowedusers` SHALL additionally check that the request's
`destinationId` is within the caller's reach, and SHALL refuse the request otherwise. Added
after PR #729 review found that the capability split alone let a jurisdiction-scoped
write-capable role mutate any jurisdiction's senders, not only its own.

#### Scenario: A write-capable scoped role may mutate its own jurisdiction's senders

- **GIVEN** a user holding `canManageSenders` whose jurisdiction claim is `az`
- **WHEN** the user calls `POST /api/allowedusers` with `destinationId: 'az'`
- **THEN** the request SHALL succeed

#### Scenario: A write-capable scoped role is refused outside its jurisdiction

- **GIVEN** the same user
- **WHEN** the user calls `POST /api/allowedusers` or `DELETE /api/allowedusers` with a
  `destinationId` outside the `az` claim
- **THEN** the request SHALL be refused with status `403`
- **AND** an `AccessDenied` audit entry SHALL be written naming the destination and the
  missing reach
- **AND** no write SHALL reach the data store

#### Scenario: A globally-scoped write-capable role is unaffected

- **GIVEN** a user holding `canManageSenders` whose role declares global tenancy
- **WHEN** the user calls `POST /api/allowedusers` or `DELETE /api/allowedusers` with any
  `destinationId`
- **THEN** the request SHALL behave exactly as it did before this requirement existed
