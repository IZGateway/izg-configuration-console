/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../auth/[...nextauth]', () => ({ authOptions: {} }))

const mockAddAdsFileTypeRecord = jest.fn()
const mockCreateAdsFileTypeAudit = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      addAdsFileTypeRecord: (...args: unknown[]) =>
        mockAddAdsFileTypeRecord(...args),
      createAdsFileTypeAudit: (...args: unknown[]) =>
        mockCreateAdsFileTypeAudit(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import handler from './index'

const buildReqRes = (body: Record<string, unknown>) => {
  const req: any = {
    method: 'POST',
    url: '/api/adsfiletypes',
    headers: {},
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

describe('POST /api/adsfiletypes audit identity (IGDD-3175)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com' },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    mockAddAdsFileTypeRecord.mockResolvedValue({ sortKey: 'sk-1' })
    mockCreateAdsFileTypeAudit.mockResolvedValue(true)
  })

  it('records the session identity in the audit newValues snapshot, ignoring a forged body.createdBy', async () => {
    const { req, res } = buildReqRes({
      description: 'A file type',
      fileTypeName: 'CSV',
      sortKey: 'sk-1',
      createdBy: 'forged-admin@example.com',
    })

    await handler(req, res)

    const [, , , , newValues] = mockCreateAdsFileTypeAudit.mock.calls[0]
    expect(newValues.createdBy).toBe('real-user@example.com')
    expect(newValues.createdBy).not.toBe('forged-admin@example.com')
  })
})
