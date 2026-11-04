/**
 * Mock Manage Connections data for local development.
 *
 * The real rows come from the IZ Gateway hub status endpoint over mTLS
 * (fetchEndpointStatus), joined with destination records from the database.
 * Neither is reachable from a developer machine. Set MOCK_ENDPOINT_STATUS=true
 * in .env.local to replace both at their seams:
 *
 *  - mockHubEndpointStatus stands in for the hub response, scoped to the
 *    session's roles and jurisdictions exactly as the hub request is, so a
 *    jurisdiction-scoped user sees only their own rows.
 *  - withMockDestinations wraps the DbClient so the mock destinations resolve,
 *    carrying the maintenance windows and change-request state the page reads.
 *
 * Callers load this module through a dynamic import behind an inline
 * NODE_ENV check, so production builds drop it from the server bundle.
 *
 * The rows cover every STATUS cell variant: Connected, Not Connected,
 * Circuit Breaker Thrown, active maintenance and scheduled maintenance.
 */
import type DbClient from '../db/DbClient'
import type { Destination } from '../type/Destination'
import type { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import isOperationsRole from '../security/accessutils'

const HOUR = 60 * 60 * 1000

interface MockConnection {
  destId: string
  destTypeId: number
  destType: string
  jurisdictionName: string
  status: string
  detail?: string
  diagnostics?: string
  retryStrategy?: string
  // Maintenance window, as offsets in ms from now.
  maint?: { start: number; end: number }
  hasDraftChangeRequest?: boolean
}

const MOCK_CONNECTIONS: MockConnection[] = [
  {
    destId: 'ak',
    destTypeId: 1,
    destType: 'PROD',
    jurisdictionName: 'Alaska',
    status: 'Connected',
  },
  {
    destId: 'az',
    destTypeId: 2,
    destType: 'DEV',
    jurisdictionName: 'Arizona',
    status: 'Connected',
    hasDraftChangeRequest: true,
  },
  {
    destId: 'ca',
    destTypeId: 1,
    destType: 'PROD',
    jurisdictionName: 'California',
    status: 'Not Connected',
    detail: 'Connection refused by remote host',
    diagnostics: 'java.net.ConnectException: Connection refused',
    retryStrategy: 'Retry in 15 minutes',
  },
  {
    destId: 'fl',
    destTypeId: 1,
    destType: 'PROD',
    jurisdictionName: 'Florida',
    status: 'Circuit Breaker Thrown',
    detail: 'Too many consecutive failures',
    diagnostics: 'Read timed out after 30000 ms',
    retryStrategy: 'Circuit breaker resets in 10 minutes',
  },
  {
    destId: 'ny',
    destTypeId: 1,
    destType: 'PROD',
    jurisdictionName: 'New York',
    status: 'Connected',
    maint: { start: -2 * HOUR, end: 6 * HOUR },
  },
  {
    destId: 'tx',
    destTypeId: 2,
    destType: 'DEV',
    jurisdictionName: 'Texas',
    status: 'Connected',
    maint: { start: 24 * HOUR, end: 30 * HOUR },
  },
  {
    destId: 'wa',
    destTypeId: 3,
    destType: 'ONBOARD',
    jurisdictionName: 'Washington',
    status: 'Not Connected',
    detail: 'Endpoint is under maintenance',
    maint: { start: -30 * 60 * 1000, end: 72 * HOUR },
  },
]

const mockDestUri = (c: MockConnection) =>
  `https://${c.destId}.${c.destType.toLowerCase()}.example.org/IISService`

const findMock = (destId: string, destTypeId: number) =>
  MOCK_CONNECTIONS.find(
    (c) => c.destId === destId && c.destTypeId === Number(destTypeId)
  )

/**
 * Hub status rows, scoped like the real request: operations roles see every
 * row, everyone else only the destinations in their jurisdictions.
 */
export const mockHubEndpointStatus = (
  roles: string[],
  jurisdictions: string[]
): Record<string, unknown>[] => {
  const allowed = new Set((jurisdictions ?? []).map((j) => j.toLowerCase()))
  const statusAt = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  return MOCK_CONNECTIONS.filter(
    (c) => isOperationsRole(roles) || allowed.has(c.destId.toLowerCase())
  ).map((c) => ({
    destId: c.destId,
    destTypeId: c.destTypeId,
    destType: c.destType,
    jurisdictionName: c.jurisdictionName,
    destUri: mockDestUri(c),
    status: c.status,
    statusAt,
    detail: c.detail ?? '',
    diagnostics: c.diagnostics ?? '',
    retryStrategy: c.retryStrategy ?? '',
  }))
}

/**
 * Wrap a DbClient so the mock destinations and their change requests resolve.
 * Every other call, and any destination that is not a mock, goes to the real
 * client unchanged.
 */
export const withMockDestinations = (db: DbClient): DbClient => {
  const fetchDestination = async (destId: string, destTypeId: number) => {
    const mock = findMock(destId, destTypeId)
    if (!mock) return db.fetchDestination(destId, destTypeId)
    const now = Date.now()
    return {
      destId: mock.destId,
      destUri: mockDestUri(mock),
      destinationType: { typeId: mock.destTypeId, type: mock.destType },
      maintStart: mock.maint ? new Date(now + mock.maint.start) : null,
      maintEnd: mock.maint ? new Date(now + mock.maint.end) : null,
    } as unknown as Destination
  }

  const fetchDestinationChangeRequestByDestIdAndDestType = async (
    destId: string,
    destTypeId: number
  ) => {
    const mock = findMock(destId, destTypeId)
    if (!mock) {
      return db.fetchDestinationChangeRequestByDestIdAndDestType(
        destId,
        destTypeId
      )
    }
    // A draft is a change request that has not been filed in Jira yet.
    return (
      mock.hasDraftChangeRequest ? { destId, jiraId: null } : null
    ) as unknown as DestinationChangeRequest
  }

  const overrides: Partial<DbClient> = {
    fetchDestination,
    fetchDestinationChangeRequestByDestIdAndDestType,
  }

  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop in overrides) return overrides[prop as keyof DbClient]
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
