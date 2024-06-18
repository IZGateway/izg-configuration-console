import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AcceptButton from './acceptButton'

describe('AcceptButton', () => {
  it('renders the component correctly', () => {
    const handleAcceptMock = jest.fn()
    render(<AcceptButton handleAccept={handleAcceptMock} agreed={true} />)
    expect(screen.getByText('ACCEPT')).toBeInTheDocument()
  })

  it('calls the handleAccept function when the button is clicked', () => {
    const handleAcceptMock = jest.fn()
    render(<AcceptButton handleAccept={handleAcceptMock} agreed={true} />)
    fireEvent.click(screen.getByText('ACCEPT'))
    expect(handleAcceptMock).toHaveBeenCalledTimes(1)
  })

  it('disables the button when agreed is false', () => {
    const handleAcceptMock = jest.fn()
    render(<AcceptButton handleAccept={handleAcceptMock} agreed={false} />)
    expect(screen.getByText('ACCEPT')).toBeDisabled()
  })

  it('enables the button when agreed is true', () => {
    const handleAcceptMock = jest.fn()
    render(<AcceptButton handleAccept={handleAcceptMock} agreed={true} />)
    expect(screen.getByText('ACCEPT')).not.toBeDisabled()
  })
})
