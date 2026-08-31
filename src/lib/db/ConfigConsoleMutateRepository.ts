import { Destination } from '../type/Destination'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DenyListItem } from '../type/DenyList'
import { AccessGroupRecord } from '../type/AccessGroupRecord'
import { AdsFileTypeItem } from '../type/AdsFileType'
import { AllowedUser } from '../type/AllowedUser'
import type { AllowedUseType } from '../type/AllowedUseType'

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
  cancelApiKeyCredential(
    sortKey: string,
    cancelledBy: string,
    cancelledAt: string
  ): Promise<void>
  revokeApiKeyCredential(
    sortKey: string,
    revokedBy: string,
    revokedAt: string,
    reason?: string,
    expectedStatuses?: string[]
  ): Promise<void>
  upsertApiKeyDomain(params: {
    sortKey: string
    domain: string
    env: number
    jurisdictionId: string
    status: 'pending_challenge' | 'authorized'
    challengeUuid?: string
    challengeExpiresAt?: string
    requestedBy?: string
    validatedAt?: string
    authExpiresAt?: string
  }): Promise<void>
  claimDomainOwnership(
    domain: string,
    jurisdictionId: string
  ): Promise<{ claimed: boolean; ownerJurisdictionId?: string }>
  getDomainOwner(domain: string): Promise<string | undefined>
  supersedeApiKeyCredential(params: {
    sortKey: string
    renewedBy: string
    renewedAt: string
    graceExpiresAt: string
    supersededBy: string
  }): Promise<void>
  markApiKeyCredentialReissued(params: {
    sortKey: string
    reissuedBy: string
    reissuedAt: string
    reissuedAs: string
  }): Promise<void>
  createApiKeyCredential(params: {
    jti: string
    sortKey: string
    useTypes?: AllowedUseType[]
    jurisdictionId: string
    environments: number[]
    status: string
    createdOn: Date
    expiresAt?: Date | null
    createdBy: string
    description?: string
    domain?: string
  }): Promise<void>
  updateApiKeyCredentialStatus(params: {
    sortKey: string
    status: string
    expiresAt?: string
    issuedAt?: string
    expectedStatus?: string
  }): Promise<void>
  markApiKeyCredentialViewed(sortKey: string, viewedAt: string): Promise<void>
}
