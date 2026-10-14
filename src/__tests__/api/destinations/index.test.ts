/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockFetchLoggedInUsersDestinations = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchLoggedInUsersDestinations: (...args: unknown[]) =>
        mockFetchLoggedInUsersDestinations(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import handler from '../../../pages/api/destinations/index'

const buildReqRes = () => {
  const req: any = { method: 'GET', url: '/api/destinations', headers: {} }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

describe('GET /api/destinations reach (IGDD-3542)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    mockFetchLoggedInUsersDestinations.mockResolvedValue([])
  })

  it('passes global reach for an IZG Support session, ignoring isAdmin: false and an empty claim', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'support@example.com',
        roles: ['IZG Support'],
        isAdmin: false,
        jurisdictions: [],
      },
    })

    const { req, res } = buildReqRes()
    await handler(req, res)

    expect(mockFetchLoggedInUsersDestinations).toHaveBeenCalledWith(true, [])
  })

  it('passes scoped reach with the claim for a Jurisdiction Operations session', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'jops@example.com',
        roles: ['Jurisdiction Operations'],
        isAdmin: false,
        jurisdictions: ['az'],
      },
    })

    const { req, res } = buildReqRes()
    await handler(req, res)

    expect(mockFetchLoggedInUsersDestinations).toHaveBeenCalledWith(false, [
      'az',
    ])
  })

  it('unions reach across held roles: IZG Support + Jurisdiction Operations is global', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'both@example.com',
        roles: ['IZG Support', 'Jurisdiction Operations'],
        isAdmin: false,
        jurisdictions: ['az'],
      },
    })

    const { req, res } = buildReqRes()
    await handler(req, res)

    expect(mockFetchLoggedInUsersDestinations).toHaveBeenCalledWith(true, [
      'az',
    ])
  })

  it('returns 200 and an empty list rather than 500 for a session with no global role and an empty claim', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'noreach@example.com',
        roles: ['Jurisdiction Operations'],
        isAdmin: false,
        jurisdictions: [],
      },
    })
    mockFetchLoggedInUsersDestinations.mockResolvedValue([])

    const { req, res } = buildReqRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([])
  })
})
