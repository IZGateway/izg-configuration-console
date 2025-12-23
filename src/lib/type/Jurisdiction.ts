import { DbAudit } from "./DbAudit"

export interface Jurisdiction extends DbAudit {
  jurisdictionId: number
  name: string
  description: string
}
