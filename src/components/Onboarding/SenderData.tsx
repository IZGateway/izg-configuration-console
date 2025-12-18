export interface SenderData {
  id: string
  sender: string
  senderDetails: string
  destination: string
  destinationCode: string
  destinationType: number // Environment ID (1-6) representing PRODUCTION, TEST, ONBOARD, STAGE, DEV, or UNKNOWN
  accessLevel: string
  status: string
  lastUpdated: string
  connectionType: string
  isConnected: boolean
  msh3: string
  msh4: string
  facilityId: string
  validatedOn?: string | null // ISO timestamp when status is 'validate', null when status is 'ready'
}
