/**
 * @jest-environment node
 */

// Guards the getServerSideProps capability gate added for sender-role-access:
// a session with no held role granting `canViewConnections` must be refused
// before fetchEndpointStatus (and therefore any DB read) ever runs.
//
// IGDD-3472 changed the OUTCOME, not the check. It used to answer with
// `redirect: { destination: '/' }` — no message, no audit event, and
// indistinguishable from a broken link. It now renders the shared
// access-denied surface in place, like every other gated page.

const mockGetServerSession = jest.fn()
const mockFetchEndpointStatus = jest.fn()

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock('next-auth/jwt', () => ({
  __esModule: true,
  getToken: jest.fn().mockResolvedValue(null),
}))

jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

jest.mock('../../../lib/services/fetchEndpointStatus', () => ({
  __esModule: true,
  fetchEndpointStatus: (...args: unknown[]) => mockFetchEndpointStatus(...args),
}))

jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: { getDbClient: jest.fn().mockResolvedValue({}) },
}))

jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { getServerSideProps } from '../../../pages/manageconnections/index'

function createContext() {
  return {
    req: { headers: {}, socket: {} },
    res: {},
  } as unknown as Parameters<typeof getServerSideProps>[0]
}

describe('manageconnections getServerSideProps: canViewConnections gate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchEndpointStatus.mockResolvedValue([])
  })

  it('denies a role with no canViewConnections without reading endpoint status', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'sender@example.com', role: 'Sender Operations', jurisdictions: ['vha'] },
    })

    const result = await getServerSideProps(createContext())

    expect('props' in result && (result.props as any).accessDenied).toBe(true)
    expect('redirect' in result).toBe(false)
    expect(mockFetchEndpointStatus).not.toHaveBeenCalled()
  })

  it('denies a session holding no recognized role at all', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'unmapped@example.com', jurisdictions: ['az'] },
    })

    const result = await getServerSideProps(createContext())

    expect('props' in result && (result.props as any).accessDenied).toBe(true)
    expect('redirect' in result).toBe(false)
    expect(mockFetchEndpointStatus).not.toHaveBeenCalled()
  })

  it('proceeds for a role that holds canViewConnections', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'jurops@example.com', role: 'Jurisdiction Operations', jurisdictions: ['az'] },
    })

    const result = await getServerSideProps(createContext())

    expect('redirect' in result).toBe(false)
    expect('props' in result && (result.props as any).accessDenied).toBeFalsy()
    expect(mockFetchEndpointStatus).toHaveBeenCalled()
  })
})
