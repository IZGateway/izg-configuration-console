/**
 * @jest-environment node
 *
 * IGDD-3599: the fleet-wide circuit breaker reset route.
 *
 * This file lives under `src/__tests__/` rather than beside the route.
 * `next.config.js` sets no `pageExtensions`, so a `.test.ts` under
 * `src/pages/` would be served as a route and break the build.
 *
 * `axios` is mocked rather than the reset utility, so the real utility runs
 * and the test can feed it a true hub body — including the `hosts` map and the
 * `destinations` block that must never reach the browser. `withMiddleware` is
 * stubbed to a pass-through: authorization for this route is unchanged by
 * IGDD-3599 and is covered by the access-matrix suites.
 */
// Each test file is its own module: without an import or export at the top
// level, TypeScript treats the file as a script and its consts collide with
// the sibling suite's.
export {}

jest.mock('../../../../lib/api/api-middleware-helper', () => ({
  __esModule: true,
  default: () => (handler: unknown) => handler,
}))

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(() => 'pem'),
}))

const mockPost = jest.fn()
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    isAxiosError: () => false,
  },
}))

const EAST_HOST = 'us-east-1:ip-10-9-93-145'
const WEST_HOST = 'us-west-1:ip-10-161-101-98'
const STATUS_BY = 'ip-10-202-10-158.us-west-2.compute.internal'

const PROD_URL = 'https://prod.izgateway.org:443/rest/statushistory'
const DEV_URL = 'https://dev.izgateway.org:443/rest/statushistory'

/** A hub body in the shape IGDD-3599 specifies, including what must be dropped. */
const hubBody = (regions?: Record<string, string>) => ({
  data: {
    destinations: {
      md: { destId: 'md', status: 'Connected', statusBy: STATUS_BY },
    },
    hosts: { [EAST_HOST]: 'OK (Local)', [WEST_HOST]: 'Timed Out' },
    ...(regions ? { regions } : {}),
  },
})

const buildReqRes = (body: unknown) => {
  const req = { method: 'POST', url: '/api/status/reset', body } as never
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
  }
  return { req, res }
}

const loadHandler = () => require('../../../../pages/api/status/reset/index').default

describe('POST /api/status/reset', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.IZG_ENDPOINT_CRT_PATH = '/tmp/cert.pem'
    process.env.IZG_ENDPOINT_KEY_PATH = '/tmp/key.pem'
    process.env.IZG_ENDPOINT_PASSCODE = 'passcode'
    process.env.IZG_STATUS_ENDPOINT_URL = JSON.stringify([
      { typeId: 1, desc: 'prod', url: PROD_URL },
    ])
  })

  const post = async (body: unknown) => {
    const { req, res } = buildReqRes(body)
    await loadHandler()(req, res)
    return res
  }

  it('forwards the regions block unchanged and reports success when every region completed', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'complete', 'us-west-1': 'complete' })
    )

    const res = await post({ destinationTypeId: 1 })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      result: {
        regions: { 'us-east-1': 'complete', 'us-west-1': 'complete' },
      },
    })
  })

  it('reports 200 without success when one region is partial, and names it', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'complete', 'us-west-1': 'partial' })
    )

    const res = await post({ destinationTypeId: 1 })

    // The hub answers 200 on a partial failure; the body carries the truth.
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ success: false })
    expect((res.body as { message: string }).message).toContain('us-west-1')
    expect((res.body as { message: string }).message).not.toContain('us-east-1')
  })

  it('reports 502 when every region failed, and still carries the block', async () => {
    mockPost.mockResolvedValue(
      hubBody({ 'us-east-1': 'failed', 'us-west-1': 'failed' })
    )

    const res = await post({ destinationTypeId: 1 })

    expect(res.statusCode).toBe(502)
    expect(res.body).toMatchObject({
      success: false,
      result: { regions: { 'us-east-1': 'failed', 'us-west-1': 'failed' } },
    })
  })

  it('does not report success for a status word it does not recognise', async () => {
    mockPost.mockResolvedValue(hubBody({ 'us-east-1': 'draining' }))

    const res = await post({ destinationTypeId: 1 })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ success: false })
  })

  it('keeps the pre-IGDD-3599 behaviour against a hub that sends no regions', async () => {
    mockPost.mockResolvedValue(hubBody())

    const res = await post({ destinationTypeId: 1 })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      success: true,
      message: 'Circuit breakers reset for the selected environment.',
    })
    expect((res.body as { result: object }).result).not.toHaveProperty('regions')
  })

  it('still reports 502 when the hub endpoint itself is unreachable', async () => {
    mockPost.mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await post({ destinationTypeId: 1 })

    expect(res.statusCode).toBe(502)
    expect(res.body).toMatchObject({ success: false })
  })

  /**
   * The all-environment form, reachable through the API but not the card.
   *
   * Design D4: a hub instance knows its region but not its environment, so dev
   * and prod both answer with a `us-east-1` key. Merging them would let one
   * environment's status overwrite another's. The verdict is aggregated
   * separately so the route never reads success from the status code alone.
   * Raised by review on PR #753.
   */
  describe('with several hubs configured and no destinationTypeId', () => {
    beforeEach(() => {
      process.env.IZG_STATUS_ENDPOINT_URL = JSON.stringify([
        { typeId: 1, desc: 'prod', url: PROD_URL },
        { typeId: 2, desc: 'dev', url: DEV_URL },
      ])
    })

    it('forwards no merged regions block', async () => {
      mockPost.mockResolvedValue(hubBody({ 'us-east-1': 'complete' }))

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(mockPost).toHaveBeenCalledTimes(2)
      expect((res.body as { result: object }).result).not.toHaveProperty(
        'regions'
      )
    })

    it('does not report success when every region of every hub failed', async () => {
      mockPost.mockResolvedValue(
        hubBody({ 'us-east-1': 'failed', 'us-west-1': 'failed' })
      )

      const res = await post({})

      // Both hubs answered 200, so the endpoint counts both as succeeded. Only
      // the aggregated verdict catches this.
      expect(res.statusCode).toBe(502)
      expect(res.body).toMatchObject({ success: false })
      // No merged block, so no region list in the message.
      expect((res.body as { error: string }).error).not.toContain('us-')
    })

    it('does not report success when one hub is partial', async () => {
      mockPost
        .mockResolvedValueOnce(hubBody({ 'us-east-1': 'complete' }))
        .mockResolvedValueOnce(
          hubBody({ 'us-east-1': 'complete', 'us-west-1': 'partial' })
        )

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({ success: false })
    })

    it('does not report success when one hub failed outright', async () => {
      mockPost
        .mockResolvedValueOnce(hubBody({ 'us-east-1': 'complete' }))
        .mockResolvedValueOnce(hubBody({ 'us-east-1': 'failed' }))

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({ success: false, result: { level: 'warning' } })
    })

    // A rejected request is a hub we never reached, not an older hub that
    // answered without regions. Raised by review on PR #753.
    it('does not report success when one hub completed and another was unreachable', async () => {
      mockPost
        .mockResolvedValueOnce(
          hubBody({ 'us-east-1': 'complete', 'us-west-1': 'complete' })
        )
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({
        success: false,
        result: { level: 'warning', failed: 1, succeeded: 1 },
      })
      expect((res.body as { message: string }).message).toContain(
        'could not be reached'
      )
    })

    it('keeps an error verdict an error when a hub is also unreachable', async () => {
      mockPost
        .mockResolvedValueOnce(hubBody({ 'us-east-1': 'failed' }))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const res = await post({})

      expect(res.statusCode).toBe(502)
      expect(res.body).toMatchObject({ success: false })
    })

    it('leaves the no-regions fallback alone when a hub is unreachable', async () => {
      // Neither hub reports regions, so there is no verdict to downgrade and
      // the route keeps reading the endpoint counts. Design D7.
      mockPost
        .mockResolvedValueOnce(hubBody())
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({ success: true })
      expect((res.body as { result: object }).result).not.toHaveProperty('level')
    })

    it('reports success when every hub completed every region', async () => {
      mockPost.mockResolvedValue(
        hubBody({ 'us-east-1': 'complete', 'us-west-1': 'complete' })
      )

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({
        success: true,
        message: 'All circuit breakers reset.',
      })
    })

    it('keeps the pre-IGDD-3599 behaviour when no hub reports regions', async () => {
      mockPost.mockResolvedValue(hubBody())

      const res = await post({})

      expect(res.statusCode).toBe(200)
      expect(res.body).toMatchObject({
        success: true,
        message: 'All circuit breakers reset.',
      })
      expect((res.body as { result: object }).result).not.toHaveProperty('level')
    })

    it('judges a hub that reports regions even when another does not', async () => {
      mockPost
        .mockResolvedValueOnce(hubBody())
        .mockResolvedValueOnce(hubBody({ 'us-east-1': 'failed' }))

      const res = await post({})

      expect(res.statusCode).toBe(502)
      expect(res.body).toMatchObject({ success: false })
    })
  })

  describe('redaction', () => {
    it('sends no hub host name, no statusBy and no destination block to the browser', async () => {
      mockPost.mockResolvedValue(
        hubBody({ 'us-east-1': 'complete', 'us-west-1': 'partial' })
      )

      const res = await post({ destinationTypeId: 1 })
      const serialised = JSON.stringify(res.body)

      expect(serialised).not.toContain('ip-')
      expect(serialised).not.toContain('.internal')
      expect(serialised).not.toContain('statusBy')
      expect(serialised).not.toContain('hosts')
      expect(serialised).not.toContain('destinations')
    })

    it('returns exactly the four result keys, so a new hub member cannot ride along', async () => {
      mockPost.mockResolvedValue(hubBody({ 'us-east-1': 'complete' }))

      const res = await post({ destinationTypeId: 1 })

      expect(
        Object.keys((res.body as { result: object }).result).sort()
      ).toEqual(['attempted', 'failed', 'level', 'regions', 'succeeded'])
    })
  })
})
