# Spec Delta

## ADDED Requirements

### Requirement: A credential's use types are visible in the keys grid

The keys grid SHALL display the use types recorded on each credential. Use types decide
which data populations a credential can submit, so an operator MUST be able to read them
from the list itself, without an action on the row.

#### Scenario: Each row displays its use types by label

- **WHEN** the keys grid renders a credential that carries one or more use types
- **THEN** the row SHALL display each of those use types by its human-readable label —
  `PATIENT` as "Patient", `PROVIDER` as "Provider", `PUBLIC_HEALTH` as "Public Health"
- **AND** the labels SHALL appear in the canonical enumeration order, `PATIENT` then
  `PROVIDER` then `PUBLIC_HEALTH`, because storage is an unordered String Set and stored
  order is therefore not a stable thing to display
- **AND** the values SHALL pass through the enumeration guard first, so a stored value
  outside the enumeration cannot reach the display

#### Scenario: More than two use types collapse behind a count

- **WHEN** a credential carries more than two use types
- **THEN** the row SHALL display the first two labels in canonical order, followed by a
  count of the remainder
- **AND** the complete list SHALL be reachable on the row without navigation away from the
  grid
- **AND** the row SHALL keep the same height as every other row

#### Scenario: A credential with no recorded use types still renders

- **WHEN** a credential row carries no use types
- **THEN** the row SHALL display an em dash rather than an empty cell
- **AND** the grid SHALL NOT fail to render that row

> Every credential created through the Console carries at least one use type, because the
> Create dialog rejects an empty selection. This scenario covers a malformed or legacy row:
> `useTypes` is an optional property and the store is schemaless, so absence is reachable.

#### Scenario: The use types column sorts on its labels

- **WHEN** the operator sorts the keys grid by the use types column
- **THEN** rows SHALL order by their use-type labels taken in canonical order
- **AND** a row with no use types SHALL sort consistently rather than at an arbitrary
  position

### Requirement: The dialogs that act on a credential state its use types

A dialog that reports an existing credential's recorded scope SHALL state that credential's
use types, read-only. The operator MUST be able to read the scope at the moment of acting on
the key, and MUST NOT be able to change it there.

#### Scenario: The Renew dialog states the use types it will carry over

- **WHEN** the Renew dialog opens for a credential
- **THEN** it SHALL display that credential's use types, by label and in canonical order,
  alongside the Jurisdiction, Environment and Domain it already carries over
- **AND** the field SHALL be read-only, because renewal takes use types from the record and
  not from the request
- **AND** the operator SHALL NOT be offered any control that changes them

#### Scenario: The Re-issue dialog states the use types it will request

- **WHEN** the Re-issue dialog opens its confirmation step for an expired credential
- **THEN** it SHALL display that credential's use types, read-only, alongside the
  Jurisdiction and Environment

> This states behaviour that already exists. It is written down because nothing specified it,
> and an unspecified display is free to disappear in a refactor.

#### Scenario: The one-time token reveal does not state the use types

- **WHEN** the one-time token reveal dialog opens
- **THEN** it SHALL display the key expiry and the token string, and SHALL NOT display the
  use types
- **AND** this is deliberate: that dialog hands over a secret that is shown once and never
  again, so its content stays minimal and its reader stays on the one task

#### Scenario: Every surface uses the same labels and the same order

- **WHEN** any surface displays a credential's use types — the grid or any dialog
- **THEN** it SHALL use the same human-readable labels and the same canonical order
- **AND** it SHALL apply the same enumeration guard, so no surface shows a value that
  another surface drops

### Requirement: The keys list can be narrowed by use type

An operator SHALL be able to reduce the keys list to the credentials carrying a given use
type, both by an explicit filter and by free-text search.

#### Scenario: The filter selects every credential carrying the chosen use type

- **WHEN** the operator chooses a use type in the keys-list filter
- **THEN** the list SHALL show every credential that carries that use type, whether or not it
  carries others as well
- **AND** a credential carrying none SHALL be excluded
- **AND** it SHALL compose with the other filters and with the text search, as the
  requirement "The credential list is returned whole and filtered client-side" already
  requires of the environment, status and organization filters

#### Scenario: The filter is reported and cleared like its neighbours

- **WHEN** a use-type filter is active
- **THEN** the active-filter count SHALL include it
- **AND** the control that clears all filters SHALL clear it

#### Scenario: Free-text search matches a use-type label

- **WHEN** the operator types text that matches a use-type label, case-insensitively and as a
  substring
- **THEN** the list SHALL include every credential carrying that use type
- **AND** search SHALL match the human-readable labels, not the stored enumeration values,
  because the stored forms appear nowhere an operator can read them
