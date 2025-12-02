export interface DbAudit {
  createdBy: string
  createdOn: Date
  updatedBy?: string
  updatedOn?: Date
}
