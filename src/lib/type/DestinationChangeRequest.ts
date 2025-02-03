import { DestinationConnectionSettings } from './DestinationConnectionSettings'
import { DestinationType } from './DestinationType'
import { Jurisdiction } from './Jurisdiction'

export interface DestinationChangeRequest {
  id: number
  destId: string
  destType: DestinationType
  jurisdiction?: Jurisdiction
  jiraId: string
  requestedAt: Date
  requestedBy: string
  scheduledAt?: Date | null
  isAsap?: boolean
  isDraft: boolean
  isPasswordDifferent?: boolean
  current?: DestinationConnectionSettings
  requested: DestinationConnectionSettings
}
