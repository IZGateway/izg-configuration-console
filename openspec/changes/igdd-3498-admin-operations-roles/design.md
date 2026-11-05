## Context

IGDD-3472 (`openspec/changes/archive/2026-09-30-admin-page-authorization/`) put every admin
surface on the role matrix and seeded the values to reproduce today's `isAdmin` access exactly.
So IZG Operations, the only role in `OPERATIONS_GROUP`, holds every admin capability. Each
divergence from the target matrix is marked PROVISIONAL at its role block.

IGDD-3547 (#763, merged as `d09ec17`) then:

- added IZG Program, holding the three Admin Operations capabilities;
- removed `checkAdmin` from `POST /api/status/reset` and `POST /api/status/refresh`, leaving each
  route gated by its capability alone (comments at `reset/index.ts:136`, `refresh/index.ts:80`);
- moved `fetchEndpointStatus.ts` from `isOperationsRole` to `hasGlobalTenancy`.

The target matrix is Confluence 1006043137 **version 13** (2026-11-02). It differs from v11 only
in the CC Access Control rows, now split per tab:

| CC row | IZG Security | IZG Operations | Every other role |
|---|---|---|---|
| view / write Access Groups | ✓ / ✓ | ✓ / — | — |
| view / write Deny List | ✓ / ✓ | ✓ / ✓ | — |
| view / write ADS File Types | ✓ / ✓ | ✓ / ✓ | — |

Where the IZG-tier roles stand on develop, against v13:

| Role | Today (develop) | After commit A | After commit B |
|---|---|---|---|
| IZG Security | No role | Every flag, global | Unchanged |
| IZG Operations | Every admin flag; all `edit`, `apikeys`, `api-doc` | Unchanged | Loses `canManageAccessGroups`, `canManagePasswordEncryption`, `canApproveChangeRequest`; denied at `/passwordencryption` |
| IZG Support | `adminoperations` all false (deferred, Finding #14) | Gains view page + hub-wide reset + refresh; per-connection reset, maintenance scheduling, change request Jira link | Denied at `/passwordencryption` |
| IZG Program | Has the three Admin Operations capabilities | Unchanged | Denied at `/passwordencryption` |

IZG Operations versus v13, row by row: apart from the three flags above, the only CC rows where
IZG Operations holds more than the matrix gives are API Key Management (IGDD-3549) and Swagger
API Doc (IGDD-3550). Every other IZG Operations value already matches.

The Console has one view flag for all three Access Control tabs (`canViewAccessControl`) and a
separate manage flag per tab, each enforced:

- routes: `accessgroups/index.ts:111` (POST), `accessgroups/[sortKey].ts:179-180` (PUT, DELETE)
  require `canManageAccessGroups`; the deny list and ADS file type routes require theirs;
- UI: `AccessGroups.tsx:248, 348` render the edit controls only on `canManageAccessGroups`.

So version 13 needs no new capability, only data.

The standalone Password Encryption page is the exception, because it is gated on the wrong flag.
`pages/passwordencryption/index.tsx:30` calls `withPageAccess('adminoperations')`, whose entry
capability is `PAGE_ENTRY.adminoperations` = `canViewAdminOperations`. It shares that page key by
design: it renders the same `PasswordEncryptionConsole` card as Admin Operations. So anyone who can
open Admin Operations can open `/passwordencryption`. Without `canManagePasswordEncryption` they
get the descriptive cards and no buttons, and the card's on-mount fetch of `/api/encryptionStatus`
is refused with a `403` and an `AccessDenied` event. There is no nav link to the page. The matrix
row "Password Encryption (standalone page)" is IZG Security only, and the team decided on
2026-11-02 that no other role may open it.

## Goals / Non-Goals

**Goals:**

- The Console's IZG Security, IZG Operations and IZG Support values match version 13, except
  where another ticket owns the row.
- A reviewer can see the grants and the removals separately: one PR, commit A only adds access,
  commit B only removes it.
- No IZG Operations user loses access they still need: the people who use the removed features are
  moved into IZG Security as part of the rollout, coordinated outside this PR.
- Only IZG Security can open `/passwordencryption`.

**Non-Goals:**

- IZG Operations' `apikeys` (IGDD-3549) and `api-doc` (IGDD-3550).
- Enforcing `edit.canApproveChangeRequest` (IGDD-3545).
- Jurisdiction Security (IGDD-3500), IZG Program's values (IGDD-3547), CDC roles.
- Removing `session.user.isAdmin` or its remaining readers (IGDD-3552).
- The Hub (IGDD-3499) and Okta (IGDD-3600).

## Decisions

### 1. One PR, two commits, split by the direction of the access change

| | Commit A | Commit B |
|---|---|---|
| Access | Only grants | Only removes |
| Data | Support +6, new IZG Security | Ops −3 |
| Code | Delete `checkAdmin` (dead) | `ROUTE_ENTRY` registry row; `/passwordencryption` gates on it |
| Comments | Support, Program, Ops "role does not exist yet" | Ops `accesscontrol` / `adminoperations` / `edit` rewritten to v13; `accesslevel.ts` `adminoperations` key |
| Tests | Snapshot, policy, rolemapping, adminPageGates, middleware `checkAdmin` test | Snapshot, policy seed table, middleware `rotatekey` holder, `/passwordencryption` gate, `ROUTE_ENTRY` invariants |

The page gate belongs in B because it only removes access (from IZG Program today, and from
IZG Support and IZG Operations once they would otherwise reach the page). Between A and B on the
branch, IZG Support can open the inert page. That state is never deployed, because the commits
merge together.

Each commit passes the test suite on its own, and each regenerates the role matrix snapshot, so
the snapshot diff in each commit shows exactly that commit's access change.

*Why not one commit:* the snapshot diff would mix new `YES` and removed `YES` cells, and reverting
the narrowing would also revert the Support grant.

*Why not two PRs:* the team prefers one review. The grants and the narrowing ship together; the
group membership work that the narrowing depends on is handled in the rollout (see Migration Plan).

### 2. Grant IZG Support through its role data (A)

Set `canViewAdminOperations`, `canResetHubCircuitBreakers` and `canRefreshHubDatabase` to `true`
in `_IZGSupportAccess.ts`, keeping the `...defaultAdminOperationsPageAccessControl` spread so
`canManagePasswordEncryption` stays `false`. `accesscontrol` stays at defaults.

Also set the three other cells matrix v13 gives IZG Support, added in review (PR #767):
`manageconnections.canResetCircuitBreaker`, `manageconnections.canScheduleMaintainance` and
`changerequest.canViewJiraTicket`. The per-connection reset fits the same reason as the hub-wide one:
a support engineer should not have to escalate to clear a stuck breaker. The reset route decides
per role with `can()` for the destination, and the maintenance route declares its capability plus
`checkAccessToDestIdSlug`. IZG Support is global, so it reaches every destination on both.

No route changes: both status routes already require only their capability.

*Alternative considered:* mapping the `IZG Support` group to `IZG Operations` in
`GROUP_ROLE_MAPPING`. Rejected: it would hand Support every Operations capability.

### 3. Add IZG Security with every Console capability, written out flag by flag (A)

The matrix's IZG Security column has a ✓ on every CC row and Reach = All. The new
`_IZGSecurityAccess.ts`:

- sets `globalTenancy: true`;
- spreads each page's `default…PageAccessControl` (all `false`), then sets every flag that exists
  today to `true` by name, across all eleven page blocks;
- follows `_IZGProgramAccess.ts` (IGDD-3547): no `as` assertion on any block, so the `RoleAccess`
  annotation's excess-property check makes a mistyped flag fail to compile on every page.

Plumbing, the same edits IGDD-3547 made for IZG Program:

- `CcRole` gets `'IZG Security'`.
- `ROLE_PRECEDENCE` gets it first, matching the matrix's column order. Precedence is presentation
  order and `Decision.grantedBy` tie-breaking only, not privilege.
- `GROUP_ROLE_MAPPING` gets `'IZG Security': ['IZG Security']`. The name is confirmed as official,
  so unlike `IZG Program` it carries no `[CONFIRM]` marker.
- The `accesslevel` map and `accessdefinitions/index.ts` register the file.

The existing drift tests cover the new role automatically: registry drift, block shape, the
tenancy invariant over `REQUIRES_GLOBAL_TENANCY`, and `PAGE_ENTRY` presence.

*Alternatives considered:*

- **Spread `_IZGOperationsAccess.ts` and override.** Rejected. Commit B would then silently narrow
  IZG Security too.
- **Compute "every flag true" from the defaults.** Rejected. A capability added later would be
  granted to IZG Security without anyone deciding to. Spreading the defaults keeps a new flag
  `false` until someone sets it, the same deny-by-default as every other role.

### 4. Narrow IZG Operations in its role data (B)

In `_IZGOperationsAccess.ts`, set to `false`:

- `accesscontrol.canManageAccessGroups`
- `adminoperations.canManagePasswordEncryption`
- `edit.canApproveChangeRequest`

`canViewAccessControl`, `canManageDenyList`, `canManageAdsFileTypes` and the other three
`adminoperations` flags stay `true`.

What a user holding only IZG Operations sees after B:

- **Access Control:** all three tabs render; the Access Groups add/edit/delete controls are
  absent; the Access Groups write routes return `403`. Deny List and ADS File Types are unchanged.
- **Admin Operations:** the Password Encryption card is absent (`AdminOperations/index.tsx:76`);
  the reset and refresh cards stay. The three encryption routes return `403`, and
  `/passwordencryption` renders Access Denied (Decision 5).
- **Edit Connection:** nothing visible changes, because nothing reads
  `edit.canApproveChangeRequest` yet (`authzDebt.ts:263`, "Not enforced"). IGDD-3545 makes it
  matter.

The PROVISIONAL comments on the `accesscontrol`, `adminoperations` and `edit` blocks are replaced
with the v13 rows the values now implement. The comments on `apikeys` and `api-doc` are reworded to
name IGDD-3549 and IGDD-3550 as the owners of those remaining divergences.

### 5. Gate `/passwordencryption` on `canManagePasswordEncryption` through a registry route entry (B)

`accessregistry.ts` gains `ROUTE_ENTRY`, a table of routes that share another page's block but have
a stricter entry capability, beside `PAGE_ENTRY`:

```ts
export const ROUTE_ENTRY = {
  passwordencryption: { page: 'adminoperations', capability: 'canManagePasswordEncryption' },
} as const satisfies Record<string, CapabilityRef>

export type GatedRoute = PageKey | keyof typeof ROUTE_ENTRY
```

`entryCapabilityOf(key: GatedRoute)` returns the `ROUTE_ENTRY` row if there is one, else
`{ page: key, capability: PAGE_ENTRY[key] }`. Both `withPageAccess` and `canEnterPage` take a
`GatedRoute` and call it. Everything else in the gate is unchanged: the per-role tenancy guard in
`decideCapability`, the in-place `accessDenied` prop, the sign-in redirect, and the `AccessDenied`
event, whose `page` is `passwordencryption` and whose `permission` is
`adminoperations.canManagePasswordEncryption`. The page becomes:

```ts
export const getServerSideProps = withPageAccess<'passwordencryption', { hasKeyName: boolean }>(
  'passwordencryption',
  async () => ({ props: { hasKeyName: … } })
)
```

What this gives:

- Only IZG Security holds `canManagePasswordEncryption` after B, so only IZG Security opens the
  page. Everyone else gets the standard Access Denied page and one audit event.
- The page handler, and with it `PasswordEncryptionConsole` and its `/api/encryptionStatus` fetch,
  never runs for a denied user. The repeated `403` disappears.
- The page keeps sharing the `adminoperations` block, so the card on Admin Operations and the
  standalone page still read one flag. The three encryption routes are unchanged.
- A typo in the row fails to compile (`satisfies Record<string, CapabilityRef>`), and so does an
  unknown key passed to `withPageAccess` or `canEnterPage`.

**The nav invariant.** The page gate and the nav predicate (`canEnterPage`) must not disagree.
Because the override is registry data that both read, `canEnterPage('passwordencryption', roles)`
returns what the page gate decides, so a future nav link to the page would render for exactly the
roles the page admits. No link-search test is needed. Tests assert that no `ROUTE_ENTRY` key
shadows a `PAGE_ENTRY` key, that each key derives from its own route, and that each key's page
gates on that key.

*First version, replaced in review (PR #767):* an optional `{ entry }` argument to
`withPageAccess`, typed against the page's block. `canEnterPage` could not see it, so it reported
`/passwordencryption` as enterable by every Admin Operations role. A static source-search test
guarded against anyone linking to it, but it could miss real links and match non-links.

The existing registry coverage tests keep working unchanged, because they find gated pages by the
string `withPageAccess`.

*Alternatives considered:*

- **Give the page its own page key (`passwordencryption`) and block.** Rejected. It adds a twelfth
  block to every role file. `canManagePasswordEncryption` would then either be duplicated on two
  blocks that must always agree, or move off `adminoperations`, re-pointing the Admin Operations
  card and the three encryption routes. That is the duplication the original "shares this block"
  decision avoided, at several times the size.
- **Check the flag inside the page handler.** Rejected. A second denial path beside the gate would
  need its own audit call, and the registry tests could not see it.
- **Leave it, since the page has no buttons for non-holders.** Rejected by the team: no role other
  than IZG Security may open it.

### 6. Delete the `checkAdmin` middleware, keep `isAdmin` on the session (A)

#763 removed `checkAdmin`'s last two callers. Remove the function
(`api-middleware-helper.ts:212`), its entry in the `withMiddleware` name map (`:387`) and its test
(`api-middleware-helper.test.ts:60`). Leaving an unused authorization primitive behind invites
someone to reattach it. Agreed on IGDD-3552 (comment 117678).

`session.user.isAdmin` stays for its remaining readers (`apikeys/index.ts:90`,
`apikeys/domains.ts:50`, `ApiKeyManagement/index.tsx`, `deephealthcheck/index.ts:77`). Reword its
type comment (`next-auth.d.ts:21`) and the reference in `deephealthcheck/index.ts:70`, which both
point at `checkAdmin`.

### 7. Delete `accessutils.ts` (`isOperationsRole`, `OPERATIONS_ROLES`, `MATRIX_ROLES`) (A)

The earlier draft added IZG Security to `OPERATIONS_ROLES` for hub status row scoping. #763 moved
that reader onto `hasGlobalTenancy`, and `allowedusers/bydestination` had already moved. Nothing
imports `accessutils.ts` any more, not even a test. Left in place it would list only IZG Operations
and IZG Support under a docblock naming callers that no longer use it, inviting someone to read it
as "is IZG staff". Deleting it changes no one's access. Raised in review.

### 8. Tests follow the holder, not the role name

Several tests use IZG Operations as "a role that holds capability X" and IZG Support as "a role that
lacks it". Where this change moves X, the test moves to a role that still has the property, rather
than being deleted:

| Test | Today | Change |
|---|---|---|
| `adminPageGates.test.ts` Admin Operations denied case | IZG Support | Jurisdiction Support (A) |
| `policy.test.ts` `NON_OPERATIONS_ROLES` "holds no new admin capability" | includes IZG Support | Support moves to an explicit per-flag block (A) |
| `policy.test.ts` "IZG Operations holds $page.$capability" over `ADMIN_CAPABILITIES` | all ten | becomes an IZG Security table over all ten, plus an IZG Operations table that asserts the two narrowed admin flags are denied (B) |
| `api-middleware-helper.test.ts` `rotatekey` authorized caller | IZG Operations | IZG Security (B) |
| `policy.test.ts` role-local guard tests on `canViewAccessControl` | IZG Operations holds it | No change: IZG Operations keeps it |

New assertions:

- IZG Security holds every flag and is global; `normalizeGroupName` maps `IZG Security`,
  `izg-security` and `IZG_SECURITY` to the role (A).
- `/passwordencryption` in `adminPageGates.test.ts` (B): IZG Security is allowed and the handler's
  props are returned; IZG Support, IZG Program and IZG Operations are each denied in place with
  exactly one `AccessDenied` event carrying `adminoperations.canManagePasswordEncryption`; the
  handler does not run for them; an unauthenticated request still redirects to sign-in with no
  event.
- The `ROUTE_ENTRY` invariants (B): no key shadows a `PAGE_ENTRY` key, each key derives from its
  own route and its page gates on that key, and `canEnterPage` applies the row.

### 9. No tenancy guard, no Hub change

- `adminoperations.*` stays out of `REQUIRES_GLOBAL_TENANCY`; every holder is global anyway.
  IZG Security is global, so it satisfies the guard on the four `accesscontrol` flags itself.
- The Console calls the Hub with its own mTLS certificate, not the user's identity, so the Hub never
  sees which Console role pressed a button.

## Risks / Trade-offs

- **[An IZG Operations user who edits Access Groups or uses Password Encryption is not in
  IZG Security when the change is deployed]** → They lose that access. Mitigations: the group
  membership step in the Migration Plan; commit B reverts on its own. The code deliberately does not detect an
  empty group: it cannot see group membership, and a fallback that restored IZG Operations'
  permissions would silently undo the narrowing.
- **[The `IZG Security` Okta group already has members]** → They gain every Console capability and
  global reach at their next session callback. For anyone also in IZG Operations, the role credited
  in `Decision.grantedBy` changes to IZG Security. Mitigation: membership is reviewed in each
  environment as part of the rollout.
- **[IZG Security is less than a full superuser]** → A member who is not also in
  `OPERATIONS_GROUP` does not get multi-environment API key create or the full deep health check
  detail until IGDD-3552. Say so in the PR. The ticket lists this dependency.
- **[Someone bookmarked `/passwordencryption` without holding `canManagePasswordEncryption`]** →
  They now see Access Denied instead of an inert page. That is the intended outcome; it is logged.
- **[`edit.canApproveChangeRequest` changes but nothing enforces it]** → Expected; the snapshot
  shows the cell change and `authzDebt.ts` already labels the flag "Not enforced".
- **[The snapshot is approved without reading it]** → Each commit's PR description section lists
  its exact cell changes: A, one new column plus six Support cells; B, three Operations cells.
- **[No test accounts for the success paths]** → Palak added dev test users for IZG Security and
  IZG Program (IGDD-3600, 2026-10-30). The nightly e2e accounts cover Operations and a
  jurisdiction role only, so Support and Security success paths are verified manually on dev.
- **[Jest jsdom suites fail locally with `ERR_REQUIRE_ESM`, a known pre-existing issue]** → The
  security suites run under the node environment. Run the affected suites individually and list
  them in the PR.

## Migration Plan

1. Merge. Pushing to develop deploys to dev (#757). Roles are re-read from `token.groups` at each
   session callback, so the change applies without re-login.
2. Rollout, coordinated outside this PR and not a merge condition: before the change reaches each
   environment, the Product Owner signs off on who moves into IZG Security, those users are added
   to the `IZG Security` group, the list of current IZG Operations users of the removed features is
   checked against it, and the group's full membership is reviewed, since every member gains every
   Console capability. Source for that list: `logApiRequest` entries for `/api/accessgroups` writes
   and `/api/encrypt`, `/api/rotatekey`, `/api/encryptionStatus`.
3. Rollback: revert commit B to restore IZG Operations; revert both to restore everything. No
   persisted state.

## Open Questions

None.

## Related decision outside this change

**Hub "Access Control Admin" (decided 2026-11-02):** writable by IZG Security only; IZG Operations
may read it but never write. The Console side of this change already matches: IZG Operations views
all Access Control tabs, and only IZG Security holds `canManageAccessGroups`. The Hub side is not
part of this change. The Hub's `AccessController` (izgw-core) has no write endpoints for access
groups, only reads (`/rest/access`, `/access/endpoints`, `/access/groups`, `/access/groups/{group}`,
`/access/users`), all `ADMIN` only. Matching the decision there means adding `OPERATIONS` to those
reads, and keeping any future write endpoint `ADMIN` only. That needs its own Hub ticket.
