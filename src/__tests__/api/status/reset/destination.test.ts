/**
 * @jest-environment node
 *
 * IGDD-3599: the per-destination circuit breaker reset route.
 *
 * Under `src/__tests__/` for the same reason as `index.test.ts`: a `.test.ts`
 * inside `src/pages/` becomes a route, because `next.config.js` sets no
 * `pageExtensions`.
 *
 * `can()` is stubbed to allow. The authorization rule on this route is
 * IGDD-3472's single permission-plus-reach decision and is unchanged here; the
 * `destination-circuit-breaker-reset` spec covers it. What IGDD-3599 changes,
 * and what this file asserts, is the response body.
 */
// Each test file is its own module: without an import or export at the top
// level, TypeScript treats the file as a script and its consts collide with
// the sibling suite's.
export {}

jest.mock('../../../../lib/api/api-middleware-helper', () => ({
  __esModule: true,
  default: () => (handler: unknown) => handler,
}))

const mockCan = jest.fn()
jest.mock('../../../../lib/security/policy', () => ({
  ...jest.requireActual('../../../../lib/security/policy'),
  can: (...args: unknown[]) => mockCan(...args),
}))

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(() => 'pem'),
}))

const mockPost = jest.fn()
const mockIsAxiosError = jest.fn(() => false)
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    isAxiosError: () => mockIsAxiosError(),
  },
}))

const STATUS_BY = 'ip-10-202-10-158.us-west-2.compute.internal'
const HUB_URL = 'https://prod.izgateway.org:443/rest/statushistory'

/** The hub body for `POST /rest/reset/{id}` after IGDD-3599. */
const hubBody = (regions?: Record<string, string>) => ({
  status: 200,
  data: {
    destId: 'md',
    status: 'Connected',
    statusBy: STATUS_BY,
    hosts: {
      'us-east-1:ip-10-9-93-145': 'OK (Local)',
      'us-west-1:ip-10-161-101-98': 'Timed Out',
    },
    ...(regions ? { regions } : {}),
  },
})

const buildReqRes = () => {
  const req = {
    method: 'POST',
    url: '/api/status/reset/1/md',
    query: { slug: ['1', 'md'] },
  } as never
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    send(payload: unknown) {
      this.body = payload
      return this
    },
    setHeader: jest.fn(),
  }
  return { req, res }
}

const loadHandler = () =>
  require('../../../../pages/api/status/reset/[...slug]').default

const reset = async () => {
  const { req, res } = buildReqRes()
  await loadHandler()(req, res)
  return res
}

describe('POST /api/status/reset/{destTypeId}/{destId}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCan.mockReturnValue({ allowed: true, grantedBy: 'IZG Operations' })
    mockIsAxiosError.mockReturnValue(false)
    process.env.IZG_ENDPOINT_CRT_PATH = '/tmp/cert.pem'
    process.env.IZG_ENDPOINT_KEY_PATH = '/tmp/key.pem'
    process.env.IZG_ENDPOINT_PASSCODE = 'passcode'
    process.env.IZG_STATUS_ENDPOINT_URL = JSON.stringify([
      { typeId: 1, desc: 'prod', url: HUB_URL },
    ])
  })

  it('reports resetComplete false, and no region names, when a region is partial', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'complete', 'us-west-1': 'partial' })
    )

    const res = await reset()

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      destId: 'md',
      status: 'Connected',
      resetComplete: false,
    })
    expect(res.body).not.toHaveProperty('regions')
  })

  it('reports resetComplete true when every region completed', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'complete', 'us-west-1': 'complete' })
    )

    const res = await reset()

    expect(res.body).toMatchObject({ resetComplete: true })
    expect(res.body).not.toHaveProperty('regions')
  })

  it('keeps the hub status code rather than mapping a partial result to 502', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'failed', 'us-west-1': 'failed' })
    )

    const res = await reset()

    // The row needs the destination status in this body, so the route does not
    // turn an all-failed result into an error status. Design D6.
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ destId: 'md', resetComplete: false })
  })

  it('omits resetComplete entirely against a hub that sends no regions', async () => {
    mockPost.mockResolvedValue(hubBody())

    const res = await reset()

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ destId: 'md', status: 'Connected' })
    expect(res.body).not.toHaveProperty('regions')
    expect(res.body).not.toHaveProperty('resetComplete')
  })

  it('passes a hub error status through unchanged', async () => {
    mockIsAxiosError.mockReturnValue(true)
    mockPost.mockRejectedValue({
      response: { status: 404, data: { error: 'destination not found' } },
    })

    const res = await reset()

    expect(res.statusCode).toBe(404)
  })

  it('returns 502 when the hub cannot be reached', async () => {
    mockPost.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await reset()

    expect(res.statusCode).toBe(502)
  })

  it('denies a caller the policy rejects, and calls no hub', async () => {
    mockCan.mockReturnValue({ allowed: false })

    const res = await reset()

    expect(res.statusCode).toBe(401)
    expect(mockPost).not.toHaveBeenCalled()
  })

  describe('redaction', () => {
    it('sends no hub host name, no hosts map and no statusBy to the browser', async () => {
      mockPost.mockResolvedValue(hubBody({ 'us-east-1': 'complete' }))

      const res = await reset()
      const serialised = JSON.stringify(res.body)

      // `.internal`, not `.ec2.internal`: a host name can read
      // ip-10-202-10-158.us-west-2.compute.internal.
      expect(serialised).not.toContain('ip-')
      expect(serialised).not.toContain('.internal')
      expect(serialised).not.toContain('statusBy')
      expect(serialised).not.toContain('hosts')
      // Region names are Hub topology. This route is reachable by a
      // jurisdiction-scoped role, so they do not leave the server here, even
      // though the Admin Operations route does return them.
      expect(serialised).not.toContain('us-east-1')
      expect(serialised).not.toContain('us-west-1')
      expect(serialised).not.toContain('regions')
    })

    // The rule is unconditional: no Hub host name reaches the browser,
    // whichever member holds it and whatever the status code. An error body is
    // still a Hub body, and this route forwards it verbatim.
    it('redacts the hub error body too, not only the success body', async () => {
      mockIsAxiosError.mockReturnValue(true)
      mockPost.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: 'reset failed',
            statusBy: STATUS_BY,
            hosts: { 'us-west-1:ip-10-161-101-98': 'Send Failure' },
            regions: { 'us-west-1': 'failed' },
          },
        },
      })

      const res = await reset()
      const serialised = JSON.stringify(res.body)

      expect(res.statusCode).toBe(500)
      expect(serialised).toContain('reset failed')
      expect(serialised).not.toContain('ip-')
      expect(serialised).not.toContain('.internal')
      expect(serialised).not.toContain('statusBy')
      expect(serialised).not.toContain('hosts')
      expect(serialised).not.toContain('regions')
      expect(serialised).not.toContain('us-west-1')
    })

    it('passes a hub error body through when it carries nothing private', async () => {
      mockIsAxiosError.mockReturnValue(true)
      mockPost.mockRejectedValue({
        response: { status: 404, data: { error: 'destination not found' } },
      })

      const res = await reset()

      expect(res.statusCode).toBe(404)
      expect(res.body).toEqual({ error: 'destination not found' })
    })
  })
})
