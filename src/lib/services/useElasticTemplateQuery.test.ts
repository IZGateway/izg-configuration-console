/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR from 'swr'
import useElasticTemplateQuery from './useElasticTemplateQuery'

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('useElasticTemplateQuery', () => {
  const mockedUseSWR = useSWR as jest.Mock
  const globalAny = globalThis as typeof globalThis & { fetch: jest.Mock }

  beforeEach(() => {
    mockedUseSWR.mockReset()
    globalAny.fetch = jest.fn()
  })

  it('returns null key when disabled', () => {
    mockedUseSWR.mockReturnValue({ data: null, error: null, isLoading: false })

    useElasticTemplateQuery({
      index: 'test-index',
      template: { size: 0 },
      params: {},
      enabled: false,
    })

    expect(mockedUseSWR).toHaveBeenCalledWith(
      null,
      expect.any(Function),
      undefined
    )
  })

  it('substitutes template params and posts query', async () => {
    const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({}) }
    globalAny.fetch.mockResolvedValue(mockResponse)

    mockedUseSWR.mockImplementation((key, fetcher) => ({ key, fetcher }))

    useElasticTemplateQuery({
      index: 'test-index',
      template: {
        query: {
          range: {
            '@timestamp': {
              gte: '${start}',
              lte: '${end}',
            },
          },
        },
      },
      params: {
        start: '2026-01-01T00:00:00.000Z',
        end: '2026-01-02T00:00:00.000Z',
      },
    })

    const fetcher = mockedUseSWR.mock.calls[0][1]
    await fetcher()

    const fetchArgs = globalAny.fetch.mock.calls[0]
    const body = JSON.parse(fetchArgs[1].body)

    expect(fetchArgs[0]).toBe('/api/elasticsearch/query')
    expect(body.index).toBe('test-index')
    expect(body.query.query.range['@timestamp'].gte).toBe(
      '2026-01-01T00:00:00.000Z'
    )
    expect(body.query.query.range['@timestamp'].lte).toBe(
      '2026-01-02T00:00:00.000Z'
    )
  })

  it('throws when template does not resolve to valid JSON', async () => {
    mockedUseSWR.mockImplementation((key, fetcher) => ({ key, fetcher }))

    useElasticTemplateQuery({
      index: 'test-index',
      template: '{bad json}',
      params: {},
    })

    const fetcher = mockedUseSWR.mock.calls[0][1]
    await expect(fetcher()).rejects.toThrow(
      'Elastic query template did not resolve to valid JSON'
    )
  })

  it('throws a friendly error when response is not ok', async () => {
    globalAny.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({ message: 'Forbidden' }),
    })

    mockedUseSWR.mockImplementation((key, fetcher) => ({ key, fetcher }))

    useElasticTemplateQuery({
      index: 'test-index',
      template: { size: 0 },
      params: {},
    })

    const fetcher = mockedUseSWR.mock.calls[0][1]
    await expect(fetcher()).rejects.toThrow('Forbidden')
  })

  it('omits index from request body when index is undefined and uses default SWR index token', async () => {
    const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({}) }
    globalAny.fetch.mockResolvedValue(mockResponse)

    mockedUseSWR.mockImplementation((key, fetcher) => ({ key, fetcher }))

    useElasticTemplateQuery({
      template: {
        size: 0,
        query: {
          match_all: {},
        },
      },
      params: {},
    })

    const swrKey = mockedUseSWR.mock.calls[0][0]
    expect(swrKey[0]).toBe('elastic-template-query')
    expect(swrKey[1]).toBe('__default_index__')

    const fetcher = mockedUseSWR.mock.calls[0][1]
    await fetcher()

    const fetchArgs = globalAny.fetch.mock.calls[0]
    const body = JSON.parse(fetchArgs[1].body)

    expect(body).toEqual({
      query: {
        size: 0,
        query: {
          match_all: {},
        },
      },
    })
    expect(body).not.toHaveProperty('index')
  })
})
