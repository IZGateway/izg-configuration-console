export interface AllowedUserAudit {
  id: string | number
  principal: string
  environment: number
  destinationId: string
  tableName: string
  userName: string
  changeType: string // 'Create', 'Update', 'Delete'
  oldValues: Record<string, string | number | boolean | Date | null> | null
  newValues: Record<string, string | number | boolean | Date | null> | null
  createdAt: Date
}
