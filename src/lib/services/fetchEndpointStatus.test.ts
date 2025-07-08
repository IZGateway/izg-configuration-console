/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import fs from 'fs'
import https from 'https'
import IZGHubStatusHistoryEndpoint from '../../lib/IZGHubStatusHistoryEndpoint'
import isOperationsRole from '../../lib/security/accessutils'

// Mock dependencies
jest.mock('axios')
jest.mock('fs')
jest.mock('https')
jest.mock('../../lib/IZGHubStatusHistoryEndpoint')
jest.mock('../../lib/security/accessutils')

import { fetchEndpointStatus } from './fetchEndpointStatus'

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedFs = fs as jest.Mocked<typeof fs>
const mockedHttps = https as jest.Mocked<typeof https>
const mockedIZGHubStatusHistoryEndpoint = IZGHubStatusHistoryEndpoint as jest.MockedClass<typeof IZGHubStatusHistoryEndpoint>
const mockedIsOperationsRole = isOperationsRole as jest.MockedFunction<typeof isOperationsRole>

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
    // Arrange
    mockedIsOperationsRole.mockReturnValue(true)
    
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

    const result = await fetchEndpointStatus('IZG Operations', ['TN', 'MD'])

    expect(mockedIZGHubStatusHistoryEndpoint).toHaveBeenCalledWith('https://fake.org')
    expect(mockedIsOperationsRole).toHaveBeenCalledWith('IZG Operations')
    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
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

})
