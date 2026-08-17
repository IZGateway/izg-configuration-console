import { DbAudit } from "./DbAudit"
import { AllowedUseType } from "./AllowedUseType"

export interface Jurisdiction extends DbAudit {
  jurisdictionId: number
  // DynamoDB sort key for the Jurisdiction row — the string form of
  // jurisdictionId. Returned by GET /api/jurisdictions (fetchJurisdictions).
  sortKey?: string
  name: string
  description: string
  // JURISDICTION (destination/receiver) role policy — IGDD-3140 spec
  // `Jurisdiction.allowedUseTypes`: the use-type categories this jurisdiction
  // accepts as a destination. An empty array means DENY-ALL. Optional until the
  // backfill migration lands.
  allowedUseTypes?: AllowedUseType[]
  // SENDER (submitter) role capability — the use-type categories a sender may
  // submit under (PATIENT / PROVIDER / PUBLIC_HEALTH). Distinct from
  // `allowedUseTypes`: an org can act as both a sender and a jurisdiction.
  useTypes?: AllowedUseType[]
}
