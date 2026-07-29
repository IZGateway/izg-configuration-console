import { DbAudit } from './DbAudit'
import { AllowedUseType } from './AllowedUseType'

export interface ApiKeyCredential extends DbAudit {
  jti: string
  sortKey: string
  jurisdictionId: string
  jurisdictionDescription: string
  status: string
  expiresAt: Date | null
  // When the key was actually issued (became Active). For the DNS-challenge
  // flow this is stamped at activation, not at record creation, so exp is
  // computed from issuance. Falls back to createdOn for keys issued at create.
  issuedAt?: Date | null
  revokedAt: Date | null
  env: string
  description?: string
  graceExpiresAt?: Date | null
  domain?: string
  viewedAt?: Date | null
  useTypes?: AllowedUseType[]
  // Soft-cancel audit fields (set when a ready_for_validation request is cancelled)
  cancelledBy?: string
  cancelledAt?: Date | null
}
