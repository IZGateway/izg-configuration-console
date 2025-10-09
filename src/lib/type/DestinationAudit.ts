export interface DestinationAudit {
  id: string | number
  destId: string
  destType: number
  tableName: string
  userName: string
  changeType: string
  isPasswordDifferent?: boolean
  oldValues: JSON
  newValues: JSON
  createdAt: Date
}
