/**
 * @jest-environment node
 */
import https from 'https'
import logger, {
  normalizeEcsError,
  normalizeEcsUrl,
  normalizeEcsUser,
} from '../../logger'

const MESSAGE = Symbol.for('message')

// Run an event through the real logger's format pipeline and parse what would
// be written to stdout and log.json — the bytes filebeat ships to Elastic.
const serialized = (meta: Record<string, unknown>) => {
  const info = logger.format.transform(
    { level: 'warn', message: 'test', ...meta } as never,
    {}
  ) as Record<symbol, string>
  return JSON.parse(info[MESSAGE])
}

describe('normalizeEcsUrl (IGDD-3541 logger backstop)', () => {
  it('rewrites a string url into the ECS object', () => {
    const out = normalizeEcsUrl({
      level: 'info',
      message: 'm',
      url: '/api/status/reset?env=dev',
    } as never)
    expect(out.url).toEqual({ path: '/api/status/reset', query: 'env=dev' })
  })

  it('rewrites a URL object, which would otherwise serialize as a string', () => {
    const out = normalizeEcsUrl({
      level: 'info',
      message: 'm',
      url: new URL('https://h/rest/reset?all=true'),
    } as never)
    expect(out.url).toEqual({
      full: 'https://h/rest/reset?all=true',
      path: '/rest/reset',
      query: 'all=true',
    })
  })

  it('rewrites a number url, which would also be rejected', () => {
    const out = normalizeEcsUrl({
      level: 'info',
      message: 'm',
      url: 7,
    } as never)
    expect(out.url).toEqual({ path: '7' })
  })

  it('leaves an object url untouched', () => {
    const url = { full: 'https://h/p', path: '/p' }
    const out = normalizeEcsUrl({ level: 'info', message: 'm', url } as never)
    expect(out.url).toBe(url)
  })

  it('leaves an event with no url untouched', () => {
    const out = normalizeEcsUrl({ level: 'info', message: 'm' } as never)
    expect(out).not.toHaveProperty('url')
  })
})

describe('normalizeEcsUser (IGDD-3541 logger backstop)', () => {
  it('rewrites a string user into the ECS object', () => {
    const out = normalizeEcsUser({
      level: 'info',
      message: 'm',
      user: 'IZG Support Tester',
    } as never)
    expect(out.user).toEqual({ name: 'IZG Support Tester' })
  })

  it('rewrites a number user, which would also be rejected', () => {
    const out = normalizeEcsUser({
      level: 'info',
      message: 'm',
      user: 42,
    } as never)
    expect(out.user).toEqual({ name: '42' })
  })

  it('leaves an object user untouched', () => {
    const user = { name: 'n', id: '1' }
    const out = normalizeEcsUser({ level: 'info', message: 'm', user } as never)
    expect(out.user).toBe(user)
  })

  it('leaves a null user as null', () => {
    const out = normalizeEcsUser({
      level: 'info',
      message: 'm',
      user: null,
    } as never)
    expect(out.user).toBeNull()
  })

  it('leaves an event with no user untouched', () => {
    const out = normalizeEcsUser({ level: 'info', message: 'm' } as never)
    expect(out).not.toHaveProperty('user')
  })
})

describe('normalizeEcsError (IGDD-3541 logger backstop)', () => {
  it('rewrites an Error as its safe error.* fields, without running its toJSON', () => {
    const err = Object.assign(new Error('boom'), {
      toJSON: () => ({ secret: 'SECRET' }),
    })
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error: err,
    } as never)
    expect(out.error).toMatchObject({ type: 'Error', message: 'boom' })
    expect(JSON.stringify(out.error)).not.toContain('SECRET')
  })

  it('writes error.related as an array of error.* objects', () => {
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error: { message: 'm', related: 'r' },
    } as never)
    expect(out.error).toEqual({ message: 'm', related: [{ message: 'r' }] })
  })

  it('rewrites a string error into the ECS object', () => {
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error: 'bad request',
    } as never)
    expect(out.error).toEqual({ message: 'bad request' })
  })

  it('rewrites a number or boolean error as a string message', () => {
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error: 500,
    } as never)
    expect(out.error).toEqual({ message: '500' })
  })

  it('rewrites an array error as its JSON message', () => {
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error: ['a required', 'b invalid'],
    } as never)
    expect(out.error).toEqual({ message: '["a required","b invalid"]' })
  })

  it('leaves an object error untouched', () => {
    const error = { type: 'AxiosError', message: 'boom' }
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error,
    } as never)
    expect(out.error).toBe(error)
  })

  it.each([
    ['a network object', new https.Agent(), '[Agent]'],
    ['a Date', new Date(0), '1970-01-01T00:00:00.000Z'],
    ['a bigint', BigInt(5), '5'],
  ])(
    'rewrites %s, which would serialize as a scalar',
    (_kind, error, message) => {
      const out = normalizeEcsError({
        level: 'error',
        message: 'm',
        error,
      } as never)
      expect(out.error).toEqual({ message })
    }
  )

  it('leaves a null error as null', () => {
    const out = normalizeEcsError({
      level: 'error',
      message: 'm',
      error: null,
    } as never)
    expect(out.error).toBeNull()
  })
})

describe('logger pipeline output (IGDD-3541)', () => {
  // The shape of ~30 error logs (`error: err.message`), which were dropped
  // whenever the backing index typed `error` as an object.
  it('never serializes a top-level string error', () => {
    const doc = serialized({ error: 'Unknown error', stack: 's' })
    expect(doc.error).toEqual({ message: 'Unknown error' })
    expect(doc.stack).toBe('s')
  })

  // The shape of the API Request log, whose `user` falls back to 'unknown'
  // even for unauthenticated calls — so every one was dropped whenever the
  // backing index typed `user` as an object.
  it('never serializes a top-level string user', () => {
    const doc = serialized({ user: 'unknown', sub: null })
    expect(doc.user).toEqual({ name: 'unknown' })
    expect(doc.sub).toBeNull()
  })

  it('serializes an AccessDenied-shaped event with object url and user', () => {
    const doc = serialized({
      eventType: 'AccessDenied',
      url: '/console',
      user: 'IZG Support Tester',
      roles: ['IZG Support'],
    })
    expect(doc.url).toEqual({ path: '/console' })
    expect(doc.user).toEqual({ name: 'IZG Support Tester' })
    expect(doc.roles).toEqual(['IZG Support'])
  })

  it('never serializes a top-level string url, even when a call site passes one', () => {
    const doc = serialized({ url: 'https://dev.izgateway.org/rest/reset' })
    expect(doc.url).toEqual({
      full: 'https://dev.izgateway.org/rest/reset',
      path: '/rest/reset',
    })
  })

  it('never serializes a URL object as a string', () => {
    const doc = serialized({ url: new URL('https://h/rest/reset') })
    expect(doc.url).toEqual({
      full: 'https://h/rest/reset',
      path: '/rest/reset',
    })
  })

  it('still expands req into url.full / url.path (the healthcheck shape)', () => {
    const req = {
      method: 'GET',
      url: '/api/healthcheck',
      headers: { host: 'dev.console.example' },
      socket: {},
      httpVersion: '1.1',
    }
    const doc = serialized({ req })
    expect(typeof doc.url).toBe('object')
    expect(doc.url.path).toBe('/api/healthcheck')
    expect(doc.url.full).toBe('http://dev.console.example/api/healthcheck')
  })
})
