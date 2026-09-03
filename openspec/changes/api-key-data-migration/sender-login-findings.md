---
schema_version: '1.0'
created:
  date: '2026-08-19T21:41:28.547Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.80
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/6b36fcb8-6019-41de-8218-f2e836b132e7/~970647ed-6f46-45fa-9ed0-03d2a1fd5d4d
  summary: Sender login and API key access findings document for team review
updated: []
change_request: api-key-data-migration
ticket: IGDD-3258
---
# Sender Login and API Key Access — Findings for Team Review

**Branch context:** `IGDD-3258_API_key_data_migration` (data migration work)
**Related branches:** `IGDD-2707` (API key management UI and routes)
**Related tickets:** [IGDD-3258](https://izgateway.atlassian.net/browse/IGDD-3258), [IGDD-2709](https://izgateway.atlassian.net/browse/IGDD-2709), [IGDD-3106](https://izgateway.atlassian.net/browse/IGDD-3106)

---

## Background

As part of IGDD-3258, sender organizations have been assigned mnemonic prefix values
(e.g. `EHEX`, `VHA`, `AZOVA`) in the DynamoDB `Sender` entity records. The intent is
that Okta administrators can grant a sender's CC users access to their own API keys by
assigning them to an Okta group whose `jurisdictions` claim carries that prefix — the
same mechanism already used for IIS jurisdictions (e.g. `az`, `md`).

The findings below describe how the current code handles (or does not handle) a user
whose Okta group carries a sender prefix, based on a code trace conducted 2026-08-19.

---

## Finding 1 — Session and Role Assignment at Login

**File:** `src/pages/api/auth/[...nextauth].ts`

At login, the NextAuth JWT callback:

1. Reads `profile.groups` from the Okta ID token
2. Intersects with the `roles` array (`src/lib/security/roles.ts`) to assign `session.user.role`
3. Calls the Okta `/oauth2/v1/userinfo` endpoint and maps `data.jurisdictions[]` →
   `token.jurisdictions` (lowercased)

The `roles` array currently contains:

```
'IZG Operations', 'IZG Support', 'IZG Program',
'Jurisdiction Operations', 'Jurisdiction Support',
'CDC Program', 'CDC CISO'
```

A user in a sender-specific Okta group that does not match one of these strings receives
`session.user.role = undefined`. Their `session.user.jurisdictions` will contain whatever
prefix values Okta sends (e.g. `["vha"]`), but no role is assigned.

---

## Finding 2 — Access Matrix Lookup

**File:** `src/lib/security/useRoleAccess.ts`

```ts
const role = session.data && session.data.user.role
const page = router.pathname.replace(/\[.*?\]/g, '').replaceAll('/', '')
const accessLevels = accessLevel[role]?.[page]
```

`accessLevel` (`src/lib/security/accesslevel.ts`) maps role strings to page-level
permission objects. With `role = undefined`, `accessLevel[undefined]` is `undefined`,
so `useRoleAccess()` returns `undefined` for every page.

The `ApiKeyManagement` component (`src/components/ApiKeyManagement/index.tsx`,
branch `IGDD-2707`) reads `useRoleAccess()` and derives:

```ts
const canCreate = !!accessLevels?.canCreateApiKey   // false
const canRevoke = !!accessLevels?.canRevokeApiKey   // false
const canRenew  = !!accessLevels?.canRenewApiKey    // false
const canCancel = !!accessLevels?.canCancelApiKey   // false
```

All action controls are hidden. The page renders but the user can take no action.

The `/api/apikeys` GET route (branch `IGDD-2707`, `src/pages/api/apikeys/index.ts`)
also checks `hasApiKeyPermission(session, 'canListApiKeys')` server-side and returns
403 if false — so the credential list is also empty for a user with no role.

---

## Finding 3 — Navigation Menu Visibility

**File:** `src/components/Navigation/menuItems.tsx` (branch `IGDD-2707`)

The API Key Management nav item uses:

```ts
isVisible: (role) => !!accessLevel[role ?? '']?.apikeys?.canListApiKeys,
```

With `role = undefined`, this evaluates to `false`. The API Key Management entry does
not appear in the navigation menu for a user with no assigned role.

---

## Finding 4 — Landing Page After Login

**File:** `src/components/Home/index.tsx`

The home page (`/`) renders for all authenticated users regardless of role. Its primary
call-to-action button is:

```tsx
<Link href="/manageconnections">
  <Button>Manage Connections</Button>
</Link>
```

This link is hardcoded. There is no role-based redirect or alternative CTA for users
who have no IIS jurisdiction access.

A sender user who successfully authenticates lands on this page with the "Manage
Connections" CTA, which leads to the IIS destinations page — a page that would show
no relevant content for a sender-only user.

---

## Finding 5 — Tenancy Check: Numeric ID vs. Prefix String

**File:** `src/lib/security/apiKeyAuthz.ts` (branch `IGDD-2707`)
**File:** `src/lib/accesshelper.ts`

`ownsJurisdiction(session, jurisdictionId)` calls `hasAccessToDestId`, which compares:

- `session.user.jurisdictions` — an array of **prefix strings** (e.g. `["vha"]`),
  lowercased by the NextAuth callback
- `jurisdictionId` — the **numeric string** from `ApiKeyCredential.jurisdictionId`
  (e.g. `"114"` for Veterans Administration)

```ts
x.toLocaleLowerCase() === destId.toLocaleLowerCase()
// "vha" === "114"  →  false
```

For `IZG Operations` and `IZG Support` roles, `hasAccessToDestId` returns `true`
unconditionally (global access), so this comparison is never reached for those roles.

For `Jurisdiction Operations`, the comparison works today because `Destination.destId`
is the prefix string (e.g. `"az"`) — the same namespace as `session.user.jurisdictions`.
`ApiKeyCredential.jurisdictionId` is a **numeric integer**, a different namespace.

The `/api/apikeys` GET handler filters the credential list using this check:

```ts
const scoped = result.filter((c) => ownsJurisdiction(session, c.jurisdictionId))
```

For a sender user whose `session.user.jurisdictions = ["vha"]` and whose credential has
`jurisdictionId = "114"`, this filter returns an empty array regardless of role — the
namespaces do not overlap.

---

## What the Data Migration Has Done (IGDD-3258)

- Each `Sender` entity in DynamoDB has been assigned a `prefix` field with an uppercase
  mnemonic value (e.g. `VHA`, `EHEX`, `AZOVA`). The full list is in
  `batches/denormalized/senders.csv`.
- The intent is for Okta admins to place this prefix in a user's `jurisdictions` claim
  to grant that user access to that sender's API keys in CC.
- The prefix is stored on the `Sender` entity. It is not stored on `ApiKeyCredential`.
  `ApiKeyCredential.jurisdictionId` remains a numeric value.

---

## Summary of Open Observations for the Team

The following are stated as observations based on the code trace. No recommendations
are made here — these are offered so the team can assess impact and decide on approach.

1. **A user with a sender Okta group assignment currently receives no CC role.** The
   role assignment mechanism (`roles.ts` + `accesslevel.ts`) does not account for a
   sender-specific Okta group. The user authenticates successfully but `session.user.role`
   is `undefined`.

2. **The home page CTA routes all users to `/manageconnections`.** There is no
   role-based routing or alternative landing path for users who have no IIS jurisdiction
   access. This behavior is in `src/components/Home/index.tsx`.

3. **`ownsJurisdiction` compares prefix strings against numeric IDs.** For IZG global
   roles (Operations/Support) this is not observed as a problem. For a user whose
   session carries a sender prefix, the comparison against a numeric `jurisdictionId`
   will always return false.

4. **The API key management page and routes are on branch `IGDD-2707`, not yet merged
   to `develop`.** Findings 2, 3, and 5 above apply to that branch. The page key in
   `accesslevel.ts` on `develop` is `apikeymanagement`; on `IGDD-2707` it is `apikeys`.
   These differ and will need to be reconciled on merge.

---

*Code trace conducted: 2026-08-19. Branches reviewed: `develop`, `IGDD-2707`.*
*Data migration branch: `IGDD-3258_API_key_data_migration`.*
