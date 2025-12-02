import { DbAudit } from './DbAudit'

export interface DenyListItem extends DbAudit {
  id: string
  name: string
  reason?: string
  dateDenied?: string
  deniedBy?: string
  certificationName?: string
  environment: string | number
}
