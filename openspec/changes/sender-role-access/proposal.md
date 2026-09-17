## Why

IGDD-3258 gave every sender organization (e.g. eHealth Exchange, VHA, `azova`) a mnemonic
`prefix`, and a sender user's Okta `jurisdictions` claim already carries that prefix correctly —
the tenancy half of access works today. But CC's access matrix only recognizes four Okta groups
(`IZG Operations`, `IZG Support`, `Jurisdiction Operations`, `Jurisdiction Support`); a sender's
Okta group maps to no role at all. The user authenticates successfully, then fails closed at
every layer: no nav entry, no page permissions, `403` on `GET /api/apikeys`, and a landing-page
call-to-action that points at Manage Connections, a page with nothing in it for them.

This was deliberately sequenced after `multi-role-permissions` (IGDD-3359): before that change,
a Okta group intersection kept only the first matched role, so a user in both `IZG Support`
(global jurisdiction reach, no API-key permissions) and a future sender role would have been a
live privilege-escalation combination the moment the naive union was written. With that
prerequisite landed, this change is a matrix addition rather than an authorization-logic change.

## What Changes

- **New role `Sender Operations`**, added to `CcRole`, `ROLE_PRECEDENCE`, and
  `GROUP_ROLE_MAPPING` in `rolemapping.ts`, with a new access-matrix entry
  (`_SenderOperationsAccess.ts`): `globalTenancy: false`, all five IIS page blocks
  (`manageconnections`, `test`, `edit`, `changerequest`, `history`) denied, and full
  `apikeys` lifecycle permissions (`canListApiKeys`, `canCreateApiKey`, `canRevokeApiKey`,
  `canRenewApiKey`, `canCancelApiKey`) — mirroring `Jurisdiction Operations`, scoped to the
  sender's own jurisdiction prefix by the existing per-role tenancy check.
- **Two new matrix-driven visibility flags**, `canViewConnections` on
  `ManageConnectionsPageAccessControl` and a new `onboarding` page block
  (`canViewOnboarding`), set `true` on all four existing roles (no behaviour change for them)
  and `false` on `Sender Operations`. Replaces the two nav items ("Manage Connections",
  "Onboarding Senders") that currently have no gate at all and are shown to every authenticated
  user regardless of role.
- **A server-side capability guard on `/manageconnections`**, checking `canViewConnections`
  before calling `fetchEndpointStatus` and redirecting otherwise. Today this page checks only
  that a session exists, then filters by the raw `jurisdictions` claim — a zero-recognized-role
  account (and, without this change, a sender account) can reach it regardless of whether any
  held role actually grants connections access. This closes that gap for the case introduced by
  this change; the equivalent gap in the `/api/changerequest` routes is tracked separately and is
  out of scope here.
- **Landing page**: the hardcoded "Manage Connections" call-to-action on `/` is gated on
  `canViewConnections`; a new "API Key Management" call-to-action is shown when `canListApiKeys`
  is held, so a sender's primary CTA leads somewhere they can use.

## Capabilities

### New Capabilities

- `sender-role-access`: How the `Sender Operations` role is defined, what it can and cannot see
  in navigation and on the API-key and connections surfaces, and that its access is scoped to
  its own jurisdiction prefix.

### Modified Capabilities

None. No spec in `openspec/specs/` currently states requirements about nav visibility or the
`/manageconnections` access gate. `multi-role-authorization` and `okta-group-ingestion`
(introduced by `multi-role-permissions`) are not yet archived to `openspec/specs/`; this change
builds on their mechanisms (the access matrix, `can()`, `subjectOf()`) without altering their
requirements — adding a role is exactly the extension point that design anticipated.

## Impact

**Not a security-boundary change to the authorization mechanism itself** — `can()`,
`mergePageAccess()`, and `apiKeyAuthz.ts` are unchanged; they are already generic over the set of
roles in the matrix. The security-relevant work here is entirely in the new role's own data
(deny-by-default on every IIS page block) and in closing the `/manageconnections` gate.

**Affected code:**

- New: `src/lib/security/accessdefinitions/_SenderOperationsAccess.ts`
- Roles/matrix: `src/lib/security/rolemapping.ts`, `src/lib/security/accesslevel.ts`,
  `src/lib/security/accessdefinitions/index.ts`, `src/lib/type/PageAccessControls.ts`,
  `src/lib/security/accessdefinitions/defaultaccesslevels.ts`, and the four existing role files
  (adding the two new `true` flags — no other change)
- Nav: `src/components/Navigation/menuItems.tsx`
- Pages: `src/pages/manageconnections/index.tsx`, `src/components/Home/index.tsx`

**No Okta tenant change is included in this change** — creating the `Sender Operations` group
and assigning users to it is a separate, Okta-administrator-tracked task. This change only adds
the code-side mapping and matrix entry so that once the group exists and is assigned, sign-in
resolves correctly.

**Depends on IGDD-3258** (sender entity seeding in DynamoDB) for end-to-end manual verification
with a real sender prefix; that work is in progress independently and does not block this
change's code or its automated tests, which exercise the policy layer directly.

**Intended behaviour change: none for existing users.** `IZG Operations`, `IZG Support`,
`Jurisdiction Operations`, and `Jurisdiction Support` retain identical nav visibility and page
access — the two new flags are set `true` for all four specifically to make this provable.
