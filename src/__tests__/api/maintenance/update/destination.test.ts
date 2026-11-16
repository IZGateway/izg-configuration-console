/**
 * @jest-environment node
 *
 * protect-connection-pages-and-endpoints (IGDD-3545/3548): closes the
 * `maintenance/update/[...slug].ts` split-decision row by moving reach from
 * the separately-attached `checkAccessToDestIdSlug` middleware into this
 * route's own `capability`+`scope` declaration, evaluated combined and
 * role-local. Runs through the real middleware (not mocked), so these tests
 * exercise the actual authorization decision, not a stub of it.
 */
export {}

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockUpdateDestination = jest.fn()
jest.mock('../../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      updateDestination: (...args: unknown[]) => mockUpdateDestination(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'

const signIn = (roles: string[], jurisdictions: string[] = []) => {
  ;(getServerSession as jest.Mock).mockResolvedValue({
    user: { email: 'u@example.com', roles, jurisdictions },
  })
  ;(getToken as jest.Mock).mockResolvedValue({ sub: '00uABC' })
}

const buildReqRes = (destId: string, body: Record<string, unknown> = {}) => {
  const req: any = {
    method: 'POST',
    url: `/api/maintenance/update/1/${destId}`,
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    query: { slug: ['1', destId] },
    body,
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    setHeader: jest.fn(),
  }
  return { req, res }
}

const loadHandler = () =>
  require('../../../../pages/api/maintenance/update/[...slug]').default

describe('POST /api/maintenance/update/{destTypeId}/{destId}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateDestination.mockResolvedValue({ destId: 'az' })
  })

  it('a role with the capability and reach to the destination succeeds', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const { req, res } = buildReqRes('az', { message: 'planned outage' })

    await loadHandler()(req, res)

    expect(mockUpdateDestination).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(403)
  })

  it('a role with the capability but not reach to this destination is refused', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const { req, res } = buildReqRes('ma', { message: 'planned outage' })

    await loadHandler()(req, res)

    expect(mockUpdateDestination).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('a role without the capability is refused even with reach', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    const { req, res } = buildReqRes('az', { message: 'planned outage' })

    await loadHandler()(req, res)

    expect(mockUpdateDestination).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('a globally-scoped role succeeds for any destination', async () => {
    signIn(['IZG Operations'])
    const { req, res } = buildReqRes('ma', { message: 'planned outage' })

    await loadHandler()(req, res)

    expect(mockUpdateDestination).toHaveBeenCalled()
  })
})
