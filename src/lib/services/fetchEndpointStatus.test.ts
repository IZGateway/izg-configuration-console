/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import fs from 'fs'
import https from 'https'
import IZGHubStatusHistoryEndpoint from '../../lib/IZGHubStatusHistoryEndpoint'

// Mock dependencies
jest.mock('axios')
jest.mock('fs')
jest.mock('https')
jest.mock('../../lib/IZGHubStatusHistoryEndpoint')

import { fetchEndpointStatus } from './fetchEndpointStatus'

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedFs = fs as jest.Mocked<typeof fs>
const mockedHttps = https as jest.Mocked<typeof https>
const mockedIZGHubStatusHistoryEndpoint = IZGHubStatusHistoryEndpoint as jest.MockedClass<typeof IZGHubStatusHistoryEndpoint>

describe('fetchEndpointStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Fake out environment variables
    process.env.IZG_STATUS_ENDPOINT_URL = 'https://fake.org'
    process.env.IZG_ENDPOINT_CRT_PATH = '/path/to/cert.crt'
    process.env.IZG_ENDPOINT_KEY_PATH = '/path/to/key.key'
    process.env.IZG_ENDPOINT_PASSCODE = 'testpasscode'

    // Mocks
    mockedFs.readFileSync.mockReturnValue('mock-certificate-content')
    mockedHttps.Agent.mockImplementation(() => ({} as any))
    const mockEndpoint = {
      getIZGHubURLs: jest.fn().mockReturnValue(['https://fake1.hub.org', 'https://fake2.hub.org'])
    }
    mockedIZGHubStatusHistoryEndpoint.mockImplementation(() => mockEndpoint as any)
  })

  afterEach(() => {
    delete process.env.IZG_STATUS_ENDPOINT_URL
    delete process.env.IZG_ENDPOINT_CRT_PATH
    delete process.env.IZG_ENDPOINT_KEY_PATH
    delete process.env.IZG_ENDPOINT_PASSCODE
  })

  it('should fetch endpoint status with no statusBy field', async () => {
    // Arrange: 'IZG Operations' holds globalTenancy: true in the real access
    // matrix, so hasGlobalTenancy needs no mocking here.
    const mockResponseData1 = {
      endpoint1: [{
        destId: 'test-dest-1',
        destTypeId: 1,
        status: 'active',
        statusBy: '192.168.1.1'
      }]
    }

    const mockResponseData2 = {
      endpoint2: [{
        destId: 'test-dest-2',
        destTypeId: 2,
        status: 'inactive',
        statusBy: '192.168.1.2'
      }]
    }

    mockedAxios.get
      .mockResolvedValueOnce({ data: mockResponseData1 })
      .mockResolvedValueOnce({ data: mockResponseData2 })

    const result = await fetchEndpointStatus(['IZG Operations'], ['TN', 'MD'])

    expect(mockedIZGHubStatusHistoryEndpoint).toHaveBeenCalledWith('https://fake.org')
    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    // No `?include=` suffix: a globally-scoped role gets the unfiltered hub URLs.
    expect(mockedAxios.get).toHaveBeenCalledWith('https://fake1.hub.org', {
      httpsAgent: expect.any(Object),
      timeout: 30000
    })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://fake2.hub.org', {
      httpsAgent: expect.any(Object),
      timeout: 30000
    })

    // Check that statusBy field is removed
    expect(result).toEqual([
      { destId: 'test-dest-1', destTypeId: 1, status: 'active' },
      { destId: 'test-dest-2', destTypeId: 2, status: 'inactive' }
    ])
  })

  // IGDD-3547: hasGlobalTenancy replaced isOperationsRole here. Jurisdiction
  // Support is scoped (globalTenancy: false), so it must still get the
  // `?include=` filtered URL form.
  it('appends assigned jurisdictions for a scoped role', async () => {
    mockedAxios.get.mockResolvedValue({ data: {} })

    await fetchEndpointStatus(['Jurisdiction Support'], ['TN', 'MD'])

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://fake1.hub.org?include=TN,MD',
      { httpsAgent: expect.any(Object), timeout: 30000 }
    )
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://fake2.hub.org?include=TN,MD',
      { httpsAgent: expect.any(Object), timeout: 30000 }
    )
  })

  // IGDD-3547: IZG Program holds globalTenancy: true but was excluded from
  // the old isOperationsRole allowlist, which would have scoped it down to
  // (typically zero) assigned jurisdictions despite its matrix-granted global
  // reach. This is the regression the switch to hasGlobalTenancy fixes.
  it('gives IZG Program the unfiltered hub URLs, matching its matrix-granted global reach', async () => {
    mockedAxios.get.mockResolvedValue({ data: {} })

    await fetchEndpointStatus(['IZG Program'], [])

    expect(mockedAxios.get).toHaveBeenCalledWith('https://fake1.hub.org', {
      httpsAgent: expect.any(Object),
      timeout: 30000
    })
    expect(mockedAxios.get).toHaveBeenCalledWith('https://fake2.hub.org', {
      httpsAgent: expect.any(Object),
      timeout: 30000
    })
  })

})
