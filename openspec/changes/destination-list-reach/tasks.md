# Tasks

Reference `specs/jurisdiction-row-scoping/spec.md` for what to build. Reference `design.md`
for how to build it.

Do group 1 before group 2. The route change in group 2 sends an empty jurisdiction list to
the database read, so the guard must exist first. Otherwise the 500 moves rather than
disappears.

## 1. Make the database read fail closed on an empty reach

- [x] 1.1 Record the baseline test result before any edit. Run
  `npx jest src/lib/db src/lib/security src/__tests__/api` and save the pass and fail
  counts. Verify that the saved counts exist, because `npm run test` cannot pass outright:
  `CLAUDE.md` records that every jsdom suite fails from an upstream `ERR_REQUIRE_ESM`
  packaging bug on `develop`, and later tasks compare against this baseline rather than
  against zero failures.

  Baseline (confirmed by stashing the fix, with the new test files present untracked):
  23 suites, 375 tests. 4 jsdom suites fail with the documented `ERR_REQUIRE_ESM` bug
  (`cryptoSupport.test.js`, `cryptoSupport.test.ts`, `DbCrypto.test.ts`,
  `dynamo.integration.test.ts`). The 2 new node-environment test files additionally fail 4
  assertions against the unfixed code, confirming they exercise the real defect.

- [x] 1.2 Add the empty-reach guard to `fetchLoggedInUsersDestinations` in
  `src/lib/db/dynamo.ts`. When the caller is not global and the jurisdiction list is empty,
  return an empty array and send no command to DynamoDB. Verify by reading the method: the
  `destId IN` filter expression is now built only when the list holds at least one value,
  so the string `destId IN )` is unreachable.

- [x] 1.3 Add a warning-level log entry on that guard path, per design Decision 4. Match
  the shape of `src/lib/accesshelper.ts:37`, which logs the same condition one layer up.
  Verify that `logger` is already imported at `src/lib/db/dynamo.ts:42` and that the entry
  names the condition, so an operator can find a user with no jurisdiction assigned.

- [x] 1.4 ~~Do not change the branch shape of `fetchAllowedUsersByDestination`~~ — superseded
  by group 6. At the time this task was written, `fetchAllowedUsersByDestination`
  (`src/lib/db/dynamo.ts:2510`) tested `isAdmin || destinations.length === 0` and then ran an
  **unfiltered** query, fail-open, and this task deferred fixing it to IGDD-3552. PR #729
  review marked that deferral Blocking once `GET /api/allowedusers` started calling this same
  function directly (group 6) and Jurisdiction Operations gained write access through it. See
  task 6.1 and design Decision 7.

- [x] 1.5 Create `src/lib/db/dynamo.destinationReach.test.ts` with a
  `@jest-environment node` docblock, built on the `dynamo.upsertAllowedUser.test.ts` mock
  pattern. Cover four cases from the spec: a global caller reads with no filter, a scoped
  caller with one jurisdiction reads with that filter, a scoped caller with an empty list
  returns an empty array, and that same empty case sends no command. Verify the file passes
  with `npx jest src/lib/db/dynamo.destinationReach.test.ts`.

- [x] 1.6 Add a case to the same file for exact whole-value matching. A scoped caller whose
  claim is `az` must not receive a destination identified by `azova`. Verify the case
  passes. `src/lib/accesshelper.ts:41-43` records why this match must never be a substring
  test.

## 2. Make the route read reach from the role matrix

- [x] 2.1 Change `src/pages/api/destinations/index.ts` to build a subject with
  `subjectOf(session)` and to pass `hasGlobalTenancy(subject)` in place of
  `session.user.isAdmin`. Verify that the file no longer reads `session.user.isAdmin` and
  that `npm run code-quality-check` reports no new lint or type error.

  `npm run type-check` passes clean. `npm run lint` cannot run in this environment (local
  Node is v20.17.0; the flat `eslint.config.js` requires Node ≥22, per `CLAUDE.md`'s minimum
  Node 24 for this repo) — confirmed pre-existing by stashing this change and reproducing
  the identical `ERR_REQUIRE_ESM`-free but `Cannot use import statement outside a module`
  failure on the unmodified branch.

- [x] 2.2 Keep the database call signature as it is. Verify that `git diff` shows no edit
  to `src/lib/db/ConfigConsoleFetchRepository.ts`, `src/lib/db/DbClientFactory.ts`, or the
  parameter list of `fetchLoggedInUsersDestinations`. The reach parameter keeps the name
  `isAdmin`, because IGDD-3552 owns that rename and states that this ticket lands first.
  See design Decision 5.

- [x] 2.3 Add a short comment at the reach decision, per design Decision 2. State that a
  union across held roles is correct here because this read pairs no capability, and point
  to `src/lib/accesshelper.ts:9-17` for the same reasoning on the single-row check. Verify
  that the comment names the precedent, so that a reviewer who recalls PR #700 does not
  read the union as the leak that review closed.

- [x] 2.4 Create `src/__tests__/api/destinations/index.test.ts` with a
  `@jest-environment node` docblock, built on the
  `src/__tests__/api/allowedusers/index.test.ts` pattern, which mocks `next-auth` and
  `DbClientFactory`. Assert on the arguments the route passes to the mocked read: an
  `IZG Support` session with `isAdmin: false` and an empty claim passes global reach, and a
  `Jurisdiction Operations` session with claim `az` passes scoped reach with that claim.
  Set `isAdmin` explicitly on the first fixture, so the test records that reach no longer
  depends on it. Verify with `npx jest src/__tests__/api/destinations`.

- [x] 2.4a Add a case to the same file for the union across held roles, which is spec
  requirement "Reach is a union across held roles on a read that pairs no capability". A
  session holding both `IZG Support` and `Jurisdiction Operations` with claim `az` passes
  global reach. Verify the case passes. This is the design Decision 2 claim, and it is the
  assertion a reviewer who recalls PR #700 will look for.

- [x] 2.5 Add a case to the same file for the end-to-end response. A session with no global
  role and an empty claim receives status `200` and an empty list, not `500`. Verify the
  case passes. This is the acceptance criterion for the original defect.

## 3. Verify the change against the acceptance criteria

- [~] 3.1 Run `npm run code-quality-check` and verify that it passes with no new lint error
  and no new type error.

  `type-check` passes clean. `lint` cannot execute in this dev environment at all (Node
  v20.17.0 here vs. the flat `eslint.config.js` requiring Node ≥22, consistent with
  `CLAUDE.md`'s documented minimum Node 24 for this repo) — reproduced identically on
  unmodified `develop`/this branch via `git stash`, so it is an environment gap, not
  something this change caused. Needs a real lint run on Node ≥22 (e.g. CI) before merge.

- [x] 3.2 Run `npx jest src/lib/db src/lib/security src/__tests__/api` and verify that every
  suite passes and that the new cases from groups 1 and 2 appear in the output.

  19/23 suites pass (375/375 tests pass). The 4 failing suites fail to load at all with the
  pre-existing `ERR_REQUIRE_ESM` bug `CLAUDE.md` documents, identical before and after this
  change.

- [x] 3.3 Run the full `npm run test`. Verify that every `@jest-environment node` suite
  passes, and that every failing suite is a jsdom suite which also fails on `develop` for
  the reason `CLAUDE.md` records. Verify that this change adds no new failure.

  Full suite: 591 tests (565 pass / 26 fail), up from 581 (555/26) before this change —
  identical fail count (60 suites / 26 tests) before and after, confirmed by running `npm
  run test` with this change stashed. The 26 failing tests are pre-existing and unrelated:
  jsdom `ERR_REQUIRE_ESM` suites plus `scripts/tests/security-updates.test.js` shell-script
  tests that need `jq`, which isn't installed in this dev environment. This change adds 10
  new passing tests across 2 new suites and zero new failures.

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

- [x] 4.2 Ask on IGDD-3542 for a one-line confirmation that the `CC | Tenancy — Reach` row
  of the target matrix is ratified for IZG Support, whose value is already `All`. Verify
  that the confirmation is written on the ticket before merge. The row's enforcement column
  reads "Per Anusha's notes", and Anusha Kanuri reported this ticket. This is a provenance
  check and not a new grant. See design Risks.

  Confirmed by the user (2026-10-09).

- [x] 4.5 Raise the onboarding sequencing question with the team, and record the answer on
  IGDD-3542. The target matrix gives IZG Support `—` on
  `CC | Onboarding Senders — add / edit`, yet one capability gates both view and write today
  and IZG Support holds it. Verify that the ticket records which option the team chose:
  ship this change and accept that IZG Support can add senders until IGDD-3471 splits the
  flag, or land IGDD-3471 first. This affects the release note and the test plan, not this
  change's code.

  Resolved differently than either listed option: the team decided to fold IGDD-3546 (the
  actual backlog ticket for this split — IGDD-3471 was closed as a duplicate of IGDD-3472
  without the split landing, see proposal.md "Scope expansion") into this ticket and ship
  the split alongside the destination-reach fix. See group 5 below.

## 5. IGDD-3546: split onboarding view/write capability (folded in, 2026-10-12)

- [x] 5.1 Confirm the write-capability grant with the user rather than guess it, per
  IGDD-3546's explicit instruction. Confirmed: IZG Operations and Jurisdiction Operations
  get `canManageSenders`; IZG Support and Jurisdiction Support remain view-only. Matches the
  Operations/Support pattern on every other page in the matrix.

- [x] 5.2 Add `canManageSenders: boolean` to `OnboardingPageAccessControl`
  (`src/lib/type/PageAccessControls.ts`), default `false`
  (`defaultaccesslevels.ts`), set `true` in `_IZGOperationsAccess.ts` and
  `_JurisdictionOperationsAccess.ts` only.

- [x] 5.3 Split `src/pages/api/allowedusers/index.ts` to `byMethod`: GET keeps
  `canViewOnboarding`, POST and DELETE require `canManageSenders`. Left
  `bydestination/index.ts` and `allowedusersaudit/[...slug].ts` on the single
  `canViewOnboarding` declaration — both are GET-only, so there is no write method to
  separate; updated their stale comments instead.

- [x] 5.4 Deleted the three `coarse-capability` rows from `authzDebt.ts` and the
  `coarse-capability` kind itself, since nothing uses it anymore.

- [x] 5.5 Hid add/edit/connect-disconnect/promote/demote/delete controls in
  `src/components/Onboarding/index.tsx` and `StatusPromoteDemote.tsx` behind
  `useRoleAccess('onboarding').canManageSenders`, render-on-true. Included the
  connect/disconnect wifi toggle even though IGDD-3546 only names the other five controls —
  it mutates the same field via the same POST endpoint, so leaving it visible for a
  view-only role would be a dead button. Flagged this addition rather than silently
  expanding scope.

- [x] 5.6 Updated the committed role-matrix snapshot
  (`src/lib/security/__snapshots__/roleMatrixSnapshot.test.ts.snap`) — diff confirmed
  exactly the intended grant (`YES | — | YES | — | —` for IZG Operations / IZG Support /
  Jurisdiction Operations / Jurisdiction Support / Sender Operations).

- [x] 5.7 Added capability-split tests to
  `src/__tests__/api/allowedusers/index.test.ts`: a view-only role (Jurisdiction Support,
  IZG Support) is refused on POST/DELETE with `403` and an `AccessDenied` audit entry (via
  the existing `enforceRouteAuthz` logging, satisfying IGDD-3546's audit acceptance
  criterion for free), can still GET; a write-capable role (Jurisdiction Operations) can
  POST. `npx jest src/__tests__/api/allowedusers` — 7/7 pass.

- [~] 5.8 UI verification — **this is an unmet IGDD-3546 acceptance criterion, not optional
  polish**: "the sender list loads and the add, edit, promote, demote and delete controls
  are absent" for a view-only role. No component tests exist for `Onboarding/*` today
  (consistent with this repo's broken jsdom suites), and this has not been exercised in a
  browser. Blocks closing IGDD-3546. Needs manual verification alongside tasks 3.4–3.6,
  with a Jurisdiction Support or IZG Support account.

- [ ] 5.9 Get the `canManageSenders` grant ratified by the matrix owner on IGDD-3546, the
  same bar as task 4.2 for the tenancy-reach grant. The user confirmed the Operations/write,
  Support/view-only split in this session, which is enough to implement against — IGDD-3546
  itself says this specific decision "must not be guessed" and names the matrix owner as
  the authority, so implementation-time confirmation is not a substitute for that signoff.
  Record it on IGDD-3546 before merge.

- [x] 5.10 ~~Note in the PR description that the write path applies no jurisdiction
  filter~~ — superseded by group 6. This task originally recorded that
  `canManageSenders` granted write on any jurisdiction's senders, deliberately deferring the
  fix. PR #729 review marked that gap Blocking; it is fixed, not merely disclosed. See task
  6.3.

## 6. PR #729 review: jurisdiction-scope the onboarding write path (2026-10-13)

Two 🔴 Blocking findings from human review: the IGDD-3546 capability split (group 5) answered
*who* may write but never restricted *which* jurisdiction's rows GET returned or POST/DELETE
could touch. The design had deferred this to IGDD-3552; the reviewer's Blocking severity
overrides that deferral. See design.md Decision 7 and proposal.md "Scope expansion: PR #729
review".

- [x] 6.1 Add the same empty-jurisdiction fail-closed guard from task 1.2 to
  `fetchAllowedUsersByDestination` (`src/lib/db/dynamo.ts`). Verify with the new
  `src/lib/db/dynamo.allowedUsersByDestination.test.ts` (5/5 pass): a global caller reads
  with no filter, a scoped caller with one destination reads with that filter, an empty list
  returns `[]` and sends no command, and the empty case logs a warning.

- [x] 6.2 Change `GET /api/allowedusers` (`src/pages/api/allowedusers/index.ts`) to call
  `fetchAllowedUsersByDestination(hasGlobalTenancy(subject), subject.jurisdictions)` instead
  of the unfiltered `fetchAllowedUsers()`. Verify with new cases in
  `src/__tests__/api/allowedusers/index.test.ts`: a scoped role's GET passes its own
  jurisdiction claim, not an unfiltered read; a global role's GET passes no filter.

- [x] 6.3 Add `hasAccessToDestId(body.destinationId, session)` to `POST` and `DELETE` in the
  same file, returning `403` with a `logAccessDenied` entry when the destination is outside
  the caller's reach. Verify with new cases: a Jurisdiction Operations caller is refused
  outside its own jurisdiction on both POST and DELETE (and the DB write is never called),
  and still succeeds within its own jurisdiction; a global role (IZG Operations) is
  unaffected.

- [x] 6.4 Delete `fetchAllowedUsers()` — after 6.2 it has no caller. Verify it is removed from
  `src/lib/db/dynamo.ts`, `src/lib/db/ConfigConsoleFetchRepository.ts`, and
  `src/lib/db/DbClientFactory.ts`, and that `npx tsc --noEmit` is clean.

- [x] 6.5 Switch `src/pages/api/allowedusers/bydestination/index.ts` and
  `src/pages/onboarding/index.tsx`'s `getServerSideProps` from `isOperationsRole` to
  `subjectOf` + `hasGlobalTenancy`, matching defect 1's fix on `/api/destinations`. Verify
  with the new `src/__tests__/pages/onboarding/index.test.ts` (3/3 pass): a global role reads
  with no filter, a scoped role reads with its claim, and an empty claim is passed through as
  scoped rather than promoted to global.

- [x] 6.6 Add a `split-decision` row to `authzDebt.ts` for `allowedusers/index.ts`, naming the
  residual risk that 6.3's `hasAccessToDestId` call unions reach across held roles the same
  way the route's capability declaration unions capability across held roles — same shape as
  the existing `changerequest/index.ts` row. Verify `npx jest
  src/lib/security/accessregistry.test.ts` still passes (ticket-format check on the new row).

- [x] 6.7 Hide the onboarding grid's ACTION column entirely for a caller who lacks
  `canManageSenders`, rather than rendering the column header over empty cells
  (`src/components/Onboarding/index.tsx`). Verify by reading the column definition: the
  column object itself is now conditionally spread into the array, not rendered as `null`
  per-cell.

- [x] 6.8 Also fix the nit this review raised on `src/pages/api/destinations/index.ts`: read
  `subject.jurisdictions` (already normalized and lowercased by `subjectOf`) instead of the
  raw `session.user.jurisdictions`. Verify `npx jest src/__tests__/api/destinations` still
  passes.

- [~] 6.9 Pagination / 100-value `IN`-filter limit, raised 🟡 non-blocking on
  `fetchLoggedInUsersDestinations`: DynamoDB returns at most 1MB per query with no
  `LastEvaluatedKey` loop, and the `IN` filter caps at 100 values. The reviewer's own
  assessment: "Neither is likely today." Deliberately deferred, not implemented in this pass
  — flag as a follow-up rather than silently dropped. No ticket filed yet; needs one before
  this task can close.

- [x] 6.10 Update `design.md`, `proposal.md`, and the two spec deltas
  (`jurisdiction-row-scoping`, `onboarding-sender-write-authorization`) so the written scope
  matches what group 6 actually implemented. The two stale Non-Goals Copilot flagged ("no new
  capability flag", "no fix to the sibling read") are corrected rather than left contradicting
  the code.

- [ ] 4.3 Add the expected test delta to the release notes for testers: an IZG Support
  account now sees every destination where it previously saw an error; Jurisdiction
  Support / IZG Support accounts lose onboarding-sender write access they previously had
  via the coarse `canViewOnboarding` gate (now view-only, per IGDD-3546); and a
  Jurisdiction Operations account can no longer write another jurisdiction's senders
  (per group 6). Verify that the note exists, so a tester comparing against the IGDD-3472
  baseline can tell each intended change from a regression.

- [x] 4.4 ~~Raise the sibling fail-open read on IGDD-3552 as a Jira comment~~ — superseded by
  group 6. The finding is fixed in this change (task 6.1) rather than raised for a separate
  ticket to fix later.
