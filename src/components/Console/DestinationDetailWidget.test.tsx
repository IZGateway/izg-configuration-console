import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import DestinationDetailWidget from './DestinationDetailWidget'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper to create a mock Elasticsearch response
const createMockElasticsearchResponse = (overrides?: {
  lastBucket?: Partial<Record<string, unknown>>
  prevBucket?: Partial<Record<string, unknown>>
}) => {
  const defaultLastBucket = {
    '1-bucket': { doc_count: 5 }, // CT errors
    '2-bucket': { doc_count: 95 }, // CT success
    '3-bucket': { doc_count: 900 }, // HL7 success
    '4-bucket': { doc_count: 100 }, // HL7 errors
    'median-response-time': { values: { '50.0': 1500 } }, // 1.5s
    '95-response-time': { values: { '95.0': 3000 } }, // 3s
    'hourly-throughput': {
      buckets: [
        { key: 1, 'hl7-messages': { doc_count: 60 } },
        { key: 2, 'hl7-messages': { doc_count: 120 } },
        { key: 3, 'hl7-messages': { doc_count: 90 } },
      ],
    },
  }

  const defaultPrevBucket = {
    '1-bucket': { doc_count: 10 },
    '2-bucket': { doc_count: 90 },
    '3-bucket': { doc_count: 800 },
    '4-bucket': { doc_count: 200 },
    'median-response-time': { values: { '50.0': 2000 } },
    '95-response-time': { values: { '95.0': 4000 } },
  }

  return {
    aggregations: {
      '0': {
        buckets: {
          'Last 24h': { ...defaultLastBucket, ...overrides?.lastBucket },
          'Previous 24h': { ...defaultPrevBucket, ...overrides?.prevBucket },
        },
      },
    },
  }
}

describe('DestinationDetailWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.log and console.error during tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial Render', () => {
    it('should render all metric cards', () => {
      render(<DestinationDetailWidget />)

      expect(screen.getByText('My IZ Gateway Status')).toBeInTheDocument()
      expect(screen.getByText('Total Messages (24h)')).toBeInTheDocument()
      expect(screen.getByText('Success Rate')).toBeInTheDocument()
      expect(screen.getByText('Average Throughput')).toBeInTheDocument()
      expect(screen.getByText('Median Response Time')).toBeInTheDocument()
      expect(
        screen.getByText('95th Percentile Response Time')
      ).toBeInTheDocument()
    })

    it('should display default values when no connection is selected', () => {
      render(<DestinationDetailWidget />)

      // Default state values - multiple 0% elements exist (IZ Gateway Status and Success Rate)
      const zeroPercentElements = screen.getAllByText('0%')
      expect(zeroPercentElements.length).toBeGreaterThan(0)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should not fetch data when selectedConnection is undefined', () => {
      render(<DestinationDetailWidget />)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not fetch data when selectedConnection is empty string', () => {
      render(<DestinationDetailWidget selectedConnection="" />)

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Data Fetching', () => {
    it('should fetch data when selectedConnection is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/elasticsearch/query',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should include the correct index in the request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      const fetchCall = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      expect(requestBody.index).toBe('izgw-dev-logstash')
    })

    it('should refetch data when selectedConnection changes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      const { rerender } = render(
        <DestinationDetailWidget selectedConnection="TX" />
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      await act(async () => {
        rerender(<DestinationDetailWidget selectedConnection="CA" />)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Metric Calculations', () => {
    it('should calculate and display total messages correctly', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '3-bucket': { doc_count: 1500 }, // HL7 success
          '4-bucket': { doc_count: 500 }, // HL7 errors
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Total = 1500 + 500 = 2000, formatted with locale
      await waitFor(() => {
        expect(screen.getByText('2,000')).toBeInTheDocument()
      })
    })

    it('should calculate IZ Gateway status correctly', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '1-bucket': { doc_count: 20 }, // CT errors
          '2-bucket': { doc_count: 80 }, // CT success (80% success)
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      await waitFor(() => {
        expect(screen.getByText('80.0%')).toBeInTheDocument()
      })
    })

    it('should calculate success rate correctly', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '3-bucket': { doc_count: 850 }, // HL7 success
          '4-bucket': { doc_count: 150 }, // HL7 errors (85% success rate)
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      await waitFor(() => {
        expect(screen.getByText('85.0%')).toBeInTheDocument()
      })
    })

    it('should calculate median response time correctly', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          'median-response-time': { values: { '50.0': 2500 } }, // 2.5 seconds
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      await waitFor(() => {
        expect(screen.getByText('2.50s')).toBeInTheDocument()
      })
    })

    it('should calculate 95th percentile response time correctly', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '95-response-time': { values: { '95.0': 5000 } }, // 5 seconds
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      await waitFor(() => {
        expect(screen.getByText('5.00s')).toBeInTheDocument()
      })
    })

    it('should calculate peak throughput from hourly buckets', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          'hourly-throughput': {
            buckets: [
              { key: 1, 'hl7-messages': { doc_count: 60 } }, // 1 msg/min
              { key: 2, 'hl7-messages': { doc_count: 180 } }, // 3 msg/min - peak
              { key: 3, 'hl7-messages': { doc_count: 120 } }, // 2 msg/min
            ],
          },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Peak = 180 / 60 = 3.00 msg/min
      await waitFor(() => {
        expect(screen.getByText(/Peak: 3.00 msg\/min/)).toBeInTheDocument()
      })
    })

    it('should calculate average throughput correctly', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '3-bucket': { doc_count: 1440 }, // HL7 success
          '4-bucket': { doc_count: 0 }, // HL7 errors
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // 1440 messages / 1440 minutes = 1.00 msg/min
      await waitFor(() => {
        expect(screen.getByText('1.00 msg/min')).toBeInTheDocument()
      })
    })
  })

  describe('Percentage Change Calculations', () => {
    it('should show message count increase percentage', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '3-bucket': { doc_count: 1000 },
          '4-bucket': { doc_count: 0 },
        },
        prevBucket: {
          '3-bucket': { doc_count: 800 },
          '4-bucket': { doc_count: 0 },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // (1000 - 800) / 800 * 100 = 25%
      // Multiple elements may show this percentage
      await waitFor(() => {
        const percentElements = screen.getAllByText(/25.0%/)
        expect(percentElements.length).toBeGreaterThan(0)
      })
    })

    it('should handle 100% increase when previous count was 0', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '3-bucket': { doc_count: 500 },
          '4-bucket': { doc_count: 0 },
        },
        prevBucket: {
          '3-bucket': { doc_count: 0 },
          '4-bucket': { doc_count: 0 },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Multiple elements may show 100% change
      await waitFor(() => {
        const percentElements = screen.getAllByText(/100.0%/)
        expect(percentElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Component should still render with default values
      expect(screen.getByText('My IZ Gateway Status')).toBeInTheDocument()
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching destination data:',
        expect.any(Error)
      )
    })

    it('should handle non-ok response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Component should still render with default values
      expect(screen.getByText('My IZ Gateway Status')).toBeInTheDocument()
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching destination data:',
        expect.any(Error)
      )
    })

    it('should handle empty aggregations gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ aggregations: {} }),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Should still render without crashing
      expect(screen.getByText('My IZ Gateway Status')).toBeInTheDocument()
    })

    it('should handle null response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Should still render without crashing
      expect(screen.getByText('My IZ Gateway Status')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero messages in both periods', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          '1-bucket': { doc_count: 0 },
          '2-bucket': { doc_count: 0 },
          '3-bucket': { doc_count: 0 },
          '4-bucket': { doc_count: 0 },
        },
        prevBucket: {
          '1-bucket': { doc_count: 0 },
          '2-bucket': { doc_count: 0 },
          '3-bucket': { doc_count: 0 },
          '4-bucket': { doc_count: 0 },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Total messages
      })
    })

    it('should display "--" for missing response time data', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          'median-response-time': { values: {} },
          '95-response-time': { values: {} },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Should show "--" for missing response times
      const dashElements = screen.getAllByText('--')
      expect(dashElements.length).toBeGreaterThan(0)
    })

    it('should handle empty hourly throughput buckets', async () => {
      const mockResponse = createMockElasticsearchResponse({
        lastBucket: {
          'hourly-throughput': { buckets: [] },
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      // Peak should be 0.00 msg/min
      await waitFor(() => {
        expect(screen.getByText(/Peak: 0.00 msg\/min/)).toBeInTheDocument()
      })
    })
  })

  describe('Subheaders and Labels', () => {
    it('should display correct subheaders for all metric cards', () => {
      render(<DestinationDetailWidget />)

      expect(
        screen.getByText(/Status Health - Last Updated at/)
      ).toBeInTheDocument()
      expect(screen.getByText('All Message Traffic')).toBeInTheDocument()
      expect(screen.getByText('Message Processing Status')).toBeInTheDocument()
      expect(screen.getByText('50th Percentile')).toBeInTheDocument()
      expect(screen.getByText('Response Time Threshold')).toBeInTheDocument()
    })

    it('should update last update time when data is fetched', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(<DestinationDetailWidget selectedConnection="TX" />)
      })

      await waitFor(() => {
        // The time should be updated from "--" to an actual time
        const subheader = screen.getByText(/Status Health - Last Updated at/)
        expect(subheader.textContent).not.toContain('--')
      })
    })
  })

  describe('Card IDs', () => {
    it('should render cards with correct IDs', () => {
      const { container } = render(<DestinationDetailWidget />)

      expect(
        container.querySelector('#my-izGateway-status-widget')
      ).toBeInTheDocument()
      expect(container.querySelector('#total-messages')).toBeInTheDocument()
      expect(container.querySelector('#success-rate')).toBeInTheDocument()
      expect(container.querySelector('#avg-throughput')).toBeInTheDocument()
      expect(
        container.querySelector('#median-response-time')
      ).toBeInTheDocument()
      // Note: #95-response-time is not a valid CSS selector (starts with number)
      // Use attribute selector instead
      expect(
        container.querySelector('[id="95-response-time"]')
      ).toBeInTheDocument()
    })
  })
})
