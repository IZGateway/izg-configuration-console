/**
 * @jest-environment node
 *
 * PR #771 review (Anusha): deleting a draft (the "Reset Draft" button) and
 * canceling a real, scheduled change request (the "Cancel Request" dialog)
 * used to both be gated by `changerequest.canCancelRequest` alone, with no
 * distinction. These tests confirm a draft delete is gated on
 * `edit.canResetDraft` and a non-draft delete stays gated on
 * `changerequest.canCancelRequest`. Runs through the real middleware (not
 * mocked) via `getServerSession`, same as the other IGDD-3545/3548 route
 * tests.
 */
export {}

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockFetchDestinationChangeRequestById = jest.fn()
const mockDeleteDestinationChangeRequest = jest.fn()
const mockFetchDestinationChangeRequestByDestIdAndDestType = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchDestinationChangeRequestById: (...args: unknown[]) =>
        mockFetchDestinationChangeRequestById(...args),
      deleteDestinationChangeRequest: (...args: unknown[]) =>
        mockDeleteDestinationChangeRequest(...args),
      fetchDestinationChangeRequestByDestIdAndDestType: (
        ...args: unknown[]
      ) => mockFetchDestinationChangeRequestByDestIdAndDestType(...args),
    }),
  },
}))

const mockChangeRequestTicketComment = jest.fn()
jest.mock('../../../lib/changerequestticketcomment', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockChangeRequestTicketComment(...args),
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'

const signIn = (roles: string[], jurisdictions: string[] = []) => {
  ;(getServerSession as jest.Mock).mockResolvedValue({
    user: { email: 'u@example.com', roles, isAdmin: false, jurisdictions },
  })
  ;(getToken as jest.Mock).mockResolvedValue({ sub: '00uABC' })
}

const buildReqRes = (
  method: string,
  slug: string[],
  body: Record<string, unknown> = {}
) => {
  const req: any = {
    method,
    url: `/api/changerequest/${slug.join('/')}`,
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    query: { slug },
    body,
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    setHeader: jest.fn(),
  }
  return { req, res }
}

const loadHandler = () =>
  require('../../../pages/api/changerequest/[...slug]').default

describe('DELETE /api/changerequest/{id}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeleteDestinationChangeRequest.mockResolvedValue(true)
  })

  it('deletes a draft when the caller holds edit.canResetDraft, without commenting on a Jira ticket', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    mockFetchDestinationChangeRequestById.mockResolvedValue({
      id: 1,
      destId: 'az',
      isDraft: true,
      jiraId: 'FAKE-1',
    })
    const { req, res } = buildReqRes('DELETE', ['1'])

    await loadHandler()(req, res)

    expect(mockDeleteDestinationChangeRequest).toHaveBeenCalledWith(1)
    expect(mockChangeRequestTicketComment).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('cancels a scheduled (non-draft) request when the caller holds changerequest.canCancelRequest, and comments on its Jira ticket', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    mockFetchDestinationChangeRequestById.mockResolvedValue({
      id: 2,
      destId: 'az',
      isDraft: false,
      jiraId: 'FAKE-2',
    })
    const { req, res } = buildReqRes('DELETE', ['2'])

    await loadHandler()(req, res)

    expect(mockChangeRequestTicketComment).toHaveBeenCalledWith(
      'FAKE-2',
      expect.anything()
    )
    expect(mockDeleteDestinationChangeRequest).toHaveBeenCalledWith(2)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('refuses a caller with neither capability', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    mockFetchDestinationChangeRequestById.mockResolvedValue({
      id: 3,
      destId: 'az',
      isDraft: true,
      jiraId: 'FAKE-3',
    })
    const { req, res } = buildReqRes('DELETE', ['3'])

    await loadHandler()(req, res)

    expect(mockDeleteDestinationChangeRequest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('refuses a role with reach to a different jurisdiction than the record', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    mockFetchDestinationChangeRequestById.mockResolvedValue({
      id: 4,
      destId: 'ma',
      isDraft: false,
      jiraId: 'FAKE-4',
    })
    const { req, res } = buildReqRes('DELETE', ['4'])

    await loadHandler()(req, res)

    expect(mockDeleteDestinationChangeRequest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('reports 401 when no record exists for the id', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    mockFetchDestinationChangeRequestById.mockResolvedValue(undefined)
    const { req, res } = buildReqRes('DELETE', ['999'])

    await loadHandler()(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockDeleteDestinationChangeRequest).not.toHaveBeenCalled()
  })
})

describe('GET /api/changerequest/{destTypeId}/{destId}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('a role with canViewDetails and reach to the destination gets the change request', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    mockFetchDestinationChangeRequestByDestIdAndDestType.mockResolvedValue({
      id: 5,
      destId: 'az',
    })
    const { req, res } = buildReqRes('GET', ['1', 'az'])

    await loadHandler()(req, res)

    expect(res.json).toHaveBeenCalledWith({ id: 5, destId: 'az' })
  })

  it('a caller with no recognized role is refused', async () => {
    signIn([], ['az'])
    const { req, res } = buildReqRes('GET', ['1', 'az'])

    await loadHandler()(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(
      mockFetchDestinationChangeRequestByDestIdAndDestType
    ).not.toHaveBeenCalled()
  })
})
