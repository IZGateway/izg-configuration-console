import { AsyncLocalStorage } from 'async_hooks'

export interface Context {
  user: string
  ipAddress: string
  sub?: string // Unique subject identifier from auth provider
}

export const asyncRequestContext = new AsyncLocalStorage<Context>()
