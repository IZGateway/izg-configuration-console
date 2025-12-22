import { DbAudit } from './DbAudit'
import { DestinationConnectionSettings } from './DestinationConnectionSettings'
import { DestinationType } from './DestinationType'
import { Jurisdiction } from './Jurisdiction'

export interface Destination extends DestinationConnectionSettings, DbAudit {
  destId: string
  destVersion?: string
  passExpiry?: Date
  maintReason?: string
  maintStart?: Date
  maintEnd?: Date
  destinationType: DestinationType
  jurisdiction?: Jurisdiction
}
