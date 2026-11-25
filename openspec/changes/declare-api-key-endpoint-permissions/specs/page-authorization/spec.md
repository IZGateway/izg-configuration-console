---
schema_version: '1.0'
created:
  date: '2026-11-07T12:45:00.714Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '5'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~708bf7c0-2caf-4f88-aec9-d823e3880a3c
  summary: >-
    Write page-authorization spec delta for
    declare-api-key-endpoint-permissions: tighten reach-requirement wording to
    cover resolved (not just found) destinations
updated:
  - date: '2026-11-07T21:42:27.741Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~fa3827bd-5489-4a08-88e7-b48a2367ee7f
    summary: >-
      Add requirement for sharing a capability between a scoped and an unscoped
      route, per Keith's correction (set-scoping vs single-scoping, both
      declarative); Trim requirement description under 500 chars per openspec
      validate warning, move detail into scenarios
  - date: '2026-11-07T12:45:17.939Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~708bf7c0-2caf-4f88-aec9-d823e3880a3c
    summary: >-
      Fix MODIFIED requirement header to match the existing main-spec header
      exactly, per openspec validate
---
# Spec Delta

## MODIFIED Requirements

### Requirement: A capability may be bound to a destination found in the request

A route's authorization declaration MAY include a reach requirement identifying a destination:
either a value found directly in the request, or one resolved from a value the request carries
(for example, a lookup keyed by an identifier in the request). When a capability and a reach
requirement are both declared, they SHALL be evaluated together against a single role: the
request SHALL be allowed only when one role the caller holds grants both the capability and
reach to that destination. A capability held by one role SHALL NOT combine with reach held by a
different role to satisfy this check.

#### Scenario: A single role satisfying both halves is allowed

- **WHEN** a user holds a role that grants both the declared capability and reach to the
  destination named in the request
- **THEN** the request is allowed

#### Scenario: Two roles each satisfying only one half is denied

- **WHEN** a user holds one role that grants the declared capability for a different destination
  and a second role that grants reach to the requested destination, but no single role grants
  both
- **THEN** the request is denied

#### Scenario: A destination resolved from the request is evaluated the same way as one found directly

- **WHEN** a route's reach requirement resolves the destination from a value the request carries,
  rather than reading the destination itself from the request
- **THEN** the resolved destination SHALL be evaluated against the caller's roles exactly as a
  directly-found destination would be
- **AND** the resolution SHALL complete before the capability-and-reach decision is made

## ADDED Requirements

### Requirement: A route may omit a capability's reach requirement even where another route requires one

A capability MAY be declared with a reach requirement on one route and without one on another.
Where a route declares no reach requirement, the request SHALL be authorized against the
capability alone — any role granting it, in any jurisdiction, SHALL satisfy the check. This
SHALL NOT fall back to requiring global reach, which remains reserved for a declared
requirement that fails to resolve a destination (see the scenarios below).

#### Scenario: A capability-only route admits a non-globally-scoped role

- **GIVEN** a capability that carries a reach requirement on at least one other route
- **WHEN** a jurisdiction-scoped role holding that capability requests a route that declares it
  with no reach requirement
- **THEN** the request SHALL be allowed

#### Scenario: An unresolved reach requirement still falls back to global-only

- **WHEN** a route declares a reach requirement for its capability, and the requirement fails to
  resolve a destination for a particular request
- **THEN** only a role with global reach SHALL satisfy the check, unchanged from today

#### Scenario: A route whose data path is filtered after the decision may rely on capability alone

- **WHEN** a route's data path narrows its result to the caller's own reach after the
  capability-and-reach decision, rather than a single destination named in the request
- **THEN** declaring the capability with no reach requirement, and narrowing the result
  separately, SHALL be a valid way to satisfy this capability's authorization
