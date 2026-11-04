# Design

## Context

See `proposal.md` - Why for the incident and the three defects. See `specs/change-request-submission/spec.md` for the required behavior.

Three facts about the current code shape the approach.

`handleSchedule` in `src/components/EditConnection/index.tsx` has four exits: a `fetch` throw, an early return when `response` is unset, a 400 branch, and a final `else` branch for every other non-2xx status. The success path and the 400 path already behave well. The `else` branch is the defective one.

`ActionButtons` in `src/components/EditConnection/actionButtons.tsx` binds one prop, `isScheduleButtonDisabled`, to two things: the `disabled` attribute of the button and the forced-open state of a Tooltip that reads "Please select date and time". The two cannot share a prop once a second disable reason exists.

`alert` lives in `CombinedContext`, which `AppProvider` owns at the application level. An alert therefore survives a step change and a page change. The local `showSnackbar` state decides whether the alert is visible.

## Goals / Non-Goals

**Goals:**

- Hold the submit path to the eight requirements in the spec delta.
- Remove the render loop in a way that survives future edits to the context.
- Keep the change inside four component files, one API route, and their tests.

**Non-Goals:**

- No change to the request body or the data layer. The API route changes only to report whether the Jira ticket was created. See Decision 9.
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

One safe message covers all of them: the request may still have been created, so verify Manage Connections before a retry. A message that claims failure is the dangerous one, because it invites the retry that creates the duplicate.

The 400 branch keeps its current behavior. A rejection is a definite non-creation, and the server supplies a specific reason.

A 5xx no longer reports straight away. It enters the confirmation step in Decision 8 first, and it reaches the unknown-outcome message only when that bounded wait expires.

A 4xx other than 400 is also a definite non-creation, so it must not use the unknown-outcome message. `withMiddleware` returns 401 at `api-middleware-helper.ts:163`, 403 at line 214, and 405 at line 318. The route refuses those before it raises a ticket. They report a definite failure instead, and they do not send the user to Manage Connections for a record that is not there.

*Alternatives considered.* Branch on 504 alone and treat other 5xx as failures. Rejected: it reports a false certainty for the 500 case.

### Decision 4: Open the snackbar explicitly, and keep the step gate

In the `else` branch, call `setAlert` and `setShowSnackbar(true)` together, the way the 400 branch at line 338 already does. Leave the `activeStep === 2` gate at lines 179-187 in place.

This reverses the approach suggested during triage. Removal of the gate looked cleaner, and inspection of all ten `setAlert` call sites showed why it is not safe yet. The `alert` value lives in application context and survives a step change. With the gate gone, an alert set on one step re-opens the snackbar on every later step until something clears it. A correct removal therefore needs alert lifecycle work: clear the alert on a step change, or auto-open only for a newly set alert.

That work does not belong in a fix for a production incident. The explicit call satisfies every scenario in the spec delta, because all four `handleSchedule` outcomes occur on the Schedule step.

The gate stays a trap for the next person. Record it as a follow-up and mark it with a code comment.

*Alternatives considered.* Remove the gate and clear the alert on every step change. Rejected for scope: it changes alert behavior on four steps that this incident does not touch.

### Decision 4a: Both success paths open the snackbar

The plain success path set the alert and navigated away without opening the snackbar. The message still reached the user, because `manageconnections/index.tsx:27` opens the snackbar for any alert level. The confirmed-success path opens it directly.

Two paths that differ for no reason are a trap. Both now call `setShowSnackbar(true)`, so the message is visible before the navigation and testable in one place.

### Decision 5: Separate the two disable reasons on the button

Pass the in-flight state to `ActionButtons` as its own prop. Do not fold it into `isScheduleButtonDisabled`.

`actionButtons.tsx:44` forces the Tooltip open whenever `isScheduleButtonDisabled` is true. A combined prop pops "Please select date and time" during a submission, which is wrong and confusing. Two props keep the Tooltip bound to the date reason alone.

Wrap the button in a `span` inside the Tooltip. MUI cannot attach listeners to a disabled child, and the console already reports that warning.

### Decision 6: Cover the behavior with Jest, not Playwright

Test every scenario in the spec delta with Jest and `@testing-library/react`, with a mocked `fetch`.

The Playwright suite in `e2e/tests/` runs against deployed environments. A 504 from the real gateway cannot be induced there on demand, and a real submit creates a real Jira ticket.

The double-activation scenario needs a `fetch` mock that never settles, plus two activations in the same tick. That is the test that proves Decision 1.

### Decision 7: Make only the unknown-outcome message persistent

Add an optional `autoHideDuration` prop to `CustomSnackbar`, keep the default at 6000, and pass `null` from the unknown-outcome path alone.

`src/components/SnackBar/index.tsx:32` hardcodes `autoHideDuration={6000}`. After a 60 second wait the user may look away, so a message that clears itself in 6 seconds does not reliably reach them. This message is the last thing between the user and a duplicate submit, so it must wait for them.

The component is already most of the way there. It ignores the `clickaway` reason at line 20, and it renders a close button through the Alert `onClose` at line 37. A dismiss-only message therefore needs one prop and one call site.

*Alternatives considered.* Change the default for every consumer. Rejected: `CustomSnackbar` has 8 consumers, and several raise low-stakes messages such as "Your draft was saved", where a message that needs a click is an annoyance. Make persistence depend on severity inside the component. Rejected for the same reason: it changes behavior on seven screens that this change does not test.

### Decision 8: Confirm a slow outcome by polling the change request record

After a 5xx or a `fetch` rejection, poll `GET /api/changerequest/{destTypeId}/{destId}` every 3 seconds for up to 90 seconds. Report a confirmed success as soon as the record carries a new ticket.

That endpoint returns the same record the connection list uses. `src/pages/api/changerequest/[...slug].ts:58-62` calls `fetchDestinationChangeRequestByDestIdAndDestType`, and `src/pages/manageconnections/index.tsx:85-88` calls the same function to set `hasChangeRequest`. So the console polls exactly what lights the Change Request icon.

Compare against the `jiraId` held before the submit, not against null. `EditConnection` already holds the record as `draftData`, and a draft row exists with `jiraId: null`. The prior value also prevents a change request that already exists from reading as a success, which matters because a user can reach `/edit/{typeId}/{destId}` by typing the URL.

A 90 second bound covers a Jira call that runs 30 seconds past the 60 second nginx timeout. The cost is one small record read every 3 seconds.

The console can confirm "created". It cannot confirm "not created". A route that threw before the write leaves no record, and that looks the same as a record that has not appeared yet. So the bounded wait ends in the unknown-outcome message rather than a claim of failure.

*Alternatives considered.* Reuse the existing SWR hook with `mutate`. Rejected: SWR deduplication and cache behavior make a fixed-interval poll harder to reason about than a plain loop. Poll with no bound. Rejected: the button must not stay disabled forever.

### Decision 9: The route reports whether the Jira ticket was created

At `src/pages/api/changerequest/index.ts:159` the catch already holds `changeRequestTicketResponse`, so the route knows which of two very different failures happened. It currently discards that fact and lets the middleware return a generic 500.

Two failures hide behind one status. The Jira call can fail outright, which leaves no ticket. The Jira call can also succeed and a later step can throw, which leaves a ticket with no record. `fetchDestinationPassword` at line 138 and `upsertChangeRequest` at line 147 both run after the ticket exists.

The route therefore answers with the fact it holds:

- No ticket created: respond `502` with `{ ticketCreated: false }`.
- Ticket created, a later step failed: respond `500` with `{ ticketCreated: true }`.

The catch no longer rethrows to the middleware, so it must log the real error itself.

The console branches on the body, not the status. A body with `ticketCreated` set to false means a confirmed failure, reported at once. Anything else goes to the confirmation poll in Decision 8. That covers `true`, a missing body, and a body that does not parse. A 504 from nginx carries no JSON body, so it falls to the safe path by default.

*Alternatives considered.* Branch on the status alone. Rejected: the middleware already returns a bare 500 for unrelated faults at `api-middleware-helper.ts:106`, so the console could not tell them apart.

**`!_.isNull(changeRequestTicketResponse)` is not the same question.** It asks whether the call returned a value, not whether a ticket exists. `createChangeRequestTicket` throws at three points: the `fetch` rejects, Jira answers non-2xx at line 133, or `jiraResponse.json()` fails at line 137 on a body Jira already accepted. Reporting all three as a proven failure invites the duplicate this change exists to prevent.

`createChangeRequestTicket` therefore classifies its own failures and throws an error carrying a `ticketMayExist` flag:

| Failure | Ticket exists | Reported as |
|---|---|---|
| Connection to Jira fails before the request is sent | No, provably | `ticketCreated: false` |
| Jira answers 4xx | No, provably | `ticketCreated: false` |
| Jira answers 2xx and the body cannot be read | Yes, almost certainly | `ticketCreated: true` |
| Jira answers 5xx | Unknown | no flag, so the console confirms |
| Anything the classifier does not recognize | Unknown | no flag, so the console confirms |

The route defaults to the unknown answer when the flag is absent, so a throw path added later is safe by default rather than reported as a proven failure.

Only the Jira 5xx row loses its immediate report. That is the one row where no answer is provable, and an immediate "nothing was created" there is exactly what produces a second ticket.

### Decision 10: Remove the dead `finally` block in the route

Delete the `finally` block at `src/pages/api/changerequest/index.ts:163-167`.

`changeRequestDBResponse` is assigned only inside `if (changeRequestTicketResponse)`. So whenever the guard `_.isNull(changeRequestTicketResponse)` passes, that variable is guaranteed to be null, and `changeRequestDBResponse.id` throws. The block never deletes a record. It only ever replaces the real error with a null dereference, because a `finally` throw discards the `catch` throw.

A draft record that existed before the submit stays a draft. That is the correct outcome when the ticket was never raised.

*Alternatives considered.* Keep the block and add a null check on `changeRequestDBResponse`. Rejected: the guarded call becomes unreachable, so the result is dead code with a longer condition.

### Decision 11: Report the route's definite answer in both directions

A 5xx body that reports the ticket as created is as definite as one that reports it as not created, so neither starts a record lookup.

The route answers `ticketCreated: true` only when the throw came after `createChangeRequestTicket` returned. The only steps after that point are the password read at `index.ts:138` and the `upsertChangeRequest` at `:147` that stores the new `jiraId`. So the record almost certainly never received it, and a poll for that `jiraId` cannot succeed. The earlier behavior spent 90 seconds proving that, then reported an unknown outcome for the one case the server already knew.

The message states that the change request exists, states that the console could not record it, and tells the user not to retry. A retry would raise a second ticket, which is the harm this change exists to prevent. The user needs IZG Operations to reconcile the ticket by hand.

### Decision 12: The alert carries its own persistence

Add an optional `persistent` field to the alert and have every screen that renders the shared alert read it.

The earlier approach compared the message against `UNKNOWN_OUTCOME_MESSAGE` inside `EditConnection`. The alert lives in `AppProvider`, above the page, so it can surface on a screen that never raised it. Three components render it: `EditConnection`, `manageconnections/index.tsx:47`, and `AccessControl/index.tsx:663`. Only the first honored the comparison, so the one message built to survive an unattended wait faded after 6 seconds on the other two.

Carrying the intent on the alert makes the guarantee travel with the message and removes the string comparison.

### Decision 13: Build the request body before the try

A throw while reading `session.user.email` or a destination value is not a transport failure. Inside the `try` it was caught and reported as "your change request may still have been created", which is false for a request that was never sent, and it sent the user hunting for a record that cannot exist.

Built before the `try`, such a throw reaches the backstop in `handleSchedule` instead. The backstop must not report the unknown outcome, because that message opens "The server did not respond", which claims a request was sent. It reports a failure to send instead: a definite non-creation, so the user can retry without risk.

### Decision 14: Two failure messages, grouped by what the user must do

A user cannot act on the difference between "Jira was unreachable", "Jira refused it" and "the request was never sent". All three mean nothing was created and a retry is safe. Likewise a user cannot act on the difference between "the wait expired" and "Jira created it but we could not record it". Both mean the outcome is uncertain.

So there are two failure messages rather than five. One reports a provable non-creation. One reports an uncertain outcome.

The uncertain message points at Manage Connections first and support second. On the expired-wait path Manage Connections holds the answer. On the created-but-not-recorded path the record was never written, so that screen shows nothing and the user reaches support, which is the right destination by a slower route.

*What this gives up.* The created-but-not-recorded path no longer carries an explicit "do not try again". The message does not invite a retry, which is the property that prevents the duplicate, but the warning itself is gone. Accepted deliberately: reaching that path needs Jira to answer 2xx with an unreadable body, and the message still routes the user to support.

The earlier unknown-outcome message opened "The server did not respond". That was false whenever the server answered with a 5xx of its own. The shared message claims nothing about the server.

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

None. The wording of all four messages is settled, so the one earlier question is closed. The shipped text lives in `src/components/EditConnection/index.tsx`: the confirmed success, the unknown outcome, the clean failure, and the refusal.
