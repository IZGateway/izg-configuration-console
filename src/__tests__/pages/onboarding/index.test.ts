/**
 * @jest-environment node
 */

// Guards the onboarding page's getServerSideProps reach decision (PR #729
// review, IGDD-3542/IGDD-3546): it must read hasGlobalTenancy from the role
// matrix, not isOperationsRole, and it must fail CLOSED (return []) rather
// than fail OPEN (return every row) when a scoped role has no jurisdictions
// assigned. fetchAllowedUsersByDestination used to fail open on an empty
// list; this is the same guard fix applied in dynamo.ts, exercised here
// through the live SSR path rather than only the DB layer.

const mockGetServerSession = jest.fn()
const mockFetchAllowedUsersByDestination = jest.fn()

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock('next-auth/jwt', () => ({
  __esModule: true,
  getToken: jest.fn().mockResolvedValue(null),
}))

jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchAllowedUsersByDestination: (...args: unknown[]) =>
        mockFetchAllowedUsersByDestination(...args),
    }),
  },
}))

jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { getServerSideProps } from '../../../pages/onboarding/index'

function createContext() {
  return {
    req: { headers: {}, socket: {} },
    res: {},
  } as unknown as Parameters<typeof getServerSideProps>[0]
}

describe('onboarding getServerSideProps: reach decision', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchAllowedUsersByDestination.mockResolvedValue([])
  })

  it('a global role (IZG Support) reads with global reach regardless of jurisdictions', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'support@example.com', roles: ['IZG Support'], jurisdictions: [] },
    })

    await getServerSideProps(createContext())

    expect(mockFetchAllowedUsersByDestination).toHaveBeenCalledWith(true, [])
  })

  it('a scoped role (Jurisdiction Operations) reads with its jurisdiction claim', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        email: 'jops@example.com',
        roles: ['Jurisdiction Operations'],
        jurisdictions: ['az'],
      },
    })

    await getServerSideProps(createContext())

    expect(mockFetchAllowedUsersByDestination).toHaveBeenCalledWith(false, ['az'])
  })

  // A scoped role with no jurisdictions assigned must be passed through as
  // isAdmin=false with an empty list, never silently promoted to global reach
  // — that promotion is exactly what the dynamo.ts empty-list guard
  // (dynamo.allowedUsersByDestination.test.ts) relies on this route NOT doing.
  it('a scoped role with no jurisdictions assigned is still passed as scoped, not promoted to global', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'jops@example.com', roles: ['Jurisdiction Operations'], jurisdictions: [] },
    })

    await getServerSideProps(createContext())

    expect(mockFetchAllowedUsersByDestination).toHaveBeenCalledWith(false, [])
  })
})
