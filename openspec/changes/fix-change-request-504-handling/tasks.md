# Tasks

## 1. Stabilize the application context

- [ ] 1.1 Run `npm run test` before any edit. Record the passing and failing suites in a baseline note, and verify that the note exists.
- [ ] 1.2 Replace the `setAlert` wrapper at `src/contexts/app.tsx:48` with the `useState` setter itself. Verify that `npm run code-quality-check` passes.
- [ ] 1.3 Wrap `combinedContextValue` in `useMemo` and `clearValue` in `useCallback`. List `pageSize`, `isChangePasswordClicked`, and `alert` in the memo dependencies. Verify that `npm run code-quality-check` passes.
- [ ] 1.4 Create `src/contexts/app.test.tsx`. Assert that the context value and `setAlert` keep the same identity across a re-render that changes no state. Verify that the new suite passes.
- [ ] 1.5 Search `src/` for `setAlert` and `clearValue` inside effect dependency arrays. Verify that `npm run test` reports no new failures against the 1.1 baseline.

## 2. Separate the disable reasons on the schedule button

- [ ] 2.1 Add an `isSubmitting` prop to `src/components/EditConnection/actionButtons.tsx`. Disable the SCHEDULE button when either prop is true. Verify that `npm run code-quality-check` passes.
- [ ] 2.2 Keep the Tooltip `open` state bound to `isScheduleButtonDisabled` alone. Verify that the date prompt stays closed when only `isSubmitting` is true.
- [ ] 2.3 Wrap the SCHEDULE button in a `span` inside the Tooltip. Verify that the MUI warning about a disabled Tooltip child no longer appears in the test output.
- [ ] 2.4 Extend `src/components/EditConnection/actionButtons.test.tsx` for the two new cases above. Verify that the extended suite passes.

## 3. Prevent repeated submission

- [ ] 3.1 Add an in-flight `useRef` flag and an `isSubmitting` state to `src/components/EditConnection/index.tsx`. Return early from `handleSchedule` when the ref is set. Verify that `npm run code-quality-check` passes.
- [ ] 3.2 Move the body of `handleSchedule` inside `try`. Clear the ref and the state in a `finally` block. Verify that no exit path leaves the flags set.
- [ ] 3.3 Pass `isSubmitting` to `ActionButtons` and show a pending label on the button. Verify that the label appears while a submission is in progress.
- [ ] 3.4 Create `src/components/EditConnection/index.test.tsx` with a harness that supplies `CombinedContext`, SWR, the session, and the router. Verify that the harness renders the Schedule step.
- [ ] 3.5 Add a test for two activations in one tick against a `fetch` that never settles. Verify that `fetch` receives exactly one call.
- [ ] 3.6 Add a test for a retry after a submission ends. Verify that the second activation sends a new submission.
- [ ] 3.7 Add a test for the pending indication during an unsettled `fetch`. Verify that the test asserts the progress state.

## 4. Report every outcome

- [ ] 4.1 Replace the final `else` branch in `handleSchedule`. Treat every 5xx status as an unknown outcome. Verify that `npm run code-quality-check` passes.
- [ ] 4.2 Call `setAlert` and `setShowSnackbar(true)` together in that branch. Remove the `router.push('/manageconnections')` call from it. Verify that the Schedule step stays mounted after a 5xx.
- [ ] 4.3 Set the unknown-outcome message to state that the request may still have been submitted. Direct the user to verify Connection History before a retry. Verify that the message never claims failure.
- [ ] 4.4 Handle the `fetch` rejection path in the same way as a 5xx. Verify that a network failure also produces a visible message.
- [ ] 4.5 Delete `hasCreateChangeRequestTicketError` and the effect at `src/components/EditConnection/index.tsx:106-115`. Verify that a search for that name returns no result.
- [ ] 4.6 Add a code comment at the `activeStep === 2` gate. Record that the gate hides alerts raised on other steps. Verify that the comment names this change.
- [ ] 4.7 Add tests for the success, 400, 5xx, and network outcomes. Verify that each one produces a visible message.
- [ ] 4.8 Add a test for the 504 message. Assert the behavior, not the exact text, because the wording needs approval. Verify that the test passes.
- [ ] 4.9 Add a test for form survival after a 5xx and for navigation after success. Verify that both cases pass.
- [ ] 4.10 Add a test that the component accepts another action after an error. Verify that the render count stays bounded.

## 5. Integration verification

- [ ] 5.1 Run `npm run code-quality-check`. Verify that lint and `tsc --noEmit` both report no error.
- [ ] 5.2 Run `npm run test`. Verify that every suite passes and that no failure is new against the 1.1 baseline.
- [ ] 5.3 Run `npm run build`. Verify that the production build succeeds.
- [ ] 5.4 Exercise the consumer screens that read `pageSize`: `manageconnections`, `AccessControl`, and `AdminOperations`. Verify that paging still works on each.
- [ ] 5.5 Reproduce the incident locally with a short `proxy_read_timeout` and a slow Jira stub. Verify that one activation creates one ticket and that the console shows the unknown-outcome message. Do not run this against production.
- [ ] 5.6 Confirm the final wording of the unknown-outcome message with the reporter and IZG Operations. Verify that the shipped text matches the approved text.
