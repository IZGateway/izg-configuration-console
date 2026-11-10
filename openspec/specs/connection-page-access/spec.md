# connection-page-access Specification

## Purpose
Governs who may enter the five connection-management pages (Edit Connection, Connection
History, Test, Change Request, Test Report) and who may use each independently-gated action or
view within Edit Connection and Connection History once there.

## Requirements

### Requirement: The five connection pages have matrix capabilities
The access matrix SHALL define entry capabilities for the `edit`, `history`, `test`, and
`changerequest` page blocks. `testreport` SHALL be gated by the `test` block's entry capability
rather than a capability of its own, since it is reached only from the Test action's own
Generate Report button for the same audience.

#### Scenario: Entering Test Report reuses the Test capability
- **WHEN** a user without `test.canRunConnectionTest` requests `/testreport`
- **THEN** they are denied exactly as they would be for `/test`

### Requirement: Connection pages deny users who lack the entry capability
`/edit`, `/history`, `/test`, `/changerequest`, and `/testreport` SHALL be gated server-side.
Reaching any of them by typing the URL directly SHALL be denied for a user without the entry
capability, not merely hidden from navigation.

#### Scenario: Direct navigation to Edit Connection is denied server-side
- **WHEN** a user without `edit.canChangeCredentials` requests `/edit/<destId>` directly
- **THEN** the server denies the request before any connection data is read, and the denial is
  recorded as an `AccessDenied` audit event

### Requirement: Connection page-entry seed values preserve today's access
The page-entry capability values already defined in the access matrix for `edit`, `history`, and
`test` SHALL grant exactly the access each currently-supported role has today, except for the
role being retired.

#### Scenario: An existing role's page access is unchanged
- **WHEN** a user holding IZG Support, Jurisdiction Operations, Jurisdiction Support, or IZG
  Operations uses Connection History or Test after this change ships
- **THEN** their access is unchanged from before this change

### Requirement: Edit Connection actions are independently gated
Each mutable action on Edit Connection — saving a draft, resetting a draft, running a draft
connection test — SHALL require its own capability, checked independently of the page's entry
capability. A role holding the entry capability but not an action's capability SHALL NOT see or
be able to invoke that action's control. Submitting (creating or resubmitting) a change request
is governed by `edit.canCreateChangeRequest` alone — there is no separate "approve" action in
the application; a change request is approved externally, in Jira, and `edit.canApproveChangeRequest`
is intentionally redundant with `canCreateChangeRequest` rather than a distinct control.

#### Scenario: A viewer without an action capability does not see its control
- **WHEN** a user holds `edit.canChangeCredentials` but not `edit.canSaveDraft`
- **THEN** the Save control is not rendered on the Edit Connection page for that user

### Requirement: Connection History views are independently gated
Each view on Connection History — change request, connection info details, hub status history,
change history — SHALL require its own capability, checked independently of the page's entry
capability.

#### Scenario: A viewer without a view's capability does not see it
- **WHEN** a user holds `history.canViewConnectionInfo` but not `history.canViewHubStatusHistory`
- **THEN** the hub status history view is not rendered on the Connection History page for that
  user

### Requirement: ConnectionTable report controls share the Test capability
The Test Report(s) toggle and both Generate Report controls on Manage Connections SHALL require
the same `canRunConnectionTest` capability already required by the adjacent connection-test
action on the same table.

#### Scenario: A role without test access does not see report controls
- **WHEN** a user lacks `canRunConnectionTest` on Manage Connections
- **THEN** neither the Test Report(s) toggle nor either Generate Report control is rendered for
  that user
