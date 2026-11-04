/**
 * @jest-environment node
 */

/**
 * IGDD-3566: a failed Jira call is not the same question as "no ticket exists".
 * These tests pin which failures prove non-creation, which prove creation, and
 * which prove nothing. The last group matters most: an unclassified failure must
 * carry no verdict, because a wrong "nothing was created" invites a retry that
 * raises a second ticket.
 */
import createChangeRequestTicket, {
  ChangeRequestTicketError,
} from './createchangerequestticket'

const changeRequest = {
  destId: 'ak',
  destType: { typeId: 5, type: 'DEV' },
  requestedBy: 'tester@example.com',
  scheduledAt: '2026-10-21T12:00:00.000Z',
  isAsap: true,
  current: {},
  requested: {},
} as never

const call = async () => {
  try {
    await createChangeRequestTicket(changeRequest)
    return null
  } catch (error) {
    return error as ChangeRequestTicketError
  }
}

describe('createChangeRequestTicket failure classification', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  // fetch reports the real reason on `cause`, so these build the error the way
  // undici does. A code in the message alone would not reach the classifier.
  const transportError = (code: string) =>
    Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error(code), { code }),
    })

  it.each([
    ['the port refuses the connection', 'ECONNREFUSED'],
    ['DNS has no record', 'ENOTFOUND'],
    ['the connection never opens', 'UND_ERR_CONNECT_TIMEOUT'],
  ])('reports no ticket when %s', async (_name, code) => {
    global.fetch = jest.fn().mockRejectedValue(transportError(code))

    const error = await call()

    expect(error).toBeInstanceOf(ChangeRequestTicketError)
    expect(error.ticketMayExist).toBe(false)
  })

  it.each([
    ['the socket closes after Jira received the request', 'UND_ERR_SOCKET'],
    ['the connection resets mid-request', 'ECONNRESET'],
    ['the reply never arrives', 'UND_ERR_HEADERS_TIMEOUT'],
  ])('carries no verdict when %s', async (_name, code) => {
    // Jira may already hold the ticket on each of these. Reporting a proven
    // failure here is what lets a retry raise a second one.
    global.fetch = jest.fn().mockRejectedValue(transportError(code))

    const error = await call()

    expect(error).toBeInstanceOf(ChangeRequestTicketError)
    expect(error.ticketMayExist).toBeUndefined()
  })

  it('carries no verdict for a transport failure with no code', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'))

    const error = await call()

    expect(error.ticketMayExist).toBeUndefined()
  })

  it('reports no ticket when Jira refuses the request', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 })

    const error = await call()

    expect(error.ticketMayExist).toBe(false)
  })

  it('carries no verdict when Jira fails on its own side', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 })

    const error = await call()

    expect(error.ticketMayExist).toBeUndefined()
  })

  it('reports a ticket when Jira accepted the request but the reply is unreadable', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => {
        throw new Error('Unexpected token < in JSON')
      },
    })

    const error = await call()

    expect(error.ticketMayExist).toBe(true)
  })

  it('returns the ticket when Jira answers normally', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ key: 'FAKE-1' }),
    })

    await expect(createChangeRequestTicket(changeRequest)).resolves.toEqual({
      key: 'FAKE-1',
    })
  })
})
