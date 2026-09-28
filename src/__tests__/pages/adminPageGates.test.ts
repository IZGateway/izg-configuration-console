/**
 * @jest-environment node
 */

// SSR page gates added by IGDD-3472. These live under src/__tests__/ and not
// beside the pages they test: a file under src/pages/ becomes a route.
//
// What these cover and what they do NOT: every assertion here is about props
// and logger calls. None asserts *rendered output*, and none can while the
// jsdom environment is broken. A page that receives `accessDenied: true` and
// forgets to branch on it passes this entire file — which is why the coverage
// suite additionally asserts that any file referencing withPageAccess also
// references AccessDenied, and why success criterion 1 has a manual
// walkthrough as its acceptance evidence.

const mockGetServerSession = jest.fn()
const mockGetHubEnvironments = jest.fn()
const mockWarn = jest.fn()

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock('next-auth/jwt', () => ({
  __esModule: true,
  getToken: jest.fn().mockResolvedValue({ sub: '00uABC', sessionId: 'sess-1' }),
}))

jest.mock('../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

jest.mock('../../lib/utils/izghubenvironments', () => ({
  __esModule: true,
  getHubEnvironments: (...args: unknown[]) => mockGetHubEnvironments(...args),
}))

jest.mock('../../../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    // Deferred: jest.mock factories are hoisted above the const declarations,
    // so referencing mockWarn directly here is a TDZ error.
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
  },
}))

import { getServerSideProps as accessControlGSSP } from '../../pages/accesscontrol/index'
import { getServerSideProps as consoleGSSP } from '../../pages/console/index'
import { getServerSideProps as adminOperationsGSSP } from '../../pages/adminoperations/index'

type Gssp = typeof accessControlGSSP

const context = (resolvedUrl: string) =>
  ({
    req: { headers: {}, socket: {}, method: 'GET' },
    res: {},
    resolvedUrl,
  }) as unknown as Parameters<Gssp>[0]

const signIn = (roles: string[] | null, jurisdictions: string[] = []) =>
  mockGetServerSession.mockResolvedValue(
    roles === null
      ? null
      : { user: { name: 'Test User', email: 'u@example.com', roles, jurisdictions } }
  )

const deniedEvents = () =>
  mockWarn.mock.calls.filter((call) => call[1]?.eventType === 'AccessDenied')

// Each page's gate returns a different props shape, so the shared table types
// them loosely; the shape assertions are made per-case below.
type AnyGssp = (ctx: Parameters<Gssp>[0]) => Promise<any>

describe.each<[string, AnyGssp, string, string]>([
  [
    'accesscontrol',
    accessControlGSSP as AnyGssp,
    '/accesscontrol',
    'accesscontrol.canViewAccessControl',
  ],
  ['console', consoleGSSP as AnyGssp, '/console', 'console.canViewConsole'],
  [
    'adminoperations',
    adminOperationsGSSP as AnyGssp,
    '/adminoperations',
    'adminoperations.canViewAdminOperations',
  ],
])('%s page gate', (_name, gssp, url, permission) => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetHubEnvironments.mockReturnValue([])
  })

  it('denies a role without the entry capability, in place', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    const result: any = await gssp(context(url))

    expect(result.props.accessDenied).toBe(true)
    // Renders a message rather than redirecting: a redirect hides that access
    // was denied and is indistinguishable from a broken link.
    expect(result.redirect).toBeUndefined()
  })

  it('writes exactly one AccessDenied event with a dotted permission', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    await gssp(context(url))

    const events = deniedEvents()
    expect(events).toHaveLength(1)
    expect(events[0][1]).toMatchObject({
      eventType: 'AccessDenied',
      deniedAt: 'page',
      permission,
      // resolvedUrl, not req.url: on a client-side transition req.url is the
      // /_next/data/... path, not what the browser shows.
      url,
      method: 'GET',
      roles: ['Jurisdiction Support'],
    })
  })

  it('allows the holder and writes no event', async () => {
    signIn(['IZG Operations'])
    const result: any = await gssp(context(url))

    expect(result.props.accessDenied).toBeFalsy()
    expect(deniedEvents()).toHaveLength(0)
  })

  it('redirects an unauthenticated request to sign-in with NO audit event', async () => {
    // Authentication, not RBAC. Logging it would fire on every expired
    // session.
    signIn(null)
    const result: any = await gssp(context(url))

    expect(result.redirect).toEqual({
      destination: '/api/auth/signin',
      permanent: false,
    })
    expect(deniedEvents()).toHaveLength(0)
  })
})

describe('adminoperations: the gate runs before the page loads any data', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetHubEnvironments.mockReturnValue([{ id: 1, name: 'prod' }])
  })

  it('does not call getHubEnvironments for a denied user', async () => {
    signIn(['IZG Support'])
    const result: any = await adminOperationsGSSP(context('/adminoperations'))

    expect(result.props.accessDenied).toBe(true)
    expect(result.props.hasKeyName).toBeUndefined()
    expect(mockGetHubEnvironments).not.toHaveBeenCalled()
  })

  it('calls it for an allowed user and returns the page data', async () => {
    signIn(['IZG Operations'])
    const result: any = await adminOperationsGSSP(context('/adminoperations'))

    expect(mockGetHubEnvironments).toHaveBeenCalled()
    expect(result.props.hubEnvironments).toEqual([{ id: 1, name: 'prod' }])
    expect(result.props.accessDenied).toBeFalsy()
  })
})
