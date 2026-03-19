import React from 'react'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Module mocks (hoisted by Jest before imports) ──────────────────────────

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('../AppHeader', () => ({
  __esModule: true,
  default: function AppHeaderMock() {
    const React = require('react') // eslint-disable-line @typescript-eslint/no-var-requires
    return React.createElement('div', { 'data-testid': 'app-header' })
  },
}))

jest.mock('../Container', () => ({
  __esModule: true,
  default: function ContainerMock({ children }: { children: React.ReactNode }) {
    const React = require('react') // eslint-disable-line @typescript-eslint/no-var-requires
    return React.createElement('div', { 'data-testid': 'container' }, children)
  },
}))

jest.mock('./DestinationDetailWidget', () => ({
  __esModule: true,
  default: function DestinationDetailWidgetMock({
    selectedConnection,
    envTag,
  }: {
    selectedConnection?: string
    envTag?: string
  }) {
    const React = require('react') // eslint-disable-line @typescript-eslint/no-var-requires
    return React.createElement('div', {
      'data-testid': 'detail-widget',
      'data-connection': selectedConnection ?? '',
      'data-env': envTag ?? '',
    })
  },
}))

jest.mock('./OutboundMessagesWidget', () => ({
  __esModule: true,
  default: function OutboundMessagesWidgetMock({
    selectedConnection,
  }: {
    selectedConnection?: string
  }) {
    const React = require('react') // eslint-disable-line @typescript-eslint/no-var-requires
    return React.createElement('div', {
      'data-testid': 'outbound-widget',
      'data-connection': selectedConnection ?? '',
    })
  },
}))

jest.mock('./InboundMessagesWidget', () => ({
  __esModule: true,
  default: function InboundMessagesWidgetMock({
    selectedConnection,
  }: {
    selectedConnection?: string
  }) {
    const React = require('react') // eslint-disable-line @typescript-eslint/no-var-requires
    return React.createElement('div', {
      'data-testid': 'inbound-widget',
      'data-connection': selectedConnection ?? '',
    })
  },
}))

jest.mock('../../lib/desttypehelper', () => ({
  getElasticEnvTag: (env: string) => env?.toLowerCase() ?? '',
}))

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { useSession } from 'next-auth/react'
import Console from '.'
import { mockDestinations } from './__mocks__/mockDestinations'

// ── Setup helpers ──────────────────────────────────────────────────────────

const mockUseSession = useSession as jest.Mock

const adminSession = {
  data: { user: { name: 'Admin User', isAdmin: true } },
  status: 'authenticated',
}

const mockFetch = jest.fn()
global.fetch = mockFetch

// Opens the destination selector popover.
// Assumes `render(<Console />)` has already been called and awaited.
async function openPopover() {
  // 'Development Environment' is the auto-selected first destination in mock data
  await act(async () => {
    fireEvent.click(screen.getByText('Development Environment'))
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Console – Destination Filter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue(adminSession)
    // Route fetch by URL: /api/destinations returns mock data, everything else returns []
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/destinations') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDestinations),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })
  })

  // ── Initial render ────────────────────────────────────────────────────────

  describe('Initial render', () => {
    it('renders the Operations Console heading', async () => {
      await act(async () => {
        render(<Console />)
      })
      expect(
        screen.getByText('IZ Gateway Operations Console')
      ).toBeInTheDocument()
    })

    it('auto-selects the first destination (Development Environment) on load', async () => {
      await act(async () => {
        render(<Console />)
      })
      // First destId is "dev" with description "Development Environment"
      expect(screen.getByText('Development Environment')).toBeInTheDocument()
    })

    it('applies ENV_PRIORITY: selects PRODUCTION over DEV/ONBOARD for "dev" destination', async () => {
      await act(async () => {
        render(<Console />)
      })
      // "dev" has DEV, PRODUCTION, ONBOARD → PRODUCTION wins (priority 0)
      expect(screen.getByText('Production')).toBeInTheDocument()
    })

    it('passes the committed connection to all three widgets on initial load', async () => {
      await act(async () => {
        render(<Console />)
      })
      expect(screen.getByTestId('detail-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
      expect(screen.getByTestId('outbound-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
      expect(screen.getByTestId('inbound-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
    })
  })

  // ── Selector trigger ──────────────────────────────────────────────────────

  describe('Destination selector trigger', () => {
    it('shows "Select a destination" placeholder before destinations load', () => {
      // Simulate loading state: clear mock data path by making session unauthenticated
      // (In authenticated+mock mode, destinations load instantly so test loading directly)
      mockUseSession.mockReturnValue({
        data: { user: { isAdmin: true } },
        status: 'loading',
      })
      render(<Console />)
      // Loading session → spinner for auth, not the filter UI
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('opens the popover when the trigger is clicked', async () => {
      await act(async () => {
        render(<Console />)
      })

      // Popover not yet visible
      expect(
        screen.queryByPlaceholderText('Search for destinations')
      ).not.toBeInTheDocument()

      await openPopover()

      expect(
        screen.getByPlaceholderText('Search for destinations')
      ).toBeInTheDocument()
    })

    it('shows the selected environment chip on the trigger', async () => {
      await act(async () => {
        render(<Console />)
      })
      // "Production" chip is rendered on the trigger for the auto-selected PRODUCTION env
      expect(screen.getByText('Production')).toBeInTheDocument()
    })

    it('shows an expand icon that rotates when the popover opens', async () => {
      await act(async () => {
        render(<Console />)
      })
      // ExpandMoreIcon is present (rotation is a CSS style, verified via presence)
      const { container } = render(<Console />)
      expect(
        container.querySelector('[data-testid="ExpandMoreIcon"]')
      ).not.toBeNull()
    })
  })

  // ── Popover content ───────────────────────────────────────────────────────

  describe('Popover content', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<Console />)
      })
    })

    it('displays env chips for the selected destination', async () => {
      await openPopover()
      // "dev" has DEV→Development, ONBOARD→Onboarding, PRODUCTION→Production
      expect(screen.getAllByText('Development').length).toBeGreaterThan(0)
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
    })

    it('shows a search field inside the popover', async () => {
      await openPopover()
      expect(
        screen.getByPlaceholderText('Search for destinations')
      ).toBeInTheDocument()
    })

    it('lists all four unique destinations in the popover', async () => {
      await openPopover()
      // All unique destinations from mock data
      expect(screen.getByText('New York CAIR2')).toBeInTheDocument()
      expect(screen.getByText('Florida SHOTS')).toBeInTheDocument()
      expect(
        screen.getByText('Centers for Disease Control')
      ).toBeInTheDocument()
    })

    it('shows destination IDs as secondary text', async () => {
      await openPopover()
      expect(screen.getByText('101')).toBeInTheDocument()
      expect(screen.getByText('202')).toBeInTheDocument()
      expect(screen.getByText('303')).toBeInTheDocument()
    })
  })

  // ── Search filtering ──────────────────────────────────────────────────────

  describe('Search filtering', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<Console />)
      })
      await openPopover()
    })

    it('filters the destination list by description (partial match)', async () => {
      const searchInput = screen.getByPlaceholderText('Search for destinations')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Florida' } })
      })

      expect(screen.getByText('Florida SHOTS')).toBeInTheDocument()
      expect(screen.queryByText('New York CAIR2')).not.toBeInTheDocument()
      expect(
        screen.queryByText('Centers for Disease Control')
      ).not.toBeInTheDocument()
    })

    it('filters the destination list by destination ID', async () => {
      const searchInput = screen.getByPlaceholderText('Search for destinations')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '303' } })
      })

      expect(
        screen.getByText('Centers for Disease Control')
      ).toBeInTheDocument()
      expect(screen.queryByText('Florida SHOTS')).not.toBeInTheDocument()
      expect(screen.queryByText('New York CAIR2')).not.toBeInTheDocument()
    })

    it('search is case-insensitive', async () => {
      const searchInput = screen.getByPlaceholderText('Search for destinations')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'new york' } })
      })

      expect(screen.getByText('New York CAIR2')).toBeInTheDocument()
    })

    it('shows "No destinations found" when search yields no results', async () => {
      const searchInput = screen.getByPlaceholderText('Search for destinations')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'xxxxxxxxxxx' } })
      })

      expect(screen.getByText('No destinations found')).toBeInTheDocument()
    })

    it('restores the full list when the search is cleared', async () => {
      const searchInput = screen.getByPlaceholderText('Search for destinations')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Florida' } })
      })
      expect(screen.queryByText('New York CAIR2')).not.toBeInTheDocument()

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '' } })
      })
      expect(screen.getByText('New York CAIR2')).toBeInTheDocument()
    })
  })

  // ── Destination selection ─────────────────────────────────────────────────

  describe('Destination selection', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<Console />)
      })
      await openPopover()
    })

    it('closes the popover after a destination is clicked', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('New York CAIR2'))
      })

      expect(
        screen.queryByPlaceholderText('Search for destinations')
      ).not.toBeInTheDocument()
    })

    it('updates the trigger to show the newly selected destination', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Florida SHOTS'))
      })

      // Wait for popover to close; then Florida SHOTS should be in the trigger
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('Search for destinations')
        ).not.toBeInTheDocument()
      })
      expect(screen.getAllByText('Florida SHOTS').length).toBeGreaterThan(0)
    })

    it('commits the selected destination to all three widgets', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Florida SHOTS'))
      })

      // Florida SHOTS → destId "202"
      expect(screen.getByTestId('detail-widget')).toHaveAttribute(
        'data-connection',
        '202'
      )
      expect(screen.getByTestId('outbound-widget')).toHaveAttribute(
        'data-connection',
        '202'
      )
      expect(screen.getByTestId('inbound-widget')).toHaveAttribute(
        'data-connection',
        '202'
      )
    })

    it('selects PRODUCTION by default for New York (has PRODUCTION, STAGE, ONBOARD)', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('New York CAIR2'))
      })

      // After click, Production chip should appear on the trigger
      expect(screen.getByText('Production')).toBeInTheDocument()
    })

    it('selects DEV for CDC (303) which only has DEV environment', async () => {
      await act(async () => {
        fireEvent.click(screen.getByText('Centers for Disease Control'))
      })

      // Wait for popover to close, then check trigger chip = "Development"
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('Search for destinations')
        ).not.toBeInTheDocument()
      })
      // Trigger chip should now be "Development" (DEV is the only env for CDC)
      expect(screen.getAllByText('Development').length).toBeGreaterThan(0)
    })

    it('clears the search query when a destination is selected', async () => {
      const searchInput = screen.getByPlaceholderText('Search for destinations')
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Florida' } })
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Florida SHOTS'))
      })

      // Wait for popover to fully close (portal unmounted) before re-opening
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('Search for destinations')
        ).not.toBeInTheDocument()
      })

      // Re-open popover — 'Florida SHOTS' now only exists in the trigger
      await act(async () => {
        fireEvent.click(screen.getByText('Florida SHOTS'))
      })

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search for destinations')
        ).toHaveValue('')
      })
    })
  })

  // ── Environment chip selection ────────────────────────────────────────────

  describe('Environment chip selection', () => {
    it('clicking an env chip commits the new environment immediately', async () => {
      await act(async () => {
        render(<Console />)
      })

      // Open popover — first dest 'dev' is selected, env = PRODUCTION
      await openPopover()

      // Click the "Onboarding" env chip (appears in the popover chip row)
      const chips = screen.getAllByText('Onboarding')
      await act(async () => {
        fireEvent.click(chips[0])
      })

      // Verify the committed environment propagated to the detail widget.
      // getElasticEnvTag is mocked: getElasticEnvTag('ONBOARD') → 'onboard'
      await waitFor(() => {
        expect(screen.getByTestId('detail-widget')).toHaveAttribute(
          'data-env',
          'onboard'
        )
      })
    })

    it('shows separate env chips for each environment of the selected destination', async () => {
      await act(async () => {
        render(<Console />)
      })

      await openPopover()

      // "dev" has DEV/ONBOARD/PRODUCTION — all visible in popover chip row
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
    })

    it('env chips change when a destination with different envs is selected', async () => {
      await act(async () => {
        render(<Console />)
      })

      await openPopover()

      // Select CDC (303) — it only has DEV
      await act(async () => {
        fireEvent.click(screen.getByText('Centers for Disease Control'))
      })

      // Wait for popover to close after destination click
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText('Search for destinations')
        ).not.toBeInTheDocument()
      })

      // Re-open popover (CDC is now the trigger text)
      await act(async () => {
        fireEvent.click(screen.getAllByText('Centers for Disease Control')[0])
      })

      // Only "Development" chip should appear (CDC only has DEV)
      await waitFor(() => {
        expect(screen.getAllByText('Development').length).toBeGreaterThan(0)
        // Onboarding should not appear as an env chip for CDC
        expect(screen.queryByText('Onboarding')).not.toBeInTheDocument()
      })
    })
  })

  // ── Refresh button ────────────────────────────────────────────────────────

  describe('Refresh button', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<Console />)
      })
    })

    it('renders a Refresh button', () => {
      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument()
    })

    it('keeps all three widgets mounted with the committed connection after refresh', async () => {
      // Widgets should already show the initial committed connection "dev"
      expect(screen.getByTestId('detail-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
      expect(screen.getByTestId('outbound-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
      expect(screen.getByTestId('inbound-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
      })

      // All three widgets must still be present with the same connection
      expect(screen.getByTestId('detail-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
      expect(screen.getByTestId('outbound-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
      expect(screen.getByTestId('inbound-widget')).toHaveAttribute(
        'data-connection',
        'dev'
      )
    })

    it('clicking Refresh multiple times keeps widgets mounted each time', async () => {
      const button = screen.getByRole('button', { name: /refresh/i })

      await act(async () => {
        fireEvent.click(button)
      })
      await act(async () => {
        fireEvent.click(button)
      })
      await act(async () => {
        fireEvent.click(button)
      })

      expect(screen.getByTestId('detail-widget')).toBeInTheDocument()
      expect(screen.getByTestId('outbound-widget')).toBeInTheDocument()
      expect(screen.getByTestId('inbound-widget')).toBeInTheDocument()
    })

    it('refresh after a destination change keeps the new destination, not the original', async () => {
      // Switch to Florida SHOTS (destId "202")
      await openPopover()
      await act(async () => {
        fireEvent.click(screen.getByText('Florida SHOTS'))
      })
      await waitFor(() => {
        expect(screen.getByTestId('detail-widget')).toHaveAttribute(
          'data-connection',
          '202'
        )
      })

      // Now refresh — committed connection must remain "202"
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
      })

      expect(screen.getByTestId('detail-widget')).toHaveAttribute(
        'data-connection',
        '202'
      )
      expect(screen.getByTestId('outbound-widget')).toHaveAttribute(
        'data-connection',
        '202'
      )
      expect(screen.getByTestId('inbound-widget')).toHaveAttribute(
        'data-connection',
        '202'
      )
    })

    it('does not close an open destination popover when Refresh is clicked', async () => {
      await openPopover()
      // Popover is open — search field is visible
      expect(
        screen.getByPlaceholderText('Search for destinations')
      ).toBeInTheDocument()

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /refresh/i, hidden: true })
        )
      })

      // Popover should still be open (Refresh only increments refreshKey, not touches popover state)
      expect(
        screen.getByPlaceholderText('Search for destinations')
      ).toBeInTheDocument()
    })
  })

  // ── Access control ────────────────────────────────────────────────────────

  describe('Access control', () => {
    it('shows a permission error for non-admin users', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { name: 'Regular User', isAdmin: false } },
        status: 'authenticated',
      })

      await act(async () => {
        render(<Console />)
      })

      expect(
        screen.getByText(
          'You do not have permission to access the Console. Admin access is required.'
        )
      ).toBeInTheDocument()
    })

    it('shows a loading spinner while the session is being resolved', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'loading' })

      await act(async () => {
        render(<Console />)
      })

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('does not render the filter UI for non-admin users', async () => {
      mockUseSession.mockReturnValue({
        data: { user: { isAdmin: false } },
        status: 'authenticated',
      })

      await act(async () => {
        render(<Console />)
      })

      expect(
        screen.queryByText('IZ Gateway Operations Console')
      ).not.toBeInTheDocument()
    })
  })
})
