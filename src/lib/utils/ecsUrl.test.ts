/**
 * @jest-environment node
 */
import { toEcsUrl } from './ecsUrl'

describe('toEcsUrl (IGDD-3541)', () => {
  it('maps a relative request path to url.path', () => {
    expect(toEcsUrl('/api/status/reset')).toEqual({ path: '/api/status/reset' })
  })

  it('splits a query string into url.query', () => {
    expect(toEcsUrl('/api/destinations?id=abc&x=1')).toEqual({
      path: '/api/destinations',
      query: 'id=abc&x=1',
    })
  })

  it('omits an empty query rather than writing it blank', () => {
    expect(toEcsUrl('/api/test?')).toEqual({ path: '/api/test' })
  })

  it('keeps an absolute URL in url.full and also splits path and query', () => {
    expect(
      toEcsUrl('https://dev.izgateway.org:443/rest/refresh?all=true')
    ).toEqual({
      full: 'https://dev.izgateway.org:443/rest/refresh?all=true',
      path: '/rest/refresh',
      query: 'all=true',
    })
  })

  it('keeps an absolute URL that does not parse whole in url.full, without throwing', () => {
    expect(toEcsUrl('https://bad host/x')).toEqual({ full: 'https://bad host/x' })
  })

  it.each([undefined, null, ''])('returns undefined for %p so the field is omitted', (v) => {
    expect(toEcsUrl(v)).toBeUndefined()
  })

  it('never returns a scalar for a present URL', () => {
    for (const v of ['/a', 'not a url', 'https://h/p', 'https://bad host']) {
      expect(typeof toEcsUrl(v)).toBe('object')
    }
  })
})
