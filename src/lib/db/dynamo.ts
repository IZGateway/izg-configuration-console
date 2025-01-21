/* eslint-disable @typescript-eslint/no-unused-vars */
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import ConfigConsoleRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'

class Dynamo implements ConfigConsoleRepository, ConfigConsoleMutateRepository {
  upsertDestinationChangeRequest(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  deleteDraftValues(
    id: number,
    destId: string,
    dest_type: number
  ): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  deleteChangeRequest(destId: string, destType: number): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  updatedAuditedDestination(
    destId: string,
    destType: number,
    updatedData: object,
    user: string,
    oldValues: object,
    isPasswordDifferent: boolean
  ): Promise<any> {
    throw new Error('Method not implemented.')
  }
  upsertDraftRecord(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  maintenanceRequest(
    destId: string,
    destType: number,
    maintData: any
  ): Promise<any> {
    throw new Error('Method not implemented.')
  }
  updateChangeRequest(
    destId: string,
    destType: number,
    updatedData: any
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationByIdAndType(
    destId: string,
    destType: number
  ): Promise<Destination> {
    throw new Error('Method not implemented.')
  }
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
    destTypeId: number
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationType(destType: string): Promise<DestinationType> {
    throw new Error('Method not implemented.')
  }
  fetchChangeRequestPasswordByIdAndType(
    destId: string,
    destType: number
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationPasswordByIdAndType(
    destId: string,
    destType: number
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
  fetchDraftRecord(
    destId: string,
    dest_type: number
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  isPasswordChangedForIdAndType(
    destId: string,
    dest_type: number
  ): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
}

export default Dynamo
