---
schema_version: '1.0'
created:
  date: '2026-11-02T22:20:31.701Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '1.0'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~f229ec6c-5b11-4c6f-b1db-3b7f31120c27
  summary: >-
    Draft proposal.md for protect-connection-pages-and-endpoints OpenSpec change
    combining IGDD-3545 and IGDD-3548
updated:
  - date: '2026-11-02T23:00:14.137Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~967f5c9a-fcab-44d1-ba4b-2dc089326fda
    summary: >-
      Add split-decision retrofit bullet to What Changes; Fix stale sentence
      deferring the split-decision retrofit; Add retrofit files to Impact
      section
change_request: protect-connection-pages-and-endpoints
ticket: 'IGDD-3545, IGDD-3548'
---
# Proposal

## Why

Five Configuration Console pages that manage a connection's credentials, change requests, and
test history have no server-side access check at all: anyone who can sign in can open Edit
Connection, Connection History, Test, Change Request, or Test Report by typing the address,
regardless of role. The role matrix already names eleven permissions covering exactly this
surface, but nothing in the application reads them, so the matrix currently describes an access
model the system does not enforce. [IGDD-3545](https://izgateway.atlassian.net/browse/IGDD-3545)
and [IGDD-3548](https://izgateway.atlassian.net/browse/IGDD-3548) both close pieces of this same
gap on the same connection surfaces and share the same underlying mechanism, so they are
implemented together rather than as two separate changes. (IGDD-3549, the API key endpoints, is
explicitly out of scope — it is waiting on a separate decision and will be scoped on its own.)

Closing the endpoint half of this gap naively — declaring a capability on a route that also
carries a destination-reach check — would reproduce a known escalation shape already
acknowledged elsewhere in this codebase (`changerequest`'s `split-decision` debt rows): a user
holding two jurisdiction-scoped roles of different privilege tiers (e.g. Jurisdiction Security
for one jurisdiction, Jurisdiction Operations for another — the one role combination the RBAC
design doc flags as needing a workaround) could combine one role's capability with the other
role's reach to act outside what either role alone grants. This change closes the gap without
reopening that shape.

## What Changes

- Gate the five pages (`/edit`, `/history`, `/test`, `/changerequest`, `/testreport`) with the
  existing `withPageAccess` mechanism. `/testreport` reuses the `test` page's capability rather
  than getting one of its own, since it is reached only from Manage Connections' Generate Report
  action for the same audience.
- Wire the in-page controls on Edit Connection and Connection History to the matrix permissions
  that already exist for them (approve/save/reset draft, run draft test on Edit; the remaining
  History view flags), so a role that may view but not change a page has those controls hidden,
  not merely unlinked from navigation.
- Declare permissions on five API routes that currently decide access by an internal escape
  hatch (`inHandler`) instead of stating it at the route's own definition: `statushistory`,
  `tests/connectiontest`, `destinations`, `destinationaudit`, and `status/reset`.
- Retrofit the four existing `split-decision` routes onto the same reach-plus-capability
  primitive instead of deferring them: `changerequest/index.ts`, `changerequest/[...slug].ts`,
  `maintenance/update/[...slug].ts`, and `allowedusers/index.ts`. One method,
  `changerequest/[...slug].ts`'s DELETE, can't use the primitive directly (its destination id
  only exists after a database lookup) and instead gets a combined in-handler check matching
  `status/reset`'s existing pattern — closing the gap without being declarative.
- Extend the `page-authorization` mechanism's route declaration with a composable reach
  requirement, so a route can declare "this capability, bound to this destination" as one
  statement evaluated against a single role, rather than pairing a capability declaration with
  an independent reach-only middleware. **BREAKING** in the narrow sense that it changes how the
  five routes above express their authorization, though it changes no caller-visible behavior for
  any user whose access is unaffected by the seed-value decisions below.
- Gate the two ConnectionTable controls (the Test Report(s) toggle and both Generate Report
  buttons) on the same `canRunConnectionTest` flag already used by the adjacent Test button on the
  same table.
- Retire the corresponding `ungated-page`, `unwired-flag`, and `in-handler` rows from
  `authzDebt.ts` as each piece lands.

Seed values for the three page-entry capabilities and five History view flags already exist and
already preserve today's universal access correctly (true for IZG/Jurisdiction Operations and
Support, false only for the role being retired). The Edit Connection control flags are a
different case: they are already seeded `true` only for IZG Operations and Jurisdiction
Operations, `false` for IZG/Jurisdiction Support — a real narrowing relative to today's
unenforced universal access that needs confirming with the Product Owner before it ships, not
assumed safe because the data already exists.

## Capabilities

### New Capabilities
- `connection-page-access`: who may enter Edit Connection, Connection History, Test, Change
  Request, and Test Report, and who may use each control within Edit Connection and Connection
  History once there. Parallel in structure to the existing `admin-page-access` capability, for
  the connection-management surfaces instead of the admin surfaces.

### Modified Capabilities
- `page-authorization`: adds a composable reach requirement to the existing route-declaration
  mechanism. A route may now declare a capability, a reach source, or both together — and when
  both are present they are evaluated as one combined per-role decision, not two independent
  checks. This closes the five routes named above, and the four existing `split-decision` routes
  named in What Changes, without introducing a new split-decision gap.

## Impact

- `src/pages/{edit,history,test,changerequest,testreport}/*.tsx` — add page gating.
- `src/pages/api/{statushistory,tests/connectiontest,destinations,destinationaudit,status/reset}/*.ts`
  — replace `inHandler` with a declared capability (+ reach, where the route is destination-scoped).
- `src/pages/api/{changerequest/index,changerequest/[...slug],maintenance/update/[...slug],allowedusers/index}.ts`
  — retrofit the existing `split-decision` checks onto the same primitive (DELETE on
  `changerequest/[...slug].ts` stays in-handler; see design.md).
- `src/lib/api/api-middleware-helper.ts` — extend `RouteAuthz`/`enforceRouteAuthz` with the
  composable reach requirement.
- `src/components/ConnectionTable/index.tsx` — gate the two ungated buttons; thread
  `canRunConnectionTest` through `CustomToolbarProps` and the `CustomFooter` call site.
- `src/lib/security/authzDebt.ts` — remove rows as each piece is wired.
- `src/lib/security/accessregistry.test.ts` — extend the hardcoded gated-page list and any
  ratchet counts affected by the above.
- No API response shape changes; no new environment variables or secrets.
