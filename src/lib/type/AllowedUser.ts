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
  [key: string]: string | number | boolean | Date | null
}

// Serialized version for Next.js getServerSideProps (Date -> string)
export interface SerializedAllowedUser {
  principal: string
  environment: number
  destinationId: string
  organization: string
  enabled: boolean
  createdBy: string
  createdOn: string | null
  updatedBy: string
  updatedOn: string | null
  validatedOn: string | null
}
