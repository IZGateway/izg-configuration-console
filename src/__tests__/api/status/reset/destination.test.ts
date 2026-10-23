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

  it('forwards the regions block unchanged, beside the existing fields', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'complete', 'us-west-1': 'partial' })
    )

    const res = await reset()

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      destId: 'md',
      status: 'Connected',
      regions: { 'us-east-1': 'complete', 'us-west-1': 'partial' },
    })
  })

  it('keeps the hub status code rather than mapping a partial result to 502', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'failed', 'us-west-1': 'failed' })
    )

    const res = await reset()

    // The row needs the destination status in this body, so the route does not
    // turn an all-failed result into an error status. Design D6.
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ destId: 'md' })
  })

  it('returns no regions block against a hub that sends none', async () => {
    mockPost.mockResolvedValue(hubBody())

    const res = await reset()

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ destId: 'md', status: 'Connected' })
    expect(res.body).not.toHaveProperty('regions')
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
    })
  })
})
