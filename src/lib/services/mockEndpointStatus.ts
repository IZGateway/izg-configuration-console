/**
 * Mock Manage Connections rows for local development.
 *
 * The real rows come from the IZ Gateway hub status endpoint over mTLS
 * (fetchEndpointStatus) joined with destination records, neither of which is
 * reachable from a developer machine. Set MOCK_ENDPOINT_STATUS=true in
 * .env.local to render these instead. Ignored when NODE_ENV is production.
 *
 * The rows cover every STATUS cell variant: Connected, Not Connected,
 * Circuit Breaker Thrown, active maintenance and scheduled maintenance.
 */

const HOUR = 60 * 60 * 1000

export const isEndpointStatusMocked = (): boolean =>
  process.env.NODE_ENV !== 'production' &&
  process.env.MOCK_ENDPOINT_STATUS === 'true'

const noMaintenance = {
  hasActiveMaintenance: false,
  hasFutureMaintenance: false,
  maintenanceValues: { maint_start: null, maint_end: null },
}

export const mockEndpointStatus = (): Record<string, unknown>[] => {
  const now = Date.now()
  const iso = (offset: number) => new Date(now + offset).toISOString()
  const statusAt = iso(-5 * 60 * 1000)

  const base = (
    destId: string,
    destTypeId: number,
    destType: string,
    jurisdictionName: string
  ) => ({
    destId,
    destTypeId,
    destType,
    jurisdictionName,
    destUri: `https://${destId}.${destType.toLowerCase()}.example.org/IISService`,
    statusAt,
    detail: '',
    diagnostics: '',
    retryStrategy: '',
    hasChangeRequest: false,
    hasActiveDraft: false,
  })

  return [
    {
      ...base('ak', 1, 'PROD', 'Alaska'),
      ...noMaintenance,
      status: 'Connected',
    },
    {
      ...base('az', 2, 'DEV', 'Arizona'),
      ...noMaintenance,
      status: 'Connected',
      hasChangeRequest: true,
      hasActiveDraft: true,
    },
    {
      ...base('ca', 1, 'PROD', 'California'),
      ...noMaintenance,
      status: 'Not Connected',
      detail: 'Connection refused by remote host',
      diagnostics: 'java.net.ConnectException: Connection refused',
      retryStrategy: 'Retry in 15 minutes',
    },
    {
      ...base('fl', 1, 'PROD', 'Florida'),
      ...noMaintenance,
      status: 'Circuit Breaker Thrown',
      detail: 'Too many consecutive failures',
      diagnostics: 'Read timed out after 30000 ms',
      retryStrategy: 'Circuit breaker resets in 10 minutes',
    },
    {
      ...base('ny', 1, 'PROD', 'New York'),
      status: 'Connected',
      hasActiveMaintenance: true,
      hasFutureMaintenance: false,
      maintenanceValues: {
        maint_start: iso(-2 * HOUR),
        maint_end: iso(6 * HOUR),
      },
    },
    {
      ...base('tx', 2, 'DEV', 'Texas'),
      status: 'Connected',
      hasActiveMaintenance: false,
      hasFutureMaintenance: true,
      maintenanceValues: {
        maint_start: iso(24 * HOUR),
        maint_end: iso(30 * HOUR),
      },
    },
    {
      ...base('wa', 3, 'ONBOARD', 'Washington'),
      status: 'Not Connected',
      detail: 'Endpoint is under maintenance',
      diagnostics: '',
      retryStrategy: '',
      hasActiveMaintenance: true,
      hasFutureMaintenance: false,
      maintenanceValues: {
        maint_start: iso(-30 * 60 * 1000),
        maint_end: iso(72 * HOUR),
      },
    },
  ]
}
