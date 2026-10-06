/**
 * @jest-environment node
 */
import logger, { normalizeEcsUrl } from '../../logger'

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

describe('logger pipeline output (IGDD-3541)', () => {
  it('never serializes a top-level string url, even when a call site passes one', () => {
    const doc = serialized({ url: 'https://dev.izgateway.org/rest/reset' })
    expect(doc.url).toEqual({
      full: 'https://dev.izgateway.org/rest/reset',
      path: '/rest/reset',
    })
  })

  it('never serializes a URL object as a string', () => {
    const doc = serialized({ url: new URL('https://h/rest/reset') })
    expect(doc.url).toEqual({ full: 'https://h/rest/reset', path: '/rest/reset' })
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
