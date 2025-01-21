import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'

export default interface ConfigConsoleFetchRepository {
  fetchDestinationByIdAndType(
    destId: string,
    destType: number
  ): Promise<Destination>
  fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    jurisdictions: Array<string>
  ): Promise<Destination[]>
  fetchDestinationAuditHistoryByIdAndType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationAudit[]>
  fetchDestinationChangeRequestByIdAndType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationChangeRequest>
  fetchDestinationType(destType: string): Promise<DestinationType>
  fetchChangeRequestPasswordByIdAndType(
    destId: string,
    destType: number
  ): Promise<string>
  fetchDestinationPasswordByIdAndType(
    destId: string,
    destType: number
  ): Promise<string>
  fetchDraftRecord(
    destId: string,
    dest_type: number
  ): Promise<DestinationChangeRequest>
  isPasswordChangedForIdAndType(
    destId: string,
    dest_type: number
  ): Promise<boolean>
}
