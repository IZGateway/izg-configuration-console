/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockFetchAllowedUser = jest.fn()
const mockFetchAllowedUsersByDestination = jest.fn()
const mockUpsertAllowedUser = jest.fn()
const mockDeleteAllowedUser = jest.fn()
const mockCreateAllowedUserAudit = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchAllowedUser: (...args: unknown[]) => mockFetchAllowedUser(...args),
      fetchAllowedUsersByDestination: (...args: unknown[]) =>
        mockFetchAllowedUsersByDestination(...args),
      upsertAllowedUser: (...args: unknown[]) => mockUpsertAllowedUser(...args),
      deleteAllowedUser: (...args: unknown[]) => mockDeleteAllowedUser(...args),
      createAllowedUserAudit: (...args: unknown[]) =>
        mockCreateAllowedUserAudit(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import handler from '../../../pages/api/allowedusers/index'

const buildReqRes = (method: string, body: Record<string, unknown>) => {
  const req: any = { method, url: '/api/allowedusers', headers: {}, body }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

describe('POST/DELETE /api/allowedusers audit identity (IGDD-3175)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      // Roles added with IGDD-3472: these routes now carry a capability
      // declaration, so an unroled subject is denied before the handler runs.
      // The test is about which identity gets recorded, not about who may call.
      user: { email: 'real-user@example.com', roles: ['IZG Operations'] },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    mockFetchAllowedUser.mockResolvedValue(null)
    mockUpsertAllowedUser.mockResolvedValue({
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
      createdBy: 'real-user@example.com@127.0.0.1',
      createdOn: new Date(),
      updatedBy: 'real-user@example.com@127.0.0.1',
      updatedOn: new Date(),
      validatedOn: null,
    })
    mockDeleteAllowedUser.mockResolvedValue(true)
    mockCreateAllowedUserAudit.mockResolvedValue(true)
  })

  it('POST: uses the session identity as the audit actor, ignoring a forged body.updatedBy', async () => {
    const { req, res } = buildReqRes('POST', {
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
      createdBy: 'forged-admin@example.com',
      updatedBy: 'forged-admin@example.com',
    })

    await handler(req, res)

    const auditArgs = mockCreateAllowedUserAudit.mock.calls[0]
    const actorArg = auditArgs[4]
    expect(actorArg).toBe('real-user@example.com')
    expect(actorArg).not.toBe('forged-admin@example.com')
  })

  it('DELETE: uses the session identity as the audit actor, ignoring a forged body.deletedBy', async () => {
    mockFetchAllowedUser.mockResolvedValue({
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
      createdBy: 'someone@example.com',
      createdOn: new Date(),
      updatedBy: 'someone@example.com',
      updatedOn: new Date(),
      validatedOn: null,
    })

    const { req, res } = buildReqRes('DELETE', {
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      deletedBy: 'forged-admin@example.com',
    })

    await handler(req, res)

    const auditArgs = mockCreateAllowedUserAudit.mock.calls[0]
    const actorArg = auditArgs[4]
    const snapshotArg = auditArgs[5]
    expect(actorArg).toBe('real-user@example.com')
    expect(actorArg).not.toBe('forged-admin@example.com')
    expect(snapshotArg.updatedBy).toBe('real-user@example.com')
  })
})

describe('GET/POST/DELETE /api/allowedusers write capability split (IGDD-3546)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    mockFetchAllowedUser.mockResolvedValue(null)
    mockFetchAllowedUsersByDestination.mockResolvedValue([])
    mockUpsertAllowedUser.mockResolvedValue({
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
      createdBy: 'support@example.com',
      createdOn: new Date(),
      updatedBy: 'support@example.com',
      updatedOn: new Date(),
      validatedOn: null,
    })
    mockDeleteAllowedUser.mockResolvedValue(true)
    mockCreateAllowedUserAudit.mockResolvedValue(true)
  })

  it('a view-only role (Jurisdiction Support) can GET the sender list', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'support@example.com', roles: ['Jurisdiction Support'] },
    })

    const { req, res } = buildReqRes('GET', {})
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
  })

  // PR #729 review: GET used to call the unfiltered fetchAllowedUsers(), so a
  // direct call to this route returned every jurisdiction's senders to any
  // role holding canViewOnboarding. It must now row-scope the same as the
  // onboarding page's own SSR load.
  it('GET row-scopes a jurisdiction-scoped role by its jurisdiction claim, not a global read', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'support@example.com',
        roles: ['Jurisdiction Support'],
        jurisdictions: ['az'],
      },
    })

    const { req, res } = buildReqRes('GET', {})
    await handler(req, res)

    expect(mockFetchAllowedUsersByDestination).toHaveBeenCalledWith(false, [
      'az',
    ])
  })

  it('GET reads with no filter for a globally-scoped role', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'izgsupport@example.com', roles: ['IZG Support'] },
    })

    const { req, res } = buildReqRes('GET', {})
    await handler(req, res)

    expect(mockFetchAllowedUsersByDestination).toHaveBeenCalledWith(true, [])
  })

  it('a view-only role (Jurisdiction Support) is refused on POST', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'support@example.com', roles: ['Jurisdiction Support'] },
    })

    const { req, res } = buildReqRes('POST', {
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
    })
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockUpsertAllowedUser).not.toHaveBeenCalled()
  })

  it('a view-only role (Jurisdiction Support) is refused on DELETE', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'support@example.com', roles: ['Jurisdiction Support'] },
    })

    const { req, res } = buildReqRes('DELETE', {
      principal: 'p',
      environment: 1,
      destinationId: 'd',
    })
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockDeleteAllowedUser).not.toHaveBeenCalled()
  })

  it('a write-capable role (Jurisdiction Operations) can POST within its own jurisdiction', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'jops@example.com',
        roles: ['Jurisdiction Operations'],
        jurisdictions: ['d'],
      },
    })

    const { req, res } = buildReqRes('POST', {
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
      createdBy: 'jops@example.com',
      updatedBy: 'jops@example.com',
    })
    await handler(req, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(mockUpsertAllowedUser).toHaveBeenCalled()
  })

  // PR #729 review (Blocking): canManageSenders said WHO may write; nothing
  // checked WHICH destinationId. A Jurisdiction Operations caller could POST
  // or DELETE any jurisdiction's destinationId, not just its own.
  it('a write-capable role (Jurisdiction Operations) is refused on POST outside its jurisdiction', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'jops@example.com',
        roles: ['Jurisdiction Operations'],
        jurisdictions: ['az'],
      },
    })

    const { req, res } = buildReqRes('POST', {
      principal: 'p',
      environment: 1,
      destinationId: 'ny',
      organization: 'o',
      enabled: true,
      createdBy: 'jops@example.com',
      updatedBy: 'jops@example.com',
    })
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockUpsertAllowedUser).not.toHaveBeenCalled()
  })

  it('a write-capable role (Jurisdiction Operations) is refused on DELETE outside its jurisdiction', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'jops@example.com',
        roles: ['Jurisdiction Operations'],
        jurisdictions: ['az'],
      },
    })

    const { req, res } = buildReqRes('DELETE', {
      principal: 'p',
      environment: 1,
      destinationId: 'ny',
    })
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockDeleteAllowedUser).not.toHaveBeenCalled()
  })

  it('a global role (IZG Operations) can POST to any jurisdiction', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'izgops@example.com',
        roles: ['IZG Operations'],
        jurisdictions: [],
      },
    })

    const { req, res } = buildReqRes('POST', {
      principal: 'p',
      environment: 1,
      destinationId: 'ny',
      organization: 'o',
      enabled: true,
      createdBy: 'izgops@example.com',
      updatedBy: 'izgops@example.com',
    })
    await handler(req, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(mockUpsertAllowedUser).toHaveBeenCalled()
  })

  // IGDD-3170: IZG Support overrides the IGDD-3546 Support-tier default
  // (view-only) and holds canManageSenders, same as the other global role,
  // IZG Operations, above.
  it('a global role (IZG Support) can POST to any jurisdiction', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'izgsupport@example.com',
        roles: ['IZG Support'],
        jurisdictions: [],
      },
    })

    const { req, res } = buildReqRes('POST', {
      principal: 'p',
      environment: 1,
      destinationId: 'd',
      organization: 'o',
      enabled: true,
      createdBy: 'izgsupport@example.com',
      updatedBy: 'izgsupport@example.com',
    })
    await handler(req, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(mockUpsertAllowedUser).toHaveBeenCalled()
  })
})
