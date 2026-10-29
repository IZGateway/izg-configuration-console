/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockIsConfigured = jest.fn()
const mockQuery = jest.fn()
jest.mock('../../../lib/repositories/ElasticRepository', () => ({
  elasticClient: {
    isConfigured: (...args: unknown[]) => mockIsConfigured(...args),
    query: (...args: unknown[]) => mockQuery(...args),
  },
  getConsoleElasticIndex: () => 'test-index',
}))

import { getServerSession } from 'next-auth'
import handler from '../../../pages/api/elasticsearch/query'
import {
  fetchSystemResources,
  resetSystemResourcesCache,
  SYSTEM_RESOURCES_CACHE_TTL_MS,
} from '../../../lib/console/systemResources'

const buildReqRes = (method = 'GET', body?: Record<string, unknown>) => {
  const req: any = {
    method,
    url: '/api/elasticsearch/query',
    headers: {},
    body,
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

const signIn = (roles: string[]) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { email: 'user@example.com', roles, jurisdictions: ['az'] },
  })

const call = async (method = 'GET', body?: Record<string, unknown>) => {
  const { req, res } = buildReqRes(method, body)
  await handler(req, res)
  return res
}

describe('GET /api/elasticsearch/query: status report only (IGDD-3474)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSystemResourcesCache()
    mockIsConfigured.mockReturnValue(true)
    mockQuery.mockResolvedValue({ aggregations: { cpu: { value: 0.2 } } })
  })

  it('401s an unauthenticated request before touching Elasticsearch', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await call()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it.each([['Sender Operations'], ['Jurisdiction Support'], ['IZG Operations']])(
    '%s can read the status report',
    async (role) => {
      signIn([role])
      const res = await call()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ aggregations: { cpu: { value: 0.2 } } })
    }
  )

  it('runs only the fixed aggregations-only query', async () => {
    signIn(['Sender Operations'])
    await call()
    const sent = mockQuery.mock.calls[0][1] as Record<string, unknown>
    expect(mockQuery.mock.calls[0][0]).toBe('test-index')
    expect(sent.size).toBe(0)
    expect(Object.keys(sent.aggs as object).sort()).toEqual([
      'connections',
      'cpu',
      'disk',
      'memory',
    ])
  })

  // REGRESSION: IGDD-3170 recognized the status-report query by its four
  // aggregation names and otherwise forwarded the caller's body, so adding
  // those names to any query read every jurisdiction's log documents. A body
  // now has no route to Elasticsearch at all: POST is not accepted.
  it('405s a POST, even one carrying the status-report aggregation names', async () => {
    signIn(['Sender Operations'])
    const res = await call('POST', {
      query: {
        size: 10000,
        query: { match_all: {} },
        aggs: { cpu: {}, memory: {}, disk: {}, connections: {} },
      },
    })
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET'])
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('500s when Elasticsearch is not configured', async () => {
    signIn(['IZG Operations'])
    mockIsConfigured.mockReturnValue(false)
    const res = await call()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('500s when the query fails', async () => {
    signIn(['IZG Operations'])
    mockQuery.mockRejectedValue(new Error('boom'))
    const res = await call()
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('fetchSystemResources: one hub-wide result shared by every caller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetSystemResourcesCache()
    mockQuery.mockResolvedValue({ aggregations: {} })
  })

  it('serves repeat requests within the window from the cache', async () => {
    let now = 1_000
    await fetchSystemResources('a@example.com', () => now)
    now += SYSTEM_RESOURCES_CACHE_TTL_MS - 1
    await fetchSystemResources('b@example.com', () => now)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('queries again once the window has passed', async () => {
    let now = 1_000
    await fetchSystemResources(undefined, () => now)
    now += SYSTEM_RESOURCES_CACHE_TTL_MS + 1
    await fetchSystemResources(undefined, () => now)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('shares a query already in flight', async () => {
    await Promise.all([fetchSystemResources(), fetchSystemResources()])
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('boom'))
    await expect(fetchSystemResources()).rejects.toThrow('boom')
    await expect(fetchSystemResources()).resolves.toEqual({ aggregations: {} })
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})
