# Tasks

Reference `specs/` for what to build. Reference `design.md` for how to build it.

Scope note: this file covers the `izg-configuration-console` PR only. The `izgw-hub` PR
is tracked on the same ticket, IGDD-3599, and ships in the same release. This PR merges
first.

Do group 1 first. It is independent of every other group, and it repairs a defect that
exists on `develop` today.

Do group 2 before groups 5 and 6. Both screens import the rule that group 2 creates.

Rule for every group: no code reads the `hosts` map. Each route deletes it. Nothing
counts it, groups it, or logs it.

## 1. Correct the request timeouts

- [x] 1.1 Change the axios timeout from 5000 to 20000 in
  `src/lib/utils/izghubcircuitbreakerreset.ts`. Verify that the literal appears once in
  the file and that `npx tsc --noEmit` reports no error.

- [x] 1.2 Change the axios timeout from 5000 to 20000 at
  `src/lib/utils/izghubdbrefresh.ts:60`. Verify the same two points. This is the
  pre-existing defect: `refresh?all=true` already waits 15 seconds.

- [x] 1.3 Add a comment above each literal that names the 15 second Hub wait and the
  reason for the 5 second margin. Verify that a reader can tell why the value is not
  5000 without opening the Hub repository.

- [x] 1.4 Confirm that `src/pages/api/status/reset/[...slug].ts:106` keeps its 30000 ms
  timeout. Verify that 30000 is above the Hub wait, so this route needs no edit.

## 2. Build the shared level rule

- [x] 2.1 Create `src/lib/utils/hubregionstatus.ts` with the types and the signature
  from design D2. Verify that the module imports nothing from `next`, reads no
  environment variable, and performs no input or output.

- [x] 2.2 Implement the four cases of the D2 table. Every value `complete` returns
  `success`. Every value `failed` returns `error`. Any other combination returns
  `warning`. An absent, empty, or non-object input returns `undefined`.

- [x] 2.3 Verify that an unrecognised status value returns `warning`, not `success`.
  This is the fail-closed rule in design D2. Add a comment naming the three words as a
  closed set, and stating that a fourth word needs a change in both repositories. Every
  deployed Console renders an unknown word as a warning.

- [x] 2.4 Create `src/lib/utils/hubregionstatus.test.ts`. Open it with the docblock
  `/** @jest-environment node */`, as `src/__tests__/api/destinations/index.test.ts`
  does. `jest.config.js` sets jsdom for every suite, and the jsdom suites fail on
  `develop`. Cover the two-region production shape, one partial region, every region
  failed, an unknown value, and each empty input. Verify that
  `npx jest src/lib/utils/hubregionstatus.test.ts` passes.

- [x] 2.5 Verify that the module names `hosts` nowhere. Run
  `grep -n hosts src/lib/utils/hubregionstatus.ts` and confirm that it returns nothing.

## 3. Forward the per-region status from the hub-wide reset route

- [x] 3.1 Add the optional `regions` member to `CircuitBreakerResetResult` in
  `src/lib/utils/izghubcircuitbreakerreset.ts`. Keep `attempted`, `succeeded` and
  `failed` with their present meaning, per design D5.

- [x] 3.2 Read `regions` from the Hub response inside
  `resetCircuitBreakersForBaseUrls` and forward the value unchanged. Set it only when
  the call used exactly one base URL, per design D4.

- [x] 3.2a Add a comment at that branch stating why a multi-URL call forwards no block:
  every environment answers with a `us-east-1` key, so a merge lets one environment
  overwrite another. Add a unit test asserting that `resetAllCircuitBreakers` returns no
  `regions`. The comment and the test together stop a later developer from adding the
  obvious merge.

- [x] 3.3 Log one info entry that names the operation, the destination type, and the
  `regions` block, per design D1. Verify that the entry holds no host name and that the
  code never reads `hosts`.

- [x] 3.4 Return the block as `result.regions` in the 200 body of
  `src/pages/api/status/reset/index.ts`. The route already nests the utility result
  under `result`. Verify that no existing field changes name or meaning.

- [x] 3.5 Return 502 when every region reports `failed`, per design D6. Include
  `result.regions` in the 502 body. Verify that an absent or empty block triggers no 502
  and that the existing "every hub unreachable" 502 still behaves as it does today.

- [x] 3.6a Derive the `message` field of the 200 body from the level, not from the
  absence of an exception. `src/pages/api/status/reset/index.ts:66` returns
  `success: true` with "Circuit breakers reset for the selected environment." That
  string is now false for a `partial` result, and the `@swagger` block publishes it to
  a direct caller. Use `hubOperationLevel`, which group 2 already provides. Verify that
  a partial result does not return a success message.

- [x] 3.6 Create `src/__tests__/api/status/reset/index.test.ts`, with the
  `/** @jest-environment node */` docblock. Do not put a test file under `src/pages/`:
  `next.config.js` sets no `pageExtensions`, so a `.test.ts` there becomes a route and
  breaks the build. Cover every region complete, one region partial at 200, every region
  failed at 502, and a Hub response with no `regions`. Verify that
  `npx jest src/__tests__/api/status` passes.

- [x] 3.7 Add a test that feeds the route a Hub body carrying a `hosts` map and a
  `destinations` block whose entries hold `statusBy`. Assert four concrete points on
  the serialised response. It holds no `ip-` substring. It holds no `.internal`
  substring. It holds no `statusBy` key. The `result` object holds exactly the keys
  `attempted`, `succeeded`, `failed` and `regions`.

- [x] 3.7a Add a comment above the line that builds `result`, stating that the route
  copies `regions` only, and that `hosts` and `destinations` both carry private host
  names. Verify that the comment names `statusBy` inside `destinations`, which is the
  one a reader does not expect.

## 4. Redact and forward on the per-destination reset route

- [x] 4.1 Delete `hosts` from the Hub body in
  `src/pages/api/status/reset/[...slug].ts`, beside the existing
  `delete response.data?.statusBy`. Verify that the two redactions sit together and
  carry one comment that names both.

- [x] 4.2 Keep `regions` in the body the route returns, at the top level and unchanged.
  Keep every existing field, including `destId` and `status`. Keep the Hub status code,
  per design D6.

- [x] 4.3 Log one info entry that names the operation, the destination, and the
  `regions` block. Keep the existing "Circuit breaker reset" entry and its `grantedBy`
  field.

- [x] 4.4 Create `src/__tests__/api/status/reset/destination.test.ts`, with the same
  docblock and for the same reason as task 3.6. Cover the deleted `hosts`, the forwarded
  `regions`, a Hub body with no `regions`, and the unchanged 404 and 502 paths. Verify
  that the tests pass.

- [x] 4.5 Add a test that feeds the route a Hub body carrying `hosts` and `statusBy`.
  Assert that the serialised response holds no `ip-` substring, no `.ec2.internal`
  substring, no `hosts` key, and no `statusBy` key. Use `.internal` rather than
  `.ec2.internal`: a host name can read `ip-10-202-10-158.us-west-2.compute.internal`.

## 5. Show the per-region status on the Admin Operations page

- [x] 5.1 Read the measured baseline before any component edit, then confirm it. Run
  `npx jest src/components/ConnectionTable src/components/SnackBar`. Do not point the
  baseline at `src/components/AdminOperations`: that directory holds no test file
  today, so jest exits 1 with "0 matches" and the baseline is empty.

  Baseline measured on `develop` on 2026-10-22, with only the OpenSpec files added:
  5 suites, 19 tests, 2 suites and 5 tests failed. Both failures are
  `TestingLibraryElementError: Found multiple elements with the text: Reset Circuit
  Breaker`, in `resetCircuitBreakerDialog.test.tsx` and in
  `popOverActionButtons.test.tsx`. The dialog is `keepMounted`, so its title sits in
  the DOM beside the menu item of the same name. The cause is a query that is not
  specific enough, not the `ERR_REQUIRE_ESM` bug that `CLAUDE.md` describes. Those
  jsdom suites do run.

  Compare every later run against these numbers. Group 6 edits one of the two failing
  files, so leaving the count unchanged is the target, and repairing the query is
  welcome but optional.

- [x] 5.2 Widen the inline result type. Add `'warning'` to the `level` union and add an
  optional `persistent` member, on the `onResult` prop of
  `src/components/AdminOperations/CircuitBreakerCard.tsx` and on `handleResult` at
  `src/components/AdminOperations/index.tsx:44`. `Alert.level` in `src/contexts/app.tsx`
  is already `string`, so the context needs no edit. Verify that `npx tsc --noEmit`
  reports no error and that the other two cards compile unchanged.

- [x] 5.3 Add `autoHideDuration={alert.persistent ? null : undefined}` to
  `CustomSnackbar` in `src/components/AdminOperations/index.tsx`. Copy the line from
  `src/pages/manageconnections/index.tsx:52`. Verify that an alert with no `persistent`
  member keeps the 6 second auto-hide.

- [x] 5.4 Read `data.result.regions` in `CircuitBreakerCard` and pass it to
  `hubOperationLevel`. Verify that an `undefined` level falls back to `res.ok` and
  reproduces today's behavior exactly.

- [x] 5.5 Write the warning message and the error message. Name the region that did not
  complete and set `persistent: true`. Verify that neither message reads as a success.

- [x] 5.6 Hold the last `regions` block in card state and render one line per region
  under the buttons. Each line names the region and its status. Verify that no line
  holds a number.

- [x] 5.7 Clear the rendered block when the operator starts another reset. Verify that
  the card never shows the result of a previous environment.

- [x] 5.8 Create `src/components/AdminOperations/CircuitBreakerCard.test.tsx`. Cover
  every region complete, one region partial, every region failed, an unknown status
  value, and an absent block. Assert the rendered region lines and the chosen severity.
  Compare the result against the group 5.1 baseline.

## 6. Correct the per-destination dialog message

- [x] 6.1 Destructure `regions` out of the response body in
  `src/components/ConnectionTable/resetCircuitBreakerDialog.tsx`, per design D10. Verify
  that `updateRow` receives no `regions` member.

- [x] 6.2 Pick the message with `hubOperationLevel`. Report success only when the level
  is `success`. Verify that a partial result states that the reset did not reach every
  instance and names the region.

- [x] 6.3 Keep today's message when the body carries no `regions`. Verify that the
  Console behaves as it does now against a Hub that reports no regions.

- [x] 6.4 Extend `src/components/ConnectionTable/resetCircuitBreakerDialog.test.tsx`
  with the three cases above. Assert that the row update holds no `regions`. Compare the
  run against the group 5.1 baseline.

## 7. Integration and release

- [x] 7.1 Update the `@swagger` block on both reset routes. Describe `result.regions` on
  `/api/status/reset`, the new 502 for every region failed, and the top-level `regions`
  on the per-destination route. Verify that `/api-doc` renders the new fields.

- [x] 7.2 Check the constraint over the changed source files only. Run
  `git diff --name-only develop -- src | grep -v -e __tests__ -e '\.test\.' | xargs grep -n hosts`.
  Verify that the only hits are the two delete statements and their comment. Test
  fixtures carry a `hosts` map on purpose, which is why they are excluded.

- [x] 7.3 Run `npm run code-quality-check`. Verify that lint and `tsc --noEmit` report
  no error.

- [x] 7.4 Run `npm run test`. Compare the pass and fail counts against the group 5.1
  baseline. Verify that no node-environment suite fails and that no new jsdom suite
  fails.

  Measured on 2026-10-23 by stashing the change and running both trees:

  | | Clean tree | With the change |
  |---|---|---|
  | Suites | 12 failed, 65 passed, 77 total | 12 failed, 69 passed, 81 total |
  | Tests | 49 failed, 996 passed, 1045 total | 49 failed, 1038 passed, 1087 total |

  The same 12 suites fail in both runs, with the same 49 tests. This change adds 4
  suites and 42 tests, all passing, and breaks nothing.

- [x] 7.5 Run `npm run build`. Verify that the build behaves as it does on a clean
  tree.

  It does not succeed, on either tree. `npm run build` fails on the clean branch with
  `Failed to collect page data for /test/[...slug]`, and fails with the identical error
  after this change. The defect is pre-existing and belongs to a separate ticket. Note
  for whoever picks it up: `next build` also rewrites `next-env.d.ts`, which is a
  generated file and must not be committed with this change.

- [x] 7.6 Run the Console against a Hub build that returns neither map. Verify that the
  reset and the refresh both report as they do today.

  Verified on 2026-10-23 against the Testing environment, which still runs the old Hub.
  The body carried `{ attempted, succeeded, failed }` and no `regions`. The console
  showed the green "Testing circuit breakers were reset." message and no region lines,
  which is the pre-IGDD-3599 behavior. This is the release-window case, because this PR
  merges first.

- [x] 7.7 Run the Console against the IGDD-3599 Hub build on dev. Post a reset and
  verify that the card lists both regions with their status.

- [x] 7.8 Stop one dev task, post a reset, and verify that the card reports a warning
  and names the region that reads `partial`. Verify that the message stays on screen
  until dismissed. The Hub side of this case is already verified: on 2026-10-22 the
  stopped instance read `Timed Out`, its region read `partial`, and the other region
  read `complete`. Expect the call to take the full 15 seconds, against a healthy
  measurement of 343 ms.

- [x] 7.9 Open the browser developer tools during a dev reset. Verify that no response
  body holds a Hub host name and no response body states an instance count.

- [x] 7.10 Write the PR title so that the generated release note is accurate. Do not
  edit `RELEASE_NOTES.md` by hand. The release workflow writes that file from the PR
  titles in the release (`.github/workflows/_release_common.yml:145`), and the
  `release-automation` spec requires it, so a hand-written entry collides with the
  generated section. The title must carry both user-visible effects: a circuit breaker
  reset now reports the status of each region, and the database refresh no longer times
  out before the hub answers.

  Done on 2026-10-23, PR #753: "IGDD-3599 Report circuit breaker reset per Hub region,
  and fix the early database refresh timeout".

- [x] 7.11 Confirm that the Hub change and this change state one contract. Verified on
  2026-10-23 against `izgw-hub` branch `IGDD-3599`: the Decisions rows name
  `{ destinations, hosts, regions }`, say that the Console removes `hosts` before
  answering the browser, and say that the Console reads `regions`. "What changes" gains
  the per-region summary, backward compatibility names both new keys, design D5 reads
  "two added members ... forwards the rest", and task 4.2 names all three. The earlier
  drift, including "The Console needs no change for this", is gone.

  Release coordination is tracked on IGDD-3599, not here. Both changes ship together by
  agreement.

## Summary

| Group | Work | Hours | Depends on |
|---|---|---|---|
| 1 | Correct the request timeouts | 0.5 | — |
| 2 | Shared level rule | 1 | — |
| 3 | Hub-wide reset route | 2.5 | 2 |
| 4 | Per-destination reset route | 1.5 | — |
| 5 | Admin Operations page | 3 | 2, 3 |
| 6 | Per-destination dialog | 1.5 | 2, 4 |
| 7 | Integration and release | 2 | 1, 5, 6 |

Total: 12 hours.

No new dependency, no new environment variable, and no infrastructure change. The nginx
read timeout already allows 20 seconds. No authorization or jurisdiction rule changes,
so no security review checkpoint is needed. Task 7.2 is the data-exposure check and is
not optional.
