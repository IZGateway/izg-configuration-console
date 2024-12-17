/* eslint-disable @typescript-eslint/no-unused-vars */
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import ConfigConsoleRepository from './ConfigConsoleRepository'

class Dynamo implements ConfigConsoleRepository {
  fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    jurisdictions: string[]
  ): Promise<Destination[]> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationAuditHistoryByIdAndType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationAudit[]> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationChangeRequestByIdAndType(
    destId: string,
    dest_type: number
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  lookupDestinationVersion: null
  destinationChangeRequestId = null
  fetchDestinationByIdAndType = null
  destinationType = null
  fetchDraftRecord = null
  jurisdiction = null
  passwordComparison = null

  upsertDestinationChangeRequest = null
  deleteDestinationChangeRequest = null
  deleteDraftValues = null
  cancelChangeRequest = null
  updatedAuditedDestination = null
  upsertDraftRecord = null
  maintenanceRequest = null
  updateChangeRequest = null
}

export default Dynamo
