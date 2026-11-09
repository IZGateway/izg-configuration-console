---
schema_version: '1.0'
created:
  date: '2026-11-02T23:13:51.000Z'
  user: boonek
  agent:
    name: claude-code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '1.0'
  prompt_uri: >-
    prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~f6fb3390-b1d7-4709-b314-aef3dda8afa2
  summary: >-
    tasks.md for protect-connection-pages-and-endpoints, including the
    split-decision retrofit and authzDebt.ts bookkeeping sequencing
updated:
  - date: '2026-11-03T15:24:33.263Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~210d1053-5aaf-4f4c-b207-4cfd5c967902
    summary: >-
      Correct review summary count after fixing the ConnectionHistory
      error-boundary finding too; Record the ErrorBoundary fix for
      ConnectionHistory/index.tsx and connectionInfo.tsx
  - date: '2026-11-03T14:51:55.008Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~a80f6947-a3a1-40c1-a9d8-8f7045270cae
    summary: >-
      Record /review results and the four fixes applied (two real security gaps,
      one audit-logging bug, one cosmetic)
  - date: '2026-11-03T14:33:46.250Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~d931e6a5-843b-4e52-9e7b-543aff028a8f
    summary: >-
      Defer test:release-validation/test:scan-workflow to CI per user direction
      - local env unreliable due to tarball workaround; Confirm npm run build
      succeeds (exit 0) with full route manifest
  - date: '2026-11-03T14:28:42.278Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~d01d9ca7-faa3-4355-aff8-1cf8ef8dfb74
    summary: >-
      Correct Group 6 to reflect the actual CI gate (code-quality-check +
      test:release-validation + test:scan-workflow, not the full jest suite) and
      record the three real fixes found
  - date: '2026-11-03T14:03:30.532Z'
    user: boonek
    agent:
      name: claude-code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '1.0'
    prompt_uri: >-
      prompt:/claude-code/539126f3-1379-44f7-9db4-3e73eeda397b/~36794a79-dbbf-4820-9f68-2e2bee2c3754
    summary: >-
      Check off tasks 1.1-5.3 in tasks.md as implementation completed,
      correcting 4.6/4.8/5.2 text to match actual findings
change_request: protect-connection-pages-and-endpoints
ticket: 'IGDD-3545, IGDD-3548'
---
# Tasks

## 1. Composable reach primitive + `status/reset` conversion

- [x] 1.1 Add the `ReachSource` type (`fromSlug`/`fromBody`/`fromQuery`) and extend `RouteAuthz`'s
      `capability` and `byMethod` variants with an optional `reach` field in
      `src/lib/api/api-middleware-helper.ts`; verify `npm run code-quality-check` passes.
- [x] 1.2 Implement reach resolution and the combined `can()` evaluation in `enforceRouteAuthz`:
      both `capability` and `reach` present → combined same-role decision; `capability` only →
      unchanged `ANY_JURISDICTION` path; `reach` only → reach-alone. Add unit tests in
      `api-middleware-helper.test.ts` covering combined-role allow, split-role deny, reach-alone,
      and capability-alone unchanged; verify `npm run test -- api-middleware-helper` passes.
- [x] 1.3 Convert `status/reset/[...slug].ts` to `{ capability: { page: 'manageconnections',
      capability: 'canResetCircuitBreaker' }, reach: { fromSlug: 1 } }`, deleting its in-handler
      `can()` call and `inHandler` ticket string; verify `src/__tests__/api/status/reset/destination.test.ts`
      still passes unmodified.
- [x] 1.4 Delete the `status/reset/[...slug].ts` `in-handler` row from `authzDebt.ts`; verify
      `npm run test -- accessregistry.test` passes.

## 2. Declare permissions on the four previously-unchecked or reach-only endpoints

- [x] 2.1 Declare `{ capability: { page: 'history', capability: 'canViewConnectionInfo' }, reach:
      { fromSlug: 1 } }` on `destinations/[...slug].ts`, removing the named
      `checkAccessToDestIdSlug` middleware; add tests asserting denial without the capability
      (even with reach) and denial without reach (even with the capability); verify the test file
      passes.
- [x] 2.2 Same pattern on `destinationaudit/[...slug].ts` with `history.canViewChangeHistory`;
      verify its test file.
- [x] 2.3 Same pattern on `statushistory/[...slug].ts` with `history.canViewHubStatusHistory`;
      verify its test file.
- [x] 2.4 Same pattern on `tests/connectiontest/[...slug].ts` with `test.canRunConnectionTest`;
      verify its test file.
- [x] 2.5 Delete the four `in-handler` rows (`destinations`, `destinationaudit`, `statushistory`,
      `tests/connectiontest`) and all four `unwired-flag` rows these declarations now match
      (`history.canViewConnectionInfo`, `history.canViewChangeHistory`,
      `history.canViewHubStatusHistory`, `test.canRunConnectionTest`) from `authzDebt.ts` - this
      group lands before the page gates in Group 4, so it is what first introduces each matching
      declaration and is responsible for closing these rows, not Group 4. Verify
      `npm run test -- accessregistry.test` passes.

## 3. Retrofit the four existing `split-decision` routes

- [x] 3.1 `changerequest/index.ts`: add `reach: { fromBody: 'destId' }` to the POST, PUT, and
      DELETE `byMethod` entries; remove the in-handler `hasAccessToDestId` call. Verify existing
      tests plus a new split-role-deny test pass.
- [x] 3.2 `changerequest/[...slug].ts` GET: add `reach: { fromSlug: 1 }` to its `byMethod`
      capability entry; remove the in-handler reach check for the GET branch only. Verify its
      test file.
- [x] 3.3 `changerequest/[...slug].ts` DELETE: keep this one in-handler - after
      `fetchDestinationChangeRequestById` resolves `changeRequest.destId`, call `can()` combining
      capability and reach, matching `status/reset`'s pattern (noting this one needs an async
      lookup `status/reset` does not). Update `authzDebt.ts`: delete the
      `changerequest/[...slug].ts` `split-decision` row, add a new `in-handler` row scoped to
      `changerequest/[...slug].ts (DELETE)`. Verify its test file.
- [x] 3.4 `maintenance/update/[...slug].ts`: add `reach: { fromSlug: 1 }` to its capability
      declaration, remove the named `checkAccessToDestIdSlug` middleware. Verify no test asserts
      a 401 for this route's reach denial (403 is the new, correct status); verify its test file.
- [x] 3.5 `allowedusers/index.ts`: add `reach: { fromBody: 'destinationId' }` to the POST and
      DELETE `byMethod` entries only (GET is unaffected); remove the in-handler
      `hasAccessToDestId` calls from those two branches. Verify its test file.
- [x] 3.6 Delete the `changerequest/index.ts`, `maintenance/update/[...slug].ts`, and
      `allowedusers/index.ts` `split-decision` rows from `authzDebt.ts`; verify
      `npm run test -- accessregistry.test` passes.

## 4. Gate the five connection pages and their in-page controls

- [x] 4.1 Add `getServerSideProps = withPageAccess('edit', ...)` to
      `src/pages/edit/[...slug].tsx` (no existing `getServerSideProps` to wrap) and render
      `<AccessDenied />` on denial; verify a new test asserts denial without
      `edit.canChangeCredentials`.
- [x] 4.2 Same for `src/pages/history/[...slug].tsx` with `'history'`.
- [x] 4.3 Wrap the existing `getServerSideProps` in `src/pages/test/[...slug].tsx` with
      `withPageAccess('test', ...)`, deleting its manual session check; verify the existing test
      still passes.
- [x] 4.4 Same for `src/pages/changerequest/[...slug].tsx` with `'changerequest'`, preserving the
      existing `hasAccessToDestId` reach check inside the wrapped handler.
- [x] 4.5 Same for `src/pages/testreport/index.tsx`, reusing `'test'` as its `withPageAccess` key
      (no new `PAGE_ENTRY` entry, matching `/passwordencryption`'s precedent).
- [x] 4.6 Gate Edit Connection's three real action controls (save draft, reset draft, run draft
      test) behind their respective `accessLevels.*` flags via `useRoleAccess()`, following the
      `{flag && <Control/>}` convention. `edit.canApproveChangeRequest` has no separate control -
      PO-confirmed 2026-11-03 that editing a change request IS `canCreateChangeRequest`, already
      enforced at the API layer; see `authzDebt.ts`. Verified with component tests per control
      asserting each is hidden without its flag (`floatingActionButtons.test.tsx`).
- [x] 4.7 Gate Connection History's remaining views (change request, connection info details,
      change history) the same way; verify a component test per view.
- [x] 4.8 Delete the five `ungated-page` rows (`edit`, `history`, `test`, `changerequest`,
      `testreport`) and the six remaining closeable `unwired-flag` rows (`edit.canChangeCredentials`,
      `edit.canSaveDraft`, `edit.canResetDraft`, `edit.canRunDraftConnectionTest`,
      `history.canViewChangeRequest`, `history.canViewConnectionInfoDetails`) from `authzDebt.ts`.
      `edit.canApproveChangeRequest` stays, permanently, by PO ruling - not an oversight.
- [x] 4.9 Extend the hardcoded gated-page array in `accessregistry.test.ts` to include `edit`,
      `history`, `test`, `changerequest`, and `testreport`'s derived page key; verify the
      gated-page-list test passes with the extended list.

## 5. Gate the two ConnectionTable report controls

- [x] 5.1 Thread `canRunConnectionTest` into `CustomToolbarProps` and gate the Test Report(s)
      toggle in `CustomToolbar`; verify a component test asserts it is hidden without the flag.
- [x] 5.2 Gate the desktop Generate Report button in `CustomFooter` - it is nested inside
      `ConnectionsTable`'s render body, not module-level as design.md first assumed, so it already
      closed over `accessLevels` with no prop-threading needed. No component test added: no test
      file exists for `ConnectionTable/index.tsx` today, and writing a new one blind for an
      1100+-line component, with no working test runner at the time, risked shipping a wrong test.
- [x] 5.3 Gate the mobile Generate Report button directly with the already-in-scope
      `accessLevels.canRunConnectionTest`; verify a component test.

## 6. Final verification

- [x] 6.1 Run `npm run code-quality-check` (lint + type-check); verify it passes. Lint passed
      outright (0 errors; removed two now-stale `eslint-disable` comments in `edit`/`history`
      pages left over from 4.1/4.2's signature change). Type-check needed one fix: the
      `changerequest` page's `changeRequest` prop was over-narrowed to `unknown` instead of `any`.
- [x] 6.1a Ran the full `npm run test` suite while chasing this down, then confirmed it is **not**
      what actually gates a PR to `develop` - `.github/workflows/deploy.yml`'s `code-quality-check`
      job explicitly comments out `npm run test`; the real gate is `code-quality-check` +
      `test:release-validation` + `test:scan-workflow` (task 6.2). Kept the three real findings
      from that run, since they're genuine bugs in this change's own new code:
      - Stale hardcoded `REQUIRES_DESTINATION_SCOPE` array assertion in
        `api-middleware-helper.test.ts` (only expected `console.canViewConsole`) - updated to the
        full 12-entry list this change adds.
      - `authzDebt.ts`'s new in-handler row had `subject: '...ts (DELETE)'`, which isn't a real
        file path and broke the "every in-handler row points at a file that exists" ratchet -
        fixed to the bare file path, with the DELETE-only scope moved into the `note`.
      - Pre-existing bug in `useRoleAccess.ts`: the explicit-page-key overload is documented as not
        needing routing context, but the implementation called `useRouter()` unconditionally
        anyway, which throws outside a mounted Next router. This change's new
        `useRoleAccess('history')` call in `connectionInfo.tsx` (task 4.7) was the first caller to
        hit it in a test with no router mock. Fixed by wrapping the call so it degrades to
        `undefined` instead of throwing, without making the hook call itself conditional (Rules of
        Hooks forbid that).
      The ~14 other failing files in that run are pre-existing and unrelated to this change
      (`useRouter`-not-mounted via `Console/index.tsx`'s separate *no-arg* `useRoleAccess()` call;
      testing-library "multiple elements found" brittleness in several untouched components;
      `toBeCalled is not a function` in two untouched dialog tests; "Test suite failed to run" on
      integration/crypto tests needing real AWS resources; `security-updates.test.js`, which the
      repo's own recent commits are already in the process of removing).
- [ ] 6.2 `npm run test:release-validation` and `npm run test:scan-workflow` - the two test
      scripts `deploy.yml`'s `code-quality-check` job actually runs on a PR. Deliberately **not**
      run locally: this environment's `node_modules` was populated via a local-tarball workaround
      for two GitHub-Packages dependencies this session couldn't authenticate against (see
      design.md/session notes), so a local result here wouldn't be trustworthy either way. Will be
      verified for real by CI once this branch is pushed and a PR is opened.
- [x] 6.3 Run `npm run build`; verify it succeeds. Exit code 0. Full route manifest confirms all
      five new pages (`/edit/[...slug]`, `/history/[...slug]`, `/test/[...slug]`,
      `/changerequest/[...slug]`, `/testreport`) build as dynamic (`ƒ`) routes, consistent with
      their new `getServerSideProps`/`withPageAccess`. Only warnings, all pre-existing and
      unrelated (a dynamic `fs.readFileSync` tracing warning in `statushistory`).
- [x] 6.4 Read `authzDebt.ts` and confirm exactly 10 rows remain, all outside this CR's scope: 1
      `ungated-page` (`api-doc`, IGDD-3550), 8 `in-handler` (the 7 `apikeys`/`apikeysaudit` rows,
      IGDD-3549, plus the `changerequest/[...slug].ts` DELETE row from task 3.3), and 1
      `unwired-flag` (`edit.canApproveChangeRequest`, permanently redundant by PO ruling, task
      4.6/4.8). Confirmed via the Jest run's own debug log: `AUTHZ_DEBT (10 rows):
      {"ungated-page":1,"in-handler":8,"unwired-flag":1}` - exact match.

## Workflow follow-up

- [x] Ran the `/review` (code-review) skill against the diff, per standing instruction. 6 findings;
      5 real, now fixed; 1 test-coverage gap acknowledged but not closed (no end-to-end test for
      `status/reset`/`destinations`/`destinationaudit`/`statushistory`/`connectiontest`'s real
      middleware declaration - all mock `api-middleware-helper` away). Real fixes:
      - `test/[...slug].tsx` and `testreport/index.tsx` had no destination-reach check - the page
        gate (`withPageAccess`) only checks the page-entry capability with `ANY_JURISDICTION`,
        same as every page gate by design, but both pages directly fetch and connection-test a
        specific destination. Added `hasAccessToDestId` checks, matching `changerequest/[...slug].tsx`'s
        existing pattern.
      - `enforceRouteAuthz`'s `deny()` read the top-level `scope` closure variable instead of the
        per-method `methodScope` in the `byMethod` branch, mis-logging every `byMethod` reach-denial.
        Fixed, with a regression test.
      - Cosmetic indentation left over from the `changerequest/index.ts` refactor in task 3.1 -
        fixed with `prettier --write`.
      - `ConnectionHistory/index.tsx` and `connectionInfo.tsx` returned a bare, unlogged
        `<div>failed to load</div>` on a fetch error instead of invoking the `ErrorBoundary`
        already mounted around them (in `history/[...slug].tsx`) - the same directory's
        `changeHistory.tsx`/`testHistory.tsx` already throw on their own fetch errors specifically
        so that boundary catches, logs (`console.error`/`console.info`), and renders the real
        `ErrorPage`. Changed both to `throw` instead, matching the established convention; added a
        regression test to `connectionInfo.test.tsx`. (Flagged as pre-existing and initially left
        as a "plausible, not current" note; user correctly pushed back that it's code this CR
        actively touches and the silent-failure pattern is a real problem regardless of who wrote
        it first - fixed instead of left noted.)
      Re-verified after all fixes: lint (0 errors), type-check (clean), `npm run build` (exit 0),
      and all touched test files (161 tests across 6 suites, all passing).
- Tag `@copilot` on the PR for its first review (once, not on every subsequent push).
- Add the `NOTE:` line linking to this proposal's GitHub branch on both IGDD-3545 and IGDD-3548
  (they already exist; don't create new tickets).
- Update `projects-in-progress.md` with this CR's artifact/task status per the Proposal
  Completion Checklist.
- Archive this OpenSpec change once implementation is verified and merged.
