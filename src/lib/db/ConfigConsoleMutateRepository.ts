import { Destination } from '../type/Destination'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DenyListItem } from '../type/DenyList'
import { AccessGroupRecord } from '../type/AccessGroupRecord'

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
  addDenyListRecord(denyListItem: {
    principal: string
    environment: number
    reason?: string
    deniedBy?: string
  }): Promise<DenyListItem>
  deleteDenyListRecord(id: string): Promise<boolean>
  updateAccessGroup(sortKey: string, updateData: any): Promise<any>
  addAccessGroup(accessGroup: {
    environment: string
    groupName: string
    description?: string
    roles?: string[]
    users?: string[]
    groups?: string[]
    createdBy: string
  }): Promise<AccessGroupRecord>
  deleteAccessGroup(sortKey: string): Promise<boolean>
}
