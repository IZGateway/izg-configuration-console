import React from 'react'
import { render, screen } from '@testing-library/react'
import Status from './index'

describe('Status of a connection', () => {
  it('should show Connected if it is passed as true', () => {
    render(<Status isConnected={true} color={true} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('should show Not Connected if it is passed as false', () => {
    render(<Status isConnected={false} color={true} />)
    expect(screen.getByText('Not Connected')).toBeInTheDocument()
  })

})
