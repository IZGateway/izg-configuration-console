import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import { DenyListItem } from '../type/DenyList'
import { AccessGroupRecord } from '../type/AccessGroupRecord'
import { AdsFileTypeItem } from '../type/AdsFileType'
import { SenderRecord } from '../type/SenderRecord'
import { AllowedUser } from '../type/AllowedUser'
import { AllowedUserAudit } from '../type/AllowedUserAudit'

export default interface ConfigConsoleFetchRepository {
  fetchDestination(destId: string, destType: number): Promise<Destination>
  fetchAllDestinations(): Promise<Destination[]>
  fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    jurisdictions: Array<string>
  ): Promise<Destination[]>
  fetchDestinationAuditHistory(
    destId: string,
    destTypeId: number
  ): Promise<DestinationAudit[]>
  fetchDestinationChangeRequestById(
    id: number
  ): Promise<DestinationChangeRequest>
  fetchDestinationChangeRequestByDestIdAndDestType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationChangeRequest>
  fetchDestinationType(destType: string): Promise<DestinationType>
  fetchChangeRequestPassword(id: number): Promise<string>
  fetchDestinationPassword(destId: string, destType: number): Promise<string>
  isPasswordChanged(destId: string, dest_type: number): Promise<boolean>
  isDatabaseConnected(): Promise<boolean>
  fetchSenderData: () => Promise<SenderRecord>
  fetchAccessGroups: () => Promise<AccessGroupRecord[]>
  fetchDenyListData: () => Promise<DenyListItem[]>
  checkDenyListRecordExists: (sortKey: string) => Promise<boolean>
  fetchFileTypeList: () => Promise<AdsFileTypeItem[]>
  checkAdsFileTypeRecordExists: (sortKey: string) => Promise<boolean>
  fetchOrganizations: () => Promise<unknown>
  fetchAllowedUser(
    environment: number,
    destinationId: string,
    principal: string
  ): Promise<AllowedUser | null>
  fetchAllowedUsers(): Promise<AllowedUser[]>
  fetchAllowedUsersByDestination(
    isAdmin: boolean,
    destinations: Array<string>
  ): Promise<AllowedUser[]>
  fetchAllowedUserAuditHistory(
    principal: string,
    environment: number,
    destinationId: string
  ): Promise<AllowedUserAudit[]>
}
