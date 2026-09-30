/**
 * @jest-environment node
 */
import {
  assertSafeRawDestinationUri,
  assertSafeDestinationUrl,
  isBlockedAddress,
  UnsafeDestinationUriError,
} from './destinationUriGuard'

jest.mock('dns', () => {
  const resolve4 = jest.fn()
  const resolve6 = jest.fn()
  class Resolver {
    setServers = jest.fn()
    resolve4 = resolve4
    resolve6 = resolve6
  }
  return {
    promises: { Resolver },
    __resolve4: resolve4,
    __resolve6: resolve6,
  }
})

const dnsMock = require('dns')

const expectRejected = async (url: string) => {
  await expect(assertSafeDestinationUrl(new URL(url))).rejects.toBeInstanceOf(
    UnsafeDestinationUriError
  )
}

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // instance metadata
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fd00::1',
    'fe80::1',
    '::ffff:10.0.0.1',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true)
  })

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '9.255.255.255', '2606:4700::1'])(
    'allows %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false)
    }
  )

  it('fails closed for non-IP input', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true)
  })
})

describe('assertSafeRawDestinationUri', () => {
  // Textual checks: parsing would hide these.
  it('rejects https:/host - URL() silently normalises the missing slash', () => {
    expect(() => assertSafeRawDestinationUri('https:/xyz.com')).toThrow(
      UnsafeDestinationUriError
    )
  })

  it.each([
    'http://xyz.com',
    'ftp://xyz.com',
    'file:///etc/passwd',
    'gopher://example.com/',
    'tftp://example.com/',
    'data:text/plain,hello',
    'mailto:someone@example.com',
    'javascript:alert(1)',
  ])('rejects %s for not beginning with https://', (raw) => {
    expect(() => assertSafeRawDestinationUri(raw)).toThrow(
      UnsafeDestinationUriError
    )
  })

  it.each([
    'https://iis.wa.gov/x?a=1',
    'https://iis.wa.gov/x#?a=1', // '?' in the fragment - url.search would be empty
    '/dev/IISService?a=1', // relative, but still no query allowed
  ])('rejects %s for containing a query string', (raw) => {
    expect(() => assertSafeRawDestinationUri(raw)).toThrow(
      UnsafeDestinationUriError
    )
  })

  it.each([
    'https://iis.wa.gov/hub',
    'https://example.com',
    '/dev/IISService', // relative - resolved against the hub base, checked later
    '',
    undefined,
  ])('allows %s through to the main guard', (raw) => {
    expect(() => assertSafeRawDestinationUri(raw)).not.toThrow()
  })
})

describe('assertSafeDestinationUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    dnsMock.__resolve4.mockResolvedValue(['93.184.216.34'])
    dnsMock.__resolve6.mockRejectedValue(new Error('ENOTFOUND'))
  })

  it.each([
    'https://iis.wa.gov/hub',
    'https://example.com/hub',
    'https://example.com:443/hub',
    'https://immunization.health/',
    'https://a.us/',
    'https://x.pr/',
    'https://y.gu/',
  ])('allows the approved destination %s', async (url) => {
    await expect(
      assertSafeDestinationUrl(new URL(url))
    ).resolves.toBeUndefined()
  })

  it('rejects http even though the raw check runs first', async () => {
    await expectRejected('http://example.com/')
  })

  it('rejects a query string', async () => {
    await expectRejected('https://example.com/x?a=1')
  })

  it('rejects embedded credentials', async () => {
    await expectRejected('https://user:pass@example.com/')
  })

  it('rejects non-allowlisted ports', async () => {
    await expectRejected('https://example.com:22/')
  })

  // The hostname allowlist subsumes the old internal-name denylist.
  it.each([
    'https://localhost/',
    'https://db.internal/',
    'https://printer.local/',
    'https://nas.lan/',
    'https://fileserver.corp/',
    'https://izgateway/', // single label
    'https://example.co.uk/', // TLD not on the approved list
    'https://example.com./', // trailing dot
    'https://10.0.0.5/', // IP literal
    'https://[::1]/', // IPv6 literal
  ])('rejects the unapproved hostname in %s', async (url) => {
    await expectRejected(url)
  })

  it('rejects an approved hostname that resolves to a private address', async () => {
    dnsMock.__resolve4.mockResolvedValue(['10.0.0.5'])
    await expectRejected('https://evil.com/')
  })

  it('rejects when any one resolved address is private', async () => {
    dnsMock.__resolve4.mockResolvedValue(['93.184.216.34', '192.168.0.7'])
    await expectRejected('https://rebind.com/')
  })

  it('allows unresolvable hostnames through for the DNS test to report', async () => {
    dnsMock.__resolve4.mockRejectedValue(new Error('ENOTFOUND'))
    await expect(
      assertSafeDestinationUrl(new URL('https://nope.example.com/'))
    ).resolves.toBeUndefined()
  })
})
