import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import CancelRequestDialog from './cancelRequestDialog'
import CombinedContext from '../../contexts/app'

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('CancelRequestDialog', () => {
  const handleCloseMock = jest.fn()
  const props = {
    open: true,
    handleClose: handleCloseMock,
    destTypeId: 1, // assuming 1 is a valid number for destTypeId
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
    const { getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <CancelRequestDialog {...props} />
      </CombinedContext.Provider>
    )
    expect(getByLabelText('Cancel Request')).toBeInTheDocument()
  })

  it('calls handleClose when Close button is clicked', () => {
    const { getByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <CancelRequestDialog {...props} />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByText('Close'))
    expect(handleCloseMock).toHaveBeenCalledTimes(1)
  })
})
