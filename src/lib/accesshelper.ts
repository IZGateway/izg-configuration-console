import { subjectOf } from './security/authzsubject'
import { hasGlobalTenancy } from './security/policy'

/**
 * "Where"-only tenancy check: may this session touch `destId`'s data?
 *
 * There is no permission dimension here — callers (the `checkAccessToDestId`
 * middleware, `fetchEndpointStatus`) have already established *what* is being
 * done by virtue of which route is running. Because no capability is involved,
 * a plain union across held roles is correct: if any role reaches this
 * destination, the user reaches it.
 *
 * This is NOT the right check for anything that pairs a permission with a
 * jurisdiction — API-key operations, for example. Those must use
 * `requireApiKeyAccess`, which evaluates permission and reach together per role.
 * Splitting them here is what would let one role's reach combine with another
 * role's permission.
 *
 * Global reach now comes from the `globalTenancy` flag on each role definition
 * rather than a hardcoded role-name list that was duplicated here and in
 * `accessutils.ts`.
 */
export default function hasAccessToDestId(destId: string, session: unknown) {
  const subject = subjectOf(session)

  if (hasGlobalTenancy(subject)) return true

  if (!subject.jurisdictions.length) {
    throw new Error(`Non-admin users must be assigned at least 1 jurisdiction`)
  }

  // Exact element match, never a substring test: the data contains both `az`
  // (Arizona) and `azova` (a sender organization).
  return subject.jurisdictions.includes(String(destId).toLowerCase())
}
