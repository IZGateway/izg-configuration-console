import accessLevel from './accesslevel'
import hasAccessToDestId from '../accesshelper'
import DbClientFactory from '../db/DbClientFactory'
import logger from '../../../logger'
import type { ApiKeyManagementPageAccessControl } from '../type/PageAccessControls'

/**
 * Server-side authorization for the `/api/apikeys/*` routes (IGDD-2707 P1).
 *
 * The UI already gates the API Key Management screen via `useRoleAccess()`, but
 * UI gating is not a security boundary — the API routes previously checked only
 * that the caller was authenticated (`getServerSession`), so any signed-in user
 * could act on any jurisdiction's credentials. These helpers re-derive the same
 * role matrix server-side (role gate) and reuse the existing jurisdiction
 * ownership primitive (tenancy gate) so both layers are enforced on the server.
 */

export type ApiKeyPermission = keyof ApiKeyManagementPageAccessControl

/**
 * Resolve the API-key access controls for a session's role — the server-side
 * equivalent of `useRoleAccess()` for the `/apikeys` page. Roles that are not
 * present in the access matrix (IZG Program, CDC Program, CDC CISO) resolve to
 * `undefined`, which every caller treats as deny-by-default.
 */
export function getApiKeyAccess(
  session: any
): ApiKeyManagementPageAccessControl | undefined {
  const role = session?.user?.role
  if (!role) return undefined
  return accessLevel[role]?.apikeys
}

/**
 * True only if the session's role explicitly grants the given API-key
 * permission. Deny-by-default: a missing session, missing role, unmapped role,
 * or unset flag all return `false`.
 */
export function hasApiKeyPermission(
  session: any,
  permission: ApiKeyPermission
): boolean {
  return Boolean(getApiKeyAccess(session)?.[permission])
}

/**
 * True if the session may act on a credential (or domain) owned by
 * `jurisdictionId`. IZG Operations/Support are global; jurisdiction roles are
 * limited to their assigned jurisdictions (see `hasAccessToDestId`).
 *
 * Two different identifier spaces have to be bridged here. Credentials, domains
 * and every `/api/apikeys/*` route carry the **numeric** `jurisdictionId` (e.g.
 * `1000`), which is the Jurisdiction table's key and what the Hub reads. But
 * `session.user.jurisdictions` is populated from Okta group membership and holds
 * lowercased jurisdiction **prefixes** (e.g. `"ainq"`) — see the `jwt` callback in
 * `pages/api/auth/[...nextauth].ts`. Comparing the numeric id against those
 * prefixes never matches, so this resolves the id to its jurisdiction's `prefix`
 * first and compares on that.
 *
 * `prefix` is the right field, not `name`: a sender row has
 * `name = "Audacious Inquiry (operators)"` with `prefix = "AINQ"`, so matching on
 * `name` would deny a legitimate owner. (Some legacy rows happen to carry the
 * short code in `name` too, which is why a name-based check appeared to work.)
 *
 * `getJurisdiction` memoizes on a process-lifetime cache, and the credential read
 * paths (`getApiKeyCredential`, `fetchApiKeyCredentials`) already pre-warm it, so
 * this is normally an in-memory hit rather than a DynamoDB read.
 *
 * Deliberately does NOT short-circuit global roles ahead of the lookup: the
 * IZG-Operations/Support exemption is defined in exactly one place
 * (`hasAccessToDestId`, which tests the role before it looks at `destId`), and
 * duplicating that list here would let the two drift apart.
 *
 * Fails closed. A jurisdiction with no resolvable `prefix` denies everyone
 * (loudly logged — all rows are expected to carry one), and `hasAccessToDestId`
 * throws for a non-admin account with no assigned jurisdictions, which is treated
 * as "no access" rather than letting one misconfigured account 500 the whole
 * request (important for the list filter, where a single bad row must not error
 * the entire response).
 */
export async function ownsJurisdiction(
  session: any,
  jurisdictionId: string
): Promise<boolean> {
  try {
    const dbClient = await DbClientFactory.getDbClient()
    const jurisdiction = await dbClient.getJurisdiction(String(jurisdictionId))
    const prefix = jurisdiction?.prefix
    if (!prefix) {
      logger.warn('Ownership check denied: jurisdiction has no prefix', {
        jurisdictionId,
        operation: 'ownsJurisdiction',
      })
      return false
    }
    return hasAccessToDestId(String(prefix), session)
  } catch {
    return false
  }
}

// Flat shape (not a discriminated union) so `status`/`error` are unconditionally
// typed and readable at call sites without relying on control-flow narrowing —
// callers only ever read them after checking `!ok`, but they don't need to be
// undefined on the `ok: true` path.
export type ApiKeyAuthzResult = {
  ok: boolean
  status: number
  error: string
}

/**
 * Single combined role + tenancy gate for a request acting on one credential
 * or domain. This is the one call every mutating/sensitive `/api/apikeys/*`
 * handler should make immediately before touching that resource, so the two
 * checks can't drift apart (e.g. a route that only remembers the role check
 * and forgets ownership, or vice versa) as routes are added or edited.
 *
 * Routes that already know `jurisdictionId` up front (create, verify-domain,
 * domains) can call this once, right after validating required fields. Routes
 * that only learn `jurisdictionId` after loading a credential by `sortKey`
 * (revoke, cancel, token reveal, renew) may still keep an earlier standalone
 * `hasApiKeyPermission` check to skip an unnecessary DB read for a role with
 * zero API-key permissions — but this call remains the authoritative gate
 * evaluated right before the credential is read out or mutated, so that
 * guarantee never depends on the earlier optimization having been written
 * correctly.
 */
export async function requireApiKeyAccess(
  session: any,
  permission: ApiKeyPermission,
  jurisdictionId: string
): Promise<ApiKeyAuthzResult> {
  // Role gate first: a role with no API-key permission at all is rejected without
  // incurring the jurisdiction lookup below.
  if (!hasApiKeyPermission(session, permission)) {
    return { ok: false, status: 403, error: 'Forbidden - insufficient role' }
  }
  if (!(await ownsJurisdiction(session, jurisdictionId))) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden - not authorized for this jurisdiction',
    }
  }
  return { ok: true, status: 200, error: '' }
}
