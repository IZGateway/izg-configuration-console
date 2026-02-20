import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MessagesWidget from './MessagesWidget'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock query builder function
const mockQueryBuilder = jest.fn()

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

describe('MessagesWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppress console.error output
    })
    mockQueryBuilder.mockReturnValue({})
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
        render(
          <MessagesWidget
            title="Inbound Messages"
            cardId="inbound-messages"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      expect(screen.getByText('Inbound Messages')).toBeInTheDocument()
    })

    it('should render all metric cards', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            queryBuilder={mockQueryBuilder}
          />
        )
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
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      // Check for default values - use getAllByText for values that appear multiple times
      expect(screen.getAllByText('0').length).toBeGreaterThan(0)
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('0s')).toBeInTheDocument()
    })

    it('should show loading spinner initially', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ ok: true, json: () => ({}) }), 1000)
            })
        )

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      // Organizations fetch completes, now waiting for data fetch
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).toBeInTheDocument()
      })
    })
  })

  describe('Organizations Fetching', () => {
    it('should fetch organizations on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockOrganizationsResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/organizations')
    })

    it('should display organization dropdown with fetched organizations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockOrganizationsResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('IZGateway - TX')).toBeInTheDocument()
      })

      // Open the dropdown
      const selectElement = screen.getByRole('combobox')
      await act(async () => {
        fireEvent.mouseDown(selectElement)
      })

      await waitFor(() => {
        expect(
          screen.getByText('IZGateway (All Organizations)')
        ).toBeInTheDocument()
        expect(screen.getByText('Organization A')).toBeInTheDocument()
        expect(screen.getByText('Organization B')).toBeInTheDocument()
      })
    })

    it('should handle organization fetch failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Error fetching organizations:',
          expect.any(Error)
        )
      })
    })
  })

  describe('Data Fetching', () => {
    beforeEach(() => {
      // Mock organizations fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

    it('should not fetch data when selectedConnection is undefined', async () => {
      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      // Only organizations fetch should be called
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/organizations')
    })

    it('should fetch data when selectedConnection is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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

    it('should call queryBuilder with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      await waitFor(() => {
        expect(mockQueryBuilder).toHaveBeenCalledWith('TX', 'IZGateway')
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      await waitFor(() => {
        expect(mockQueryBuilder).toHaveBeenCalledWith('TX', 'IZGateway')
      })

      mockQueryBuilder.mockClear()

      await act(async () => {
        rerender(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="CA"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      await waitFor(() => {
        expect(mockQueryBuilder).toHaveBeenCalledWith('CA', 'IZGateway')
      })
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
    beforeEach(() => {
      // Mock organizations fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      await waitFor(() => {
        expect(screen.getByText('2,000')).toBeInTheDocument()
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
    beforeEach(() => {
      // Mock organizations fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

    it('should display failure types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
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
    beforeEach(() => {
      // Mock organizations fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockOrganizationsResponse()),
      })
    })

    it('should pass selected organization to queryBuilder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      // Wait for initial load with "IZGateway"
      await waitFor(() => {
        expect(mockQueryBuilder).toHaveBeenCalledWith('TX', 'IZGateway')
      })

      mockQueryBuilder.mockClear()

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
        expect(mockQueryBuilder).toHaveBeenCalledWith('TX', 'Organization A')
      })
    })

    it('should update dropdown display when organization changes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockElasticsearchResponse()),
      })

      await act(async () => {
        render(
          <MessagesWidget
            title="Test Messages"
            cardId="test-messages"
            selectedConnection="TX"
            queryBuilder={mockQueryBuilder}
          />
        )
      })

      // Initially shows "IZGateway - TX"
      await waitFor(() => {
        expect(screen.getByText('IZGateway - TX')).toBeInTheDocument()
      })

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

      // Should now show "Organization A - TX"
      await waitFor(() => {
        expect(screen.getByText('Organization A - TX')).toBeInTheDocument()
      })
    })
  })
})
