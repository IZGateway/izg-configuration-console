/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockIsConfigured = jest.fn()
const mockQuery = jest.fn()
jest.mock('../../../lib/repositories/ElasticRepository', () => ({
  elasticClient: {
    isConfigured: (...args: unknown[]) => mockIsConfigured(...args),
    query: (...args: unknown[]) => mockQuery(...args),
  },
}))

import { getServerSession } from 'next-auth'
import handler from '../../../pages/api/elasticsearch/query'

const buildReqRes = (body: Record<string, unknown>) => {
  const req: any = {
    method: 'POST',
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

const SYSTEM_RESOURCES_QUERY = {
  query: {
    aggs: {
      cpu: {},
      memory: {},
      disk: {},
      connections: {},
    },
  },
}

const LOG_SEARCH_QUERY = {
  query: {
    query: { match_all: {} },
  },
}

describe('POST /api/elasticsearch/query capability split (IGDD-3170)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockQuery.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } })
  })

  it('401s an unauthenticated request before touching Elasticsearch', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)

    const { req, res } = buildReqRes(LOG_SEARCH_QUERY)
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('a role without canViewConsole (IZG Support) is refused the log search', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'noconsole@example.com', roles: ['Jurisdiction Support'] },
    })

    const { req, res } = buildReqRes(LOG_SEARCH_QUERY)
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('a role with canViewConsole (IZG Support) can run the log search', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'izgsupport@example.com', roles: ['IZG Support'] },
    })

    const { req, res } = buildReqRes(LOG_SEARCH_QUERY)
    await handler(req, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(mockQuery).toHaveBeenCalled()
  })

  it('any signed-in role, even with no console access, can run the status-report query', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'noconsole@example.com', roles: ['Jurisdiction Support'] },
    })

    const { req, res } = buildReqRes(SYSTEM_RESOURCES_QUERY)
    await handler(req, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(mockQuery).toHaveBeenCalled()
  })
})
