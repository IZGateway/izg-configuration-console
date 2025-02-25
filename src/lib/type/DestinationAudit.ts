export interface DestinationAudit {
  id: string
  destId: string
  destType: number
  tableName: string
  userName: string
  changeType: string
  oldValues: JSON
  newValues: JSON
  createdAt: Date
}
