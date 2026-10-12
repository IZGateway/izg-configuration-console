/**
 * @jest-environment node
 */
import { Writable } from 'stream'
import http from 'http'
import https from 'https'
import vm from 'vm'
import winston from 'winston'
import { AxiosError } from 'axios'
import logger from '../../logger'

// Capture the exact bytes the logger writes (what reaches stdout, log.json and
// Elastic), through the real winston entry points rather than format.transform,
// because how an Error reaches the formats depends on how it was logged.
const lines: string[] = []
const capture = new winston.transports.Stream({
  stream: new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString())
      callback()
    },
  }),
})

beforeAll(() => {
  logger.transports.forEach((t) => (t.silent = true))
  logger.add(capture)
})

afterAll(() => {
  logger.remove(capture)
  logger.transports.forEach((t) => (t.silent = false))
})

beforeEach(() => {
  lines.length = 0
})

const lastLine = async () => {
  await new Promise((resolve) => setImmediate(resolve))
  return lines[lines.length - 1]
}

const withDefaultMeta = async (
  meta: Record<string, unknown>,
  run: () => Promise<void>
) => {
  logger.defaultMeta = meta
  try {
    await run()
  } finally {
    logger.defaultMeta = undefined
  }
}

// FAKE values only: shaped like the Hub client agents the app builds.
const hubAgent = () =>
  new https.Agent({
    cert: '-----BEGIN CERTIFICATE-----FAKE-CERT',
    key: '-----BEGIN PRIVATE KEY-----FAKE-KEY',
    passphrase: 'FAKE-PASSPHRASE',
  })

const hubAxiosError = () => {
  const httpsAgent = hubAgent()
  const config = { url: 'https://hub/rest/status', httpsAgent } as never
  const request = Object.assign(Object.create(http.ClientRequest.prototype), {
    agent: httpsAgent,
  })
  return new AxiosError(
    'connect ECONNREFUSED 10.0.0.1:443',
    'ECONNREFUSED',
    config,
    request
  )
}

const expectNoSecrets = (line: string) => {
  expect(line).not.toMatch(/FAKE-KEY|FAKE-CERT|FAKE-PASSPHRASE|PRIVATE KEY/)
}

// The event's own Error: one of the shapes winston produces (ecsErrors).
describe("the event's own Error becomes safe ECS error.* fields (IGDD-3541)", () => {
  it('logger.error(err): the shape Next.js logs for an uncaught API route error', async () => {
    logger.error(hubAxiosError())
    const line = await lastLine()
    expectNoSecrets(line)

    const doc = JSON.parse(line)
    expect(doc.message).toBe('connect ECONNREFUSED 10.0.0.1:443')
    expect(doc.error).toMatchObject({
      type: 'AxiosError',
      name: 'AxiosError',
      code: 'ECONNREFUSED',
      message: 'connect ECONNREFUSED 10.0.0.1:443',
    })
    expect(doc.error.stack_trace).toContain('connect ECONNREFUSED')
    expect(doc).not.toHaveProperty('config')
    expect(doc).not.toHaveProperty('request')
    expect(doc).not.toHaveProperty('stack')
  })

  it('console.error(err) is covered too (console is routed to the logger)', async () => {
    console.error(hubAxiosError())
    const line = await lastLine()
    expectNoSecrets(line)
    expect(JSON.parse(line).error.type).toBe('AxiosError')
  })

  it("logger.error('msg', err): the pattern in dynamo.ts and Next's ⨯ logger", async () => {
    logger.error('Hub call failed', hubAxiosError())
    const line = await lastLine()
    expectNoSecrets(line)

    const doc = JSON.parse(line)
    expect(doc.message).toBe(
      'Hub call failed connect ECONNREFUSED 10.0.0.1:443'
    )
    expect(doc.error).toMatchObject({
      type: 'AxiosError',
      code: 'ECONNREFUSED',
    })
    expect(doc).not.toHaveProperty('config')
    expect(doc).not.toHaveProperty('request')
    expect(doc).not.toHaveProperty('code')
  })

  it("logger.error('msg %s', err): keeps the Error when the message has format tokens", async () => {
    logger.error('Hub call failed: %s', hubAxiosError())
    const doc = JSON.parse(await lastLine())
    expect(doc.message).toBe('Hub call failed: %s')
    expect(doc.error).toMatchObject({
      type: 'AxiosError',
      code: 'ECONNREFUSED',
    })
  })

  it('logger.error(err, meta): keeps the meta, sanitizes the Error', async () => {
    // winston's types omit (err, meta), but its runtime accepts it.
    logger.error(hubAxiosError() as unknown as string, {
      operation: 'resetCircuitBreaker',
    })
    const line = await lastLine()
    expectNoSecrets(line)

    const doc = JSON.parse(line)
    expect(doc.operation).toBe('resetCircuitBreaker')
    expect(doc.message).toBe('connect ECONNREFUSED 10.0.0.1:443')
    expect(doc.error).toMatchObject({
      type: 'AxiosError',
      code: 'ECONNREFUSED',
    })
  })

  it('logger.error({ message: err }): message is a string, never an object', async () => {
    logger.error({ message: hubAxiosError() } as never)
    const doc = JSON.parse(await lastLine())
    expect(doc.message).toBe('connect ECONNREFUSED 10.0.0.1:443')
    expect(doc.error.type).toBe('AxiosError')
  })

  it.each([
    ['err', (e: Error) => ({ err: e })],
    ['error', (e: Error) => ({ error: e })],
  ])(
    'an Error under meta.%s becomes ECS error.* fields',
    async (_key, meta) => {
      logger.error('Hub call failed', {
        operation: 'op',
        ...meta(hubAxiosError()),
      })
      const line = await lastLine()
      expectNoSecrets(line)

      const doc = JSON.parse(line)
      expect(doc.operation).toBe('op')
      expect(doc.error).toMatchObject({
        type: 'AxiosError',
        code: 'ECONNREFUSED',
      })
      expect(doc).not.toHaveProperty('err')
    }
  )

  it('logger.log(info) with an err: the Error becomes error.*', async () => {
    logger.log({
      level: 'error',
      message: 'm',
      requestId: 'r1',
      err: hubAxiosError(),
    })
    const line = await lastLine()
    expectNoSecrets(line)
    const doc = JSON.parse(line)
    expect(doc).toMatchObject({
      message: 'm',
      requestId: 'r1',
      error: { type: 'AxiosError' },
    })
    expect(doc).not.toHaveProperty('err')
  })

  it('handles an Error with an empty message', async () => {
    logger.error(new Error(''))
    const doc = JSON.parse(await lastLine())
    expect(doc.message).toBe('Error')
    expect(doc.error.type).toBe('Error')
  })

  it('sanitizes an Error from another realm, which fails instanceof Error', async () => {
    const err = vm.runInNewContext(
      'Object.assign(new Error("boom"), { config: { key: "FAKE-KEY" } })'
    )
    expect(err instanceof Error).toBe(false)

    logger.error(err)
    const line = await lastLine()
    expectNoSecrets(line)
    expect(JSON.parse(line).error).toMatchObject({
      type: 'Error',
      message: 'boom',
    })
  })
})

describe('error.* fields (IGDD-3541)', () => {
  it('keeps AWS SDK $metadata and $fault, drops everything else', async () => {
    class ConditionalCheckFailedException extends Error {}
    const err = Object.assign(
      new ConditionalCheckFailedException('The conditional request failed'),
      {
        name: 'ConditionalCheckFailedException',
        $fault: 'client',
        $metadata: {
          httpStatusCode: 400,
          requestId: 'REQ1',
          attempts: 1,
          nested: { x: 1 },
        },
        $response: { body: 'raw response' },
        Item: { sortKey: 'abc' },
      }
    )
    logger.error('DynamoDB write failed', err)
    const doc = JSON.parse(await lastLine())

    expect(doc.error).toMatchObject({
      type: 'ConditionalCheckFailedException',
      name: 'ConditionalCheckFailedException',
      $fault: 'client',
      $metadata: { httpStatusCode: 400, requestId: 'REQ1', attempts: 1 },
    })
    expect(doc.error.$metadata).not.toHaveProperty('nested')
    expect(doc.error).not.toHaveProperty('$response')
    expect(doc.error).not.toHaveProperty('Item')
    expect(doc).not.toHaveProperty('Item')
    expect(doc).not.toHaveProperty('$response')
  })

  it('writes error.code as a string, whatever type the library used', async () => {
    logger.error('failed', Object.assign(new Error('boom'), { code: 503 }))
    expect(JSON.parse(await lastLine()).error.code).toBe('503')
  })

  it('keeps the method and endpoint of a failed axios request, without secrets', async () => {
    const config = {
      method: 'post',
      url: 'https://user:pw@hub/rest/status?token=SECRET#frag',
      headers: { Authorization: 'Basic SECRET' },
    }
    logger.error(
      'failed',
      new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config as never)
    )
    const line = await lastLine()
    expect(line).not.toContain('SECRET')
    // The ECS url object, as everywhere else, never a bare string.
    expect(JSON.parse(line).error).toMatchObject({
      method: 'POST',
      url: { full: 'https://hub/rest/status', path: '/rest/status' },
    })

    for (const url of [
      '//admin:SECRET@hub/x',
      'admin:SECRET@hub/x',
      'admin:SEC@RET@hub/x',
      'ftp://u:SECRET@hub/x',
      'https://u:SEC?RET@hub/x',
      'https://u:SEC#RET@hub/x',
    ]) {
      logger.error(
        'failed',
        new AxiosError('Unsupported protocol', 'ERR', { url } as never)
      )
      const misconfigured = await lastLine()
      expect(misconfigured).not.toMatch(/SECRET|RET@/)
      expect(typeof JSON.parse(misconfigured).error.url).toBe('object')
      expect(misconfigured).toContain('hub/x')
    }

    // Joined as axios joins them, keeping the baseURL's path.
    const relative = {
      method: 'get',
      url: '/status?x=1',
      baseURL: 'https://hub/rest/',
    }
    logger.error(
      'failed',
      new AxiosError('Request failed', 'ERR', relative as never)
    )
    expect(JSON.parse(await lastLine()).error.url.full).toBe(
      'https://hub/rest/status'
    )
  })

  it('keeps the address and port a system error failed to reach', async () => {
    const err = Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:443'), {
      code: 'ECONNREFUSED',
      syscall: 'connect',
      address: '10.0.0.1',
      port: 443,
    })
    logger.error('failed', err)
    expect(JSON.parse(await lastLine()).error).toMatchObject({
      code: 'ECONNREFUSED',
      address: '10.0.0.1',
      port: 443,
    })
  })

  it("writes an object error's error.* fields as the types toEcsError writes", async () => {
    logger.error('x', {
      error: {
        message: { detail: 'y' },
        code: 5,
        cause: { reason: 'r' },
        status: 'FAILED',
        statusCode: '404',
        port: BigInt(443),
        $metadata: { requestId: 'R1', nested: { x: 1 } },
        url: 'https://u:SECRET@hub/x?q=1',
        reason: { kept: true },
      },
    })
    const line = await lastLine()
    expect(line).not.toContain('SECRET')
    expect(JSON.parse(line).error).toEqual({
      message: '{"detail":"y"}',
      code: '5',
      cause: '{"reason":"r"}',
      statusCode: 404,
      port: 443,
      $metadata: { requestId: 'R1' },
      url: { full: 'https://hub/x?q=1', path: '/x', query: 'q=1' },
    })

    logger.error('x', { err: new Error('e'), error: { message: { a: 1 } } })
    expect(JSON.parse(await lastLine()).error.related).toEqual([
      { message: '{"a":1}' },
    ])
  })

  it("leaves out an object error's keys that are not error.* fields", async () => {
    // Without a fixed type, `reason` could be text in one event and an object
    // in the next, which Elasticsearch rejects.
    for (const reason of ['text', { kept: true }]) {
      logger.error('x', { error: { message: 'm', code: 'E1', reason } })
      expect(JSON.parse(await lastLine()).error).toEqual({
        message: 'm',
        code: 'E1',
      })
    }
  })

  it('returns an error object that is already in the ECS shape as it is', async () => {
    const error = { message: 'm', code: 'E1' }
    logger.error('x', { error })
    expect(JSON.parse(await lastLine()).error).toEqual(error)
  })

  it('keeps status, statusCode and errno numeric, or drops them', async () => {
    const err = Object.assign(new Error('boom'), {
      status: 'FAILED',
      statusCode: '404',
      errno: true,
    })
    logger.error('failed', err)
    const doc = JSON.parse(await lastLine())
    expect(doc.error.statusCode).toBe(404)
    expect(doc.error).not.toHaveProperty('status')
    expect(doc.error).not.toHaveProperty('errno')
  })

  it('writes stack_trace only as a string', async () => {
    const err = new Error('boom')
    Object.defineProperty(err, 'stack', { value: { frames: [] } })
    logger.error('failed', { err })
    const doc = JSON.parse(await lastLine())
    expect(doc.error.message).toBe('boom')
    expect(doc.error).not.toHaveProperty('stack_trace')
  })

  it("does not log an Error's own non-allowlisted properties, e.g. an error payload", async () => {
    const err = Object.assign(new Error('token request failed'), {
      error: { body: 'SECRET-PAYLOAD' },
      response: { data: 'SECRET-PAYLOAD' },
    })
    logger.error('call failed', err)
    const line = await lastLine()
    expect(line).not.toContain('SECRET-PAYLOAD')
    expect(JSON.parse(line).error.message).toBe('token request failed')
  })

  // winston itself reads the Error's properties when merging a meta Error
  // (`logger.error('msg', err)`), before any format runs; that is unchanged.
  it.each([
    ['logger.error(err)', (err: Error) => logger.error(err)],
    [
      "logger.error('msg', { err })",
      (err: Error) => logger.error('failed', { err }),
    ],
  ])(
    '%s: never throws when an Error property cannot be read',
    async (_shape, log) => {
      const err = new Error('boom')
      Object.defineProperty(err, 'code', {
        enumerable: true,
        get() {
          throw new Error('getter exploded')
        },
      })

      expect(() => log(err)).not.toThrow()
      const doc = JSON.parse(await lastLine())
      // Only the unreadable field is lost.
      expect(doc.error).toMatchObject({ type: 'Error', message: 'boom' })
      expect(doc.error.stack_trace).toContain('boom')
      expect(doc.error).not.toHaveProperty('code')
    }
  )
})

describe('several Errors in one event (IGDD-3541)', () => {
  it('the logged Error is error, any other error.related', async () => {
    logger.error(new Error('A') as unknown as string, { error: new Error('B') })
    const doc = JSON.parse(await lastLine())
    expect(doc.message).toBe('A')
    expect(doc.error.message).toBe('A')
    expect(doc.error.related).toEqual([
      expect.objectContaining({ message: 'B' }),
    ])
  })

  it('err comes before error', async () => {
    class DynamoError extends Error {}
    logger.error('save failed', {
      err: new DynamoError('write failed'),
      error: hubAxiosError(),
    })
    const line = await lastLine()
    expectNoSecrets(line)

    const doc = JSON.parse(line)
    expect(doc.error).toMatchObject({
      type: 'DynamoError',
      message: 'write failed',
    })
    expect(doc.error.related).toEqual([
      expect.objectContaining({ type: 'AxiosError', code: 'ECONNREFUSED' }),
    ])
    expect(doc).not.toHaveProperty('err')
  })

  it("keeps a caller's non-Error error, in its ECS shape, in error.related", async () => {
    logger.error('save failed', { error: 'context', err: new Error('boom') })
    expect(JSON.parse(await lastLine()).error).toMatchObject({
      message: 'boom',
      related: [{ message: 'context' }],
    })

    logger.error(new Error('A') as unknown as string, {
      error: { message: 'B', related: 'r' },
    })
    // error.related is one level deep: B's own related is left out.
    expect(JSON.parse(await lastLine()).error).toEqual(
      expect.objectContaining({ message: 'A', related: [{ message: 'B' }] })
    )
  })

  it('does not overwrite a non-Error err the caller logged', async () => {
    logger.error('timed out', { err: 'E_TIMEOUT', error: hubAxiosError() })
    const line = await lastLine()
    expectNoSecrets(line)

    const doc = JSON.parse(line)
    expect(doc.err).toBe('E_TIMEOUT')
    expect(doc.error.type).toBe('AxiosError')
  })
})

// Anything else, wherever it is: the serializer (safeStringify).
describe('the serializer never writes Error or network object internals (IGDD-3541)', () => {
  it("never runs a nested AxiosError's toJSON, which walks its request config", async () => {
    const toJSON = jest.spyOn(AxiosError.prototype, 'toJSON')
    try {
      logger.error('Hub failed', {
        cause: hubAxiosError(),
        list: [hubAxiosError()],
      })
      const line = await lastLine()
      expectNoSecrets(line)
      expect(JSON.parse(line).cause.type).toBe('AxiosError')
      expect(toJSON).not.toHaveBeenCalled()
    } finally {
      toJSON.mockRestore()
    }
  })

  it("removes winston's copy of an Error property whose getter returns a new object", async () => {
    const err = new Error('boom')
    Object.defineProperty(err, 'config', {
      enumerable: true,
      get: () => ({ headers: { Authorization: 'Basic SECRET' } }),
    })
    logger.error('failed', err)
    const line = await lastLine()
    expect(line).not.toContain('SECRET')
    expect(JSON.parse(line)).not.toHaveProperty('config')
  })

  it.each([
    [
      '{ cause: err }',
      () => logger.error('Hub failed', { cause: hubAxiosError() }),
    ],
    [
      '{ details: { err } }',
      () => logger.error('Hub failed', { details: { err: hubAxiosError() } }),
    ],
    [
      '{ reason: [err] }',
      () => logger.error('Hub failed', { reason: [hubAxiosError()] }),
    ],
    [
      "console.error('msg', [err])",
      () => console.error('Hub failed', [hubAxiosError()]),
    ],
  ])('an Error under any other key or nesting: %s', async (_shape, log) => {
    log()
    const line = await lastLine()
    expectNoSecrets(line)
    expect(line).toContain('"type":"AxiosError"')
    expect(line).not.toContain('httpsAgent')
  })

  it('an Error inside a class instance', async () => {
    class ConnectionTestResult {
      constructor(public ok: boolean, public error: unknown) {}
    }
    logger.error('test failed', {
      result: new ConnectionTestResult(false, hubAxiosError()),
    })
    const line = await lastLine()
    expectNoSecrets(line)
    expect(JSON.parse(line).result).toMatchObject({
      ok: false,
      error: { type: 'AxiosError' },
    })
  })

  it('network objects outside Errors, e.g. an axios response', async () => {
    const httpsAgent = hubAgent()
    const request = Object.assign(Object.create(http.ClientRequest.prototype), {
      agent: httpsAgent,
    })
    logger.error('call failed', {
      response: { status: 500, config: { httpsAgent }, request },
    })
    const line = await lastLine()
    expectNoSecrets(line)
    expect(JSON.parse(line).response).toEqual({
      status: 500,
      config: { httpsAgent: '[Agent]' },
      request: '[ClientRequest]',
    })
  })

  it.each([
    [
      'a toJSON that returns an Error',
      (e: Error) => ({ wrapper: { toJSON: () => e } }),
    ],
    [
      'an Error whose toJSON returns a string',
      (e: Error) => ({ nested: Object.assign(e, { toJSON: () => 'SECRET' }) }),
    ],
  ])('an Error behind toJSON: %s', async (_shape, meta) => {
    const err = Object.assign(new Error('inner'), { payload: 'SECRET' })
    logger.info('x', meta(err))
    const line = await lastLine()
    expect(line).not.toContain('SECRET')
    expect(line).toContain('"message":"inner"')
  })

  it.each([
    ['an array error holding an Error', () => ({ error: [hubAxiosError()] })],
    [
      'an error whose toJSON returns a network object',
      () => ({ error: { toJSON: () => hubAgent() } }),
    ],
  ])('%s is written as error.message', async (_shape, meta) => {
    logger.error('x', meta())
    const line = await lastLine()
    expectNoSecrets(line)
    expect(typeof JSON.parse(line).error.message).toBe('string')
  })

  it('an Error at any depth, shared or circular', async () => {
    let deep: Record<string, unknown> = { err: hubAxiosError() }
    for (let i = 0; i < 20; i++) deep = { next: deep }
    const shared = { err: hubAxiosError() }
    const circular: Record<string, unknown> = { err: hubAxiosError() }
    circular.self = circular
    logger.error('Hub failed', { deep, list: [shared, shared], circular })
    const line = await lastLine()
    expectNoSecrets(line)
    const doc = JSON.parse(line)
    expect(doc.list[1].err.type).toBe('AxiosError')
    expect(doc.circular.err.type).toBe('AxiosError')
  })

  it('does not allow child loggers, which flatten an Error before any format runs', () => {
    // child.error(err) would write the AxiosError's config as plain data.
    expect(() => logger.child({ requestId: 'r1' })).toThrow(
      /logger\.child\(\) is not supported/
    )
  })

  it("reduces an Error in a caller's error.related, without running its toJSON", async () => {
    const toJSON = jest.spyOn(AxiosError.prototype, 'toJSON')
    try {
      logger.error('x', { error: { message: 'm', related: [hubAxiosError()] } })
      const line = await lastLine()
      expectNoSecrets(line)
      expect(JSON.parse(line).error.related).toEqual([
        expect.objectContaining({ type: 'AxiosError', code: 'ECONNREFUSED' }),
      ])
      expect(toJSON).not.toHaveBeenCalled()
    } finally {
      toJSON.mockRestore()
    }
  })

  it.each([
    [
      'refers back to itself',
      () => {
        const e: Record<string, unknown> = { message: 'loop' }
        e.related = [e]
        return { error: e }
      },
    ],
    [
      'is a two-object cycle, next to an Error',
      () => {
        const a: Record<string, unknown> = { message: 'a' }
        const b: Record<string, unknown> = { message: 'b', related: [a] }
        a.related = [b]
        return { err: new Error('boom'), error: a }
      },
    ],
  ])("a caller's error.related that %s stays shallow", async (_shape, meta) => {
    expect(() => logger.error('x', meta())).not.toThrow()
    const line = await lastLine()
    // Elasticsearch rejects documents nested deeper than its depth limit (20).
    const depth = (value: unknown): number =>
      value !== null && typeof value === 'object'
        ? 1 + Math.max(0, ...Object.values(value).map(depth))
        : 0
    expect(depth(JSON.parse(line))).toBeLessThan(10)
    // Every item of error.related is an object, as Elasticsearch requires.
    expect(line).not.toContain('[Circular]')
    for (const item of JSON.parse(line).error.related ?? []) {
      expect(typeof item).toBe('object')
      expect(item).not.toHaveProperty('related')
    }
  })

  it.each(['url', 'user', 'error'])(
    'never throws for an event whose %s cannot be read',
    async (key) => {
      const info = { level: 'info', message: 'x', requestId: 'r1' }
      Object.defineProperty(info, key, {
        enumerable: true,
        get() {
          throw new Error('getter exploded')
        },
      })
      expect(() => logger.log(info)).not.toThrow()
      const doc = JSON.parse(await lastLine())
      expect(doc).toMatchObject({ message: 'x', requestId: 'r1' })
      expect(doc).not.toHaveProperty(key)
    }
  )

  it('if one field cannot be serialized, still writes the others, error included', async () => {
    const ctx = {
      get bad() {
        throw new Error('getter exploded')
      },
    }
    expect(() =>
      logger.error('Hub call failed', {
        err: hubAxiosError(),
        ctx,
        requestId: 'r1',
      })
    ).not.toThrow()
    const line = await lastLine()
    expectNoSecrets(line)
    const doc = JSON.parse(line)
    expect(doc).toMatchObject({
      message: 'Hub call failed',
      requestId: 'r1',
      error: { type: 'AxiosError', code: 'ECONNREFUSED' },
    })
    expect(doc).not.toHaveProperty('ctx')
  })

  it('never throws for a throwing getter on an event that has an Error', async () => {
    const info = {
      message: 'x',
      err: new Error('e'),
      get detail() {
        throw new Error('getter exploded')
      },
    }
    expect(() => logger.error(info)).not.toThrow()
    const doc = JSON.parse(await lastLine())
    expect(doc).toMatchObject({ message: 'x', error: { message: 'e' } })
    expect(doc).not.toHaveProperty('detail')
  })

  it.each([
    [
      'a revoked Proxy as error',
      () => {
        const { proxy, revoke } = Proxy.revocable({}, {})
        revoke()
        return { error: proxy }
      },
    ],
    [
      'an error whose toJSON returns a revoked Proxy',
      () => {
        const { proxy, revoke } = Proxy.revocable({}, {})
        revoke()
        return { error: { toJSON: () => proxy } }
      },
    ],
    [
      'a Proxy whose prototype cannot be read',
      () => ({
        error: new Proxy(
          {},
          {
            getPrototypeOf() {
              throw new Error('trap exploded')
            },
          }
        ),
        details: { nested: 1 },
      }),
    ],
  ])('never throws for %s', async (_shape, meta) => {
    expect(() =>
      logger.error('x', { requestId: 'r1', ...meta() })
    ).not.toThrow()
    expect(JSON.parse(await lastLine())).toMatchObject({
      message: 'x',
      requestId: 'r1',
    })
  })

  // winston itself reads these before any format runs.
  const throwingGetterError = () =>
    Object.defineProperty(new Error('boom'), 'detail', {
      enumerable: true,
      get() {
        throw new Error('getter exploded')
      },
    })
  const unlistableError = () =>
    new Proxy(new Error('boom'), {
      ownKeys() {
        throw new Error('ownKeys exploded')
      },
    })

  it.each([
    [
      "logger.error('msg', err) with a throwing getter",
      () => logger.error('Hub failed', throwingGetterError()),
    ],
    [
      "logger.error('msg', err) whose keys cannot be listed",
      () => logger.error('Hub failed', unlistableError()),
    ],
    [
      "logger.log('error', 'msg', err) with a throwing getter",
      () => logger.log('error', 'Hub failed', throwingGetterError()),
    ],
    [
      "console.error('msg', err) with a throwing getter",
      () => console.error('Hub failed', throwingGetterError()),
    ],
  ])(
    '%s: never throws, and logs the message and error',
    async (_shape, log) => {
      expect(log).not.toThrow()
      const doc = JSON.parse(await lastLine())
      expect(doc).toMatchObject({
        message: 'Hub failed',
        'log.level': 'error',
        error: { type: 'Error', message: 'boom' },
      })
      expect(doc).not.toHaveProperty('detail')
    }
  )

  it.each([
    ['a frozen Error', () => Object.freeze(new Error('boom'))],
    [
      'a Proxy that refuses writes',
      () =>
        new Proxy(new Error('boom'), {
          set() {
            throw new Error('set exploded')
          },
        }),
    ],
  ])('logger.error(err) for %s: never throws', async (_shape, err) => {
    expect(() => logger.error(err())).not.toThrow()
    expect(JSON.parse(await lastLine())).toMatchObject({
      message: 'boom',
      error: { type: 'Error', message: 'boom' },
    })
  })

  it('logger.log(info) for a frozen event: never throws, at its level', async () => {
    const info = Object.freeze({ level: 'warn', message: 'frozen' })
    expect(() => logger.log(info)).not.toThrow()
    expect(JSON.parse(await lastLine())).toMatchObject({
      message: 'frozen',
      'log.level': 'warn',
    })
  })

  it('if an event cannot be serialized, writes the fields it can instead of throwing', async () => {
    const unreadable = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('ownKeys exploded')
        },
      }
    )
    expect(() =>
      logger.info('Payment sync done', {
        requestId: 'r1',
        message: 'ok',
        details: unreadable,
      })
    ).not.toThrow()
    const doc = JSON.parse(await lastLine())
    expect(doc).toMatchObject({
      message: 'Payment sync done ok',
      requestId: 'r1',
    })
    expect(doc).not.toHaveProperty('details')
    expect(doc).not.toHaveProperty('error')
  })
})

describe("the caller's objects and winston's own behaviour (IGDD-3541)", () => {
  it('does not strip the Error the caller still holds', async () => {
    const err = hubAxiosError()
    logger.error('Hub call failed', err)
    await lastLine()
    expect(err.config?.httpsAgent).toBeDefined()
    expect(err.request).toBeDefined()
  })

  it('gives back the Error winston used as the event without level, and defaultMeta in the event', async () => {
    await withDefaultMeta({ service_area: 'console' }, async () => {
      const err = hubAxiosError()
      logger.error(err)
      const doc = JSON.parse(await lastLine())
      expect(doc.service_area).toBe('console')
      expect(doc.error.type).toBe('AxiosError')
      expect(err).not.toHaveProperty('level')
      expect(err.config?.httpsAgent).toBeDefined()
    })
  })

  it("never deletes an Error's own property that equals a defaultMeta value", async () => {
    await withDefaultMeta({ service_area: 'console' }, async () => {
      const err = Object.assign(new Error('boom'), { service_area: 'console' })
      logger.error(err)
      await lastLine()
      expect(err.service_area).toBe('console')
    })
  })

  it('does not modify an object with an Error passed as the event', async () => {
    const err = hubAxiosError()
    const info = { level: 'error', message: 'm', err }
    logger.log(info)
    expect(JSON.parse(await lastLine()).error.type).toBe('AxiosError')
    expect(info.err).toBe(err)
    expect(info).not.toHaveProperty('error')
  })

  it.each([
    ['err', (inner: Error) => ({ err: inner })],
    ['error', (inner: Error) => ({ error: inner })],
  ])(
    "logger.error('msg', err): an Error's own %s is not the event's",
    async (_key, own) => {
      const err = Object.assign(new Error('outer'), own(new Error('inner')))
      logger.error('wrap failed', err)
      const doc = JSON.parse(await lastLine())
      expect(doc.error.message).toBe('outer')
      expect(doc.error).not.toHaveProperty('related')
      expect(doc).not.toHaveProperty('err')
    }
  )

  it("does not read an Error's own err or error fields as the event's", async () => {
    const err = Object.assign(new Error('outer'), { error: new Error('inner') })
    logger.error(err)
    const doc = JSON.parse(await lastLine())
    expect(doc.error.message).toBe('outer')
    expect(doc.error).not.toHaveProperty('related')
  })

  it('never throws for an Error whose level cannot be deleted', async () => {
    const err = new Error('nc')
    Object.defineProperty(err, 'level', {
      value: 'x',
      writable: true,
      enumerable: true,
      configurable: false,
    })
    expect(() => logger.error(err)).not.toThrow()
    expect(JSON.parse(await lastLine()).error.message).toBe('nc')
  })

  it("does not modify the caller's objects when replacing a nested Error", async () => {
    const err = hubAxiosError()
    const meta = { details: { err, attempt: 2 } }
    logger.error('Hub failed', meta)
    const doc = JSON.parse(await lastLine())
    expect(doc.details).toMatchObject({
      attempt: 2,
      err: { type: 'AxiosError' },
    })
    expect(meta.details.err).toBe(err)
  })

  it("keeps winston's precedence: the meta over defaultMeta", async () => {
    await withDefaultMeta(
      { operation: 'default', service_area: 'console' },
      async () => {
        logger.error(new Error('boom') as unknown as string, {
          operation: 'putItem',
        })
        expect(JSON.parse(await lastLine())).toMatchObject({
          operation: 'putItem',
          service_area: 'console',
        })

        logger.error(
          'failed: %s',
          Object.assign(new Error('boom'), { service_area: 'other' })
        )
        expect(JSON.parse(await lastLine())).toMatchObject({
          service_area: 'console',
          error: { message: 'boom' },
        })
      }
    )
  })

  it('leaves plain metadata unchanged, and writes a string error as error.message', async () => {
    logger.error('Elasticsearch query failed', {
      errorMessage: 'm',
      stack: 's',
      statusCode: 500,
      error: 'bad request',
    })
    const doc = JSON.parse(await lastLine())
    expect(doc).toMatchObject({
      message: 'Elasticsearch query failed',
      errorMessage: 'm',
      stack: 's',
      statusCode: 500,
      error: { message: 'bad request' },
    })
  })

  it('leaves the meta out when the message has format tokens, as winston does', async () => {
    logger.info('loaded %s', { operation: 'op' })
    const doc = JSON.parse(await lastLine())
    expect(doc.message).toBe('loaded %s')
    expect(doc).not.toHaveProperty('operation')
  })
})
