# Design

## Context

See `proposal.md` — Why, for the motivation. See
`specs/jurisdiction-row-scoping/spec.md` for the requirements.

Three facts about the current code shape the approach.

**The single-row answer already exists.** `hasAccessToDestId`
(`src/lib/accesshelper.ts:24-44`) answers "may this session touch this destination?" It
calls `subjectOf(session)`, then `hasGlobalTenancy(subject)`, then falls back to an exact
element match on the jurisdiction claim. The destination list is the plural form of the
same question. This change makes the list read ask it the same way.

**The row filter matches on destination identity, not on a jurisdiction prefix.** The
filter compares `destId` for equality against the values in the jurisdiction claim.
`accesshelper.ts:41-43` records why the match must be exact: the data holds both `az`
(Arizona) and `azova` (a sender organization). The DynamoDB `destId IN (...)` expression
uses the same model, so this change keeps it.

**The database interface still names the reach parameter `isAdmin`.** The name runs through
`ConfigConsoleFetchRepository.ts:19`, `DbClientFactory.ts:280` and `dynamo.ts:584`.
IGDD-3552 owns that rename and states that IGDD-3542 lands first.

## Goals / Non-Goals

**Goals:**

- Make the destination list read decide reach from the access matrix.
- Make an empty reach return an empty list, for every caller of the read and not only for
  the route in this ticket.
- Leave a record of why a union across roles is correct on this read, so that a reviewer
  does not read the fix as the leak that PR #700 closed.

**Non-Goals:**

- No change to the reach parameter name through the database interface. That is IGDD-3552.
- No change to `session.user.isAdmin` itself, nor to the session callback that computes it.
  Other readers keep it until IGDD-3552 removes it.
- No fix to the sibling read `fetchAllowedUsersByDestination`. See Risks.
- No change to the `destId IN (...)` filter model, and no move to a jurisdiction prefix
  match.
- No new capability flag. Reach is not a capability.

## Decisions

### Decision 1: Read reach from `hasGlobalTenancy`, not from `isAdmin` or `isOperationsRole`

The route builds a subject with `subjectOf(session)` and asks
`hasGlobalTenancy(subject)`. This is the same pair that `hasAccessToDestId` uses one row at
a time.

Alternatives considered:

- **Keep `isAdmin` and add IZG Support to the `OPERATIONS_GROUP` Okta group.** Rejected.
  That grant is wider than the one this ticket needs. `isAdmin` gates nine other
  behaviours, so IZG Support would gain all of them at once, outside the matrix and
  invisible to review.
- **Use `isOperationsRole(session.user.roles)`, as the sibling read does.** Rejected.
  `isOperationsRole` is a hardcoded role-name list (`src/lib/security/accessutils.ts:23`).
  Its own doc comment states that tenancy decisions must use `hasGlobalTenancy` instead.
  The two routes disagree today, and this one must not copy the outlier.
- **Add a capability flag such as `canViewAllDestinations`.** Rejected. The archived
  IGDD-3472 design and IGDD-3552 both state that this switch is reach and not a capability.
  A capability flag would create a second way to express the same thing.

### Decision 2: A union across held roles is correct on this read

`hasGlobalTenancy(subject)` is subject-wide. It returns true if **any** held role declares
global tenancy.

A reviewer who remembers PR #700 will question this. That review found a real leak: asking
`can(subject, …)` and `hasGlobalTenancy(subject)` as two separate questions computes
"some role holds the capability **and** some role is global", which lets a scoped role
borrow reach from an unrelated global role. The comments at
`src/lib/security/pageAccessGate.ts:75-90` and `src/lib/security/policy.test.ts:289-300`
record it.

That rule does not apply here, and the reason is specific. The destination list read pairs
**no capability**. It requires a session and nothing more. There is no capability for a
scoped role to borrow reach for, so the union is the whole question.
`src/lib/accesshelper.ts:9-17` already states this for the single-row case: "Because no
capability is involved, a plain union across held roles is correct."

The implementation must carry a short comment to this effect, pointing at the
`accesshelper.ts` precedent. Without it the next reader has to re-derive the distinction.

### Decision 3: The empty-reach guard goes in the database read, not in the route

`fetchLoggedInUsersDestinations` returns an empty array and issues no query when the caller
is not global and the jurisdiction list is empty.

The route is the wrong layer. The ticket states that the malformed expression affects any
caller treated as non-global who has no jurisdiction claim, not only this route. A guard in
the route leaves the database method able to build `destId IN )` for the next caller. A
guard in the database method fixes it once.

This mirrors `accesshelper.ts:29-39`, which denies cleanly on an empty claim rather than
throw. The comment there records the same failure mode one layer up: an earlier version
threw, and that turned a clean 401 into an uncaught 500 (PR #666 review).

### Decision 4: An empty reach logs a warning

An empty claim on a scoped role is a reachable state and not an invariant violation. It
happens when the Okta userinfo call fails, or when a user has no jurisdiction assigned yet.
After this change the user sees an empty list instead of an error, so the condition becomes
silent. The read must emit a warning-level log entry, in the same spirit as
`accesshelper.ts:37`, so that a misconfigured account is still visible to an operator.

### Decision 5: Keep the parameter name, change only the value passed

The reach parameter keeps the name `isAdmin` through all three database files. Only the
value the route passes changes, plus the guard inside the method.

IGDD-3552 owns the rename and states that this ticket lands first to avoid a collision. A
rename here would create the collision the dependency note exists to prevent.

The project convention prefers context read from `AsyncLocalStorage` over user data
threaded through arguments. This read predates that convention and threads two arguments
already. This change adds no new argument, and re-plumbing the signature belongs to
IGDD-3552.

### Decision 6: Two tests, at two layers

- A unit test on the database read, for the empty-jurisdiction case. This is the input that
  produces the malformed expression, and it is the acceptance criterion. It goes in a
  `@jest-environment node` file under `src/lib/db/`, built on the
  `dynamo.upsertAllowedUser.test.ts` pattern, which mocks the client `send` call. That
  pattern is confirmed to run.
- A test on the route, for the reach decision. A globally scoped role with an empty claim
  must receive an unfiltered read, and a scoped role must receive a filtered one. Without
  this test, defect 2 can regress with no failure, because the database guard would keep
  the response a valid empty list rather than a 500. The pattern already exists.
  `src/__tests__/api/allowedusers/index.test.ts` mocks `next-auth`, mocks
  `DbClientFactory.getDbClient`, builds a plain request and response pair, and imports the
  handler directly. The new test goes beside it at `src/__tests__/api/destinations/`, and
  it asserts on the arguments the route passes to the mocked read.

The Jest default environment is `jsdom`, and `CLAUDE.md` records that jsdom suites fail
with `ERR_REQUIRE_ESM` from an upstream packaging bug. Both new tests must declare
`@jest-environment node`, as both templates already do.

## Risks / Trade-offs

**The access grant is not confirmed.** → This change widens IZG Support from
jurisdiction-scoped to global on the destination list. It is Open Decision 1 in
`openspec/changes/archive/2026-09-30-admin-page-authorization/design.md:417-434`, which
records that it needs the RBAC matrix owner's confirmation. Mitigation: state the grant in
the pull request as its own line, and hold the merge for that confirmation. The live 500 is
evidence that today's behaviour is unintended, but the grant is still a grant.

**A tester cannot tell the widening from a regression.** → IGDD-3472 nominates an IZG
Support account as its release gate, and that account now sees more destinations than the
baseline that change captured. Mitigation: land this change after IGDD-3472 ships, and
state the expected delta — IZG Support sees every destination rather than none — in the
pull request and in test notes.

**The union in Decision 2 is misread as the PR #700 leak.** → Mitigation: the code comment
required by Decision 2, which names the precedent and the reason.

**An empty reach is now silent.** → A scoped user with no Okta jurisdiction claim sees an
empty list rather than an error, so a misconfigured account can go unnoticed. Mitigation:
the warning log required by Decision 4.

**The sibling read fails open, and it is reachable today.** →
`fetchAllowedUsersByDestination` (`src/lib/db/dynamo.ts:2506`) tests
`isAdmin || destinations.length === 0` and then runs an **unfiltered** query. A non-global
caller with no jurisdictions receives every allowed-user row.

This is not merely latent. `canViewOnboarding` gates that route, and both
`Jurisdiction Operations` (`_JurisdictionOperationsAccess.ts:76`) and
`Jurisdiction Support` (`_JurisdictionSupportAccess.ts:60`) hold it. Both declare
`globalTenancy: false`. So a Jurisdiction Operations user whose Okta jurisdiction claim is
empty reads every organization's allowed-user records today. The exposure is wider than
the defect this ticket fixes, and the trigger is the same empty claim.

Mitigation: it is out of scope here and belongs to IGDD-3552. Raise it on that ticket with
the reachability evidence above, rather than leave it in a design document only. Do not copy
that branch shape into the destination read.

## Migration Plan

No data migration. No schema change. No session shape change, so sessions issued before the
deploy keep working and no user has to sign in again.

Deploy is an ordinary application deploy. Rollback is a revert of the commit, which restores
the 500 for IZG Support and removes the widened reach together.

Order matters for one reason only. Land this after IGDD-3472 ships, so its release gate
captures a clean baseline. Land this before IGDD-3552 starts, as that ticket requires.

## Open Questions

- Whether the sibling fail-open read is fixed inside IGDD-3552 or raised as its own bug.
  This does not change this change's specs, approach, or tasks. It needs a decision on
  IGDD-3552 before that ticket is picked up.
