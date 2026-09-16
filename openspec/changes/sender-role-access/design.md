## Context

`multi-role-permissions` (IGDD-3359) made the access matrix the single source of truth for
authorization: `can()`, `mergePageAccess()`, and every `/api/apikeys/*` route are generic over
`subject.roles`, and nothing hardcodes a role name outside `rolemapping.ts` and the
`accessdefinitions/*` files. That was the explicit reason this work was sequenced second — see
`multi-role-permissions/design.md`'s Non-Goals ("Adding a sender role. That is a separate change
that depends on this one") and Open Questions.

Two gaps exist today that are not authorization-logic gaps, verified by reading the current code
rather than assuming the older planning docs (`sender-roles-technical-plan.md`,
`sender-login-plan.md`, both written pre-refactor and referencing the now-deleted `roles.ts`):

1. **Two nav items have no gate at all.** `menuItems.tsx`'s "Manage Connections" and "Onboarding
   Senders" entries have `adminOnly: false` and no `isVisible`, so `Navigation/index.tsx`'s filter
   shows them to every authenticated user. Harmless while every recognized role is entitled to
   both pages; not harmless once `Sender Operations` exists.
2. **`/manageconnections`'s `getServerSideProps` has no capability check.** It verifies a session
   exists, then calls `fetchEndpointStatus(session.user.roles, session.user.jurisdictions)`,
   which filters by the raw `jurisdictions` claim for anyone who isn't IZG Operations/Support —
   with no check that any held role actually grants connections access. This was found and filed
   separately as a pre-existing bug (affects a zero-role account too), but it directly blocks this
   change's AC #2/#3: a `Sender Operations`-only user must not reach this page's data, not just
   have its nav entry hidden.

## Goals / Non-Goals

**Goals:**

- Add `Sender Operations` as a fully-specified role: recognized at ingestion, present in the
  access matrix, deny-by-default on every IIS page, scoped to the caller's own jurisdiction
  prefix by the tenancy mechanism that already exists.
- Close the two nav-visibility gaps and the `/manageconnections` capability gap using the same
  matrix-driven approach the rest of the system uses, not a role name check.
- Zero behavior change for the four existing roles — provable, not just asserted, the same
  standard `multi-role-permissions` held itself to.

**Non-Goals:**

- Changing `can()`, `mergePageAccess()`, `apiKeyAuthz.ts`, or any `/api/apikeys/*` route. These
  are already generic; a new role is data, not logic.
- Fixing the `/api/changerequest` half of the previously-filed reach-only-check bug
  (`changerequest-and-manageconnections-reach-only-bug.md`, Finding 1). That is a separate,
  pre-existing issue unrelated to whether `Sender Operations` exists, and is tracked on its own
  ticket.
- Okta tenant configuration (creating the group, assigning users, confirming the groups-claim
  filter reaches it). Tracked separately with the Okta administrator; code references the group
  name via `GROUP_ROLE_MAPPING`, not inline.
- A "Support" tier for senders. The ticket's own decision record calls for one role now, extensible
  later without rework — `GROUP_ROLE_MAPPING`'s many-to-one shape already supports adding
  `Sender Support` later as a pure data change.
- Sender self-service domain verification (`/api/apikeys/verify-domain`). Full-lifecycle
  permissions (see below) include `canCreateApiKey`, which is what gates that route today, but no
  UI or workflow change for domain verification is in scope here — it inherits whatever the
  existing API Key Management UI does for any role holding that permission.

## Decisions

### Full API-key lifecycle, not List-only or List+Renew

**Chosen:** `Sender Operations` gets all five `apikeys` flags — `canListApiKeys`,
`canCreateApiKey`, `canRevokeApiKey`, `canRenewApiKey`, `canCancelApiKey` — identical in shape to
`Jurisdiction Operations`, differing only in `globalTenancy: false` scoping it to the caller's own
prefix.

**Alternatives considered:** the ticket left this as an open team decision with three options
(List only; List+Renew; full lifecycle) and recommended starting narrow ("narrowing later is a
permission removal from users who already have it"). Full lifecycle was chosen instead: a sender
managing their own organization's credentials — creating a new key, revoking a compromised one,
cancelling one no longer needed — is ordinary self-service, and every one of those actions is
already scoped to the caller's own jurisdiction by the same `can()` check `Jurisdiction
Operations` goes through today. There is no additional capability being invented; the ceiling is
already enforced by tenancy, not by which of the five flags are set.

**Consequence:** the AC #4 test surface is the full five-route matrix (create/revoke/renew/cancel
all 403 outside the sender's own jurisdiction, not just list), mirroring the existing
`Jurisdiction Operations` coverage in `lifecycle.test.ts` rather than a narrower subset.

### Nav and page visibility become matrix data, not a role check

**Chosen:** add `canViewConnections: boolean` to `ManageConnectionsPageAccessControl`, and a new
minimal `onboarding: { canViewOnboarding: boolean }` block added to `PageControls`. Set `true` on
all four existing roles, `false` on `Sender Operations`.

**Alternative considered:** a lightweight `isVisible: (roles) => !roles.includes('Sender
Operations')` predicate, style-matched to `isOperationsRole`. Rejected: `multi-role-permissions/
design.md` specifically called out that `isOperationsRole` is an *affordance* predicate kept
deliberately separate from matrix data, and that pattern exists for cases where the concept truly
isn't matrix-shaped. Nav/page visibility is exactly the shape the matrix already models — it is
what `canListApiKeys` already gates the API Key Management nav entry on. Using a role-name
denylist here would be the one nav item styled differently from the rest for no structural reason,
and it silently fails to extend if a second sender-shaped role is added later (a new role would
default to visible unless someone remembers to update every denylist predicate, whereas a new
role in the matrix defaults every new flag to `false` under the required-key `PageControls` type —
the compiler forces the choice).

**Consequence:** `PageControls` being a required-key type means adding `onboarding` forces an
edit to all four existing role files, not just the new one. That edit is mechanical
(`onboarding: { canViewOnboarding: true }`) and is exactly what makes "no behavior change for
existing roles" a compiler-checked fact rather than a claim.

### Close the `/manageconnections` capability gap as part of this change, not the filed bug ticket

**Chosen:** `getServerSideProps` checks `canViewConnections` (via `subjectOf` + `mergePageAccess`,
the same primitives `useRoleAccess` uses) before calling `fetchEndpointStatus`, redirecting
otherwise.

**Alternative considered:** ship only the nav-level hide, matching the older `sender-login-plan.md`
Step 2 verbatim, and leave the page-level fix entirely to the separately filed bug. Rejected:
AC #3 says a sender "sees only credentials whose jurisdiction resolves to their own prefix, and no
credentials belonging to any other organization or IIS jurisdiction" for API Key Management, and
the parallel expectation for Manage Connections (AC #2, read together with the filed bug's own
Finding 2) is that a sender reaching the page directly — nav is discoverability only, never a
boundary — should not see IIS connection data. Nav-only gating would leave that boundary
unenforced for the one new case this change introduces. The `/api/changerequest` half of the
filed bug is unrelated to whether `Sender Operations` exists (it is broken for `Jurisdiction
Support` too, today) and stays out of scope here.

**Consequence:** this change incidentally closes Finding 2 of
`changerequest-and-manageconnections-reach-only-bug.md` (the `manageconnections` half) as a
side effect. That bug ticket should be updated to reflect Finding 2 as resolved once this ships,
leaving only Finding 1 (`/api/changerequest`) open.

## Risks / Trade-offs

- **A sender is granted full apikeys lifecycle, a larger surface than the ticket's own
  recommended starting point** → mitigated by tenancy scoping being identical to `Jurisdiction
  Operations`'s existing, already-tested enforcement; no new capability class is introduced.
- **`PageControls` required-key type forces touching all four existing role files** → mechanical,
  additive-only (`true` for existing roles), and the compiler is what guarantees no role is missed
  — this is the same trade-off `multi-role-permissions` already accepted for `globalTenancy`.
- **IGDD-3258 (sender DynamoDB seeding) is still in progress** → does not block this change's code
  or automated tests, which exercise `policy.ts` directly with `AuthzSubject` literals and need no
  seeded data. It does block true end-to-end manual verification with a real sender prefix; the
  test plan will note this as a dependency for the manual-verification session rather than for
  code sign-off.
- **Exact Okta group string for `Sender Operations` is unconfirmed** → code references it via a
  single `GROUP_ROLE_MAPPING` entry; `normalizeGroupName` (from `multi-role-permissions`) already
  makes the mapping tolerant of capitalization/punctuation choices, so confirming the exact string
  with the Okta administrator is a follow-up that does not block writing or testing this change.
- **A sender being placed in a second Okta group unintentionally (e.g. also `IZG Support`)** →
  already covered by the escalation guard `multi-role-permissions` built and tested
  (`policy.test.ts`'s named regression case); this change adds the mirror-image test case with
  `Sender Operations` as the scoped role to confirm the guard generalizes to the new role rather
  than assuming it.

## Migration Plan

1. Deploy. No Okta change is required for the deploy itself — the code changes are inert until an
   Okta group is mapped to `Sender Operations` and a user is assigned to it.
2. No data migration; no API contract change. Existing sessions are unaffected — the four existing
   roles gain two new `true`-valued flags they were already implicitly entitled to.
3. Once the Okta administrator creates and assigns the group (tracked separately), the pilot
   sender's sign-in is verified against this change's test plan.
4. **Rollback** is a straight revert: no persisted state changes shape, and a reverted deploy
   simply removes the `Sender Operations` matrix entry, which is the only thing keeping a user in
   that Okta group from getting `roles: []` (fail-closed, same as any unmapped group today).

## Open Questions

- Should the `manageconnections`/`onboarding` visibility flags be introduced now for all four
  existing roles set to `true`, or is there a nearer-term reason one of the four should actually
  be `false` for one of them (e.g. should `Jurisdiction Support` really see "Onboarding Senders"
  today)? Out of scope to relitigate here — current recommendation is `true` for all four,
  preserving today's actual behavior exactly, and revisiting that as its own decision if raised.
- Exact Okta group string — **[CONFIRM with Okta admin]**, per `sender-roles-technical-plan.md`
  Part 2.
