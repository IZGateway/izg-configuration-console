export default interface ConfigConsoleRepository {
  destination(destId: string, destType: number): Promise<any>
  destinations(isAdmin: boolean, jurisdictions: any): Promise<any>
  destinationaudithistory(destId: string, destTypeId: any): Promise<any>
  destinationChangeRequest(destId: string, dest_type: number): Promise<any>
  destinationType(destType: string): Promise<any>
  fetchDraftRecord(destId: string, dest_type: number): Promise<any>
  jurisdiction(destId: string): Promise<any>
  passwordComparison(destId: string, dest_type: number): Promise<any>
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
