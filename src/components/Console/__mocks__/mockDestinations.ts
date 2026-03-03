/**
 * Mock destination data for tests and local development.
 *
 * Key scenarios covered:
 *  - destId "404" (Georgia IIS)  → exists in PRODUCTION + ONBOARD  (multi-env)
 *  - destId "101" (New York)     → exists in PRODUCTION + STAGE + DEV (multi-env)
 *  - destId "202" (Florida)      → exists in PRODUCTION only (single-env)
 *  - destId "303" (CDC)          → exists in DEV only (single-env)
 *
 * The API returns one record per (destId × destTypeId) combination, so the same
 * destId can appear multiple times with different destinationType values.
 */

export interface MockDestination {
  destId: string
  jurisdictionName?: string
  jurisdiction?: {
    jurisdictionId: number
    name: string
    description: string
  }
  destinationType?: {
    typeId: number // 1=PRODUCTION, 2=TEST, 3=ONBOARD, 4=STAGE, 5=DEV
    type: string
  }
}

export const mockDestinations: MockDestination[] = [
  // ── Development – Development (destTypeId 5)
  {
    destId: 'dev',
    jurisdictionName: 'Development',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 5, type: 'DEV' },
  },
  {
    destId: 'dev',
    jurisdictionName: 'Development',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 1, type: 'PRODUCTION' },
  },
  // ── Georgia IIS – Onboarding (destTypeId 3)
  {
    destId: 'dev',
    jurisdictionName: 'Development',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 3, type: 'ONBOARD' },
  },

  // ── New York – Production (destTypeId 1)
  {
    destId: '101',
    jurisdictionName: 'New York',
    jurisdiction: {
      jurisdictionId: 36,
      name: 'NY',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 1, type: 'PRODUCTION' },
  },
  // ── New York – Staging (destTypeId 4)
  {
    destId: '101',
    jurisdictionName: 'New York',
    jurisdiction: {
      jurisdictionId: 36,
      name: 'NY',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 4, type: 'STAGE' },
  },
  // ── New York – Development (destTypeId 5)
  {
    destId: '101',
    jurisdictionName: 'New York',
    jurisdiction: {
      jurisdictionId: 36,
      name: 'NY',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 3, type: 'ONBOARD' },
  },

  // ── Florida – Production only (destTypeId 1)
  {
    destId: '202',
    jurisdictionName: 'Florida',
    jurisdiction: {
      jurisdictionId: 12,
      name: 'FL',
      description: 'Florida SHOTS',
    },
    destinationType: { typeId: 1, type: 'PRODUCTION' },
  },

  // ── CDC – Development only (destTypeId 5)
  {
    destId: '303',
    jurisdictionName: 'CDC',
    jurisdiction: {
      jurisdictionId: 99,
      name: 'CDC',
      description: 'Centers for Disease Control',
    },
    destinationType: { typeId: 5, type: 'DEV' },
  },
]

/**
 * Returns mock destinations as a resolved fetch Response, mimicking `/api/destinations`.
 * Uses a plain object instead of `new Response()` for JSDOM compatibility.
 */
export const mockDestinationsResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(mockDestinations),
  } as Response)

/**
 * Returns mock organizations as a resolved fetch Response, mimicking `/api/organizations`.
 * Uses a plain object instead of `new Response()` for JSDOM compatibility.
 */
export const mockOrganizationsResponse = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () =>
      Promise.resolve([
        {
          organizationName: 'Org A',
          principalNames: ['cn=orgA,o=IZ_GATEWAY,c=US'],
        },
        {
          organizationName: 'Org B',
          principalNames: ['cn=orgB,o=IZ_GATEWAY,c=US'],
        },
      ]),
  } as Response)
