---
schema_version: '1.0'
created:
  date: '2026-11-02T22:28:58.458Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '1.0'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~89ff88aa-413a-418d-ac97-244f1a455684
  summary: >-
    page-authorization spec delta adding composable reach requirement for
    protect-connection-pages-and-endpoints
updated: []
change_request: protect-connection-pages-and-endpoints
ticket: 'IGDD-3545, IGDD-3548'
---
# Spec Delta

## ADDED Requirements

### Requirement: A capability may be bound to a destination found in the request
A route's authorization declaration MAY include a reach requirement identifying where in the
request a destination id is found. When a capability and a reach requirement are both declared,
they SHALL be evaluated together against a single role: the request SHALL be allowed only when
one role the caller holds grants both the capability and reach to that destination. A capability
held by one role SHALL NOT combine with reach held by a different role to satisfy this check.

#### Scenario: A single role satisfying both halves is allowed
- **WHEN** a user holds a role that grants both the declared capability and reach to the
  destination named in the request
- **THEN** the request is allowed

#### Scenario: Two roles each satisfying only one half is denied
- **WHEN** a user holds one role that grants the declared capability for a different destination
  and a second role that grants reach to the requested destination, but no single role grants
  both
- **THEN** the request is denied

### Requirement: A declared reach requirement is the only reach check on that route
A route that declares a reach requirement SHALL NOT also be wrapped in an independent,
reach-only check. The declared requirement SHALL be the sole source of the route's reach
decision, so a capability and a reach check cannot be attached to the same route as two
separately-satisfiable pieces.

#### Scenario: No independent reach middleware runs alongside a declared reach requirement
- **WHEN** a route declares a reach requirement as part of its authorization declaration
- **THEN** no separate reach-only middleware also runs for that route
