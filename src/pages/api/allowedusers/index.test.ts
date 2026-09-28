/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../auth/[...nextauth]', () => ({ authOptions: {} }))

const mockFetchAllowedUser = jest.fn()
const mockUpsertAllowedUser = jest.fn()
const mockDeleteAllowedUser = jest.fn()
const mockCreateAllowedUserAudit = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchAllowedUser: (...args: unknown[]) => mockFetchAllowedUser(...args),
      upsertAllowedUser: (...args: unknown[]) => mockUpsertAllowedUser(...args),
      deleteAllowedUser: (...args: unknown[]) => mockDeleteAllowedUser(...args),
      createAllowedUserAudit: (...args: unknown[]) =>
        mockCreateAllowedUserAudit(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import handler from './index'

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
      user: { email: 'real-user@example.com' },
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
