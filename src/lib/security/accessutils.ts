import accessLevel from './accesslevel'
import type { CcRole } from './rolemapping'

/**
 * Is any held role an IZG operations-tier role?
 *
 * This is a UI/behaviour *affordance* predicate — it decides things like whether
 * the "OUR API" button appears on the home page. It is deliberately kept
 * separate from the `globalTenancy` matrix flag even though the two currently
 * select the same roles, because they answer different questions: "is this IZG
 * staff?" versus "does this role bypass jurisdiction scoping?". Conflating them
 * means a future role that needs one but not the other silently gets both.
 *
 * Tenancy decisions must use `hasAccessToDestId` / `hasGlobalTenancy`, not this.
 */
const OPERATIONS_ROLES: CcRole[] = ['IZG Operations', 'IZG Support']

export default function isOperationsRole(
  roles: CcRole[] | string[] | undefined
): boolean {
  if (!roles) return false
  return roles.some((role) => OPERATIONS_ROLES.includes(role as CcRole))
}

/** Every role known to the access matrix. Used by the drift test. */
export const MATRIX_ROLES = Object.keys(accessLevel)
