import logger from '../../../logger'

/**
 * Structured "Access Denied" event for RBAC/authorization rejections.
 *
 * Only call this from a genuine per-request rejection gate (something that
 * returns a 401/403 for the current action) — never from inside a predicate
 * that is also used to filter a list of rows (e.g. `hasAccessToDestId`,
 * `ownsJurisdiction`), or an authorized user's normal request will emit one
 * phantom "denied" event per row they don't own.
 */
export interface AccessDeniedEvent {
  reason: string
  url?: string
  method?: string
  user?: string | null
  role?: string | null
  permission?: string
  destId?: string
  jurisdictionId?: string
}

export function logAccessDenied(event: AccessDeniedEvent): void {
  logger.warn('Access denied: RBAC rejection', {
    eventType: 'AccessDenied',
    ...event,
  })
}
