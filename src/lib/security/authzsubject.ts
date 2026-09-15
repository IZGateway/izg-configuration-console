import accessLevel from './accesslevel'
import type { CcRole } from './rolemapping'

/**
 * The only input the authorization layer accepts.
 *
 * Deliberately *not* a NextAuth `Session`. Authorization depends on the two
 * things it actually needs and nothing else, which has three consequences:
 *
 *  - The authz functions stop being typed `session: any`. An unconstrained blob
 *    at the security boundary means TypeScript cannot check the shape, so any
 *    object that happens to carry a role gets authority.
 *  - Policy tests construct `AuthzSubject` literals — no session mocks, no
 *    DynamoDB mocks.
 *  - Removing `session.user.role` (below) turns every stale single-role reader
 *    into a compile error rather than a silent wrong answer.
 */
export type AuthzSubject = {
  /** Recognized roles held, ordered by ROLE_PRECEDENCE. */
  roles: CcRole[]
  /** Jurisdiction prefixes from Okta, lowercased. */
  jurisdictions: string[]
}

/**
 * Derive the authorization subject from a NextAuth session.
 *
 * The `?? [role]` branch accepts single-role-shaped objects — hand-built test
 * fixtures that never pass through the real `session()` callback. Production
 * sessions always carry `roles`, because the session callback recomputes it from
 * `token.groups` on every call, so no in-flight JWT needs migrating across the
 * deploy. It can be deleted once the remaining fixtures are migrated.
 */
export function subjectOf(session: unknown): AuthzSubject {
  const user = (session as { user?: Record<string, unknown> } | null | undefined)
    ?.user

  const rawRoles = Array.isArray(user?.roles)
    ? (user?.roles as string[])
    : typeof user?.role === 'string'
      ? [user.role as string]
      : []

  const rawJurisdictions = Array.isArray(user?.jurisdictions)
    ? (user?.jurisdictions as string[])
    : []

  return {
    // Defence in depth. `GROUP_ROLE_MAPPING` can only name roles that exist, so
    // for production sessions this filter never removes anything. It is here to
    // stop a hand-built fixture — or a future mapping typo — from reaching the
    // policy with a role that has no matrix entry.
    roles: rawRoles.filter((role): role is CcRole => role in accessLevel),
    jurisdictions: rawJurisdictions
      .filter((j): j is string => typeof j === 'string')
      .map((j) => j.toLowerCase()),
  }
}
