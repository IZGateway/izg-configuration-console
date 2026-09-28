/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../auth/[...nextauth]', () => ({ authOptions: {} }))

const mockAddDenyListRecord = jest.fn()
const mockCreateDenyListAudit = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      addDenyListRecord: (...args: unknown[]) =>
        mockAddDenyListRecord(...args),
      createDenyListAudit: (...args: unknown[]) =>
        mockCreateDenyListAudit(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import handler from './index'

const buildReqRes = (body: Record<string, unknown>) => {
  const req: any = {
    method: 'POST',
    url: '/api/denylist',
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    query: {},
    body,
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

describe('POST /api/denylist audit identity (IGDD-3175)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    mockAddDenyListRecord.mockResolvedValue({ id: 'rec-1' })
    mockCreateDenyListAudit.mockResolvedValue(true)
  })

  it('derives createdBy/deniedBy from the authenticated session, ignoring any values supplied in the request body', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com' },
    })

    const { req, res } = buildReqRes({
      certificationName: 'some-cert',
      environment: 1,
      reason: 'testing',
      createdBy: 'forged-admin@example.com',
      deniedBy: 'forged-admin@example.com',
    })

    await handler(req, res)

    expect(mockAddDenyListRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'real-user@example.com',
        deniedBy: 'real-user@example.com',
      })
    )
  })

  it('does not persist a forged identity even when the body claims to be a different user', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com' },
    })

    const { req, res } = buildReqRes({
      certificationName: 'some-cert',
      environment: 1,
      reason: 'testing',
      createdBy: 'forged-admin@example.com',
      deniedBy: 'forged-admin@example.com',
    })

    await handler(req, res)

    const [callArgs] = mockAddDenyListRecord.mock.calls[0]
    expect(callArgs.createdBy).not.toBe('forged-admin@example.com')
    expect(callArgs.deniedBy).not.toBe('forged-admin@example.com')
  })
})
