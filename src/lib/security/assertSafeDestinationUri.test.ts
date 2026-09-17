/**
 * @jest-environment node
 */
import { assertSafeDestinationUri } from './assertSafeDestinationUri'
import { UnsafeDestinationUriError } from './destinationUriGuard'

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

const DEST_TYPE_ID = 1

beforeEach(() => {
  jest.clearAllMocks()
  process.env.IZG_STATUS_ENDPOINT_URL = JSON.stringify([
    { typeId: DEST_TYPE_ID, desc: 'dev', url: 'https://dev.izgateway.org/' },
  ])
  dnsMock.__resolve4.mockResolvedValue(['93.184.216.34'])
  dnsMock.__resolve6.mockResolvedValue([])
})

const expectRejected = async (destUri: string) => {
  await expect(
    assertSafeDestinationUri(destUri, DEST_TYPE_ID)
  ).rejects.toBeInstanceOf(UnsafeDestinationUriError)
}

describe('assertSafeDestinationUri', () => {
  it('rejects a hostname under a non-approved TLD', async () => {
    // The exact case reported from the dev environment.
    await expectRejected('https://pcahill.co.uk/dev/IISService_test')
  })

  it('rejects http', async () => {
    await expectRejected('http://dev.izgateway.org/dev/IISService')
  })

  it('rejects a single-slash scheme that URL would normalise', async () => {
    await expectRejected('https:/pcahill.co.uk/dev/IISService_test')
  })

  it('rejects a query string', async () => {
    await expectRejected('https://dev.izgateway.org/dev/IISService?a=1')
  })

  it('rejects embedded credentials', async () => {
    await expectRejected('https://user:pass@dev.izgateway.org/dev/IISService')
  })

  it('rejects a host resolving to a private address', async () => {
    dnsMock.__resolve4.mockResolvedValue(['10.0.0.5'])
    await expectRejected('https://dev.izgateway.org/dev/IISService')
  })

  it('accepts an approved absolute URL', async () => {
    await expect(
      assertSafeDestinationUri(
        'https://dev.izgateway.org/dev/IISService',
        DEST_TYPE_ID
      )
    ).resolves.toBeUndefined()
  })

  it('accepts a relative path by resolving it against the hub host', async () => {
    await expect(
      assertSafeDestinationUri('/dev/IISService', DEST_TYPE_ID)
    ).resolves.toBeUndefined()
    expect(dnsMock.__resolve4).toHaveBeenCalledWith('dev.izgateway.org')
  })
})
