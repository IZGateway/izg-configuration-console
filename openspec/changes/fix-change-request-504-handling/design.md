# Design

## Context

See `proposal.md` - Why for the incident and the three defects. See `specs/change-request-submission/spec.md` for the required behavior.

Three facts about the current code shape the approach.

`handleSchedule` in `src/components/EditConnection/index.tsx` has four exits: a `fetch` throw, an early return when `response` is unset, a 400 branch, and a final `else` branch for every other non-2xx status. The success path and the 400 path already behave well. The `else` branch is the defective one.

`ActionButtons` in `src/components/EditConnection/actionButtons.tsx` binds one prop, `isScheduleButtonDisabled`, to two things: the `disabled` attribute of the button and the forced-open state of a Tooltip that reads "Please select date and time". The two cannot share a prop once a second disable reason exists.

`alert` lives in `CombinedContext`, which `AppProvider` owns at the application level. An alert therefore survives a step change and a page change. The local `showSnackbar` state decides whether the alert is visible.

## Goals / Non-Goals

**Goals:**

- Hold the submit path to the six requirements in the spec delta.
- Remove the render loop in a way that survives future edits to the context.
- Keep the change inside three component files and their tests.

**Non-Goals:**

- No change to the request body, the API route, or the data layer. This design is client-side only.
- No rework of the alert lifecycle across the whole stepper. See Decision 4.
- No server-side duplicate guard. See `proposal.md` - Out of scope.

## Decisions

### Decision 1: Guard the submit with a ref, and drive the UI with state

Use a `useRef` flag as the gate that blocks a second submission, and a `useState` flag to render the pending state.

React batches state updates, so a state flag alone does not close the window. Two fast activations can both read the old `false` before React commits the first update. A ref updates synchronously, so the second activation reads `true` and returns.

Clear both flags in a `finally` block. `handleSchedule` has four exits, and a per-branch reset will miss one.

*Alternatives considered.* A state flag alone is simpler, and it closes the common case, because the button disables on the next render. It does not satisfy "the server receives exactly one submission" under a fast double activation. An `AbortController` cancels the in-flight request instead of blocking the new one. Rejected: aborting the first request does not stop the server from finishing the ticket, so it creates the same duplicate it aims to prevent.

### Decision 2: Fix the render loop in two places, not one

Apply both fixes.

In `src/contexts/app.tsx`, pass the `useState` setter directly instead of the wrapper at line 48. Wrap the context value in `useMemo` and `clearValue` in `useCallback`. React guarantees that a `useState` setter is stable, so the dependency stops changing on every render.

In `src/components/EditConnection/index.tsx`, delete `hasCreateChangeRequestTicketError` and the effect at lines 106-115. Call `setAlert` directly in the `else` branch.

Either fix alone breaks the current loop. Both together remove the class of fault. The context fix helps all 15 consumers of `CombinedContext`. The direct call makes this screen immune even if the context identity churns again later.

The `useMemo` dependency list must include `alert`, `pageSize`, and `isChangePasswordClicked`. The goal is to stop the identity from changing on unrelated renders, not to freeze the value.

*Alternatives considered.* Split the context into a state context and a stable dispatch context. This is the standard React answer and it is stronger. Rejected for this change: 15 consumers would need edits, which is a large blast radius for a production bug fix.

### Decision 3: Treat every 5xx as an unknown outcome

The `else` branch must report an unknown outcome for any 5xx status, not for 504 alone.

The console cannot tell "the ticket was not created" from "the ticket was created and the response was lost". A 504 proves the second case happened at least once. A 500 from the API route carries the same doubt, because the route throws after `createChangeRequestTicket` returns in some paths.

One safe message covers all of them: the request may still have been submitted, so verify Connection History before a retry. A message that claims failure is the dangerous one, because it invites the retry that creates the duplicate.

The 400 branch keeps its current behavior. A rejection is a definite non-creation, and the server supplies a specific reason.

*Alternatives considered.* Branch on 504 alone and treat other 5xx as failures. Rejected: it reports a false certainty for the 500 case.

### Decision 4: Open the snackbar explicitly, and keep the step gate

In the `else` branch, call `setAlert` and `setShowSnackbar(true)` together, the way the 400 branch at line 338 already does. Leave the `activeStep === 2` gate at lines 179-187 in place.

This reverses the approach suggested during triage. Removal of the gate looked cleaner, and inspection of all ten `setAlert` call sites showed why it is not safe yet. The `alert` value lives in application context and survives a step change. With the gate gone, an alert set on one step re-opens the snackbar on every later step until something clears it. A correct removal therefore needs alert lifecycle work: clear the alert on a step change, or auto-open only for a newly set alert.

That work does not belong in a fix for a production incident. The explicit call satisfies every scenario in the spec delta, because all four `handleSchedule` outcomes occur on the Schedule step.

The gate stays a trap for the next person. Record it as a follow-up and mark it with a code comment.

*Alternatives considered.* Remove the gate and clear the alert on every step change. Rejected for scope: it changes alert behavior on four steps that this incident does not touch.

### Decision 5: Separate the two disable reasons on the button

Pass the in-flight state to `ActionButtons` as its own prop. Do not fold it into `isScheduleButtonDisabled`.

`actionButtons.tsx:44` forces the Tooltip open whenever `isScheduleButtonDisabled` is true. A combined prop pops "Please select date and time" during a submission, which is wrong and confusing. Two props keep the Tooltip bound to the date reason alone.

Wrap the button in a `span` inside the Tooltip. MUI cannot attach listeners to a disabled child, and the console already reports that warning.

### Decision 6: Cover the behavior with Jest, not Playwright

Test every scenario in the spec delta with Jest and `@testing-library/react`, with a mocked `fetch`.

The Playwright suite in `e2e/tests/` runs against deployed environments. A 504 from the real gateway cannot be induced there on demand, and a real submit creates a real Jira ticket.

The double-activation scenario needs a `fetch` mock that never settles, plus two activations in the same tick. That is the test that proves Decision 1.

## Risks / Trade-offs

- **The context change affects 15 consumers** → The change removes renders and keeps values identical. Run the full Jest suite and exercise the consumer screens. Pay attention to `manageconnections`, `AccessControl`, and `AdminOperations`, which read `pageSize`.
- **A stable `setAlert` changes effect timing elsewhere** → Any other effect that lists `setAlert` as a dependency stops re-running on every render. That is the intent, and it can expose an effect that depended on the churn. Grep for `setAlert` in dependency arrays before the change and verify each.
- **The in-flight guard can stick** → If an exception escapes before the `finally`, the button stays disabled and the user is stuck with no recourse but a reload. Keep the whole body inside `try`, and reset in `finally` only.
- **The unknown-outcome message can read as alarming** → Operations staff coordinate every change request by hand, so a "verify before retry" message matches the real workflow. Review the wording with the reporter.
- **The step gate stays in place** → A future alert added on another step repeats this bug. The code comment and the follow-up item are the only guard.

## Migration Plan

No data migration. No API contract change. No new dependency.

Deploy is a normal container build and an ECS service update. Rollback is a revert of the commit and a redeploy of the previous image tag.

No feature flag. The change has no configuration surface, and a flag would add a second code path to the branch that is already defective.

Verify after deploy with the local reproduction method recorded in `proposal.md` - Why: a short `proxy_read_timeout` against a slow Jira stub. The reproduction is local only and must not run against production.

## Open Questions

- The exact wording of the unknown-outcome message. The reporter and IZG Operations must approve the final text. The approach, the specs, and the task breakdown do not depend on it.
