// Local-only mock data for the Organizations dropdown (Create Key dialog +
// filter panel), so the create/renew/validate workflow can be exercised
// without a live /api/jurisdictions call or seeding DynamoDB.
//
// Enable by setting NEXT_PUBLIC_MOCK_ORGANIZATIONS=true (see src/.env.template).
// Off by default — must be explicitly opted into locally, never on in a real
// deployment.
//
// Shape mirrors the actual GET /api/jurisdictions response (fetchJurisdictions
// in src/lib/db/dynamo.ts: jurisdictionId, sortKey, name, description,
// createdBy, createdOn) plus the two role-specific use-type fields from the
// IGDD-3140 spec:
//   • allowedUseTypes — JURISDICTION (destination) policy: which credential
//     categories the jurisdiction accepts. Varied per the IGDD-3140 spec
//     examples (Texas=[PROVIDER], NJ/Utah=all three, MA=[PROVIDER,
//     PUBLIC_HEALTH]) so the intersection rule is testable.
//   • useTypes — SENDER (submitter) capability. A sender may submit under any
//     of PATIENT / PROVIDER / PUBLIC_HEALTH.
// A credential is valid for a destination only when credential.useTypes ∩
// destination.jurisdiction.allowedUseTypes is non-empty (IGDD-3140 design).
// These are distinct roles: a jurisdiction row carries allowedUseTypes, a
// sender row carries useTypes (an org could in principle be both). Per the
// IGDD-3140 design a non-jurisdiction sender is still stored as a Jurisdiction
// row, so both kinds share this one Organizations list.
import { Jurisdiction } from '../../lib/type/Jurisdiction'

export const MOCK_ORGANIZATIONS_ENABLED =
  process.env.NEXT_PUBLIC_MOCK_ORGANIZATIONS === 'true'

const mockAudit = {
  createdBy: 'mock-data',
  createdOn: new Date('2026-01-01T00:00:00Z'),
}

export const mockOrganizations: Jurisdiction[] = [
  // ── Jurisdictions (destinations) — allowedUseTypes varies per policy ──────
  {
    jurisdictionId: 9001,
    sortKey: '9001',
    name: 'CA',
    description: 'California IZ Program',
    // Fully open (cf. spec NJ/Utah example).
    allowedUseTypes: ['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH'],
    ...mockAudit,
  },
  {
    jurisdictionId: 9002,
    sortKey: '9002',
    name: 'TX',
    description: 'Texas Immunization Registry',
    // Provider-only, matching the spec's literal Texas example.
    allowedUseTypes: ['PROVIDER'],
    ...mockAudit,
  },
  {
    jurisdictionId: 9003,
    sortKey: '9003',
    name: 'NY',
    description: 'New York State IIS',
    // cf. spec Massachusetts example.
    allowedUseTypes: ['PROVIDER', 'PUBLIC_HEALTH'],
    ...mockAudit,
  },
  {
    jurisdictionId: 9004,
    sortKey: '9004',
    name: 'WA',
    description: 'Washington State IIS',
    // Public-health only — exercises the narrow single-category case.
    allowedUseTypes: ['PUBLIC_HEALTH'],
    ...mockAudit,
  },
  // ── Senders (submitters) — useTypes across PATIENT / PROVIDER / PUBLIC_HEALTH
  {
    jurisdictionId: 9101,
    sortKey: '9101',
    name: 'WALGREENS',
    description: 'Walgreens Pharmacy',
    useTypes: ['PATIENT', 'PROVIDER', 'PUBLIC_HEALTH'],
    ...mockAudit,
  },
  {
    jurisdictionId: 9102,
    sortKey: '9102',
    name: 'CVS',
    description: 'CVS Health',
    useTypes: ['PATIENT', 'PROVIDER'],
    ...mockAudit,
  },
  {
    jurisdictionId: 9103,
    sortKey: '9103',
    name: 'KAISER',
    description: 'Kaiser Permanente',
    useTypes: ['PATIENT'],
    ...mockAudit,
  },
]
