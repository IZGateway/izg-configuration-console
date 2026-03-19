/**
 * Mock destinations data for console.test.tsx.
 *
 * The /api/destinations endpoint returns a flat array where each record
 * represents one (destId × destinationType) pair.  Duplicate destIds are
 * deduplicated by the Console component to build the dropdown list.
 *
 * Destinations:
 *  - "dev"  → Development Environment  (DEV, PRODUCTION, ONBOARD)
 *  - "101"  → New York CAIR2           (PRODUCTION, STAGE, ONBOARD)
 *  - "202"  → Florida SHOTS            (PRODUCTION)
 *  - "303"  → Centers for Disease Control (DEV)
 */
export const mockDestinations = [
  // ── dev – Development Environment ─────────────────────────────────────────
  {
    destId: 'dev',
    jurisdictionName: 'Development Environment',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 1, type: 'DEV' },
  },
  {
    destId: 'dev',
    jurisdictionName: 'Development Environment',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 2, type: 'PRODUCTION' },
  },
  {
    destId: 'dev',
    jurisdictionName: 'Development Environment',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 3, type: 'ONBOARD' },
  },

  // ── 101 – New York CAIR2 ───────────────────────────────────────────────────
  {
    destId: '101',
    jurisdictionName: 'New York CAIR2',
    jurisdiction: {
      jurisdictionId: 2,
      name: 'ny',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 4, type: 'PRODUCTION' },
  },
  {
    destId: '101',
    jurisdictionName: 'New York CAIR2',
    jurisdiction: {
      jurisdictionId: 2,
      name: 'ny',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 5, type: 'STAGE' },
  },
  {
    destId: '101',
    jurisdictionName: 'New York CAIR2',
    jurisdiction: {
      jurisdictionId: 2,
      name: 'ny',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 6, type: 'ONBOARD' },
  },

  // ── 202 – Florida SHOTS ────────────────────────────────────────────────────
  {
    destId: '202',
    jurisdictionName: 'Florida SHOTS',
    jurisdiction: {
      jurisdictionId: 3,
      name: 'fl',
      description: 'Florida SHOTS',
    },
    destinationType: { typeId: 7, type: 'PRODUCTION' },
  },

  // ── 303 – Centers for Disease Control ─────────────────────────────────────
  {
    destId: '303',
    jurisdictionName: 'Centers for Disease Control',
    jurisdiction: {
      jurisdictionId: 4,
      name: 'cdc',
      description: 'Centers for Disease Control',
    },
    destinationType: { typeId: 8, type: 'DEV' },
  },
]
