export interface AllowedUser {
  principal: string
  environment: number
  destinationId: string
  enabled: boolean
  createdBy: string
  createdOn: Date
  updatedBy: string
  updatedOn: Date
  validatedOn: Date
}

// Serialized version for Next.js getServerSideProps (Date -> string)
export interface SerializedAllowedUser {
  principal: string
  environment: number
  destinationId: string
  enabled: boolean
  createdBy: string
  createdOn: string
  updatedBy: string
  updatedOn: string
  validatedOn: string
}
