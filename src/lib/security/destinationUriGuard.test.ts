/**
 * @jest-environment node
 */
import {
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

describe('assertSafeDestinationUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    dnsMock.__resolve4.mockResolvedValue(['93.184.216.34'])
    dnsMock.__resolve6.mockRejectedValue(new Error('ENOTFOUND'))
  })

  it('allows an https destination resolving to a public address', async () => {
    await expect(
      assertSafeDestinationUrl(new URL('https://example.com/hub'))
    ).resolves.toBeUndefined()
  })

  it.each([
    'file:///etc/passwd',
    'gopher://example.com/',
    'tftp://example.com/',
    'ftp://example.com/',
  ])('rejects the %s scheme', async (url) => {
    await expectRejected(url)
  })

  it('rejects embedded credentials', async () => {
    await expectRejected('https://user:pass@example.com/')
  })

  it('rejects non-allowlisted ports', async () => {
    await expectRejected('https://example.com:22/')
  })

  it('rejects private IP literals', async () => {
    await expectRejected('http://169.254.169.254/latest/meta-data/')
  })

  it('rejects bracketed IPv6 loopback literals', async () => {
    await expectRejected('https://[::1]/')
  })

  it('rejects a hostname resolving to a private address', async () => {
    dnsMock.__resolve4.mockResolvedValue(['10.0.0.5'])
    await expectRejected('https://internal.example.com/')
  })

  it('rejects when any resolved address is private', async () => {
    dnsMock.__resolve4.mockResolvedValue(['93.184.216.34', '192.168.0.7'])
    await expectRejected('https://rebind.example.com/')
  })

  it.each([
    'https://localhost/',
    'https://localhost:443/',
    'https://api.localhost/',
    'https://printer.local/',
    'https://db.internal/',
    'https://svc.home.arpa/',
    'https://box.localdomain/',
    'https://LOCALHOST/',
  ])('rejects the internal-only name in %s', async (url) => {
    // public DNS returns nothing for these, so they must be blocked by name
    dnsMock.__resolve4.mockRejectedValue(new Error('ENOTFOUND'))
    await expectRejected(url)
  })

  it('allows unresolvable hostnames through for the DNS test to report', async () => {
    dnsMock.__resolve4.mockRejectedValue(new Error('ENOTFOUND'))
    await expect(
      assertSafeDestinationUrl(new URL('https://nope.example.com/'))
    ).resolves.toBeUndefined()
  })
})
