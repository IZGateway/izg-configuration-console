export interface AccessGroupRecord {
  environment: string
  groupName: string
  sortKey: string
  updatedBy: string
  createdBy: string
  entityType: string
  roles: string[]
  groups: string[]
  updatedOn: string
  createdOn: string
  users: string[]
  description?: string
}
