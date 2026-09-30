import accessLevel from './accesslevel'
import type { CcRole } from './rolemapping'

/**
 * Is any held role an IZG operations-tier role?
 *
 * **No longer an affordance predicate.** It used to decide whether the "OUR
 * API" button appeared on the home page; IGDD-3472 moved that to the matrix,
 * because this predicate is invisible to a `can()`-based audit and it
 * disagreed with the two other things gating the same page. Both remaining
 * readers — `fetchEndpointStatus.ts` and `allowedusers/bydestination` — are
 * **row scoping**: "see every row" versus "see only these". That is what this
 * predicate is now for, and new affordance checks should read the matrix.
 *
 * It is deliberately kept separate from the `globalTenancy` matrix flag even
 * though the two currently select the same roles, because they answer
 * different questions: "is this IZG staff?" versus "does this role bypass
 * jurisdiction scoping?". Conflating them means a future role that needs one
 * but not the other silently gets both.
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
