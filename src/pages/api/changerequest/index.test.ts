/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('../../../lib/accesshelper', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockUpsertDestinationChangeRequest = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      upsertDestinationChangeRequest: (...args: unknown[]) =>
        mockUpsertDestinationChangeRequest(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import hasAccessToDestId from '../../../lib/accesshelper'
import handler from './index'

const buildReqRes = (body: Record<string, unknown>) => {
  const req: any = {
    method: 'POST',
    url: '/api/changerequest',
    headers: {},
    query: {},
    body: JSON.stringify(body),
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

describe('POST /api/changerequest audit identity (IGDD-3175)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com' },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    ;(hasAccessToDestId as jest.Mock).mockReturnValue(true)
    mockUpsertDestinationChangeRequest.mockResolvedValue({ id: 1 })
  })

  it('derives requestedBy from the session when saving a draft, ignoring a forged value in the body', async () => {
    const { req, res } = buildReqRes({
      destId: 'dest1',
      destType: { typeId: 1, type: 'PROD' },
      isDraft: true,
      requestedBy: 'forged-admin@example.com',
      requested: {},
    })

    await handler(req, res)

    expect(mockUpsertDestinationChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestedBy: 'real-user@example.com' })
    )
  })
})
