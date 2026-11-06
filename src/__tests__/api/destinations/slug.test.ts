/**
 * @jest-environment node
 *
 * PR #771 review (Anusha): this route returned username, facilityId and the
 * HL7 interface fields (MSH3-22, RXA11) to anyone holding history.
 * canViewConnectionInfo, regardless of history.canViewConnectionInfoDetails
 * — only the UI drawer hid them, so a caller could read them straight off
 * the network response. Found while fixing that: the route ALSO returned
 * the real, decrypted password, which neither of its two consumers
 * (ConnectionHistory, EditConnection's form prefill) ever reads — pure
 * over-exposure, stripped unconditionally regardless of capability.
 *
 * No role in the current matrix holds canViewConnectionInfo without also
 * holding canViewConnectionInfoDetails (they're seeded identically), so the
 * detail-field gate is dormant today, same shape as the other PR #771
 * findings — these tests confirm the mechanism, not a live divergence.
 */
export {}

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockFetchDestination = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchDestination: (...args: unknown[]) => mockFetchDestination(...args),
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

const fullDestination = () => ({
  destId: 'az',
  destUri: 'https://example.org',
  username: 'svc-user',
  password: 'super-secret-plaintext',
  facilityId: 'FAC1',
  MSH3: 'm3',
  MSH4: 'm4',
  MSH5: 'm5',
  MSH6: 'm6',
  MSH11: 'm11',
  MSH22: 'm22',
  RXA11: 'r11',
  destinationType: { typeId: 1, type: 'PROD' },
})

const buildReqRes = (destTypeId: string, destId: string) => {
  const req: any = {
    method: 'GET',
    url: `/api/destinations/${destTypeId}/${destId}`,
    headers: {},
    query: { slug: [destTypeId, destId] },
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
  require('../../../pages/api/destinations/[...slug]').default

describe('GET /api/destinations/{destTypeId}/{destId}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchDestination.mockResolvedValue(fullDestination())
  })

  it('never returns the real password, even for a fully-privileged role', async () => {
    signIn(['IZG Operations'])
    const { req, res } = buildReqRes('1', 'az')

    await loadHandler()(req, res)

    const [returned] = res.json.mock.calls[0]
    expect(returned).not.toHaveProperty('password')
  })

  it('returns the detail fields for a role holding canViewConnectionInfoDetails', async () => {
    signIn(['IZG Operations'])
    const { req, res } = buildReqRes('1', 'az')

    await loadHandler()(req, res)

    const [returned] = res.json.mock.calls[0]
    expect(returned).toMatchObject({
      username: 'svc-user',
      facilityId: 'FAC1',
      MSH3: 'm3',
      RXA11: 'r11',
    })
  })

  it('refuses a caller with no reach to the destination', async () => {
    signIn(['Jurisdiction Operations'], ['ma'])
    const { req, res } = buildReqRes('1', 'az')

    await loadHandler()(req, res)

    expect(mockFetchDestination).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
