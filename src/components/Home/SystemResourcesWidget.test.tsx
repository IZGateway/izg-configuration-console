import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SWRConfig } from 'swr'

const mockUseSession = jest.fn()
jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import SystemResourcesWidget, {
  SYSTEM_RESOURCES_ENDPOINT,
} from './SystemResourcesWidget'

// A fresh SWR cache per render, so one test's response never serves another.
const renderWidget = () =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <SystemResourcesWidget />
    </SWRConfig>
  )

describe('SystemResourcesWidget (IGDD-3474: open to every signed-in user)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          aggregations: {
            cpu: { value: 0.25 },
            memory: { value: 0.5 },
            disk: { value: 0.75 },
            connections: { value: 12 },
          },
        }),
    })
  })

  it.each([
    ['a non-admin jurisdiction user', { isAdmin: false, roles: ['Jurisdiction Support'] }],
    ['an admin', { isAdmin: true, roles: ['IZG Operations'] }],
  ])('renders and fetches for %s', async (_label, user) => {
    mockUseSession.mockReturnValue({ data: { user }, status: 'authenticated' })

    renderWidget()

    expect(screen.getByText('System Resources')).toBeInTheDocument()
    expect(await screen.findByText('25%')).toBeInTheDocument()
    expect(screen.getByText('Active Connections: 12')).toBeInTheDocument()
  })

  it('asks the server for the report and sends no query of its own', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' })

    renderWidget()

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    // A plain GET: no method override and no body.
    expect(mockFetch).toHaveBeenCalledWith(SYSTEM_RESOURCES_ENDPOINT)
  })

  it('does not fetch until the session is authenticated', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' })

    renderWidget()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows an error when the request fails', async () => {
    mockUseSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' })
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'boom' }),
    })

    renderWidget()

    expect(
      await screen.findByText('Unable to load system resources.')
    ).toBeInTheDocument()
  })
})
