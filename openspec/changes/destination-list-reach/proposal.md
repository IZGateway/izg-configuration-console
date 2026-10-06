# Proposal

## Why

An IZG Support user cannot add a sender. The destination list shows "Internal server
error" in the Onboarding Add Sender dialog and in the Console destination picker, because
`GET /api/destinations` returns a 500. Two independent defects cause it: the route decides
the caller's row reach from an Okta group instead of the role matrix, and the database
layer builds an invalid DynamoDB filter when the jurisdiction list is empty.

Tracked as IGDD-3542. The failure is pre-existing and reproduces on `develop`.

## What Changes

- **Reach comes from the role matrix.** `src/pages/api/destinations/index.ts:26` stops
  reading `session.user.isAdmin` and asks `hasGlobalTenancy` instead
  (`src/lib/security/policy.ts:144`). `isAdmin` means only "is this user in the
  `OPERATIONS_GROUP` Okta group", which selects IZG Operations alone. IZG Support declares
  `globalTenancy: true` (`src/lib/security/accessdefinitions/_IZGSupportAccess.ts:29`) but
  is not in that group, so the route filtered it by a jurisdiction claim it does not hold.
- **An empty jurisdiction list fails closed.** `fetchLoggedInUsersDestinations`
  (`src/lib/db/dynamo.ts:584-607`) returns an empty array and runs no query when a
  non-global caller has no jurisdictions. Today the filter loop never runs, the expression
  becomes `destId IN )`, and DynamoDB rejects it. The session callback already defaults the
  claim to `[]` so that a scoped role with no jurisdictions fails closed
  (`src/pages/api/auth/[...nextauth].ts:118-121`). This change makes the database layer
  honour that intent.
- **A test covers the empty-jurisdiction case**, which is the input that produces the
  malformed expression.
- **Access change (not breaking).** This widens IZG Support from jurisdiction-scoped to
  global on `/api/destinations`. No API response shape changes and no client changes, so
  nothing breaks. It is still a real grant. The RBAC matrix owner has **not** confirmed it.
  It is recorded as Open Decision 1 in
  `openspec/changes/archive/2026-09-30-admin-page-authorization/design.md:417-434`. The
  live 500 is evidence that today's behaviour is unintended, but the grant must be confirmed
  before merge, not assumed.

## Capabilities

### New Capabilities

- `jurisdiction-row-scoping`: which rows a jurisdiction-filtered data read returns, given
  the caller's tenancy reach. It covers where reach comes from, what an empty reach returns,
  and that the answer fails closed. The first requirements cover `/api/destinations` only.

### Modified Capabilities

None.

`multi-role-authorization` already requires that global jurisdiction reach is declared per
role in the access matrix. A route that reads an Okta group instead violates that
requirement. It does not change it. This change brings the route into conformance, so no
delta spec is needed there.

## Impact

Affected code:

- `src/pages/api/destinations/index.ts` — the reach decision.
- `src/lib/db/dynamo.ts` — `fetchLoggedInUsersDestinations`, the empty-list guard.
- `src/lib/db/` — one new `@jest-environment node` test file.
  `dynamo.upsertAllowedUser.test.ts` is the working template.

Affected surfaces. Both consumers call the same endpoint, so both acceptance criteria have
one root cause:

- `src/components/DestinationSelector/index.tsx:78` — the Onboarding Add Sender selector.
- `src/components/Console/index.tsx:173` — the Console destination picker.

Security-sensitive notes:

- This is jurisdiction scoping on a read path. The row filter decides which jurisdictions'
  destinations a caller sees.
- No encrypted field handling changes. `DbClientFactory` still decrypts destination
  passwords on the way out.

Out of scope, recorded here so it is not lost:

- **The `isAdmin` parameter name stays.** The parameter keeps its name through
  `ConfigConsoleFetchRepository.ts:19`, `DbClientFactory.ts:280` and `dynamo.ts:584`.
  IGDD-3552 owns that rename and states that IGDD-3542 lands first to avoid a collision.
  This change alters only the value the route passes, plus the guard inside `dynamo.ts`.
- **The sibling read fails open.** `fetchAllowedUsersByDestination`
  (`src/lib/db/dynamo.ts:2506`) tests `isAdmin || destinations.length === 0` and then runs
  an unfiltered query. A non-global caller with no jurisdictions receives every row. That
  is the opposite of the behaviour this change requires. Do not copy that branch. It is a
  latent defect and it belongs to IGDD-3552.
