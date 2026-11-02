## Why

The ratified role matrix ("Role Based Access Control for IZ Gateway", Confluence 1006043137,
version 13, 2026-11-02) puts three things in place that the Console does not yet reflect
([IGDD-3498]; [IGDD-3497] was closed as its duplicate on 2026-10-30):

- **IZG Support can reset the hub-wide circuit breakers and refresh the hub database.** Both are
  non-destructive, yet today a support engineer who spots a stuck circuit breaker must escalate to
  someone with full operations access. IGDD-3472 deliberately deferred this grant (IGDD-3486
  Finding #14) so its own change would only ever remove access. IZG Program already has it
  ([IGDD-3547], merged as #763).
- **IZG Security exists**, as a super-user tier holding every Console capability. The Okta group
  is named `IZG Security` ([IGDD-3600]), but the Console has no role for it.
- **IZG Operations loses the security-management permissions.** Version 13 split Access Control by
  tab. Compared with today, IZG Operations keeps everything on the matrix except:
  - changing Access Groups (viewing them stays);
  - Password Encryption, both the Admin Operations card and the standalone page;
  - approving a change request on Edit Connection.

  Today IZG Operations holds those only because no other role existed to hold them.
- **The standalone Password Encryption page is IZG Security only.** Today `/passwordencryption`
  admits anyone who can open Admin Operations (it shares that page's entry capability,
  `canViewAdminOperations`). A user without `canManagePasswordEncryption` gets the page with no
  action buttons, and its status request is refused with a `403` and an `AccessDenied` event. IZG
  Program already lands there since #763; IZG Support would after its grant, and IZG Operations
  after the narrowing.

## What Changes

The change ships as **one PR with two commits**. Commit A only adds access; commit B only removes
it. Either can be reviewed alone, and B can be reverted without touching A.

**Commit A — grants, the IZG Security role, dead-code removal**

- Grant `IZG Support` three `adminoperations` capabilities: `canViewAdminOperations` (to reach the
  page), `canResetHubCircuitBreakers` and `canRefreshHubDatabase`.
- Add `IZG Security` as a recognized role:
  - add it to `CcRole`, `ROLE_PRECEDENCE` and `GROUP_ROLE_MAPPING` (`'IZG Security'`, confirmed
    as the official group name; no `[CONFIRM]` marker);
  - add it to the `accesslevel` map and the access definitions index;
  - create `_IZGSecurityAccess.ts`: `globalTenancy: true`, and every flag on every page `true`,
    written out by name.
- Delete the `checkAdmin` middleware and its test. #763 removed its last two call sites (the
  status reset and refresh routes), so it is dead code. Agreed on [IGDD-3552] (comment 117678).
- Delete `src/lib/security/accessutils.ts` (`isOperationsRole`, `OPERATIONS_ROLES`). #763 moved its
  last reader onto `hasGlobalTenancy` and nothing imports it, so it affects no one; left in place it
  invites being mistaken for "is IZG staff".
- Rewrite the comments that this commit makes stale:
  - IZG Support's `accesscontrol`/`adminoperations` block (the "deferred" grant);
  - IZG Program's reference to that deferral;
  - IZG Operations' provisional comments, which say IZG Security "does not exist in this codebase
    yet" and that Support's Admin Log Search grant is deferred (IGDD-3170 already made it);
  - the `isAdmin` type comment in `next-auth.d.ts`, which points at `checkAdmin`;
  - the Admin Operations nav item (`menuItems.tsx`) and the Deny List and ADS File Types
    components, which say IZG Operations is the only holder.

**Commit B — narrow IZG Operations and close the Password Encryption page**

- In `_IZGOperationsAccess.ts`, set three flags from `true` to `false`:
  - `accesscontrol.canManageAccessGroups`
  - `adminoperations.canManagePasswordEncryption`
  - `edit.canApproveChangeRequest`
- Gate `/passwordencryption` on `adminoperations.canManagePasswordEncryption` instead of
  `canViewAdminOperations`:
  - `withPageAccess` gains an optional, type-checked entry-capability override for a page that
    shares another page's block but has a stricter entry rule;
  - `/passwordencryption` uses it; every other page is unchanged;
  - after B, only IZG Security holds `canManagePasswordEncryption`, so only IZG Security can open
    the page. Everyone else gets the standard in-place Access Denied page and one `AccessDenied`
    event, and the encryption status request is never made.
- Replace the PROVISIONAL comments on the `accesscontrol`, `adminoperations` and `edit` blocks
  with the version 13 rows they now implement. The `apikeys` and `api-doc` divergences stay, with
  their comments naming the owning tickets.
- Move every test that uses IZG Operations as the holder of those three capabilities onto
  IZG Security.

**Unchanged**

- IZG Operations' `apikeys.*` and `api-doc.canViewApiDoc`. The matrix removes both, but they are
  owned by [IGDD-3549] and [IGDD-3550].
- IZG Program's values.
- Every jurisdiction-tier role.
- `session.user.isAdmin` and its remaining readers (multi-environment API keys, deep health check
  detail), which stay on the `OPERATIONS_GROUP` axis until [IGDD-3552].

**Out of scope**

- Jurisdiction Security's matrix column, including its approve-change-request ✓ ([IGDD-3500]).
- Making `edit.canApproveChangeRequest` enforced ([IGDD-3545]). Until then commit B changes that
  flag in the data but nothing a user sees.
- The Hub's group-to-role mapping ([IGDD-3499]) and the Hub "Access Control Admin" matrix row,
  which version 13 did not split.
- Okta group creation and membership ([IGDD-3600]).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin-page-access`:
  - **"Seed values reproduce today's access exactly"** is superseded. Its premise, that the seeds
    match today's `isAdmin` access and no role gains anything, ends with this change. It becomes a
    requirement that the admin capabilities follow the version 13 matrix, with the per-role holders
    stated, including IZG Operations' view-all and manage-Deny-List/ADS-only position on Access
    Control.
  - **"Admin pages deny users who lack the entry capability"**: the scenario "The
    password-encryption page shares the Admin Operations capability" changes. The page still reads
    the `adminoperations` block (no page key of its own), but its entry capability is
    `canManagePasswordEncryption`. A user holding `canViewAdminOperations` without it is denied at
    the page.
  - **"Administrative API routes are gated by capability"** gains a scenario: a caller holding the
    capability is not refused for lacking `OPERATIONS_GROUP` membership, and no route uses
    `checkAdmin`.
  - **"The target role matrix is reconciled, not silently adopted"**: the "target holder does not
    exist" and "grants are deferred" scenarios no longer describe anything. They are replaced by
    one rule: every remaining divergence from the matrix is recorded at its role block with the
    ticket that owns it (`apikeys` and `api-doc` for IZG Operations).
- `multi-role-authorization`:
  - **"Only roles present in the access matrix may be resolved"** gains a scenario: the
    `IZG Security` Okta group resolves to the `IZG Security` role, which has a full matrix entry and
    global reach.
  - **"Existing single-role users retain their current access"** names its exceptions: IZG Support
    and IZG Operations change by ratified-matrix decision (IGDD-3498), not as a side effect of the
    multi-role model.

## Impact

- **Role data and vocabulary:**
  - `src/lib/security/accessdefinitions/_IZGSecurityAccess.ts` (new)
  - `src/lib/security/accessdefinitions/_IZGSupportAccess.ts`
  - `src/lib/security/accessdefinitions/_IZGOperationsAccess.ts` (A: comments; B: three flags)
  - `src/lib/security/accessdefinitions/_IZGProgramAccess.ts` (comment only)
  - `src/lib/security/accessdefinitions/index.ts`
  - `src/lib/security/accesslevel.ts`
  - `src/lib/security/rolemapping.ts`
- **Middleware:** `src/lib/api/api-middleware-helper.ts` (`checkAdmin` and its name-map entry
  removed); `src/next-auth.d.ts` (comment).
- **Page gate (B):** `src/lib/security/pageAccessGate.ts` (optional entry override);
  `src/pages/passwordencryption/index.tsx` (uses it); the comment on the `adminoperations` key in
  `src/lib/security/accesslevel.ts`.
- **Tests:**
  - `src/lib/security/__snapshots__/roleMatrixSnapshot.test.ts.snap`, regenerated in each commit.
    A: a new IZG Security column (all `YES`) and three IZG Support cells `—` → `YES`. B: three
    IZG Operations cells `YES` → `—`.
  - `src/lib/security/policy.test.ts`: A moves IZG Support out of `NON_OPERATIONS_ROLES` and adds
    IZG Support and IZG Security blocks; B makes the admin seed table per role, so IZG Operations
    is asserted to lack the two narrowed admin capabilities.
  - `src/lib/security/rolemapping.test.ts`: `IZG Security` group normalization.
  - `src/__tests__/pages/adminPageGates.test.ts`: the Admin Operations "denied user" case uses
    IZG Support, which now holds the entry capability (A).
  - `src/components/Navigation/menuItems.test.tsx`: IZG Support now sees the Admin Operations nav
    item; IZG Security sees every admin item (A).
  - `src/lib/api/api-middleware-helper.test.ts`: the `checkAdmin` denial test goes (A); the
    `rotatekey` "authorized caller" case moves from IZG Operations to IZG Security (B).
  - `e2e/tests/circuitBreakerReset.spec.ts`: comments asserting IZG Operations is the only holder
    (A).
  - `src/__tests__/pages/adminPageGates.test.ts` gains a `/passwordencryption` case (B): IZG
    Security allowed; IZG Support, IZG Program and IZG Operations denied with one `AccessDenied`
    event naming `adminoperations.canManagePasswordEncryption`; the page handler not run for a
    denied user.
  - `src/lib/security/accessregistry.test.ts` (or `pageAccessGate`'s own test): a guard that the
    entry override is used only by pages with no navigation link, so the nav predicate and the gate
    cannot disagree (B).
- **Users:**
  - A: IZG Support users get the Admin Operations nav item and page, with the reset and refresh
    cards. IZG Security members get every Console feature.
  - B: IZG Operations users who are not also in IZG Security lose editing Access Groups and
    Password Encryption. Approve change request has no reader yet, so nothing visible changes
    there. Every role except IZG Security gets Access Denied at `/passwordencryption`.
- **No change to** the Hub, Okta configuration, environment variables or infrastructure.
- **Release gate:** the PR must not merge until the Product Owner has signed off on who moves into
  IZG Security, those users are in the group, and the group's full membership has been reviewed
  (every member gains every Console capability). Pushing to develop deploys to dev (#757).

[IGDD-3497]: https://izgateway.atlassian.net/browse/IGDD-3497
[IGDD-3498]: https://izgateway.atlassian.net/browse/IGDD-3498
[IGDD-3499]: https://izgateway.atlassian.net/browse/IGDD-3499
[IGDD-3500]: https://izgateway.atlassian.net/browse/IGDD-3500
[IGDD-3545]: https://izgateway.atlassian.net/browse/IGDD-3545
[IGDD-3547]: https://izgateway.atlassian.net/browse/IGDD-3547
[IGDD-3549]: https://izgateway.atlassian.net/browse/IGDD-3549
[IGDD-3550]: https://izgateway.atlassian.net/browse/IGDD-3550
[IGDD-3552]: https://izgateway.atlassian.net/browse/IGDD-3552
[IGDD-3600]: https://izgateway.atlassian.net/browse/IGDD-3600
