export interface SenderRecord {
  id: string
  sender: string
  senderDetails: string
  destination: string
  destinationCode: string
  accessLevel: string
  status: string
  lastActive: string
  connectionType: 'production' | 'onboarding'
  isConnected: boolean
}
