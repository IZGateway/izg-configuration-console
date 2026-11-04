# Proposal

## Why

An IZG Support user cannot add a sender. The destination list shows "Internal server
error" in the Onboarding Add Sender dialog and in the Console destination picker, because
`GET /api/destinations` returns a 500. Two independent defects cause it: the route decides
the caller's row reach from an Okta group instead of the role matrix, and the database
layer builds an invalid DynamoDB filter when the jurisdiction list is empty.

Tracked as IGDD-3542. The failure is pre-existing and reproduces on `develop`.

## What Changes

- **Reach comes from the role matrix.** `src/pages/api/destinations/index.ts:26` stops
  reading `session.user.isAdmin` and asks `hasGlobalTenancy` instead
  (`src/lib/security/policy.ts:144`). `isAdmin` means only "is this user in the
  `OPERATIONS_GROUP` Okta group", which selects IZG Operations alone. IZG Support declares
  `globalTenancy: true` (`src/lib/security/accessdefinitions/_IZGSupportAccess.ts:29`) but
  is not in that group, so the route filtered it by a jurisdiction claim it does not hold.
- **An empty jurisdiction list fails closed.** `fetchLoggedInUsersDestinations`
  (`src/lib/db/dynamo.ts:584-607`) returns an empty array and runs no query when a
  non-global caller has no jurisdictions. Today the filter loop never runs, the expression
  becomes `destId IN )`, and DynamoDB rejects it. The session callback already defaults the
  claim to `[]` so that a scoped role with no jurisdictions fails closed
  (`src/pages/api/auth/[...nextauth].ts:118-121`). This change makes the database layer
  honour that intent.
- **A test covers the empty-jurisdiction case**, which is the input that produces the
  malformed expression.
- **Conformance, not a grant.** This widens IZG Support from jurisdiction-scoped to global
  on `/api/destinations`. No API response shape changes and no client changes. The target
  RBAC matrix already specifies this reach: the `CC | Tenancy — Reach` row gives IZG Support
  the value `All` ([Role Based Access Control for IZ
  Gateway](https://izgateway.atlassian.net/wiki/spaces/IGDD/pages/1006043137), version 7,
  2026-09-24). The code matrix already agrees, and the archived `admin-page-access` spec
  asserts that the two match in its scenario "Tenancy reach already agrees". Only this route
  disagreed. Open Decision 1 in
  `openspec/changes/archive/2026-09-30-admin-page-authorization/design.md:417-434` was
  raised before that row was confirmed. One caveat remains: the row's enforcement column
  reads "Per Anusha's notes" rather than a ratified state, so the row's authority needs a
  one-line confirmation. See `design.md` Risks.

## Capabilities

### New Capabilities

- `jurisdiction-row-scoping`: which rows a jurisdiction-filtered data read returns, given
  the caller's tenancy reach. It covers where reach comes from, what an empty reach returns,
  and that the answer fails closed. Originally `/api/destinations` only; PR #729 review
  extended it to `GET /api/allowedusers` — see "Scope expansion: PR #729 review" below.
- `onboarding-sender-write-authorization`: which roles may mutate the onboarding sender
  list, as distinct from viewing it, and — after PR #729 review — which destination's
  senders a write-capable role may mutate. Folded in from IGDD-3546 — see "Scope expansion"
  above.

### Modified Capabilities

None.

`multi-role-authorization` already requires that global jurisdiction reach is declared per
role in the access matrix. A route that reads an Okta group instead violates that
requirement. It does not change it. This change brings the route into conformance, so no
delta spec is needed there.

## Impact

Affected code:

- `src/pages/api/destinations/index.ts` — the reach decision.
- `src/lib/db/dynamo.ts` — `fetchLoggedInUsersDestinations`, the empty-list guard.
- `src/lib/db/` — one new `@jest-environment node` test file.
  `dynamo.upsertAllowedUser.test.ts` is the working template.

Affected surfaces. Both consumers call the same endpoint, so both acceptance criteria have
one root cause:

- `src/components/DestinationSelector/index.tsx:78` — the Onboarding Add Sender selector.
- `src/components/Console/index.tsx:173` — the Console destination picker.

Security-sensitive notes:

- This is jurisdiction scoping on a read path. The row filter decides which jurisdictions'
  destinations a caller sees.
- No encrypted field handling changes. `DbClientFactory` still decrypts destination
  passwords on the way out.

## Scope expansion: IGDD-3546 folded in (2026-10-12)

While confirming defect 2's access grant, we found that IGDD-3471 ("Controlled read/write
access to onboarding senders") was closed as a duplicate of IGDD-3472, but IGDD-3472's own
design doc (Decision 14) explicitly deferred the view/mutate split it asks for — it closed
only the "any signed-in user can write" hole, not the "view-only roles can still write"
narrowing. IGDD-3546 is the open backlog ticket tracking that narrowing. The team decided
to fold it into IGDD-3542 rather than file it as a follow-up, since both land on the same
onboarding authorization surface.

Added, beyond the original defect-1/defect-2 fix:

- A new `onboarding.canManageSenders` capability, separate from `canViewOnboarding`.
  Granted to IZG Operations and Jurisdiction Operations only; IZG Support, Jurisdiction
  Support and Sender Operations remain view-only (or no access, for Sender Operations).
  Confirmed with the user rather than guessed, per IGDD-3546's own instruction not to
  guess this value — the split matches the Operations/Support pattern used by every other
  page in the matrix with no exceptions.
- `src/pages/api/allowedusers/index.ts` now declares capability per method: GET requires
  `canViewOnboarding`, POST/DELETE require `canManageSenders`. The two sibling read-only
  routes (`bydestination`, `allowedusersaudit`) keep their single `canViewOnboarding`
  declaration — they never served a write method, so there was nothing to split.
- The three `coarse-capability` rows in `authzDebt.ts` are deleted, and the `kind` itself
  is removed since nothing uses it anymore.
- The Onboarding UI (`src/components/Onboarding/index.tsx`,
  `src/components/Onboarding/StatusPromoteDemote.tsx`) hides add, edit, connect/disconnect,
  promote/demote and delete controls for a caller who lacks `canManageSenders`, via
  `useRoleAccess('onboarding')`. Render-on-true, consistent with the rest of the codebase,
  so a permission still loading fails closed. The connect/disconnect (wifi) toggle is
  hidden alongside the five controls IGDD-3546 names explicitly — it mutates the same
  `enabled` field via the same POST endpoint, so leaving it visible for a view-only role
  would be a dead button that 403s instead of a true view-only experience.

## Scope expansion: PR #729 review (2026-10-13)

Human review on #729 found two 🔴 Blocking gaps in the IGDD-3546 fold-in: `canManageSenders`
split *who* may write, but nothing restricted *which* jurisdiction's rows GET returned or
POST/DELETE could touch. The design had deferred exactly this to IGDD-3552 (see design.md
Non-Goals); the reviewer's Blocking severity overrides that deferral. Folded in rather than
raised as a separate PR, since fixing it touches the same route this change already modifies.

Added, beyond the IGDD-3546 fold-in above:

- `GET /api/allowedusers` now row-scopes by the caller's jurisdiction, via
  `fetchAllowedUsersByDestination(hasGlobalTenancy(subject), subject.jurisdictions)` instead
  of the unfiltered `fetchAllowedUsers()` (deleted — it had no other caller after this
  change, including its declaration in `ConfigConsoleFetchRepository.ts` and
  `DbClientFactory.ts`).
- `POST`/`DELETE /api/allowedusers` each call `hasAccessToDestId(body.destinationId,
  session)` before writing, returning 403 with a `logAccessDenied` audit entry if the
  destination is outside the caller's reach.
- `fetchAllowedUsersByDestination` (`src/lib/db/dynamo.ts`) gets the same
  empty-jurisdiction fail-closed guard added to `fetchLoggedInUsersDestinations` for
  defect 2, rather than being left for IGDD-3552. Covered by the new
  `dynamo.allowedUsersByDestination.test.ts`.
- `src/pages/api/allowedusers/bydestination/index.ts` and `src/pages/onboarding/index.tsx`
  switch from `isOperationsRole` to `hasGlobalTenancy`, matching defect 1's fix on
  `/api/destinations` — flagged by the same reviewer as an inconsistency that could silently
  diverge if a future role needed one axis but not the other.
- A new `split-decision` row in `authzDebt.ts` for `allowedusers/index.ts`, naming the
  residual risk that the capability check (`canManageSenders`, unioned across held roles by
  the route declaration) and the reach check (`hasAccessToDestId`, which also unions across
  held roles) are each correct alone but can combine across two different roles. Same shape
  as the existing `changerequest/index.ts` row; not solved with a same-role check in this
  pass, consistent with how that precedent was handled.

Out of scope, recorded here so it is not lost:

- **The `isAdmin` parameter name stays.** The parameter keeps its name through
  `ConfigConsoleFetchRepository.ts:19`, `DbClientFactory.ts:280` and `dynamo.ts:584`.
  IGDD-3552 owns that rename and states that IGDD-3542 lands first to avoid a collision.
  This change alters only the value the route passes, plus the guard inside `dynamo.ts`.

Formerly out of scope, brought in by PR #729 review (2026-10-13) — see "Scope expansion:
PR #729 review" below:

- **The sibling read no longer fails open.** `fetchAllowedUsersByDestination`
  (`src/lib/db/dynamo.ts:2510`) used to test `isAdmin || destinations.length === 0` and then
  run an unfiltered query, so a non-global caller with no jurisdictions received every row —
  the opposite of the behaviour this change requires elsewhere. This was deferred to
  IGDD-3552 in the original proposal; a human reviewer on #729 marked it Blocking once
  `GET /api/allowedusers` started calling this same function directly and Jurisdiction
  Operations gained write access through it. It now has the same empty-jurisdiction
  fail-closed guard as `fetchLoggedInUsersDestinations`.
- **The onboarding write path is now scoped by jurisdiction, not just by capability.**
  `POST`/`DELETE /api/allowedusers` check `hasAccessToDestId(body.destinationId, session)`
  before writing. Previously `canManageSenders` answered only *who* may write; a
  Jurisdiction Operations caller could write any jurisdiction's senders, not just its own.
  See the "Scope expansion: PR #729 review" section below for the residual
  union-across-roles risk this reintroduces, recorded as a `split-decision` row in
  `authzDebt.ts` rather than solved with a same-role check in this pass.
