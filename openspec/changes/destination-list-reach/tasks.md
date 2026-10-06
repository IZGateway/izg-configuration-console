# Tasks

Reference `specs/jurisdiction-row-scoping/spec.md` for what to build. Reference `design.md`
for how to build it.

Do group 1 before group 2. The route change in group 2 sends an empty jurisdiction list to
the database read, so the guard must exist first. Otherwise the 500 moves rather than
disappears.

## 1. Make the database read fail closed on an empty reach

- [ ] 1.1 Record the baseline test result before any edit. Run
  `npx jest src/lib/db src/lib/security src/__tests__/api` and save the pass and fail
  counts. Verify that the saved counts exist, because `npm run test` cannot pass outright:
  `CLAUDE.md` records that every jsdom suite fails from an upstream `ERR_REQUIRE_ESM`
  packaging bug on `develop`, and later tasks compare against this baseline rather than
  against zero failures.

- [ ] 1.2 Add the empty-reach guard to `fetchLoggedInUsersDestinations` in
  `src/lib/db/dynamo.ts`. When the caller is not global and the jurisdiction list is empty,
  return an empty array and send no command to DynamoDB. Verify by reading the method: the
  `destId IN` filter expression is now built only when the list holds at least one value,
  so the string `destId IN )` is unreachable.

- [ ] 1.3 Add a warning-level log entry on that guard path, per design Decision 4. Match
  the shape of `src/lib/accesshelper.ts:37`, which logs the same condition one layer up.
  Verify that `logger` is already imported at `src/lib/db/dynamo.ts:42` and that the entry
  names the condition, so an operator can find a user with no jurisdiction assigned.

- [ ] 1.4 Do not change the branch shape of `fetchAllowedUsersByDestination`
  (`src/lib/db/dynamo.ts:2506`). Verify that it is untouched in `git diff`. It tests
  `isAdmin || destinations.length === 0` and then runs an **unfiltered** query, which is
  fail-open and the opposite of this change. It belongs to IGDD-3552. See design Risks.

- [ ] 1.5 Create `src/lib/db/dynamo.destinationReach.test.ts` with a
  `@jest-environment node` docblock, built on the `dynamo.upsertAllowedUser.test.ts` mock
  pattern. Cover four cases from the spec: a global caller reads with no filter, a scoped
  caller with one jurisdiction reads with that filter, a scoped caller with an empty list
  returns an empty array, and that same empty case sends no command. Verify the file passes
  with `npx jest src/lib/db/dynamo.destinationReach.test.ts`.

- [ ] 1.6 Add a case to the same file for exact whole-value matching. A scoped caller whose
  claim is `az` must not receive a destination identified by `azova`. Verify the case
  passes. `src/lib/accesshelper.ts:41-43` records why this match must never be a substring
  test.

## 2. Make the route read reach from the role matrix

- [ ] 2.1 Change `src/pages/api/destinations/index.ts` to build a subject with
  `subjectOf(session)` and to pass `hasGlobalTenancy(subject)` in place of
  `session.user.isAdmin`. Verify that the file no longer reads `session.user.isAdmin` and
  that `npm run code-quality-check` reports no new lint or type error.

- [ ] 2.2 Keep the database call signature as it is. Verify that `git diff` shows no edit
  to `src/lib/db/ConfigConsoleFetchRepository.ts`, `src/lib/db/DbClientFactory.ts`, or the
  parameter list of `fetchLoggedInUsersDestinations`. The reach parameter keeps the name
  `isAdmin`, because IGDD-3552 owns that rename and states that this ticket lands first.
  See design Decision 5.

- [ ] 2.3 Add a short comment at the reach decision, per design Decision 2. State that a
  union across held roles is correct here because this read pairs no capability, and point
  to `src/lib/accesshelper.ts:9-17` for the same reasoning on the single-row check. Verify
  that the comment names the precedent, so that a reviewer who recalls PR #700 does not
  read the union as the leak that review closed.

- [ ] 2.4 Create `src/__tests__/api/destinations/index.test.ts` with a
  `@jest-environment node` docblock, built on the
  `src/__tests__/api/allowedusers/index.test.ts` pattern, which mocks `next-auth` and
  `DbClientFactory`. Assert on the arguments the route passes to the mocked read: an
  `IZG Support` session with `isAdmin: false` and an empty claim passes global reach, and a
  `Jurisdiction Operations` session with claim `az` passes scoped reach with that claim.
  Set `isAdmin` explicitly on the first fixture, so the test records that reach no longer
  depends on it. Verify with `npx jest src/__tests__/api/destinations`.

- [ ] 2.4a Add a case to the same file for the union across held roles, which is spec
  requirement "Reach is a union across held roles on a read that pairs no capability". A
  session holding both `IZG Support` and `Jurisdiction Operations` with claim `az` passes
  global reach. Verify the case passes. This is the design Decision 2 claim, and it is the
  assertion a reviewer who recalls PR #700 will look for.

- [ ] 2.5 Add a case to the same file for the end-to-end response. A session with no global
  role and an empty claim receives status `200` and an empty list, not `500`. Verify the
  case passes. This is the acceptance criterion for the original defect.

## 3. Verify the change against the acceptance criteria

- [ ] 3.1 Run `npm run code-quality-check` and verify that it passes with no new lint error
  and no new type error.

- [ ] 3.2 Run `npx jest src/lib/db src/lib/security src/__tests__/api` and verify that every
  suite passes and that the new cases from groups 1 and 2 appear in the output.

- [ ] 3.3 Run the full `npm run test`. Verify that every `@jest-environment node` suite
  passes, and that every failing suite is a jsdom suite which also fails on `develop` for
  the reason `CLAUDE.md` records. Verify that this change adds no new failure.

- [ ] 3.4 Sign in as an IZG Support account on a deployed environment. Open Onboarding,
  click Add Sender, and verify that the destination list is populated and shows no
  "Internal server error" message. This is acceptance criterion 1.

- [ ] 3.5 With the same account, open the Console destination picker and verify that it
  lists the same destinations as the Add Sender selector. This is acceptance criterion 3.

- [ ] 3.6 Sign in as a jurisdiction-scoped account that holds at least one jurisdiction.
  Verify that both surfaces list only that account's own destinations, so the change
  removed no scoping.

## 4. Pre-merge gates

- [ ] 4.1 State the access grant in the pull request description as its own line: this
  change widens IZG Support from jurisdiction-scoped to global on `/api/destinations`.
  Verify that the line names the role, the endpoint, and the reach before and after.

- [ ] 4.2 Obtain the RBAC matrix owner's confirmation of that grant, and record it on
  IGDD-3542. Verify that the confirmation is written on the ticket before merge. It is Open
  Decision 1 in `openspec/changes/archive/2026-09-30-admin-page-authorization/design.md`,
  which states that it needs confirmation rather than assumption.

- [ ] 4.3 Add the expected test delta to the release notes for testers: an IZG Support
  account now sees every destination where it previously saw an error. Verify that the note
  exists, so that a tester comparing against the IGDD-3472 baseline can tell the intended
  widening from a regression.

- [ ] 4.4 Raise the sibling fail-open read on IGDD-3552 as a Jira comment, with the
  reachability evidence from design Risks: `canViewOnboarding` gates that route,
  `Jurisdiction Operations` and `Jurisdiction Support` both hold it, and both declare
  `globalTenancy: false`. Verify that the comment is posted, so the finding does not stay
  in a design document only.
