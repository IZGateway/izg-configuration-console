import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import RescheduleDialog from './reScheduleDialog'
import CombinedContext from '../../contexts/app'

jest.mock('next/router', () => ({
  useRouter() {
    return {
      pathname: '',
      // ... whatever else you you call on `router`
    }
  },
}))

describe('RescheduleDialog', () => {
  const handleCloseMock = jest.fn()
  const props = {
    open: true,
    handleClose: handleCloseMock,
    destTypeId: 'sampleDestTypeId',
    destId: 'sampleDestId',
  }
  const combinedContextValueMock = {
    pageSize: 0,
    setPageSize: jest.fn(),
    isChangePasswordClicked: true,
    setIsChangePasswordClicked: jest.fn(),
    clearValue: jest.fn(),
    alert: { level: '', message: '' },
    setAlert: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dialog properly', () => {
    const { getByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <RescheduleDialog {...props} />
      </CombinedContext.Provider>
    )
    expect(getByText('Reschedule Options')).toBeInTheDocument()
  })

  it('displays appropriate radio buttons and date picker', () => {
    const { getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <RescheduleDialog {...props} />
      </CombinedContext.Provider>
    )
    expect(getByLabelText('Reschedule ASAP')).toBeInTheDocument()
    expect(
      getByLabelText(
        'Reschedule at a future date and time (Eastern Standard Time)'
      )
    ).toBeInTheDocument()
    fireEvent.click(
      getByLabelText(
        'Reschedule at a future date and time (Eastern Standard Time)'
      )
    )
    expect(getByLabelText('Deployment date and time')).toBeInTheDocument()
  })

  it('calls handleASAPPicker when Reschedule ASAP radio button is clicked', () => {
    const { getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <RescheduleDialog {...props} />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('Reschedule ASAP'))
    expect(getByLabelText('Reschedule ASAP')).toBeChecked()
    expect(
      getByLabelText(
        'Reschedule at a future date and time (Eastern Standard Time)'
      )
    ).not.toBeChecked()
  })

  it('calls handleDateTimePicker when Reschedule at a future date and time radio button is clicked', () => {
    const { getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <RescheduleDialog {...props} />
      </CombinedContext.Provider>
    )
    fireEvent.click(
      getByLabelText(
        'Reschedule at a future date and time (Eastern Standard Time)'
      )
    )
    expect(getByLabelText('Reschedule ASAP')).not.toBeChecked()
    expect(
      getByLabelText(
        'Reschedule at a future date and time (Eastern Standard Time)'
      )
    ).toBeChecked()
  })

  it('calls handleClose when Close button is clicked', () => {
    const { getByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <RescheduleDialog {...props} />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByText('Close'))
    expect(handleCloseMock).toHaveBeenCalledTimes(1)
  })
})
