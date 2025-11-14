import { Destination } from '../type/Destination'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { AllowedUser } from '../type/AllowedUser'
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
  addDenyListRecord(denyListItem: {
    principal: string
    environment: number
    reason?: string
    deniedBy?: string
  }): Promise<DenyListItem>
  deleteDenyListRecord(id: string): Promise<boolean>
}
