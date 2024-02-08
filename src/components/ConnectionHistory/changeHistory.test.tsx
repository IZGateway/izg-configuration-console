import React from 'react'
import { render, screen } from '@testing-library/react'
import ChangeHistory from './changeHistory'
import useSWR from 'swr'

jest.mock('swr')

describe('ChangeHistory component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders "no data" message when no data is available', () => {
    ;(useSWR as jest.Mock).mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: false,
    })

    const { getByText } = render(<ChangeHistory destId="al" destTypeId="2" />)
    expect(getByText('no data')).toBeInTheDocument()
  })

  it('renders change history timeline when data is available with "Show CHnages" button', () => {
    const data = [
      {
        id: 1,
        userName: 'User 1',
        createdAt: new Date(),
        newValues: { field1: 'newValue1' },
        oldValues: { field1: 'oldValue1' },
      },
      {
        id: 2,
        userName: 'User 2',
        createdAt: new Date(),
        newValues: { field2: 'newValue2' },
        oldValues: { field2: 'oldValue2' },
      },
    ]
    ;(useSWR as jest.Mock).mockReturnValueOnce({
      data,
      error: false,
      isLoading: false,
    })

    render(<ChangeHistory destId="al" destTypeId="2" />)
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
    expect(screen.getAllByText('Show Changes')).toHaveLength(2)
  })
})
