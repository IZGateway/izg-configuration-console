import { DestinationChangeRequest } from '../type/DestinationChangeRequest'

export default interface ConfigConsoleMutateRepository {
  upsertDestinationChangeRequest(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest>
  deleteDraftValues(
    id: number,
    destId: string,
    dest_type: number
  ): Promise<boolean>
  deleteChangeRequest(destId: string, destType: number): Promise<boolean>
  updatedAuditedDestination(
    destId: string,
    destType: number,
    updatedData: object,
    user: string,
    oldValues: object,
    isPasswordDifferent: boolean
  ): Promise<any>
  upsertDraftRecord(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest>
  maintenanceRequest(
    destId: string,
    destType: number,
    maintData: any
  ): Promise<any>
  updateChangeRequest(
    destId: string,
    destType: number,
    updatedData: any
  ): Promise<DestinationChangeRequest>
}
