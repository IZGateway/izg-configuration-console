import { DestinationConnectionSettings } from './DestinationConnectionSettings'
import { DestinationType } from './DestinationType'
import { Jurisdiction } from './Jurisdiction'

export type DestinationChangeRequest = {
  id: number
  destId: string
  destType: DestinationType
  destUri: string
  jurisdiction?: Jurisdiction
  jiraId: string
  requestedAt: Date
  requestedBy: string
  scheduledAt: Date
  isAsap?: boolean
  isDraft?: boolean
  isPasswordDifferent?: boolean
  current?: DestinationConnectionSettings
  requested: DestinationConnectionSettings
}
