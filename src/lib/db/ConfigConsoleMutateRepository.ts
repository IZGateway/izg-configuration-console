import { Destination } from '../type/Destination'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DenyListItem } from '../type/DenyList'
import { AccessGroupRecord } from '../type/AccessGroupRecord'
import { AdsFileTypeItem } from '../type/AdsFileType'
import { AllowedUser } from '../type/AllowedUser'

export default interface ConfigConsoleMutateRepository {
  upsertDestinationChangeRequest(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest>
  deleteDestinationChangeRequest(id: number): Promise<boolean>
  createDestinationChangeRequestDeploymentAudit(
    changeRequest: DestinationChangeRequest,
    user: string
  ): Promise<boolean>
  updateDestination(destination: Destination): Promise<boolean>
  addDenyListRecord(denyListItem: {
    principal: string
    environment: number
    reason?: string
    deniedBy?: string
    createdBy: string
  }): Promise<DenyListItem>
  deleteDenyListRecord(id: string): Promise<boolean>
  updateAccessGroup(
    sortKey: string,
    updateData: Partial<AccessGroupRecord>
  ): Promise<AccessGroupRecord>
  addAccessGroup(accessGroup: {
    environment: string
    groupName: string
    description?: string
    roles?: string[]
    users?: string[]
    groups?: string[]
    createdBy: string
  }): Promise<AccessGroupRecord>
  deleteAccessGroup(sortKey: string): Promise<boolean>
  createAccessGroupAudit(
    changeType: string,
    sortKey: string,
    userName: string,
    oldValues: AccessGroupRecord | null,
    newValues: AccessGroupRecord | null
  ): Promise<boolean>
  addAdsFileTypeRecord(fileTypeItem: {
    fileTypeName: string
    sortKey: string
    description: string
    createdBy: string
  }): Promise<boolean>
  deleteAdsFileTypeRecord(sortKey: string): Promise<boolean>
  createDenyListAudit(
    changeType: string,
    id: string,
    userName: string,
    oldValues: DenyListItem | null,
    newValues: DenyListItem | null
  ): Promise<boolean>
  createAdsFileTypeAudit(
    changeType: string,
    sortKey: string,
    userName: string,
    oldValues: AdsFileTypeItem | null,
    newValues: AdsFileTypeItem | null
  ): Promise<boolean>
  upsertAllowedUser(allowedUser: AllowedUser): Promise<AllowedUser>
  deleteAllowedUser(
    principal: string,
    environment: number,
    destinationId: string
  ): Promise<boolean>
  createAllowedUserAudit(
    changeType: string,
    principal: string,
    environment: number,
    destinationId: string,
    userName: string,
    oldValues: AllowedUser | null,
    newValues: AllowedUser | null
  ): Promise<boolean>
  revokeApiKeyCredential(
    sortKey: string,
    revokedBy: string,
    revokedAt: string,
    reason?: string
  ): Promise<void>
  upsertApiKeyDomain(params: {
    sortKey: string
    domain: string
    env: string
    status: 'pending_challenge' | 'authorized'
    challengeUuid?: string
    challengeExpiresAt?: string
    requestedBy?: string
    validatedAt?: string
    authExpiresAt?: string
  }): Promise<void>
  supersedApiKeyCredential(params: {
    sortKey: string
    renewedBy: string
    renewedAt: string
    graceExpiresAt: string
    supersededByJti: string
  }): Promise<void>
  createApiKeyCredential(params: {
    jti: string
    sortKey: string
    jurisdictionId: string
    env: string
    status: string
    createdOn: Date
    expiresAt: Date
    createdBy: string
    description?: string
    domain?: string
  }): Promise<void>
  updateApiKeyCredentialStatus(params: {
    sortKey: string
    status: string
    expiresAt?: string
  }): Promise<void>
  markApiKeyCredentialViewed(sortKey: string, viewedAt: string): Promise<void>
}
