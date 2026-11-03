import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import useSWR from 'swr'

jest.mock('swr')
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
import { useSession } from 'next-auth/react'
import ConnectionInfo from './connectionInfo'

const mockedSession = useSession as jest.Mock

const destData = {
  destinationType: { type: 'prod' },
  destUri: 'https://example.org',
  jurisdiction: { description: 'Arizona' },
}

describe('Connection info component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // protect-connection-pages-and-endpoints (IGDD-3545): ConnectionInfo now
    // calls useRoleAccess, which calls useSession - mocked so a bare render
    // doesn't depend on a real SessionProvider.
    mockedSession.mockReturnValue({ data: null, status: 'unauthenticated' })
    ;(useSWR as jest.Mock).mockReturnValue({
      data: destData,
      error: undefined,
      isLoading: false,
    })
  })

  it('renders without throwing any errors', () => {
    expect(() => {
      render(<ConnectionInfo destId={'ak'} />)
    }).not.toThrow()
  })

  it('throws on a fetch error so the mounted ErrorBoundary renders the real error page', () => {
    ;(useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: new Error('network error'),
      isLoading: false,
    })
    expect(() => {
      render(<ConnectionInfo destId={'ak'} />)
    }).toThrow('network error')
  })

  it('hides the detail view toggle for a caller without canViewConnectionInfoDetails', () => {
    // status: 'unauthenticated' resolves zero roles, so every history flag
    // reads falsy — the fail-closed default useRoleAccess documents.
    const { container } = render(<ConnectionInfo destId={'ak'} />)
    expect(container.querySelector('#detail')).not.toBeInTheDocument()
  })

  it('shows the detail view toggle for a caller with canViewConnectionInfoDetails', () => {
    mockedSession.mockReturnValue({
      data: { user: { email: 'u@example.com', roles: ['IZG Operations'] } },
      status: 'authenticated',
    })
    const { container } = render(<ConnectionInfo destId={'ak'} />)
    expect(container.querySelector('#detail')).toBeInTheDocument()
  })
})
