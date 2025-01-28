export type DestinationAudit = {
  id: number
  destId: string
  destType: number
  tableName: string
  userName: string
  changeType: string
  oldValues: JSON
  newValues: JSON
  createdAt: Date
}
