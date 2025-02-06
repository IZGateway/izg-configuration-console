/* eslint-disable @typescript-eslint/no-unused-vars */
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import ConfigConsoleRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'
class Dynamo implements ConfigConsoleRepository, ConfigConsoleMutateRepository {
  fetchDestination(destId: string, destType: number): Promise<Destination> {
    throw new Error('Method not implemented.')
  }
  fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    jurisdictions: string[]
  ): Promise<Destination[]> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationAuditHistory(
    destId: string,
    destTypeId: number
  ): Promise<DestinationAudit[]> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationChangeRequestById(
    id: number
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationChangeRequestByDestIdAndDestType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationType(destType: string): Promise<DestinationType> {
    throw new Error('Method not implemented.')
  }
  fetchChangeRequestPassword(id: number): Promise<string> {
    throw new Error('Method not implemented.')
  }
  fetchDestinationPassword(destId: string, destType: number): Promise<string> {
    throw new Error('Method not implemented.')
  }
  isPasswordChanged(destId: string, dest_type: number): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  isDatabaseConnected(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  upsertDestinationChangeRequest(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest> {
    throw new Error('Method not implemented.')
  }
  deleteDestinationChangeRequest(id: number): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  createDestinationChangeRequestDeploymentAudit(
    changeRequest: DestinationChangeRequest,
    user: string
  ): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  updateDestination(destination: Destination): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
}

export default Dynamo
