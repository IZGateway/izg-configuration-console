import { DbAudit } from './DbAudit'

export interface AdsFileTypeItem extends DbAudit {
  sortKey: string
  fileTypeName: string
  description?: string
}
