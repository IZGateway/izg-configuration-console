import { AsyncLocalStorage } from 'async_hooks'
import { Session } from 'next-auth'

export interface Context {
  user: string
  ipAddress: string
  sub?: string // Unique subject identifier from auth provider
  session?: Session | null // Full session object for access control
  userId?: string // Okta `sub` — stable user identifier for audit logging
  email?: string // Authenticated user's email
  sessionId?: string // CC-generated opaque login-session identifier
  authTime?: number // Okta `auth_time` (Unix seconds) for Okta log correlation
}

export const asyncRequestContext = new AsyncLocalStorage<Context>()
