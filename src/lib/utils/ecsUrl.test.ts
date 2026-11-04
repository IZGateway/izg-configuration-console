/**
 * @jest-environment node
 */
import { toEcsUrl, toEcsUrlValue } from './ecsUrl'

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

  it.each([
    ['https://user:SECRET@hub/rest/x?a=1', 'https://hub/rest/x?a=1'],
    ['https://user:SEC@RET@hub/rest/x', 'https://hub/rest/x'],
    ['https://user:SECRET@bad host/x', 'https://bad host/x'],
  ])('never writes the credentials of %s', (url, full) => {
    expect(toEcsUrl(url)?.full).toBe(full)
  })

  it.each([
    ['//svc:SECRET@hub/rest/reset', { path: '//hub/rest/reset' }],
    ['svc:SECRET@hub/rest/reset', { path: 'hub/rest/reset' }],
    ['https://u:SEC?RET@hub/x', { full: 'https://hub/x', path: '/x' }],
  ])(
    'never writes the credentials of %s, with or without a scheme',
    (url, ecs) => {
      expect(toEcsUrl(url)).toEqual(ecs)
    }
  )

  it('reads a \\ as URL parsers do, keeping the host the request went to', () => {
    // new URL() reads host hub.example and path /@evil.com/x.
    expect(toEcsUrl('https://hub.example\\@evil.com/x')?.full).toBe(
      'https://hub.example\\@evil.com/x'
    )
  })

  it('leaves an @ in the path or query alone', () => {
    expect(toEcsUrl('https://hub/users/a@b.org')?.full).toBe(
      'https://hub/users/a@b.org'
    )
    expect(toEcsUrl('/api/users?email=a@b.org')).toEqual({
      path: '/api/users',
      query: 'email=a@b.org',
    })
  })

  it('keeps an absolute URL that does not parse whole in url.full, without throwing', () => {
    expect(toEcsUrl('https://bad host/x')).toEqual({
      full: 'https://bad host/x',
    })
  })

  it.each([undefined, null, ''])(
    'returns undefined for %p so the field is omitted',
    (v) => {
      expect(toEcsUrl(v)).toBeUndefined()
    }
  )

  it('never returns a scalar for a present URL', () => {
    for (const v of ['/a', 'not a url', 'https://h/p', 'https://bad host']) {
      expect(typeof toEcsUrl(v)).toBe('object')
    }
  })
})

describe('toEcsUrlValue (IGDD-3541)', () => {
  it.each([
    ['/api/x?a=1', { path: '/api/x', query: 'a=1' }],
    [new URL('https://u:SECRET@hub/x'), { full: 'https://hub/x', path: '/x' }],
    [7, { path: '7' }],
  ])('writes %p as the ECS url object', (value, ecs) => {
    expect(toEcsUrlValue(value)).toEqual(ecs)
  })

  it('returns any other value as it is', () => {
    const ecs = { full: 'https://hub/x', path: '/x' }
    expect(toEcsUrlValue(ecs)).toBe(ecs)
    expect(toEcsUrlValue(undefined)).toBeUndefined()
    expect(toEcsUrlValue(null)).toBeNull()
  })
})
