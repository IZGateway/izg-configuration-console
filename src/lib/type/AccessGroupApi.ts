// API request/response types for Access Group endpoints
import { AccessGroupRecord } from './AccessGroupRecord'

export interface CreateAccessGroupRequest {
  environment: number
  groupName: string
  roles?: string[]
  users?: string[]
  groups?: string[]
  description?: string
}

export interface UpdateAccessGroupRequest {
  roles?: string[]
  users?: string[]
  groups?: string[]
  description?: string
}

// Re-export AccessGroupRecord as the response type
export type AccessGroupResponse = AccessGroupRecord

export interface DeleteAccessGroupResponse {
  message: string
}

export interface ErrorResponse {
  error: string
}
