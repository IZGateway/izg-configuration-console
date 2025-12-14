export interface AllowedUserAudit {
  id: string | number
  principal: string
  environment: number
  destinationId: string
  tableName: string
  userName: string
  changeType: string // 'Create', 'Update', 'Delete'
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  createdAt: Date
}
