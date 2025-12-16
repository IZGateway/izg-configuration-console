import { DbAudit } from "./DbAudit"

export interface AccessGroupRecord extends DbAudit {
  environment: string
  groupName: string
  sortKey: string
  entityType: string
  roles: string[]
  groups: string[]
  users: string[]
  description?: string
}
