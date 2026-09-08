## Why

The Configuration Console assigns each user exactly one role, chosen by taking the *first*
Okta group that matches a known role name. Group order in the Okta response is not guaranteed,
so a user who belongs to two recognized groups can receive different permissions on different
logins — and a group that maps to nothing (`IZG Program`, `CDC Program`, `CDC CISO` were
declared as roles but had no entry in the access matrix) could be selected and displace a role
that would have worked, leaving the user with no access at all.

This is a live defect today, independent of any new role. It also blocks the sender API key
work: adding a sender role increases the number of users who legitimately hold two groups, and
one specific pairing (`IZG Support`, which has global jurisdiction reach but no API-key
permissions, combined with any role that can list keys) becomes a privilege-escalation hazard
the moment permissions are combined naively.

## What Changes

- **BREAKING (internal):** `session.user.role` (single string) is removed and replaced by
  `session.user.roles` (array of all recognized roles held). Removing the field rather than
  retaining it makes every stale single-role reader a compile error instead of a silent
  wrong answer. Nothing in the UI displayed it and the audit context never captured it; the two
  places that logged it now log the full array.
- Permissions become a **union** across every held role. A user may do something if any held
  role permits it.
- Authorization decisions that pair a permission with a jurisdiction are evaluated **one role at
  a time**. A capability from one role may never combine with jurisdiction reach from a
  different role. This is the escalation guard and is the security-critical part of the change.
- Group ingestion is hardened: Okta group claims are read from the profile, the ID token, the
  access token **and** the userinfo response and unioned, rather than the ID token alone; group
  names are matched case- and punctuation-insensitively; and claim values are parsed tolerantly
  (array of strings, array of objects, JSON string, comma-separated string).
- Okta group names are decoupled from CC's role vocabulary by a `GROUP_ROLE_MAPPING` table,
  initialized one-to-one with existing behaviour. This replaces `src/lib/security/roles.ts`,
  which is deleted. Roles that have no access-matrix entry can no longer be named.
- Global jurisdiction reach becomes access-matrix data (`globalTenancy` on each role definition)
  instead of a hardcoded role-name list duplicated in `src/lib/accesshelper.ts` and
  `src/lib/security/accessutils.ts`.
- Authorization functions stop accepting `session: any` and take a narrow `AuthzSubject`
  (`{ roles, jurisdictions }`). The decision function becomes pure — no session, no database.
- Failure to resolve a jurisdiction during an authorization check now logs at error level while
  still denying. Previously a swallowed exception made a DynamoDB outage indistinguishable from
  a legitimate deny — the user saw an empty list and nothing alerted.
- The authorizing role is returned as `grantedBy` so mutating API-key routes can record which
  role permitted an action.

## Capabilities

### New Capabilities

- `multi-role-authorization`: How a user's Okta group membership resolves to a set of roles, how
  permissions combine across those roles, and the rule that a permission and a jurisdiction
  check must be satisfied by the same role.
- `okta-group-ingestion`: Which token/claim locations Okta group membership is read from, how
  group names are normalized, and how claim value shapes are tolerated.

### Modified Capabilities

None. No existing spec in `openspec/specs/` states requirements about role resolution or
permission combination. `destination-circuit-breaker-reset` and `allowed-user-audit-logging`
touch code that this change edits, but neither specifies role-selection behaviour, so their
requirements are unchanged.

## Impact

**Security boundary.** This change rewrites how every authorization decision is derived. The
API-key routes and the jurisdiction middleware are the enforcement points; the UI layer is
convenience only and remains non-authoritative.

**Affected code** (13 production call sites plus types and tests):

- New: `src/lib/security/rolemapping.ts`, `src/lib/security/authzsubject.ts`,
  `src/lib/security/policy.ts`
- Deleted: `src/lib/security/roles.ts`
- Auth: `src/pages/api/auth/[...nextauth].ts`, `src/next-auth.d.ts`
- Authorization: `src/lib/security/apiKeyAuthz.ts`, `src/lib/accesshelper.ts`,
  `src/lib/security/accessutils.ts`, `src/lib/security/accesslevel.ts`, the four files in
  `src/lib/security/accessdefinitions/`
- Routes: `src/pages/api/apikeys/index.ts`, `src/pages/api/status/reset/[...slug].ts`,
  `src/pages/api/allowedusers/bydestination/index.ts`
- UI: `src/lib/security/useRoleAccess.ts`, `src/components/Navigation/index.tsx`,
  `src/components/Navigation/menuItems.tsx`, `src/components/Home/index.tsx`,
  `src/components/AccessControl/DenyList.tsx`, `src/components/AccessControl/FileTypeList.tsx`,
  `src/pages/manageconnections/index.tsx`, `src/lib/services/fetchEndpointStatus.ts`

**No external impact.** No Okta tenant configuration change is required, no data migration, and
no API contract change. Sessions issued before deployment continue to work — roles are recomputed
from token groups on every session read, so no re-login is needed.

**Intended behaviour change: none for existing users.** Every current single-role user must
retain exactly the access they have today; the union only adds capability for users who hold
more than one recognized group.
