import React from 'react'
import { render, screen } from '@testing-library/react'
import SystemResourcesWidget from './SystemResourcesWidget'
import useElasticTemplateQuery from '../../lib/services/useElasticTemplateQuery'

// Mock environment variable
process.env.NEXT_PUBLIC_ELASTIC_INDEX = 'test-index'

jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react')
  const mockSession = {
    expires: new Date(Date.now() + 2 * 86400).toISOString(),
    user: { username: 'tester', role: 'IZG User' },
  }
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(() => {
      return { data: mockSession, status: 'authenticated' }
    }),
  }
})

jest.mock('../../lib/services/useElasticTemplateQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('SystemResourcesWidget', () => {
  it('renders system resource metrics from elastic data', () => {
    ;(useElasticTemplateQuery as jest.Mock).mockReturnValue({
      data: {
        aggregations: {
          cpu: { value: 0.34 },
          memory: { value: 0.68 },
          disk: { value: 0.44 },
          connections: { value: 547 },
        },
      },
      error: null,
      isLoading: false,
    })

    render(<SystemResourcesWidget />)

    expect(screen.getByText('System Resources')).toBeInTheDocument()
    expect(screen.getByText('CPU Usage')).toBeInTheDocument()
    expect(screen.getByText('Memory Usage')).toBeInTheDocument()
    expect(screen.getByText('Disk Usage')).toBeInTheDocument()
    expect(screen.getByText('34%')).toBeInTheDocument()
    expect(screen.getByText('68%')).toBeInTheDocument()
    expect(screen.getByText('44%')).toBeInTheDocument()
    expect(screen.getByText('Active Connections: 547')).toBeInTheDocument()
  })

  it('shows N/A values when query is loading', () => {
    ;(useElasticTemplateQuery as jest.Mock).mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    })

    render(<SystemResourcesWidget />)

    // All metrics should show N/A when loading
    expect(screen.getAllByText('N/A')).toHaveLength(3) // CPU, Memory, Disk
    expect(screen.getByText('Active Connections: N/A')).toBeInTheDocument()
  })

  it('shows error message when query fails', () => {
    ;(useElasticTemplateQuery as jest.Mock).mockReturnValue({
      data: null,
      error: new Error('Failed to fetch'),
      isLoading: false,
    })

    render(<SystemResourcesWidget />)

    expect(
      screen.getByText('Unable to load system resources.')
    ).toBeInTheDocument()
  })

  it('handles null values gracefully', () => {
    ;(useElasticTemplateQuery as jest.Mock).mockReturnValue({
      data: {
        aggregations: {
          cpu: { value: null },
          memory: { value: null },
          disk: { value: null },
          connections: { value: null },
        },
      },
      error: null,
      isLoading: false,
    })

    render(<SystemResourcesWidget />)

    expect(screen.getAllByText('N/A')).toHaveLength(3)
    expect(screen.getByText('Active Connections: N/A')).toBeInTheDocument()
  })
})
