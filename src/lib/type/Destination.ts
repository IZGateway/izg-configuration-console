export type Destination = {
  destId: string
  destTypeId: number
  destUri: string
  destVersion: string
  username: string
  MSH6: string
  MSH22: string
  MSH3: string
  MSH4: string
  MSH5: string
  RXA11: string
  facilityId: string
  passExpiry: Date
  maintReason: string
  maintStart: Date
  maintEnd: Date
  destinationType: {
    type: string
    typeId: number
  }
  jurisdiction: {
    name: string
    description: string
  }
}
