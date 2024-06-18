import React from 'react'
import { render } from '@testing-library/react'
import MaintenanceDialog from './maintenanceDialog'
import CombinedContext from '../../contexts/app'

describe('MaintenanceDialog component', () => {
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
    const handleClose = jest.fn()
    const { getByText, getByTestId, getByRole, getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <MaintenanceDialog
          open={true}
          handleClose={handleClose}
          destTypeId={1}
          destId={2}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
        />
      </CombinedContext.Provider>
    )
    expect(getByText('Disable Traffic Request')).toBeInTheDocument()
    expect(getByLabelText('Start date and time*')).toBeInTheDocument()
    expect(getByLabelText('Reinstatement date and time*')).toBeInTheDocument()
    expect(getByTestId('message-select')).toBeInTheDocument()
    expect(
      getByRole('button', { name: 'Disable connection' })
    ).toBeInTheDocument()
  })
})
