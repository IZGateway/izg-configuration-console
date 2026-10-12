# Spec Delta

## Purpose

Decide which rows a jurisdiction-filtered data read returns, given how far the caller's
roles reach. Reach is declared per role in the access matrix, and a caller with no reach
receives nothing rather than an error or an unfiltered result.

## ADDED Requirements

### Requirement: Destination row reach comes from the role matrix

The destination list read SHALL decide whether a caller sees every destination from the
global-tenancy value declared on the caller's roles in the access matrix. It SHALL NOT
decide from membership of an Okta group that the matrix does not describe.

#### Scenario: A globally scoped role sees every destination

- **GIVEN** a user whose only role declares global tenancy, and who holds no jurisdiction
  claim
- **WHEN** the user requests the destination list
- **THEN** the response SHALL contain every destination
- **AND** the response status SHALL be `200`

#### Scenario: Reach does not depend on the operations Okta group

- **GIVEN** a user whose role declares global tenancy and who is not a member of the Okta
  group named by `OPERATIONS_GROUP`
- **WHEN** the user requests the destination list
- **THEN** the response SHALL contain every destination
- **AND** the outcome SHALL match that of a user whose role declares global tenancy and who
  is a member of that group

#### Scenario: A scoped role sees only the destinations named in its claim

- **GIVEN** a user who holds no role with global tenancy and whose jurisdiction claim is
  `az`
- **WHEN** the user requests the destination list
- **THEN** the response SHALL contain only the destination whose identifier equals `az`
- **AND** the match SHALL be an exact whole-value match, case-insensitively
- **AND** a destination identified by `azova` SHALL NOT be present, because a longer value
  is a different destination and not a child of `az`

#### Scenario: Changing which role has reach requires no code change

- **WHEN** a role's declared global-tenancy value changes in the access matrix
- **THEN** the destination list reach of that role SHALL change accordingly
- **AND** the destination list read SHALL need no edit

### Requirement: Reach is a union across held roles on a read that pairs no capability

The destination list read requires a session and no capability. For such a read the caller
SHALL see every destination if any held role declares global tenancy. The same-role rule
does not apply, because there is no capability for a scoped role to borrow reach for.

#### Scenario: One global role and one scoped role

- **GIVEN** a user who holds one role with global tenancy and one jurisdiction-scoped role
- **WHEN** the user requests the destination list
- **THEN** the response SHALL contain every destination

#### Scenario: Only scoped roles

- **GIVEN** a user who holds two jurisdiction-scoped roles and no global role
- **WHEN** the user requests the destination list
- **THEN** the response SHALL contain only destinations in the user's jurisdiction claim

### Requirement: A caller with no reach receives an empty list

A caller with no global tenancy and an empty jurisdiction claim SHALL receive an empty
list and a success status. The read SHALL fail closed. It SHALL NOT return an error and
SHALL NOT return rows outside the caller's reach.

#### Scenario: Empty jurisdiction claim returns an empty list

- **GIVEN** a user who holds no role with global tenancy and whose jurisdiction claim is
  empty
- **WHEN** the user requests the destination list
- **THEN** the response status SHALL be `200`
- **AND** the response body SHALL be an empty list

#### Scenario: No query is issued for an empty reach

- **GIVEN** the same user
- **WHEN** the user requests the destination list
- **THEN** no data-store read SHALL be issued

#### Scenario: An empty reach does not return every row

- **GIVEN** the same user
- **WHEN** the user requests the destination list
- **THEN** the response SHALL NOT contain any destination
- **AND** an empty reach SHALL NOT be treated as unrestricted reach

#### Scenario: A malformed filter is never built

- **WHEN** the row filter for a jurisdiction-scoped caller is built from an empty
  jurisdiction claim
- **THEN** no filter expression SHALL be sent to the data store
- **AND** the read SHALL NOT raise an error

### Requirement: Every surface that selects a destination shows the caller's full reach

Each surface that lets a user choose a destination SHALL show every destination within the
caller's reach. All such surfaces SHALL read the same list, so that one caller sees one
set of destinations across the application.

#### Scenario: The Add Sender destination selector is populated

- **GIVEN** a signed-in user whose role declares global tenancy
- **WHEN** the user opens Add Sender on the Onboarding page
- **THEN** the destination selector SHALL list every destination
- **AND** no error message SHALL be shown in place of the list

#### Scenario: The Console destination picker is populated

- **GIVEN** the same user
- **WHEN** the user opens the destination picker on the Console page
- **THEN** the picker SHALL list the same destinations as the Add Sender selector

#### Scenario: A caller with no reach sees an empty selector

- **GIVEN** a signed-in user with no global tenancy and an empty jurisdiction claim
- **WHEN** the user opens either surface
- **THEN** the selector SHALL be empty
- **AND** no error message SHALL be shown
