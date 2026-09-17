/**
 * @jest-environment node
 */

// Guards the getServerSideProps capability gate added for sender-role-access:
// a session with no held role granting `canViewConnections` must be redirected
// away before fetchEndpointStatus (and therefore any DB read) ever runs.

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

  it('redirects a role with no canViewConnections without reading endpoint status', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'sender@example.com', role: 'Sender Operations', jurisdictions: ['vha'] },
    })

    const result = await getServerSideProps(createContext())

    expect('redirect' in result && result.redirect).toBeTruthy()
    expect(mockFetchEndpointStatus).not.toHaveBeenCalled()
  })

  it('redirects a session holding no recognized role at all', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'unmapped@example.com', jurisdictions: ['az'] },
    })

    const result = await getServerSideProps(createContext())

    expect('redirect' in result && result.redirect).toBeTruthy()
    expect(mockFetchEndpointStatus).not.toHaveBeenCalled()
  })

  it('proceeds for a role that holds canViewConnections', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'jurops@example.com', role: 'Jurisdiction Operations', jurisdictions: ['az'] },
    })

    const result = await getServerSideProps(createContext())

    expect('redirect' in result).toBe(false)
    expect(mockFetchEndpointStatus).toHaveBeenCalled()
  })
})
