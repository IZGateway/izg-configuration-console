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

const mockFetchAllDestinations = jest.fn()
const mockFetchDecryptedDestinations = jest.fn()
const mockFetchOrganizations = jest.fn()
const mockGetDbClient = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: (...args: unknown[]) => mockGetDbClient(...args),
  },
}))

const mockLogAccessDenied = jest.fn()
jest.mock('../../../lib/security/accessDeniedAudit', () => ({
  logAccessDenied: (...args: unknown[]) => mockLogAccessDenied(...args),
}))

import { getServerSession } from 'next-auth'
import handler from '../../../pages/api/console/metrics'

const buildReqRes = (body: unknown, method = 'POST') => {
  const req: any = { method, url: '/api/console/metrics', headers: {}, body }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

const signIn = (roles: string[], jurisdictions: string[] = []) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { email: 'user@example.com', roles, jurisdictions },
  })

const call = async (body: unknown, method = 'POST') => {
  const { req, res } = buildReqRes(body, method)
  await handler(req, res)
  return res
}

/** The query actually sent to Elasticsearch, serialized for containment checks. */
const sentQuery = () => JSON.stringify(mockQuery.mock.calls[0][1])

describe('POST /api/console/metrics (IGDD-3474)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockQuery.mockResolvedValue({ aggregations: { ok: true } })
    mockGetDbClient.mockResolvedValue({
      fetchAllDestinations: (...args: unknown[]) => mockFetchAllDestinations(...args),
      fetchLoggedInUsersDestinations: (...args: unknown[]) =>
        mockFetchDecryptedDestinations(...args),
      fetchOrganizations: (...args: unknown[]) => mockFetchOrganizations(...args),
    })
    mockFetchAllDestinations.mockResolvedValue([
      { destId: 'az', jurisdiction: { name: 'Arizona' } },
      { destId: 'ma', jurisdiction: { name: 'Massachusetts' } },
      { destId: 'nj', jurisdiction: { name: 'New Jersey' } },
    ])
    mockFetchOrganizations.mockResolvedValue([
      { organizationName: 'Arizona', principalNames: ['az-sender.example'] },
      { organizationName: 'Massachusetts', principalNames: ['ma-sender.example'] },
    ])
  })

  describe('authentication and request shape', () => {
    it('401s an unauthenticated request before touching Elasticsearch', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)
      const res = await call({ view: 'destination', destId: 'az' })
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('405s a GET', async () => {
      signIn(['IZG Operations'])
      const res = await call(undefined, 'GET')
      expect(res.status).toHaveBeenCalledWith(405)
    })

    it.each([
      [{ view: 'everything', destId: 'az' }],
      [{ view: 'destination' }],
      [{ view: 'destination', destId: 'az', envTag: 'nope' }],
    ])('400s an invalid body %j', async (body) => {
      signIn(['IZG Operations'])
      const res = await call(body)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('authorization', () => {
    it.each([
      ['Jurisdiction Operations'],
      ['Jurisdiction Support'],
    ])('%s may view its own jurisdiction', async (role) => {
      signIn([role], ['az'])
      const res = await call({ view: 'destination', destId: 'az', envTag: 'prod' })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(sentQuery()).toContain('"transactionData.destination.fips.keyword":"AZ"')
    })

    it.each([
      ['Jurisdiction Operations'],
      ['Jurisdiction Support'],
    ])('%s is refused another jurisdiction, and the denial is audited', async (role) => {
      signIn([role], ['az'])
      const res = await call({ view: 'inbound', destId: 'ma' })
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockQuery).not.toHaveBeenCalled()
      expect(mockLogAccessDenied).toHaveBeenCalledWith(
        expect.objectContaining({
          destId: 'ma',
          permission: 'console.canViewConsole',
          deniedAt: 'api',
        })
      )
    })

    it('a scoped role with no jurisdiction claim reaches nothing', async () => {
      signIn(['Jurisdiction Operations'], [])
      const res = await call({ view: 'destination', destId: 'az' })
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it.each([['IZG Operations'], ['IZG Support']])(
      '%s may view any jurisdiction',
      async (role) => {
        signIn([role])
        const res = await call({ view: 'destination', destId: 'ma' })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(mockQuery).toHaveBeenCalledTimes(1)
      }
    )

    it('Sender Operations, which holds no console capability, is refused', async () => {
      signIn(['Sender Operations'], ['azova'])
      const res = await call({ view: 'destination', destId: 'azova' })
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockQuery).not.toHaveBeenCalled()
    })
  })

  describe('the query is built on the server', () => {
    it("outbound uses the jurisdiction's own principals, not another's", async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      await call({ view: 'outbound', destId: 'az' })
      expect(sentQuery()).toContain('az-sender.example')
      expect(sentQuery()).not.toContain('ma-sender.example')
    })

    it('outbound with an organization narrows to that destination inside the own-principal filter', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      await call({ view: 'outbound', destId: 'az', organization: 'Massachusetts' })
      expect(sentQuery()).toContain('az-sender.example')
      expect(sentQuery()).toContain('"value":"MA"')
    })

    it('outbound with no resolvable principals returns the reason without querying', async () => {
      signIn(['IZG Operations'])
      const res = await call({ view: 'outbound', destId: 'nj' })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        unavailable: expect.stringContaining('(New Jersey)'),
      })
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it("an organization outside the scoped user's own destinations still narrows outbound", async () => {
      // The org-to-destination lookup is server-side over all destinations,
      // so a jurisdiction user can filter its own senders' traffic to MA.
      signIn(['Jurisdiction Support'], ['az'])
      const res = await call({ view: 'outbound', destId: 'az', organization: 'Massachusetts' })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(sentQuery()).toContain('"value":"MA"')
    })

    it('inbound with an unknown organization fails closed instead of showing all traffic', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      const res = await call({ view: 'inbound', destId: 'az', organization: 'Nobody' })
      expect(res.json).toHaveBeenCalledWith({
        unavailable: expect.stringContaining('(Nobody)'),
      })
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('caller-supplied DSL in the body is never forwarded', async () => {
      signIn(['Jurisdiction Support'], ['az'])
      await call({
        view: 'destination',
        destId: 'az',
        query: { match_all: {} },
        size: 10000,
      })
      expect(sentQuery()).not.toContain('match_all')
      expect(sentQuery()).not.toContain('10000')
    })
  })

  describe('only the lookup tables a view needs are read', () => {
    it('destination view reads no table at all', async () => {
      signIn(['IZG Operations'])
      await call({ view: 'destination', destId: 'az' })
      expect(mockGetDbClient).not.toHaveBeenCalled()
      expect(mockQuery).toHaveBeenCalledTimes(1)
    })

    it('inbound view with no organization reads no table', async () => {
      signIn(['IZG Operations'])
      await call({ view: 'inbound', destId: 'az' })
      expect(mockGetDbClient).not.toHaveBeenCalled()
    })

    it('inbound view with an organization reads organizations only', async () => {
      signIn(['IZG Operations'])
      await call({ view: 'inbound', destId: 'az', organization: 'Arizona' })
      expect(mockFetchOrganizations).toHaveBeenCalledTimes(1)
      expect(mockFetchAllDestinations).not.toHaveBeenCalled()
    })

    it('outbound view never takes the password-decrypting destination read', async () => {
      signIn(['IZG Operations'])
      await call({ view: 'outbound', destId: 'az' })
      expect(mockFetchAllDestinations).toHaveBeenCalledTimes(1)
      expect(mockFetchDecryptedDestinations).not.toHaveBeenCalled()
    })

    it('a failing destination read does not break the destination view', async () => {
      signIn(['IZG Operations'])
      mockFetchAllDestinations.mockRejectedValue(new Error('cannot decrypt'))
      const res = await call({ view: 'destination', destId: 'az' })
      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  it('400s a malformed destId with a message naming the format', async () => {
    signIn(['IZG Operations'])
    const res = await call({ view: 'destination', destId: 'az.prod' })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/letters, digits/) })
    )
  })

  it('500s when Elasticsearch is not configured', async () => {
    signIn(['IZG Operations'])
    mockIsConfigured.mockReturnValue(false)
    const res = await call({ view: 'destination', destId: 'az' })
    expect(res.status).toHaveBeenCalledWith(500)
    expect(mockQuery).not.toHaveBeenCalled()
  })
})
