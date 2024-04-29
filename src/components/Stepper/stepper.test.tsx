import React from 'react'
import { render, screen } from '@testing-library/react'
import StepperComponent from './index'

describe('Stepper component', () => {
  const steps = ['SERVICE AGREEMENT', 'ORGANIZATION', 'IDENTIFY', 'VERIFY']
  it('renders without throwing any errors', () => {
    expect(() => {
      render(<StepperComponent activeStep={0} steps={[]} />)
    }).not.toThrow()
  })

  it('renders the correct number of steps and their labels', () => {
    render(<StepperComponent activeStep={0} steps={steps} />)
    const stepLabels = screen.getAllByTestId('step-label')
    expect(stepLabels.length).toBe(steps.length)
    steps.forEach((step, index) => {
      expect(stepLabels[index]).toHaveTextContent(step)
    })
  })
})
