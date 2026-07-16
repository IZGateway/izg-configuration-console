import { DbAudit } from './DbAudit'

export interface ApiKeyCredential extends DbAudit {
  jti: string
  sortKey: string
  jurisdictionId: string
  jurisdictionDescription: string
  status: string
  expiresAt: Date | null
  revokedAt: Date | null
  env: string
  description?: string
  graceExpiresAt?: Date | null
  domain?: string
  viewedAt?: Date | null
}
