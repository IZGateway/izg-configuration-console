import { DbAudit } from "./DbAudit"

export interface OrganizationRecord extends DbAudit {
  organizationName: string
  principalNames: string[]
}
