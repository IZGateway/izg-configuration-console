## MODIFIED Requirements

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

#### Scenario: The IZG Security group resolves to the IZG Security role

- **WHEN** a user belongs to the Okta group `IZG Security`, spelled with any capitalization or with
  `-` or `_` in place of the space
- **THEN** the resolved role set SHALL contain `IZG Security`
- **AND** that role SHALL have an access-matrix entry that declares global tenancy

### Requirement: Existing single-role users retain their current access

Introducing multi-role support SHALL NOT change the effective permissions of any user who holds
exactly one recognized role. Later changes to a role's values SHALL come only from ratified
role-matrix decisions, recorded as such.

#### Scenario: Each existing role is unchanged

- **WHEN** a user holding exactly one of `IZG Operations`, `IZG Support`,
  `Jurisdiction Operations` or `Jurisdiction Support` signs in
- **THEN** their page permissions and jurisdiction scope SHALL match the behaviour prior to this
  change
- **AND** the only exceptions SHALL be the ratified role-matrix decisions applied by IGDD-3498:
  `IZG Support` gains the three hub-wide Admin Operations capabilities, and `IZG Operations` loses
  `accesscontrol.canManageAccessGroups`, `adminoperations.canManagePasswordEncryption` and
  `edit.canApproveChangeRequest`

#### Scenario: Sessions issued before deployment continue to work

- **WHEN** a session established before this change is used after deployment
- **THEN** roles SHALL resolve correctly without requiring the user to sign in again

> **Not yet verified.** The design supports this scenario — the role set is recomputed
> from `token.groups` on every session callback rather than being frozen at sign-in — but
> it was never exercised, because the change is merged and not yet deployed. It is task 8.8
> of the originating change, recorded in `~/Downloads/izg-cc-openspec-archive.md`,
> section 13. Confirm after the 2026-10-06 deploy.
