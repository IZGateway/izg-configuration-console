import React from 'react'
import { render, screen, act, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'Ops', roles: ['IZG Operations'] } },
    status: 'authenticated',
  }),
}))
jest.mock('../../lib/security/useRoleAccess', () => ({
  __esModule: true,
  default: () => ({ canViewConsole: true }),
}))
jest.mock('../AppHeader', () => ({ __esModule: true, default: () => null }))
jest.mock('../Container', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock('./DestinationDetailWidget', () => ({
  __esModule: true,
  default: ({ envTag }: { envTag?: string }) => (
    <div data-testid="detail-widget" data-env={envTag ?? ''} />
  ),
}))
jest.mock('./OutboundMessagesWidget', () => ({ __esModule: true, default: () => null }))
jest.mock('./InboundMessagesWidget', () => ({ __esModule: true, default: () => null }))

import Console from '.'

// Matches the local data: every destination has TEST (2) and DEV (5).
const dest = (destId: string, description: string, typeId: number, type: string) => ({
  destId,
  jurisdiction: { jurisdictionId: 1, name: description, description },
  destinationType: { typeId, type },
})
const DESTINATIONS = [
  dest('az', 'Arizona', 2, 'TEST'),
  dest('az', 'Arizona', 5, 'DEV'),
  dest('ma', 'Massachusetts', 2, 'TEST'),
  dest('ma', 'Massachusetts', 5, 'DEV'),
  dest('dex', 'DEX', 5, 'DEV'),
]

const mockFetch = jest.fn()
global.fetch = mockFetch

const openPicker = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Select destination and environment' }))
  })
}
const trigger = () => screen.getByRole('button', { name: 'Select destination and environment' })

describe('Console: the chosen environment survives a destination change', () => {
  beforeEach(() => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(url === '/api/destinations' ? DESTINATIONS : []),
      })
    )
  })

  it('keeps Test when switching to a destination that has Test', async () => {
    await act(async () => {
      render(<Console />)
    })
    expect(within(trigger()).getByText('Development')).toBeInTheDocument()

    await openPicker()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'Test' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /Massachusetts/ }))
    })

    expect(within(trigger()).getByText('Massachusetts')).toBeInTheDocument()
    expect(within(trigger()).getByText('Test')).toBeInTheDocument()
    expect(screen.getByTestId('detail-widget')).toHaveAttribute('data-env', 'test')
  })

  it('falls back to the default for a destination without Test', async () => {
    await act(async () => {
      render(<Console />)
    })
    await openPicker()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'Test' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /DEX/ }))
    })

    expect(within(trigger()).getByText('Development')).toBeInTheDocument()
  })

  // The reported case: a Jurisdiction Operations user for ak and az. The rows
  // arrive in DynamoDB sort-key order (typeId#destId), so both TEST rows come
  // before both DEV rows.
  it('keeps Test from ak to az for a jurisdiction user', async () => {
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            url === '/api/destinations'
              ? [
                  dest('ak', 'Alaska', 2, 'TEST'),
                  dest('az', 'Arizona', 2, 'TEST'),
                  dest('ak', 'Alaska', 5, 'DEV'),
                  dest('az', 'Arizona', 5, 'DEV'),
                ]
              : []
          ),
      })
    )
    await act(async () => {
      render(<Console />)
    })
    expect(within(trigger()).getByText('Alaska')).toBeInTheDocument()
    expect(within(trigger()).getByText('Development')).toBeInTheDocument()

    await openPicker()
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'Test' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: /Arizona/ }))
    })

    expect(within(trigger()).getByText('Arizona')).toBeInTheDocument()
    expect(within(trigger()).getByText('Test')).toBeInTheDocument()
  })
})
