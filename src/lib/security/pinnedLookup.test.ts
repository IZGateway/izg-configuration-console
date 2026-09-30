/**
 * @jest-environment node
 */
import { createPinnedLookup } from './pinnedLookup'

describe('createPinnedLookup', () => {
  it('returns the pinned IPv4 address instead of resolving', (done) => {
    const lookup = createPinnedLookup('93.184.216.34')
    lookup('evil.example.com', {}, (err, address, family) => {
      expect(err).toBeNull()
      expect(address).toBe('93.184.216.34')
      expect(family).toBe(4)
      done()
    })
  })

  it('returns the pinned IPv6 address with the right family', (done) => {
    const lookup = createPinnedLookup('2606:4700::1')
    lookup('example.com', {}, (err, address, family) => {
      expect(err).toBeNull()
      expect(address).toBe('2606:4700::1')
      expect(family).toBe(6)
      done()
    })
  })

  it('honours the { all: true } form Node uses for some agents', (done) => {
    const lookup = createPinnedLookup('93.184.216.34')
    lookup('example.com', { all: true }, (err, addresses) => {
      expect(err).toBeNull()
      expect(addresses).toEqual([{ address: '93.184.216.34', family: 4 }])
      done()
    })
  })

  it('supports the two-argument lookup(hostname, cb) form', (done) => {
    const lookup = createPinnedLookup('93.184.216.34')
    lookup('example.com', (err, address) => {
      expect(err).toBeNull()
      expect(address).toBe('93.184.216.34')
      done()
    })
  })

  // The whole point: never silently fall back to a real DNS lookup.
  it.each(['', undefined, 'not-an-ip'])(
    'fails closed when the pinned value is %p',
    async (bad) => {
      const lookup = createPinnedLookup(bad as string)
      const result = await new Promise<{
        err: NodeJS.ErrnoException | null
        address: unknown
      }>((resolve) => {
        lookup('evil.example.com', {}, (err, address) =>
          resolve({ err, address })
        )
      })
      expect(result.err).toBeInstanceOf(Error)
      expect(result.err?.code).toBe('ENOTFOUND')
      expect(result.address).toBeUndefined()
    }
  )
})
