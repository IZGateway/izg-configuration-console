## ADDED Requirements

### Requirement: Group membership is read from every location Okta may supply it

Okta group membership SHALL be read from the profile claims, the ID token, the access token and
the userinfo response, and the results SHALL be combined. A group present in any one location
SHALL count. No source's absence SHALL remove a group supplied by another.

#### Scenario: Group present only in the ID token

- **WHEN** a user's group appears in the ID token and nowhere else
- **THEN** the corresponding role SHALL be granted

#### Scenario: Group present only in the access token

- **WHEN** a user's group appears in the access token and nowhere else
- **THEN** the corresponding role SHALL be granted

#### Scenario: Group present only in the userinfo response

- **WHEN** a user's group appears in the userinfo response and nowhere else
- **THEN** the corresponding role SHALL be granted

#### Scenario: Group present in several locations

- **WHEN** the same group appears in more than one location
- **THEN** it SHALL be counted once and SHALL NOT produce a duplicate role

#### Scenario: Sources disagree

- **WHEN** one source lists a group and another omits it
- **THEN** the group SHALL still be counted

### Requirement: Group names match regardless of case and separators

Group names SHALL be compared after normalizing case and punctuation, so that differences in
capitalization or separator characters do not change the roles granted.

#### Scenario: Separator and case variants

- **WHEN** the Okta group is named any of `IZG Operations`, `izg operations`, `IZG-Operations`
  or `IZG_OPERATIONS`
- **THEN** the same role SHALL be granted in every case

#### Scenario: Surrounding whitespace

- **WHEN** a group name carries leading or trailing whitespace
- **THEN** it SHALL match the same role as the trimmed name

### Requirement: Group claim values are parsed tolerantly

The groups claim SHALL be read successfully whether Okta emits an array of strings, an array of
objects, a JSON-encoded array, or a comma-separated string, and whether the claim key is
`groups`, `Groups`, `group` or `Group`. A value that cannot be interpreted SHALL yield no groups
rather than raising an error.

#### Scenario: Array of strings

- **WHEN** the claim is an array of group-name strings
- **THEN** each name SHALL be read

#### Scenario: Array of objects

- **WHEN** the claim is an array of objects carrying the group name under `name`, `label`,
  `value` or a nested `profile.name`
- **THEN** each name SHALL be read

#### Scenario: Encoded string forms

- **WHEN** the claim is a JSON-encoded array, a comma-separated list, or a single bare name
- **THEN** the group names SHALL be read

#### Scenario: Alternate claim key casing

- **WHEN** the claim is published under `Groups`, `group` or `Group` instead of `groups`
- **THEN** the group names SHALL be read

#### Scenario: Malformed value

- **WHEN** the claim is absent, null, a non-string scalar, or an undecodable token
- **THEN** no groups SHALL be read
- **AND** sign-in SHALL NOT fail

### Requirement: Okta group names are decoupled from the role vocabulary

The mapping from Okta group name to roles SHALL be declared in one place, so that renaming a
group in Okta or granting several roles from one group is a configuration change rather than a
change to authorization logic.

#### Scenario: One group grants its role

- **WHEN** a recognized group name is resolved
- **THEN** the roles declared for it in the mapping SHALL be granted

#### Scenario: Mapping is the sole registry of role names

- **WHEN** the set of roles named by the mapping is compared with the access matrix
- **THEN** the two SHALL describe the same set of roles

### Requirement: Sign-in succeeds when the userinfo request fails

A failure to retrieve userinfo SHALL NOT prevent sign-in or discard group membership obtained
from other sources. Jurisdiction assignment SHALL be treated as empty in that case.

#### Scenario: Userinfo unavailable

- **WHEN** the userinfo request fails or returns an error status
- **THEN** sign-in SHALL complete
- **AND** roles SHALL still resolve from the remaining group sources
- **AND** the user's jurisdictions SHALL be empty
- **AND** an error-level log entry SHALL be emitted
