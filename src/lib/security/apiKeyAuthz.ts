import DbClientFactory from '../db/DbClientFactory'
import logger from '../../../logger'
import { subjectOf, type AuthzSubject } from './authzsubject'
import {
  ANY_JURISDICTION,
  can,
  mergePageAccess,
  type Decision,
} from './policy'
import type { ApiKeyManagementPageAccessControl } from '../type/PageAccessControls'

/**
 * Server-side authorization for the `/api/apikeys/*` routes.
 *
 * This module is the *impure adapter*: it resolves a jurisdiction id to its
 * prefix (a DynamoDB read) and shapes results into HTTP status/error pairs. The
 * decision itself is made by `can()` in `policy.ts`, which is pure.
 *
 * The UI gates the API Key Management screen too, but UI gating is not a security
 * boundary — these routes are.
 */

export type ApiKeyPermission = keyof ApiKeyManagementPageAccessControl

/**
 * Resolve the API-key flags for a session — the server-side equivalent of
 * `useRoleAccess()` for the `/apikeys` page.
 *
 * This is a "what"-only check with no jurisdiction, so a plain union across held
 * roles is correct. It backs `hasApiKeyPermission`, which several routes call as
 * an early exit before the authoritative gate; unioning here is what stops a
 * multi-role user being rejected by that pre-check before ever reaching it.
 */
export function getApiKeyAccess(
  session: unknown
): Partial<ApiKeyManagementPageAccessControl> | undefined {
  const subject = subjectOf(session)
  if (subject.roles.length === 0) return undefined
  return mergePageAccess(subject, 'apikeys')
}

/**
 * True if any held role grants the permission, ignoring tenancy.
 *
 * Deny-by-default: a missing session, no recognized role, or an unset flag all
 * return false. NOT sufficient on its own for anything that touches a specific
 * credential — pair it with `canActOnJurisdiction`, or just use
 * `requireApiKeyAccess`.
 */
export function hasApiKeyPermission(
  session: unknown,
  permission: ApiKeyPermission
): boolean {
  return Boolean(getApiKeyAccess(session)?.[permission])
}

/** Resolve a jurisdiction id to its short prefix. Throws on infrastructure failure. */
async function prefixOf(jurisdictionId: string): Promise<string | null> {
  const dbClient = await DbClientFactory.getDbClient()
  const jurisdiction = await dbClient.getJurisdiction(String(jurisdictionId))
  return jurisdiction?.prefix ?? null
}

/**
 * The single authorization decision for "may this caller do X to this
 * jurisdiction's data?".
 *
 * Every tenancy-paired caller goes through here, so the one-role-at-a-time rule
 * in `policy.ts` is implemented once rather than re-derived per route. The
 * permission-only helper `ownsJurisdiction` that used to exist is gone: it let a
 * caller check reach without a permission, which is half of the mistake this
 * design prevents.
 *
 * Fails closed in every direction, but loudly. A jurisdiction with no resolvable
 * prefix denies everyone (warn), and an infrastructure failure denies too but
 * logs at error level — previously a swallowed `catch { return false }` made a
 * DynamoDB outage indistinguishable from a legitimate deny, so the symptom was
 * an empty list with nothing alerting.
 */
export async function canActOnJurisdiction(
  subject: AuthzSubject,
  permission: ApiKeyPermission,
  jurisdictionId: string
): Promise<Decision> {
  let prefix: string | null
  try {
    prefix = await prefixOf(jurisdictionId)
  } catch (error) {
    logger.error('Authorization could not resolve jurisdiction', {
      jurisdictionId,
      operation: 'canActOnJurisdiction',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    return { allowed: false }
  }

  if (!prefix) {
    logger.warn('Ownership check denied: jurisdiction has no prefix', {
      jurisdictionId,
      operation: 'canActOnJurisdiction',
    })
    return { allowed: false }
  }

  return can(subject, 'apikeys', permission, prefix)
}

// Flat shape (not a discriminated union) so `status`/`error` are unconditionally
// typed and readable at call sites without relying on control-flow narrowing.
export type ApiKeyAuthzResult = {
  ok: boolean
  status: number
  error: string
  /** Role that authorized the request, when ok. Log this on mutating routes. */
  grantedBy?: string
}

/**
 * The combined role + tenancy gate. Call this immediately before touching a
 * credential or domain, so the two checks cannot drift apart as routes are added.
 */
export async function requireApiKeyAccess(
  session: unknown,
  permission: ApiKeyPermission,
  jurisdictionId: string
): Promise<ApiKeyAuthzResult> {
  const subject = subjectOf(session)

  // Cheap prefilter: skip the DynamoDB read for a caller that no held role could
  // ever allow. Valid because the union is a superset of any single role's
  // permissions, so this can only reject callers the real check would also
  // reject. ANY_JURISDICTION states plainly that tenancy is skipped on purpose.
  if (!can(subject, 'apikeys', permission, ANY_JURISDICTION).allowed) {
    return { ok: false, status: 403, error: 'Forbidden - insufficient role' }
  }

  const decision = await canActOnJurisdiction(subject, permission, jurisdictionId)
  if (!decision.allowed) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden - not authorized for this jurisdiction',
    }
  }

  return { ok: true, status: 200, error: '', grantedBy: decision.grantedBy }
}
