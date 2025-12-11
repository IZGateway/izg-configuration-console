export interface AllowedUser {
  principal: string
  environment: number
  destinationId: string
  organization: string
  enabled: boolean
  createdBy: string
  createdOn: Date | null
  updatedBy: string
  updatedOn: Date | null
  validatedOn: Date | null
}

// Serialized version for Next.js getServerSideProps (Date -> string)
export interface SerializedAllowedUser {
  principal: string
  environment: number
  destinationId: string
  organization: string
  enabled: boolean
  createdBy: string
  createdOn: string
  updatedBy: string
  updatedOn: string
  validatedOn: string
}
