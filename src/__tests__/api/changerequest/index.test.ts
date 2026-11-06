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
// Keep the real named exports: the route and these tests both need the same
// ChangeRequestTicketError class for its instanceof check to hold.
jest.mock('../../../lib/createchangerequestticket', () => ({
  __esModule: true,
  ...jest.requireActual('../../../lib/createchangerequestticket'),
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
// Base-repository read (no decrypt) vs the decrypting wrapper's read.
const mockFetchDestination = jest.fn()
const mockDecryptingFetchDestination = jest.fn()
const mockGetChangeRequestId = jest.fn()
const mockFetchDestinationChangeRequestById = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      upsertDestinationChangeRequest: (...args: unknown[]) =>
        mockUpsertDestinationChangeRequest(...args),
      getRepository: () => ({
        fetchDestination: (...args: unknown[]) => mockFetchDestination(...args),
      }),
      fetchDestination: (...args: unknown[]) =>
        mockDecryptingFetchDestination(...args),
      fetchDestinationPassword: jest.fn().mockResolvedValue('stored-password'),
      deleteDestinationChangeRequest: jest.fn(),
      getChangeRequestId: (...args: unknown[]) =>
        mockGetChangeRequestId(...args),
      fetchDestinationChangeRequestById: (...args: unknown[]) =>
        mockFetchDestinationChangeRequestById(...args),
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
import hasAccessToDestId from '../../../lib/accesshelper'
import handler from '../../../pages/api/changerequest/index'
import { ChangeRequestTicketError } from '../../../lib/createchangerequestticket'

const buildReqRes = (
  body: Record<string, unknown>,
  options: { method?: string; query?: Record<string, string> } = {}
) => {
  const req: any = {
    method: options.method || 'POST',
    url: '/api/changerequest',
    headers: {},
    query: options.query || {},
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
 * IGDD-3640: the form sends destUri on every edit. A URI already stored for the
 * connection must not block unrelated edits, even if it predates the
 * destination URL specification. A '?' fails the guard's textual check before
 * any DNS lookup, so these cases need no network.
 */
describe('POST /api/changerequest unchanged destUri (IGDD-3640)', () => {
  const legacyUri = 'https://iis.example.gov/soa/HL7Service.wsdl?'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com', roles: ['IZG Operations'] },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    ;(hasAccessToDestId as jest.Mock).mockReturnValue(true)
    mockUpsertDestinationChangeRequest.mockResolvedValue({ id: 1 })
    mockFetchDestination.mockResolvedValue({ destUri: legacyUri })
    mockDecryptingFetchDestination.mockRejectedValue(
      new Error('password decrypt failed')
    )
  })

  const draftWith = (destUri: string, current: Record<string, unknown> = {}) =>
    buildReqRes({
      destId: 'dest1',
      destType: { typeId: 1, type: 'PROD' },
      isDraft: true,
      requested: { destUri, username: 'user' },
      current,
    })

  it('accepts the stored destUri unchanged, even though it would fail the guard', async () => {
    const { req, res } = draftWith(legacyUri)

    await handler(req, res)

    expect(mockFetchDestination).toHaveBeenCalledWith('dest1', 1)
    // No password decrypt just to read destUri: a decrypt failure must not
    // turn an unchanged URI into a rejection.
    expect(mockDecryptingFetchDestination).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(400)
    expect(mockUpsertDestinationChangeRequest).toHaveBeenCalled()
  })

  it('still rejects a changed destUri that fails the guard', async () => {
    const { req, res } = draftWith('https://evil.example.com/x?a=1')

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
  })

  it('ignores a client-supplied current destUri and compares with the stored one', async () => {
    const forged = 'https://evil.example.com/x?a=1'
    const { req, res } = draftWith(forged, { destUri: forged })

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
  })

  it('validates the destUri when the stored destination cannot be read', async () => {
    mockFetchDestination.mockRejectedValue(new Error('dynamo down'))
    const { req, res } = draftWith(legacyUri)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
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

  it('reports 502 and ticketCreated false when no ticket can exist', async () => {
    mockCreateChangeRequestTicket.mockRejectedValue(
      new ChangeRequestTicketError(
        'Could not reach Jira: connect ECONNREFUSED',
        false
      )
    )
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ ticketCreated: false })
    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
  })

  it('reports ticketCreated true when Jira accepted the request', async () => {
    mockCreateChangeRequestTicket.mockRejectedValue(
      new ChangeRequestTicketError(
        'Jira accepted the request but its reply could not be read',
        true
      )
    )
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ ticketCreated: true })
  })

  it('says nothing about the ticket when the failure carries no verdict', async () => {
    mockCreateChangeRequestTicket.mockRejectedValue(
      new ChangeRequestTicketError('Bad Jira response: 503', undefined)
    )
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({})
  })

  it('says nothing about the ticket for a failure it cannot classify', async () => {
    // Any throw path added later must land here rather than claim a proven
    // failure, because claiming one invites a retry that raises a second ticket.
    mockCreateChangeRequestTicket.mockRejectedValue(new Error('something new'))
    const { req, res } = buildReqRes(submitBody)

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({})
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
      new ChangeRequestTicketError('Bad Jira response: 404', false)
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

/**
 * PR #771 review (Anusha): the route's declarative scope check validates
 * requestBody.destId, but every write site used to trust a SEPARATE,
 * client-supplied requestBody.id / requestBody.jiraId with no check that they
 * belonged to the same record as the validated destId. Since a change request
 * id is a deterministic hash of destType+destId, a caller authorized for one
 * destination could target another jurisdiction's record. These tests assert
 * the client-supplied id/jiraId are never trusted.
 */
describe('PUT/POST /api/changerequest id is never trusted from the body (IGDD-3545/3548 review)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'real-user@example.com', roles: ['IZG Operations'] },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    ;(hasAccessToDestId as jest.Mock).mockReturnValue(true)
    mockUpsertDestinationChangeRequest.mockResolvedValue({ id: 1 })
    mockGetChangeRequestId.mockReturnValue(999)
    mockFetchDestinationChangeRequestById.mockResolvedValue({
      id: 999,
      jiraId: 'REAL-JIRA-999',
      destId: 'dest1',
    })
  })

  it('POST draft save ignores a client-supplied id, letting dynamo.ts derive it from destId+destType', async () => {
    const { req, res } = buildReqRes({
      destId: 'dest1',
      destType: { typeId: 1, type: 'PROD' },
      isDraft: true,
      id: 424242, // forged: some other destination's change request id
      requested: {},
    })

    await handler(req, res)

    const [writtenArgs] = mockUpsertDestinationChangeRequest.mock.calls[0]
    expect(writtenArgs).not.toHaveProperty('id')
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('PUT (plain) strips a client-supplied id before writing', async () => {
    const { req, res } = buildReqRes(
      {
        destId: 'dest1',
        destType: { typeId: 1, type: 'PROD' },
        id: 424242, // forged
        jiraId: 'SOME-JIRA-1',
        requested: {},
      },
      { method: 'PUT' }
    )

    await handler(req, res)

    const [writtenArgs] = mockUpsertDestinationChangeRequest.mock.calls[0]
    expect(writtenArgs).not.toHaveProperty('id')
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('PUT scheduleupdate computes id from destId+destType and uses the STORED jiraId, not the body\'s', async () => {
    const { req, res } = buildReqRes(
      {
        destId: 'dest1',
        destType: { typeId: 1, type: 'PROD' },
        id: 424242, // forged
        jiraId: 'FORGED-JIRA', // forged
        requestedAt: new Date().toISOString(),
        requested: {},
      },
      { method: 'PUT', query: { scheduleupdate: 'true' } }
    )

    await handler(req, res)

    expect(mockGetChangeRequestId).toHaveBeenCalledWith('dest1', 1)
    expect(mockFetchDestinationChangeRequestById).toHaveBeenCalledWith(999)
    expect(mockChangeRequestTicketComment.mock.calls[0][0]).toBe(
      'REAL-JIRA-999'
    )
    const [writtenArgs] = mockUpsertDestinationChangeRequest.mock.calls[0]
    expect(writtenArgs).toMatchObject({ id: 999, jiraId: 'REAL-JIRA-999' })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('PUT scheduleupdate 404s when the computed id has no stored record', async () => {
    mockFetchDestinationChangeRequestById.mockResolvedValue(undefined)
    const { req, res } = buildReqRes(
      {
        destId: 'dest1',
        destType: { typeId: 1, type: 'PROD' },
        requestedAt: new Date().toISOString(),
        requested: {},
      },
      { method: 'PUT', query: { scheduleupdate: 'true' } }
    )

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(mockChangeRequestTicketComment).not.toHaveBeenCalled()
    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
  })

  it('no longer offers DELETE on this route — the path-param route is the only delete path', async () => {
    const { req, res } = buildReqRes(
      { destId: 'dest1', destType: { typeId: 1, type: 'PROD' }, id: 1 },
      { method: 'DELETE' }
    )

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})

/**
 * PR #771 review (Anusha): the route's declared capability
 * (edit.canCreateChangeRequest) covered both a real submission and a draft
 * save with no distinction, so a role seeded with canSaveDraft: false but
 * canCreateChangeRequest: true could still save a draft by calling the API.
 */
describe('POST /api/changerequest draft save requires edit.canSaveDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    ;(hasAccessToDestId as jest.Mock).mockReturnValue(true)
    mockUpsertDestinationChangeRequest.mockResolvedValue({ id: 1 })
  })

  it('saves a draft for a role holding canSaveDraft', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'u@example.com', roles: ['IZG Operations'] },
    })
    const { req, res } = buildReqRes({
      destId: 'dest1',
      destType: { typeId: 1, type: 'PROD' },
      isDraft: true,
      requested: {},
    })

    await handler(req, res)

    expect(mockUpsertDestinationChangeRequest).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('refuses a draft save for a role holding neither canCreateChangeRequest nor canSaveDraft', async () => {
    // No role in the current matrix holds canCreateChangeRequest without
    // canSaveDraft (both are provisional-true together on the same two
    // roles), so this exercises the route's declarative gate and the new
    // in-handler check together rather than isolating the latter. Still a
    // real regression guard: if either gate were loosened, this would catch it.
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'u@example.com', roles: ['Jurisdiction Support'] },
    })
    const { req, res } = buildReqRes({
      destId: 'dest1',
      destType: { typeId: 1, type: 'PROD' },
      isDraft: true,
      requested: {},
    })

    await handler(req, res)

    expect(mockUpsertDestinationChangeRequest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
