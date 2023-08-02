import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import Manage from '../pages/manage/index'

describe('Manage page', () => {
  it('should render properly in a loading state', () => {
    render(<Manage />)
    expect(screen.getByText('Loading your connections...')).toBeInTheDocument()
  })
  it('should render properly after loading state', async () => {
    const { getByText, queryByText, getByRole } = render(<Manage />)
    expect(getByText('Loading your connections...')).toBeInTheDocument()
    await waitFor(() => {
      expect(queryByText('Loading your connections...')).not.toBeInTheDocument()
    })
    expect(getByRole('grid')).toBeInTheDocument()
  })
})
