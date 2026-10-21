# Proposal

## Why

On 2026-10-08 a production user created eight duplicate Jira tickets for one change request (IGDD-3566).

The user completed the Create Change Request flow for destination `nyc` in production. The user pressed SCHEDULE. `POST /api/changerequest` reached the 60 second nginx read timeout and returned 504. The screen showed no success message and no error message. The user pressed SCHEDULE several more times. The server created one Jira ticket for each press.

A local reproduction on 2026-10-19 confirmed the whole sequence. With a 60 second proxy timeout and a Jira stub that answered after 65 seconds, nginx returned 504 to the browser, and the server finished the ticket 5 seconds later. The server log recorded `jiraTicketId` and "Change request ticket created successfully" after the browser already gave up. Every press therefore created a real ticket that the user never saw.

The duplicates also orphaned records. DynamoDB holds at most one change request row per destination, because the key is a hash of `destType` and `destId`. Each submit overwrote the `jiraId` on that single row. The eight presses therefore produced eight Jira tickets and one database row, so seven tickets have no record in the console. This explains why Operations counted eight tickets while the console tracked one change request.

Three defects made the failure silent:

1. An infinite render loop locks the browser on the error path. `src/contexts/app.tsx:48` rebuilds the `setAlert` wrapper on every render of `AppProvider`, and `src/contexts/app.tsx:41` rebuilds the context value object. `src/components/EditConnection/index.tsx:115` lists `setAlert` as an effect dependency, and that effect calls `setAlert`. The 504 sets the flag that arms the cycle. The browser logged the React warning "Maximum update depth exceeded" 499 times and stopped responding.
2. The alert snackbar never opens on the Schedule step. `src/components/EditConnection/index.tsx:179-187` opens it only when `activeStep === 2`, which is the IDENTIFY step. Schedule is step 4.
3. The SCHEDULE button stays enabled while the request is in flight, so repeated presses reach the server.

A larger `NGINX_READ_TIMEOUT` is a separate operational task, and it does not fix this. It moves the cliff. Any slow Jira response produces the same silent failure and the same duplicate tickets.

## What Changes

- Disable the SCHEDULE button while `POST /api/changerequest` is in flight. Show a pending state on the button, so that a long wait does not look like a frozen screen.
- Replace the `setAlert` wrapper in `AppProvider` with the stable `useState` setter. Memoize the context value object and the `clearValue` callback, so that the context identity stops changing on every render.
- Remove the `hasCreateChangeRequestTicketError` state and its effect from `EditConnection`. Call `setAlert` directly in the error branch, the way the existing 400 branch does.
- Open the alert snackbar on every stepper step, not only on IDENTIFY.
- Keep the user on the Schedule step after a 5xx response. The current code calls `router.push('/manageconnections')`, which discards the completed form before any message can register.
- Report a timeout as an unknown outcome, not as a failure. A 504 does not prove that the ticket failed. The message must tell the user to verify Manage Connections before a retry.
- Wrap the SCHEDULE button in a `span` inside its MUI `Tooltip`. MUI cannot attach listeners to a disabled child, and the console already reports this warning.
- Report whether the Jira ticket was created when the change request route fails, so that the console can tell a clean failure from an unknown one.
- Report a clean failure at once, with no confirmation wait. Report a ticket the route says it created at once as well, and tell the user not to retry.
- Remove the dead `finally` block in the change request route. It masked every Jira error with a null dereference.
- After a slow or failed response, look up the change request record before reporting anything. Report a confirmed success with the ticket when the record shows one.
- Report an unknown outcome only when that lookup cannot confirm the result within a bounded wait.
- Keep the unknown-outcome message on screen until the user dismisses it. Every other message keeps its current 6 second auto-hide.

No breaking changes.

## Capabilities

### New Capabilities

- `change-request-submission`: How the Configuration Console submits a change request and reports the outcome. This capability owns the rules that hold for every submit attempt: one ticket per confirmed submit, a visible outcome for every server response, no silent failure, and a safe message when the outcome is unknown. The existing specs cover authorization, audit, and release concerns only. None covers submit behavior.

### Modified Capabilities

None. No existing requirement changes.

## Impact

### Code

- `src/components/EditConnection/index.tsx` — in-flight state, error branch, snackbar gate, navigation on 5xx.
- `src/components/EditConnection/actionButtons.tsx` — disabled state and the Tooltip child wrapper.
- `src/contexts/app.tsx` — stable setter and memoized context value.
- `src/components/SnackBar/index.tsx` — optional auto-hide duration.
- `src/pages/api/changerequest/index.ts` — report whether the ticket was created, and remove the dead `finally` block.
- Jest tests for all five files.

### Risk

The `src/contexts/app.tsx` change touches `CombinedContext`, which 15 components consume. The change makes the context value stable rather than new on every render. This removes renders, so it must not alter behavior. Any component that depends on the current churn would change behavior, so the test run must cover the consumers.

### Security

This change does not affect auth, jurisdiction scoping, or encrypted fields. `handleSchedule` still posts `password` and `newPassword` in the request body, and `src/pages/api/changerequest/index.ts` still writes them through `EncryptedRepository`. This change does not touch that path.

### Out of scope

The following items are real, and this change does not address them:

- `NGINX_READ_TIMEOUT` in the APHL production environment. `run_and_monitor.sh:62` defaults to 60 seconds, and `iz-gateway-terraform/hub/console/ecs_task.tf:175` sets 180 seconds for the AWS environment. Production shows exactly 60 seconds, so the variable is probably unset there. This is an operational task with APHL, tracked on IGDD-3566.
- A server-side guard against a second open change request for one destination. The product answer is settled: a second open change request for one destination is not valid. The data model already assumes this, because `src/lib/db/dynamo.ts:825` derives the key from a hash of `destType` and `destId`, and its comment states the rule. `POST /api/changerequest` does not enforce it. The lookup needed for a guard already exists as `fetchDestinationChangeRequestByDestIdAndDestType`. The decision on when to build the guard waits until the client fix is verified in a deployed environment. Items in this change protect the client only. A second browser tab still defeats them. The record lookup added here informs the user, and the guard prevents the duplicate, so the guard is still needed.
- `src/lib/createchangerequestticket.ts:111`. The Jira fetch carries no `AbortSignal`, so the call can hang without limit. A server timeout shorter than the nginx timeout would turn a 504 into a clean error with a real message.
- `POST /api/destinationuri/validate` on the VERIFY step. It has the same timeout exposure, and it returned 504 during the first local reproduction.
- The record lookup does not survive an unmount. An SWR revalidation failure during the wait throws at `src/components/EditConnection/index.tsx:237`, the `ErrorBoundary` at `src/pages/edit/[...slug].tsx:22` replaces the screen, and the lookup then reports to a component that is gone. Leaving the page during the wait has the same effect. A fix means reporting from somewhere above the page, which is a design change rather than a patch.
- No request in the submit path carries an `AbortController` or a timeout. A stalled connection never settles, so the button stays disabled until the user reloads. The 90 second bound also limits iterations started rather than elapsed time, so a slow lookup can extend the wait past 150 seconds.
- The success branch trusts `response.ok` alone. The middleware answers a failed DPoP proof with a redirect that ends in a 200 HTML page, which reads as success. `src/lib/fetch.ts:19-23` already guards this for SWR callers. This submit uses a hand-rolled `fetch` and does not.
- `router.push` is not awaited on either success path, so the button re-enables for about 250 milliseconds before `NavigationLoader` draws its blocking overlay.
