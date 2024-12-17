export type DestinationChangeRequest = {
  id: number
  destId: string
  destUri: string
  destType: number
  jiraId: string
  MSH22: string
  MSH3: string
  MSH4: string
  MSH5: string
  MSH6: string
  requestedAt: Date
  requestedBy: string
  RXA11: string
  scheduledAt: Date
  username: string
  facilityId: string
  destinations: {
    destinationType: {
      type: string
      typeId: number
    }
    jurisdiction: {
      name: string
      description: string
    }
  }
}
