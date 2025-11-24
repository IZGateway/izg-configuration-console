export interface AllowedUserAudit {
  id: string | number
  principal: string
  environment: number
  destinationId: string
  tableName: string
  userName: string
  changeType: string // 'Create', 'Update', 'Delete'
  oldValues: JSON | null
  newValues: JSON | null
  createdAt: Date
}
