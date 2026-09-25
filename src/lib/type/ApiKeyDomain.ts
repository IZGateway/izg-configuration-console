import { DbAudit } from './DbAudit'

export interface ApiKeyDomain extends DbAudit {
  sortKey: string
  domain: string
  env: number
  jurisdictionId: string
  status: 'pending_challenge' | 'authorized'
  challengeUuid?: string
  challengeExpiresAt?: Date | null
  requestedBy?: string
  validatedAt?: Date | null
  // Who proved DNS ownership, and how. `upsertApiKeyDomain` is a Put (full
  // overwrite), so the authorization write must carry `requestedBy` forward
  // explicitly or the requester is erased at the moment of authorization.
  validatedBy?: string
  verificationMethod?: 'dns_txt' | 'bypass'
  authExpiresAt?: Date | null
}
