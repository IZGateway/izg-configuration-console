import logger from '../../../logger'
import type { ApiKeyCredential } from '../type/ApiKeyCredential'
import type { ApiKeyCredentialChangeType } from '../type/ApiKeyCredentialAudit'

/** The subset of the db client this helper needs, so routes can pass theirs directly. */
interface AuditCapableClient {
  createApiKeyCredentialAudit?: (
    changeType: string,
    credentialSortKey: string,
    userName: string,
    oldValues: ApiKeyCredential | null,
    newValues: ApiKeyCredential | null,
    additionalData?: Record<string, unknown>
  ) => Promise<boolean>
}

export interface ApiKeyAuditParams {
  changeType: ApiKeyCredentialChangeType
  /** sortKey of the credential the action was performed on. */
  credentialSortKey: string
  /** Acting user (session email). */
  userName: string
  oldValues?: ApiKeyCredential | null
  newValues?: ApiKeyCredential | null
  /**
   * Action-specific context that is not part of the credential snapshot —
   * the revoke `reason`, the successor `jti` on Renew/Reissue,
   * `verificationMethod` on Activate, the authorizing grant.
   */
  context?: Record<string, unknown>
}

/**
 * Writes an API key lifecycle audit row, best-effort.
 *
 * Deliberately never throws: it is always called AFTER the mutation it
 * describes has already committed, so propagating a failure would fail a
 * request whose effect already happened — telling the caller nothing changed
 * when something did. A failed write is logged at error level instead. This
 * matches the convention already used for the DenyList / AccessGroup /
 * AdsFileType audit writes ("Continue even if audit fails").
 */
export async function recordApiKeyAudit(
  dbClient: AuditCapableClient,
  params: ApiKeyAuditParams
): Promise<void> {
  const { changeType, credentialSortKey, userName, oldValues, newValues, context } =
    params
  try {
    await dbClient.createApiKeyCredentialAudit?.(
      changeType,
      credentialSortKey,
      userName,
      oldValues ?? null,
      newValues ?? null,
      context
    )
  } catch (auditError) {
    logger.error('Failed to create API key credential audit record', {
      operation: 'createApiKeyCredentialAudit',
      changeType,
      credentialSortKey,
      userName,
      errorMessage:
        auditError instanceof Error ? auditError.message : 'Unknown error',
    })
  }
}
