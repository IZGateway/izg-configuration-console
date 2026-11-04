import logger from '../../../logger'
import { toEcsUrl } from '../utils/ecsUrl'

/**
 * Structured "Access Denied" event for RBAC/authorization rejections.
 *
 * Only call this from a genuine per-request rejection gate (something that
 * returns a 401/403 for the current action) — never from inside a predicate
 * that is also used to filter a list of rows (e.g. `hasAccessToDestId`,
 * `canActOnJurisdiction`), or an authorized user's normal request will emit
 * one phantom "denied" event per row they don't own.
 */
export interface AccessDeniedEvent {
  reason: string
  url?: string
  method?: string
  user?: string | null
  // Plural: a caller can hold multiple roles (see `AuthzSubject`/`subjectOf`).
  // Prefer `subjectOf(session).roles` over reading a session's role(s) directly.
  roles?: string[]
  /**
   * The capability that was missing, **dotted and page-qualified** —
   * `'accesscontrol.canViewAccessControl'`.
   *
   * A bare capability name is genuinely ambiguous: `canViewChangeRequest`
   * exists on both the `manageconnections` and `history` blocks, and
   * `canRunConnectionTest` on both `manageconnections` and `test`. Without the
   * page an operator cannot tell which grant would have allowed the request.
   */
  permission?: string
  /**
   * Set **instead of** `permission` when the rule was an any-of and the caller
   * held none of the alternatives (IGDD-3472). Every listed capability would
   * have allowed the request on its own.
   *
   * `permission` is deliberately left unset in that case rather than filled
   * with the first alternative. Naming one of several would tell an operator
   * reading the log to grant a capability that is not the only answer, and
   * `/api/organizations` — the one any-of rule in the codebase — spans three
   * different page blocks, so the accompanying `page` would be arbitrary too.
   */
  permissionAnyOf?: string[]
  destId?: string
  jurisdictionId?: string
  /**
   * Which enforcement point refused (IGDD-3472). Optional, so the five
   * pre-existing call sites and every existing Elastic search keep working
   * unchanged. `eventType:AccessDenied AND deniedAt:page` isolates page
   * denials; `sessionId`, already attached by the ALS logger injector,
   * correlates them with that session's API denials with no new field.
   */
  deniedAt?: 'page' | 'api'
  /** The page key whose entry capability was missing, for page denials. */
  page?: string
}

export function logAccessDenied(event: AccessDeniedEvent): void {
  // Callers pass `url` as a plain string; it is converted to the ECS object
  // shape here, once, rather than at every call site. A string `url` is
  // rejected by the Elastic index and the event silently never arrives
  // (IGDD-3541) — see `toEcsUrl`.
  const { url, ...rest } = event
  logger.warn('Access denied: RBAC rejection', {
    eventType: 'AccessDenied',
    ...rest,
    url: toEcsUrl(url),
  })
}
