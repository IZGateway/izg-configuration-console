import { Destination } from '../type/Destination'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { AllowedUser } from '../type/AllowedUser'
import { AllowedUserAudit } from '../type/AllowedUserAudit'
import { DenyListItem } from '../type/DenyList'

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
  addDenyListRecord(denyListItem: {
    principal: string
    environment: number
    reason?: string
    deniedBy?: string
  }): Promise<DenyListItem>
  deleteDenyListRecord(id: string): Promise<boolean>
}
