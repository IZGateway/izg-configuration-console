export interface DestinationAudit {
  id: number
  destId: string
  destType: number
  tableName: string
  userName: string
  changeType: string
  oldValues: string
  newValues: string
  createdAt: Date
}
