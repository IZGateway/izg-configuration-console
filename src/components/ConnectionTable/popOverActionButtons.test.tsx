import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import PopOverActionButtons from './popOverActionButtons'
import CombinedContext from '../../contexts/app'

describe('PopOverActionButtons component', () => {
  const combinedContextValueMock = {
    pageSize: 0,
    setPageSize: jest.fn(),
    isChangePasswordClicked: true,
    setIsChangePasswordClicked: jest.fn(),
    clearValue: jest.fn(),
    alert: { level: '', message: '' },
    setAlert: jest.fn(),
  }

  it('renders correctly', () => {
    const { getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <PopOverActionButtons
          destTypeId={1}
          destId={2}
          status="active"
          hasActiveMaintenance={true}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
        />
      </CombinedContext.Provider>
    )
    expect(getByLabelText('moreactions')).toBeInTheDocument()
  })

  it('opens the menu on button click', async () => {
    const { getByLabelText, getByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <PopOverActionButtons
          destTypeId={1}
          destId={2}
          status="active"
          hasActiveMaintenance={true}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(getByText('History')).toBeInTheDocument()
  })
})
