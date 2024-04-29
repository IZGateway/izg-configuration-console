import React from 'react'
import { render, screen } from '@testing-library/react'

import ViewChangeRequest from './viewChangeRequest'

describe('ViewChangeRequest component', () => {
  it('renders with correct title and text', () => {
    render(<ViewChangeRequest />)
    expect(screen.getByText('View Change Request?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Use the button below to access the most recent change request.'
      )
    ).toBeInTheDocument()
  })

  it('renders link with correct href', () => {
    const props = {
      destTypeId: '123',
      destId: '456',
    }
    render(<ViewChangeRequest {...props} />)
    const link = screen.getByRole('link', { name: 'ACCESS' })
    expect(link).toHaveAttribute('href', '/changerequest/123/456')
  })
})
