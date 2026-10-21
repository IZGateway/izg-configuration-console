# Tasks

## 1. Stabilize the application context

- [x] 1.1 Run `npm run test` before any edit. Record the passing and failing suites in a baseline note, and verify that the note exists.
- [x] 1.2 Replace the `setAlert` wrapper at `src/contexts/app.tsx:48` with the `useState` setter itself. Verify that `npm run code-quality-check` passes.
- [x] 1.3 Wrap `combinedContextValue` in `useMemo` and `clearValue` in `useCallback`. List `pageSize`, `isChangePasswordClicked`, and `alert` in the memo dependencies. Verify that `npm run code-quality-check` passes.
- [x] 1.4 Create `src/contexts/app.test.tsx`. Assert that the context value and `setAlert` keep the same identity across a re-render that changes no state. Verify that the new suite passes.
- [x] 1.5 Search `src/` for `setAlert` and `clearValue` inside effect dependency arrays. Verify that `npm run test` reports no new failures against the 1.1 baseline.

## 2. Separate the disable reasons on the schedule button

- [x] 2.1 Add an `isSubmitting` prop to `src/components/EditConnection/actionButtons.tsx`. Disable the SCHEDULE button when either prop is true. Verify that `npm run code-quality-check` passes.
- [x] 2.2 Keep the Tooltip `open` state bound to `isScheduleButtonDisabled` alone. Verify that the date prompt stays closed when only `isSubmitting` is true.
- [x] 2.3 Wrap the SCHEDULE button in a `span` inside the Tooltip. Verify that the MUI warning about a disabled Tooltip child no longer appears in the test output.
- [x] 2.4 Extend `src/components/EditConnection/actionButtons.test.tsx` for the two new cases above. Verify that the extended suite passes.

## 3. Prevent repeated submission

- [x] 3.1 Add an in-flight `useRef` flag and an `isSubmitting` state to `src/components/EditConnection/index.tsx`. Return early from `handleSchedule` when the ref is set. Verify that `npm run code-quality-check` passes.
- [x] 3.2 Move the body of `handleSchedule` inside `try`. Clear the ref and the state in a `finally` block. Verify that no exit path leaves the flags set.
- [x] 3.3 Pass `isSubmitting` to `ActionButtons` and show a pending label on the button. Verify that the label appears while a submission is in progress.
- [x] 3.4 Create `src/components/EditConnection/index.test.tsx` with a harness that supplies `CombinedContext`, SWR, the session, and the router. Verify that the harness renders the Schedule step.
- [x] 3.5 Add a test for two activations in one tick against a `fetch` that never settles. Verify that `fetch` receives exactly one call.
- [x] 3.6 Add a test for a retry after a submission ends. Verify that the second activation sends a new submission.
- [x] 3.7 Add a test for the pending indication during an unsettled `fetch`. Verify that the test asserts the progress state.

## 4. Report every outcome

- [x] 4.1 Replace the final `else` branch in `handleSchedule`. Treat every 5xx status as an unknown outcome. Verify that `npm run code-quality-check` passes.
- [x] 4.2 Call `setAlert` and `setShowSnackbar(true)` together in that branch. Remove the `router.push('/manageconnections')` call from it. Verify that the Schedule step stays mounted after a 5xx.
- [x] 4.3 Set the unknown-outcome message to state that the request may still have been submitted. Direct the user to verify Manage Connections before a retry. Verify that the message never claims failure.
- [x] 4.4 Handle the `fetch` rejection path in the same way as a 5xx. Verify that a network failure also produces a visible message.
- [x] 4.5 Delete `hasCreateChangeRequestTicketError` and the effect at `src/components/EditConnection/index.tsx:106-115`. Verify that a search for that name returns no result.
- [x] 4.6 Add a code comment at the `activeStep === 2` gate. Record that the gate hides alerts raised on other steps. Verify that the comment names this change.
- [x] 4.7 Add tests for the success, 400, 5xx, and network outcomes. Verify that each one produces a visible message.
- [x] 4.8 Add a test for the 504 message. Assert the behavior, not the exact text, because the wording needs approval. Verify that the test passes.
- [x] 4.9 Add a test for form survival after a 5xx and for navigation after success. Verify that both cases pass.
- [x] 4.10 Add a test that the component accepts another action after an error. Verify that the render count stays bounded.
- [x] 4.11 Add an optional `autoHideDuration` prop to `src/components/SnackBar/index.tsx`. Keep 6000 as the default. Verify that `npm run code-quality-check` passes.
- [x] 4.12 Pass `null` for that prop from the unknown-outcome path only. Verify that a success message still auto-hides.
- [x] 4.13 Add a test that the unknown-outcome message stays after the auto-hide window and clears when the user dismisses it. Verify that the test passes.

## 5. Integration verification

- [x] 5.1 Run `npm run code-quality-check`. Verify that lint and `tsc --noEmit` both report no error.
- [x] 5.2 Run `npm run test`. Verify that no failure is new against the 1.1 baseline in `jest-baseline.md`. The baseline has 34 failing suites that predate this change, so a fully green run is not the criterion.
- [x] 5.3 Run `npm run build`. Verify that the production build succeeds.
- [x] 5.4 Exercise the consumer screens that read `pageSize`: `manageconnections`, `AccessControl`, and `AdminOperations`. Verify that paging still works on each.
- [x] 5.5 Reproduce the incident locally with a short `proxy_read_timeout` and a slow Jira stub. Verify that one activation creates one ticket and that the console shows the unknown-outcome message. Verify that the unknown-outcome message stays until it is dismissed. Do not run this against production.
- [x] 5.6 Confirm the final wording of both messages with the reporter and IZG Operations. Cover the confirmed-success text and the unknown-outcome fallback. Verify that the shipped text matches the approved text.

## 6. Confirm a slow submission before reporting

- [x] 6.1 Capture the record's `jiraId` before the submit starts. Verify that the value is read from the draft the component already holds.
- [x] 6.2 Add a poll helper that reads `GET /api/changerequest/{destTypeId}/{destId}` every 3 seconds for up to 90 seconds. Stop as soon as the `jiraId` differs from the captured value. Verify that `npm run code-quality-check` passes.
- [x] 6.3 Enter a confirming state after a 5xx or a `fetch` rejection. Keep the SCHEDULE button disabled for the whole confirming period. Verify that the button stays disabled.
- [x] 6.4 Show that the console is still working while it confirms. Verify that the label differs from the submitting label.
- [x] 6.5 Report a confirmed success, then return the user to the connection list. Verify that the message does not contain the ticket key, which is internal.
- [x] 6.6 Report the unknown-outcome message when the bounded wait expires. Verify that the fallback keeps its dismiss-only behavior.
- [x] 6.7 Add a test for a 504 followed by a record that gains a ticket. Verify that the console reports a confirmed success.
- [x] 6.8 Add a test for a 504 followed by a record that never gains a ticket. Verify that the console reports the unknown outcome after the bounded wait.
- [x] 6.9 Add a test that a pre-existing ticket does not read as a success. Verify that the comparison uses the captured value.
- [x] 6.10 Add a test that a schedule action during the confirming period sends nothing. Verify that the server receives one submission.
- [x] 6.11 Run `npm run code-quality-check` and `npm run test`. Verify that no failure is new against the 1.1 baseline.
- [x] 6.12 Reproduce the incident locally with the slow Jira stub. Verify that the console reports a confirmed success after the gateway times out. Do not run this against production.

## 7. Report a clean failure at once

- [x] 7.1 Replace the rethrow in the catch at `src/pages/api/changerequest/index.ts`. Respond `502` with `ticketCreated` set to false when no ticket exists. Verify that `npm run code-quality-check` passes.
- [x] 7.2 Respond `500` with `ticketCreated` set to true when the ticket exists and a later step failed. Verify that the real error reaches the log.
- [x] 7.3 Remove the dead `finally` block in the same route. Verify that a search for `changeRequestDBResponse.id` returns no result.
- [x] 7.4 Add route tests for both failure shapes. Verify that each response carries the correct `ticketCreated` value.
- [x] 7.5 Add a route test that a failed Jira call no longer masks its own error. Verify that the logged message names the Jira failure.
- [x] 7.6 Report a clean failure at once in the console when the body reports that nothing was created. Verify that the console runs no record lookup.
- [x] 7.7 Keep the confirmation poll for every other failure, including a body that is missing or does not parse. Verify that a 504 still confirms.
- [x] 7.8 Add client tests for the confirmed-failure path and the fallback. Verify that both pass.
- [x] 7.9 Run `npm run code-quality-check` and `npm run test`. Verify that no failure is new against the 1.1 baseline.
- [x] 7.10 Reproduce a Jira outage locally by stopping the stub. Verify that the console reports the failure at once with no wait. Do not run this against production.

## 8. Verification follow-ups

- [x] 8.1 Correct the stale artifact references found by verification. Verify that no artifact names Connection History as the place to check.
- [x] 8.2 Open the snackbar on the plain success path as well. Verify that both success paths behave alike.
- [x] 8.3 Align the two definite-failure messages on one word for one meaning. Verify that both read "problem".
- [x] 8.4 Add a test that the entered values survive a failed submission. Verify that the test reads a value back.
- [x] 8.5 Add a test that the plain success message becomes visible. Verify that the test asserts rendered text.
- [x] 8.6 Run `npm run code-quality-check` and `npm run test`. Verify that no failure is new against the 1.1 baseline.

## 9. Independent verification follow-ups

- [x] 9.1 Move the refusal comment to the message it describes and name Manage Connections. Verify that no source comment names Connection History.
- [x] 9.2 Add a catch to `handleSchedule` so that no exit ends a submission without a message. Verify that the backstop reports the unknown outcome.
- [x] 9.3 Correct the log text on the submit-rejection path and drop the duplicate `clearValue` call. Verify that one call remains.
- [x] 9.4 Rewrite the double-activation test so that it isolates the synchronous guard. Verify that the test fails when the guard is removed.
- [x] 9.5 Rename the test that claimed a clean failure but exercises the unknown outcome. Verify that the name matches the response it sends.
- [x] 9.6 Correct the three stale counts in the design and the proposal. Verify that each count matches what shipped.
- [x] 9.7 Close the open question on message wording. Verify that the design records the decision.
- [x] 9.8 Run `npm run code-quality-check` and `npm run test`. Verify that no failure is new against the 1.1 baseline.

## 10. Targeted audit follow-ups

- [x] 10.1 Report a ticket the route says it created at once, rather than polling for a record it never wrote. Verify that the console runs no lookup.
- [x] 10.2 Warn the user not to retry on that path. Verify that the message says so.
- [x] 10.3 Move persistence onto the alert and honour it on every screen that renders the shared alert. Verify that all three call sites read it.
- [x] 10.4 Build the request body before the try. Verify that a construction error no longer reports as a transport failure.
- [x] 10.5 Replace the test that fabricated a record state the route cannot produce. Verify that the new test matches the route's behavior.
- [x] 10.6 Name the load-bearing assertion in the button-disabled test and the limit of the mocked router in the success test. Verify that both comments state what the test does not prove.
- [x] 10.7 Record the unmount, timeout and response-validation findings as out of scope. Verify that the proposal names each one.
- [x] 10.8 Run `npm run code-quality-check` and `npm run test`. Verify that no failure is new against the 1.1 baseline.

