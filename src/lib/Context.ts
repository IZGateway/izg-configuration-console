import { AsyncLocalStorage } from 'async_hooks'
import { Session } from 'next-auth'

export interface Context {
  user: string
  ipAddress: string
  sub?: string // Unique subject identifier from auth provider
  session?: Session | null // Full session object for access control
}

export const asyncRequestContext = new AsyncLocalStorage<Context>()
