/**
 * Immutable audit row for an API key credential lifecycle action.
 *
 * Mirrors the shape produced by `createAuditRecord`/`fetchAuditHistory`
 * (see `lib/db/auditHelper.ts`), the same mechanism already used for
 * AllowedUser, AccessGroup, DenyList and AdsFileType.
 *
 * Note the identifying field is `credentialSortKey`, NOT `sortKey`: the audit
 * row's own DynamoDB `sortKey` is the composite `<credentialSortKey>#<timestamp>`
 * key, and `createAuditRecord` writes it last — so an `additionalData.sortKey`
 * would be silently clobbered by it and the credential reference lost.
 */
export type ApiKeyCredentialChangeType =
  | 'Create' // credential minted (active, or ready_for_validation)
  | 'Activate' // DNS challenge satisfied; credential became active
  | 'Renew' // superseded by a successor; entered grace_period
  | 'Reissue' // expired credential replaced by a successor
  | 'Revoke'
  | 'Cancel'
  | 'TokenViewed' // the one-time JWT reveal

export interface ApiKeyCredentialAudit {
  id: string | number
  /** sortKey of the ApiKeyCredential this row describes. */
  credentialSortKey: string
  jurisdictionId?: string
  tableName: string
  userName: string
  changeType: ApiKeyCredentialChangeType | string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  createdAt: Date
  /**
   * Action-specific context that is not part of the credential itself —
   * e.g. the revoke `reason`, the successor `jti` on Renew/Reissue, or
   * `verificationMethod` on Activate.
   */
  [key: string]: unknown
}
