import { DbAudit } from './DbAudit'

export interface ApiKeyCredential extends DbAudit {
  jti: string
  sortKey: string
  jurisdictionId: string
  jurisdictionDescription: string
  status: 'Active' | 'Grace Period' | 'Revoked'
  expiresAt: Date | null
  revokedAt: Date | null
  env: string
}
