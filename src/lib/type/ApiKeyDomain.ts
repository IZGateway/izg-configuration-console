import { DbAudit } from './DbAudit'

export interface ApiKeyDomain extends DbAudit {
  sortKey: string
  domain: string
  env: string
  status: 'pending_challenge' | 'authorized'
  challengeUuid?: string
  challengeExpiresAt?: Date | null
  requestedBy?: string
  validatedAt?: Date | null
  authExpiresAt?: Date | null
}
