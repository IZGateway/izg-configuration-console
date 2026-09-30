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
