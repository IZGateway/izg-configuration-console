import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import InboundMessagesWidget from './InboundMessagesWidget'

// Mock AnimatedNumber to render final value instantly (bypasses 1200ms rAF animation)
jest.mock('./components/AnimatedNumber', () => ({
  __esModule: true,
  default: function AnimatedNumberMock({ value }: { value: string | number }) {
    const React = require('react') // eslint-disable-line @typescript-eslint/no-var-requires
    const display =
      typeof value === 'number' ? value.toLocaleString() : String(value)
    return React.createElement('span', null, display)
  },
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper to create a mock organizations response
const createMockOrganizationsResponse = () => [
  {
    organizationName: 'Organization A',
    principalNames: ['principal1', 'principal2'],
  },
  {
    organizationName: 'Organization B',
    principalNames: ['principal3'],
  },
]

// Mock organizations to pass as prop
const mockOrganizations = createMockOrganizationsResponse()

// Helper to create a mock Elasticsearch response
const createMockElasticsearchResponse = (overrides?: {
  successCount?: number
  errorCount?: number
  medianResponseTime?: number
  errorBuckets?: any[]
}) => {
  const successCount = overrides?.successCount ?? 950
  const errorCount = overrides?.errorCount ?? 50
  const medianResponseTime = overrides?.medianResponseTime ?? 17
  const errorBuckets = overrides?.errorBuckets ?? [
    {
      key: 'Organization A',
      doc_count: 30,
      '1': {
        buckets: {
          'HTTP 500': { doc_count: 20 },
          'Connection Timeout': { doc_count: 10 },
        },
      },
    },
    {
      key: 'Organization B',
      doc_count: 20,
      '1': {
        buckets: {
          'HTTP 404': { doc_count: 15 },
          'Read Timeout': { doc_count: 5 },
        },
      },
    },
  ]

  return {
    aggregations: {
      metrics: {
        buckets: {
          'Last 24h': {
            '1-bucket': { doc_count: successCount },
            '2-bucket': { doc_count: errorCount },
            '3-bucket': {
              '3-metric': {
                values: {
                  '50.0': medianResponseTime,
                },
              },
            },
          },
        },
      },
      errors: {
        organizations: {
          buckets: errorBuckets,
        },
      },
    },
  }
}

describe('InboundMessagesWidget', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppress console.error output
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial Render', () => {
    it('should render the widget with title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await act(async () => {
        render(<InboundMessagesWidget organizations={mockOrganizations} />)
      })

      expect(screen.getByText('Inbound Messages')).toBeInTheDocument()
    })

    it('should render all metric cards', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await act(async () => {
        render(<InboundMessagesWidget organizations={mockOrganizations} />)
      })

      expect(screen.getByText('Total Messages')).toBeInTheDocument()
      expect(screen.getByText('Success Rate')).toBeInTheDocument()
      expect(screen.getByText('Avg Response')).toBeInTheDocument()
      expect(screen.getByText('Total Failures')).toBeInTheDocument()
    })

    it('should display default metric values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await act(async () => {
        render(<InboundMessagesWidget organizations={mockOrganizations} />)
      })

      // '0%' appears twice: successRate + failure-rate caption; '0' appears multiple times
      expect(screen.getAllByText('0').length).toBeGreaterThan(0)
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
      expect(screen.getByText('0s')).toBeInTheDocument()
    })

    it('should show loading spinner initially', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: () => ({}) }), 1000)
          })
      )

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      // Waiting for data fetch to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).toBeInTheDocument()
      })
    })
  })

  describe('Data Fetching', () => {
    it('should not fetch data when selectedConnection is undefined', async () => {
      await act(async () => {
        render(<InboundMessagesWidget organizations={mockOrganizations} />)
      })

      // No data fetch should be called when selectedConnection is undefined
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should fetch data when selectedConnection is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/elasticsearch/query',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    })

    it('should refetch data when selectedConnection changes', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockElasticsearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockElasticsearchResponse()),
        })

      const { rerender } = await act(async () => {
        return render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      await act(async () => {
        rerender(
          <InboundMessagesWidget
            selectedConnection="CA"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Error fetching message data:',
          expect.any(Error)
        )
      })
    })
  })

  describe('Metric Calculations', () => {
    it('should calculate total messages correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockElasticsearchResponse({
              successCount: 1500,
              errorCount: 500,
            })
          ),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      // totalMessages appears twice (main count + caption denominator)
      await waitFor(() => {
        expect(
          screen.getAllByText((2000).toLocaleString()).length
        ).toBeGreaterThan(0)
      })
    })

    it('should calculate success rate correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockElasticsearchResponse({
              successCount: 850,
              errorCount: 150,
            })
          ),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('85.0%')).toBeInTheDocument()
      })
    })

    it('should format response time in milliseconds for < 1000ms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockElasticsearchResponse({
              medianResponseTime: 250,
            })
          ),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('250ms')).toBeInTheDocument()
      })
    })

    it('should format response time in seconds for >= 1000ms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockElasticsearchResponse({
              medianResponseTime: 2500,
            })
          ),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('2.5s')).toBeInTheDocument()
      })
    })

    it('should display total failures count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockElasticsearchResponse({
              successCount: 900,
              errorCount: 100,
            })
          ),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        // Find the "100" text in the Total Failures metric card
        const failuresElements = screen.getAllByText('100')
        expect(failuresElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Failure List', () => {
    it('should display failure types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Recent Failures')).toBeInTheDocument()
        expect(screen.getByText('HTTP 500')).toBeInTheDocument()
        expect(screen.getByText('Connection Timeout')).toBeInTheDocument()
      })
    })

    it('should aggregate error counts across organizations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        // HTTP 500 appears in Org A with count 20
        expect(screen.getByText('HTTP 500')).toBeInTheDocument()
        expect(screen.getByText('20')).toBeInTheDocument()
      })
    })

    it('should show only first 4 failures by default', async () => {
      const errorBuckets = [
        {
          key: 'Org',
          doc_count: 450,
          '1': {
            buckets: {
              'Error 1': { doc_count: 100 },
              'Error 2': { doc_count: 90 },
              'Error 3': { doc_count: 80 },
              'Error 4': { doc_count: 70 },
              'Error 5': { doc_count: 60 },
              'Error 6': { doc_count: 50 },
            },
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(createMockElasticsearchResponse({ errorBuckets })),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Error 1')).toBeInTheDocument()
        expect(screen.getByText('Error 2')).toBeInTheDocument()
        expect(screen.getByText('Error 3')).toBeInTheDocument()
        expect(screen.getByText('Error 4')).toBeInTheDocument()
        expect(screen.queryByText('Error 5')).not.toBeInTheDocument()
        expect(screen.queryByText('Error 6')).not.toBeInTheDocument()
      })
    })

    it('should show "Show All" button when more than 4 failures', async () => {
      const errorBuckets = [
        {
          key: 'Org',
          doc_count: 400,
          '1': {
            buckets: {
              'Error 1': { doc_count: 100 },
              'Error 2': { doc_count: 90 },
              'Error 3': { doc_count: 80 },
              'Error 4': { doc_count: 70 },
              'Error 5': { doc_count: 60 },
            },
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(createMockElasticsearchResponse({ errorBuckets })),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Show All')).toBeInTheDocument()
      })
    })

    it('should expand failure list when "Show All" is clicked', async () => {
      const errorBuckets = [
        {
          key: 'Org',
          doc_count: 400,
          '1': {
            buckets: {
              'Error 1': { doc_count: 100 },
              'Error 2': { doc_count: 90 },
              'Error 3': { doc_count: 80 },
              'Error 4': { doc_count: 70 },
              'Error 5': { doc_count: 60 },
            },
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(createMockElasticsearchResponse({ errorBuckets })),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Show All')).toBeInTheDocument()
      })

      const showAllButton = screen.getByText('Show All')
      await act(async () => {
        fireEvent.click(showAllButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Error 5')).toBeInTheDocument()
        expect(screen.getByText('Show Less')).toBeInTheDocument()
      })
    })

    it('should display "No failures" message when no errors', async () => {
      const errorBuckets: any[] = []

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockElasticsearchResponse({
              successCount: 1000,
              errorCount: 0,
              errorBuckets,
            })
          ),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(
          screen.getByText('No failures detected in the last 24 hours')
        ).toBeInTheDocument()
      })
    })

    it('should calculate "Other Errors" for uncategorized errors', async () => {
      const errorBuckets = [
        {
          key: 'Org',
          doc_count: 50, // 30 uncategorized (50 total - 20 HTTP 500 = 30 Other Errors)
          '1': {
            buckets: {
              'HTTP 500': { doc_count: 20 },
            },
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(createMockElasticsearchResponse({ errorBuckets })),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('Other Errors')).toBeInTheDocument()
        expect(screen.getByText('30')).toBeInTheDocument()
      })
    })
  })

  describe('Organization Filtering', () => {
    it('should refetch data when organization changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      // Wait for initial load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Change organization selection
      const selectElement = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.mouseDown(selectElement)
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      const orgOption = await screen.findByText('Organization A')
      await act(async () => {
        fireEvent.click(orgOption)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should update dropdown display when organization changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <InboundMessagesWidget
            selectedConnection="TX"
            organizations={mockOrganizations}
          />
        )
      })

      // Initially the combobox shows IZGateway → TX (arrow rendered in separate span)
      const combobox = screen.getByRole('combobox')
      expect(combobox.textContent).toMatch(/IZGateway/)
      expect(combobox.textContent).toMatch(/TX/)

      // Change organization
      const selectElement = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.mouseDown(selectElement)
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      const orgOption = await screen.findByText('Organization A')
      await act(async () => {
        fireEvent.click(orgOption)
      })

      // Should now show Organization A → TX
      await waitFor(() => {
        expect(screen.getByRole('combobox').textContent).toMatch(
          /Organization A/
        )
      })
    })
  })
})
