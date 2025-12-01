import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'

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
  fetchSenderData: () => Promise<any>
  fetchAccessGroups: () => Promise<any>
  fetchDenyListData: () => Promise<any>
  checkDenyListRecordExists: (sortKey: string) => Promise<boolean>
  fetchFileTypeList: () => Promise<any>
  checkAdsFileTypeRecordExists: (sortKey: string) => Promise<boolean>
  fetchOrganizations: () => Promise<any>
}
