import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'

export default interface ConfigConsoleRepository {
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
  fetchDraftRecord(destId: string, dest_type: number): Promise<any>
  fetchJurisdictionByDestId(destId: string): Promise<any>
  isPasswordChangedForIdAndType(
    destId: string,
    dest_type: number
  ): Promise<boolean>

  upsertDestinationChangeRequest(changeRequestData: any): Promise<any>
  deleteDestinationChangeRequest(id: any): Promise<any>
  deleteDraftValues(id: number, destId: string, dest_type: number): Promise<any>
  cancelChangeRequest(destId: string, destType: number): Promise<any>
  updatedAuditedDestination(
    destId: string,
    destType: number,
    updatedData: object,
    user: string,
    oldValues: object,
    isPasswordDifferent: object
  ): Promise<any>
  upsertDraftRecord(changeRequestData: any): Promise<any>
  maintenanceRequest(
    destId: string,
    destType: number,
    maintData: any
  ): Promise<any>
  updateChangeRequest(
    destId: string,
    destType: number,
    updatedData: any
  ): Promise<any>
}
