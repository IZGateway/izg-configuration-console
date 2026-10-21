import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ActionButtons from './actionButtons'

describe('ActionButtons', () => {
  it('renders the component correctly', () => {
    const handlePreviousMock = jest.fn()
    const handleScheduleMock = jest.fn()
    const handleNextMock = jest.fn()
    render(
      <ActionButtons
        activeStep={0}
        handlePrevious={handlePreviousMock}
        steps={['Step 1', 'Step 2', 'Step 3']}
        isScheduleButtonDisabled={false}
        handleSchedule={handleScheduleMock}
        handleNext={handleNextMock}
        isNextButtonDisabled={false}
      />
    )
    expect(screen.getByText('PREVIOUS')).toBeInTheDocument()
    expect(screen.getByText('NEXT')).toBeInTheDocument()
  })

  it('renders schedule button only on last step', () => {
    const handlePreviousMock = jest.fn()
    const handleScheduleMock = jest.fn()
    const handleNextMock = jest.fn()
    render(
      <ActionButtons
        activeStep={3}
        handlePrevious={handlePreviousMock}
        steps={['Step 1', 'Step 2', 'Step 3', 'Step 4']}
        isScheduleButtonDisabled={false}
        handleSchedule={handleScheduleMock}
        handleNext={handleNextMock}
        isNextButtonDisabled={false}
      />
    )
    expect(screen.getByText('SCHEDULE')).toBeInTheDocument()
  })

  it('calls the handlePrevious function when the "PREVIOUS" button is clicked', () => {
    const handlePreviousMock = jest.fn()
    render(
      <ActionButtons
        activeStep={1}
        handlePrevious={handlePreviousMock}
        steps={['Step 1', 'Step 2', 'Step 3']}
        isScheduleButtonDisabled={false}
        handleSchedule={jest.fn()}
        handleNext={jest.fn()}
        isNextButtonDisabled={false}
      />
    )
    fireEvent.click(screen.getByText('PREVIOUS'))
    expect(handlePreviousMock).toHaveBeenCalledTimes(1)
  })

  it('calls the handleSchedule function when the "SCHEDULE" button is clicked', () => {
    const handleScheduleMock = jest.fn()
    render(
      <ActionButtons
        activeStep={2}
        handlePrevious={jest.fn()}
        steps={['Step 1', 'Step 2', 'Step 3']}
        isScheduleButtonDisabled={false}
        handleSchedule={handleScheduleMock}
        handleNext={jest.fn()}
        isNextButtonDisabled={false}
      />
    )
    fireEvent.click(screen.getByText('SCHEDULE'))
    expect(handleScheduleMock).toHaveBeenCalledTimes(1)
  })

  it('calls the handleNext function when the "NEXT" button is clicked', () => {
    const handleNextMock = jest.fn()

    render(
      <ActionButtons
        activeStep={0}
        handlePrevious={jest.fn()}
        steps={['Step 1', 'Step 2', 'Step 3']}
        isScheduleButtonDisabled={false}
        handleSchedule={jest.fn()}
        handleNext={handleNextMock}
        isNextButtonDisabled={false}
      />
    )
    fireEvent.click(screen.getByText('NEXT'))
    expect(handleNextMock).toHaveBeenCalledTimes(1)
  })
  // IGDD-3566: isSubmitting disables SCHEDULE while a submission is in flight.
  // It must not open the date Tooltip, which belongs to isScheduleButtonDisabled.
  const lastStepProps = {
    activeStep: 4,
    handlePrevious: jest.fn(),
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
    handleNext: jest.fn(),
    isNextButtonDisabled: false,
  }

  it('disables SCHEDULE and shows the pending label while submitting', () => {
    const handleScheduleMock = jest.fn()
    render(
      <ActionButtons
        {...lastStepProps}
        isScheduleButtonDisabled={false}
        isSubmitting={true}
        handleSchedule={handleScheduleMock}
      />
    )
    const button = screen.getByRole('button', { name: /SCHEDULING/i })
    expect(button).toBeDisabled()
    expect(screen.queryByText('SCHEDULE')).not.toBeInTheDocument()
    fireEvent.click(button)
    expect(handleScheduleMock).not.toHaveBeenCalled()
  })

  it('keeps the date Tooltip closed when only isSubmitting is true', () => {
    render(
      <ActionButtons
        {...lastStepProps}
        isScheduleButtonDisabled={false}
        isSubmitting={true}
        handleSchedule={jest.fn()}
      />
    )
    expect(
      screen.queryByText('Please select date and time')
    ).not.toBeInTheDocument()
  })

  it('opens the date Tooltip when isScheduleButtonDisabled is true', () => {
    render(
      <ActionButtons
        {...lastStepProps}
        isScheduleButtonDisabled={true}
        isSubmitting={false}
        handleSchedule={jest.fn()}
      />
    )
    expect(screen.getByText('Please select date and time')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'SCHEDULE' })).toBeDisabled()
  })
})
