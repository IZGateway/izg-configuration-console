export type Destination = {
  dest_id: string
  dest_uri: string
  dest_version: string
  username: string
  MSH6: string
  MSH22: string
  MSH3: string
  MSH4: string
  MSH5: string
  RXA11: string
  facility_id: string
  pass_expiry: Date
  destination_type: {
    type: string
    type_id: number
  }
  jurisdiction: {
    name: string
    description: string
  }
}
