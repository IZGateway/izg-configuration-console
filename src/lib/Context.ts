import { AsyncLocalStorage } from 'async_hooks'
import { Session } from 'next-auth'
import type { CcRole } from './security/rolemapping'

export interface Context {
  user: string
  ipAddress: string
  sub?: string // Unique subject identifier from auth provider
  session?: Session | null // Full session object for access control
  userId?: string // Okta `sub` — stable user identifier for audit logging
  email?: string // Authenticated user's email
  sessionId?: string // CC-generated opaque login-session identifier
  jti?: string // Okta ID-token `jti` (token reference) for audit logging
  authTime?: number // Okta `auth_time` (Unix seconds) for Okta log correlation
  // Which role `enforceRouteAuthz` decided the request on (IGDD-3549). Set
  // only on an allowed capability/byMethod decision; a handler that records
  // an audit trail's "which role authorized this?" reads it from here
  // instead of re-deciding authorization a second time just to find out.
  grantedBy?: CcRole
  // Whether the caller holds a `{ public, detail }` route's `detail`
  // capability, decided by `enforceRouteAuthz` (IGDD-3552). Unset on every
  // other kind of route.
  detailGranted?: boolean
}

export const asyncRequestContext = new AsyncLocalStorage<Context>()

/**
 * Which role `enforceRouteAuthz` granted the current request on, if any.
 * Factored out (IGDD-3549 review follow-up) — was copied verbatim into four
 * route files (`apikeys/index.ts`, `token.ts`, `renew/index.ts`,
 * `verify-domain/index.ts`) as `const grantedBy = () => ...`.
 */
export const currentGrantedBy = (): CcRole | undefined =>
  asyncRequestContext.getStore()?.grantedBy

/**
 * Whether the current request may see a `{ public, detail }` route's fuller
 * response. Strictly `true` only, so a missing context or declaration fails
 * closed.
 */
export const currentDetailGranted = (): boolean =>
  asyncRequestContext.getStore()?.detailGranted === true
