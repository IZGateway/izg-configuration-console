/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('../../../lib/accesshelper', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockCreateChangeRequestTicket = jest.fn()
jest.mock('../../../lib/createchangerequestticket', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockCreateChangeRequestTicket(...args),
}))

const mockLoggerError = jest.fn()
jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

const mockUpsertDestinationChangeRequest = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      upsertDestinationChangeRequest: (...args: unknown[]) =>
        mockUpsertDestinationChangeRequest(...args),
      fetchDestinationPassword: jest.fn().mockResolvedValue('stored-password'),
      deleteDestinationChangeRequest: jest.fn(),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import hasAccessToDestId from '../../../lib/accesshelper'
import handler from '../../../pages/api/changerequest/index'

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
      // Roles added with IGDD-3472: these routes now carry a capability
      // declaration, so an unroled subject is denied before the handler runs.
      // The test is about which identity gets recorded, not about who may call.
      user: { email: 'real-user@example.com', roles: ['IZG Operations'] },
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

/**
 * IGDD-3566: a failed submit must say whether the Jira ticket exists. A Jira call
 * that never succeeded leaves no ticket, so the console can report a clean failure
 * at once. A Jira call that did succeed leaves a ticket behind even though a later
 * step threw, so the console must not claim that nothing happened.
 */
describe('POST /api/changerequest failure reporting (IGDD-3566)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com', roles: ['IZG Operations'] },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    ;(hasAccessToDestId as jest.Mock).mockReturnValue(true)
    mockUpsertDestinationChangeRequest.mockResolvedValue({ id: 1 })
  })

  const submitBody = {
    destId: 'ak',
    destType: { typeId: 5, type: 'DEV' },
    isDraft: false,
    requested: { newPassword: 'new', confirmPassword: 'new' },
    current: {},
  }

  it('reports 502 and ticketCreated false when the Jira call never succeeded', async () => {
    mockCreateChangeRequestTicket.mockRejectedValue(
      new Error('connect ECONNREFUSED 127.0.0.1:4500')
    )
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ ticketCreated: false })
    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
  })

  it('reports 500 and ticketCreated true when a step after the ticket throws', async () => {
    mockCreateChangeRequestTicket.mockResolvedValue({ key: 'FAKE-9' })
    mockUpsertDestinationChangeRequest.mockRejectedValue(
      new Error('dynamo write failed')
    )
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ ticketCreated: true })
  })

  it('logs the real failure instead of masking it with a null dereference', async () => {
    mockCreateChangeRequestTicket.mockRejectedValue(
      new Error('Bad Jira response: 404')
    )
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    const logged = mockLoggerError.mock.calls
      .map(([message]) => message)
      .join(' ')
    expect(logged).toContain('Bad Jira response: 404')
    expect(logged).not.toContain("reading 'id'")
  })
})
