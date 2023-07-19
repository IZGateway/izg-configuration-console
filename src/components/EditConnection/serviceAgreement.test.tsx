import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ServiceAgreement from './serviceAgreement'

describe('Service Agreement component', () => {
  it('renders without throwing any errors', () => {
    expect(() => {
      render(<ServiceAgreement clickOnAgree={jest.fn()} agreed={false} />)
    }).not.toThrow()
    expect(screen.getByTestId('agree-button')).toBeInTheDocument()
  })

  it('should call agree function when agree button is clicked', () => {
    const handleAgree = jest.fn()
    render(<ServiceAgreement clickOnAgree={handleAgree} agreed={false} />)
    const agreeButton = screen.getByTestId('agree-button')
    fireEvent.click(agreeButton)
    expect(handleAgree).toBeCalled()
  })
})
