/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import PopOverActionButtons from './popOverActionButtons'
import CombinedContext from '../../contexts/app'
import { ManageConnectionsPageAccessControl } from '../../lib/type/PageAccessControls'
import useRoleAccess from '../../lib/security/useRoleAccess'

jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react')
  const mockSession = {
    expires: new Date(Date.now() + 2 * 86400).toISOString(),
    user: { username: 'admin', role: 'IZG Operations' },
  }
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(() => {
      return { data: mockSession, status: 'authenticated' } // return type is [] in v3 but changed to {} in v4
    }),
  }
})

jest.mock('next/router', () => ({
  useRouter() {
    return {
      pathname: '',
      // ... whatever else you you call on `router`
    }
  },
}))

jest.mock('../../lib/security/useRoleAccess', () => {
  return jest.fn(() => {
    return {
      canRunConnectionTest: true,
      canScheduleMaintainance: true,
      canViewHistory: true,
      canEditConnection: true,
      canViewChangeRequest: true,
      canResetCircuitBreaker: true,
    } as ManageConnectionsPageAccessControl
  })
})

describe('PopOverActionButtons component', () => {
  const combinedContextValueMock = {
    pageSize: 0,
    setPageSize: jest.fn(),
    isChangePasswordClicked: true,
    setIsChangePasswordClicked: jest.fn(),
    clearValue: jest.fn(),
    alert: { level: '', message: '' },
    setAlert: jest.fn(),
    accessLevels: { canViewHistory: true }, // Add the 'canViewHistory' property
  }

  it('renders correctly', async () => {
    const { getByLabelText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <PopOverActionButtons
          destTypeId={1}
          destId={'test'}
          status="active"
          hasActiveMaintenance={true}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
          row={undefined}
          updateRow={function (row: any): void {
            throw new Error('Function not implemented.')
          }}
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
          destId={'test'}
          status="active"
          hasActiveMaintenance={true}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
          row={undefined}
          updateRow={function (row: any): void {
            throw new Error('Function not implemented.')
          }}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(getByText('History')).toBeInTheDocument()
  })

  it('shows the Reset Circuit Breaker menu item when the circuit breaker is tripped and the role has the capability', async () => {
    const { getByLabelText, getByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <PopOverActionButtons
          destTypeId={1}
          destId={'test'}
          status="Circuit Breaker Thrown"
          hasActiveMaintenance={false}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
          row={undefined}
          updateRow={function (row: any): void {
            throw new Error('Function not implemented.')
          }}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(getByText('Reset Circuit Breaker')).toBeInTheDocument()
  })

  it('does not show the Reset Circuit Breaker menu item when the circuit breaker is not tripped', async () => {
    const { getByLabelText, queryByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <PopOverActionButtons
          destTypeId={1}
          destId={'test'}
          status="active"
          hasActiveMaintenance={false}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
          row={undefined}
          updateRow={function (row: any): void {
            throw new Error('Function not implemented.')
          }}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(queryByText('Reset Circuit Breaker')).not.toBeInTheDocument()
  })

  it('does not show the Reset Circuit Breaker menu item when the role lacks the capability', async () => {
    ;(useRoleAccess as jest.Mock).mockReturnValueOnce({
      canRunConnectionTest: true,
      canScheduleMaintainance: false,
      canViewHistory: true,
      canEditConnection: false,
      canViewChangeRequest: true,
      canResetCircuitBreaker: false,
    } as ManageConnectionsPageAccessControl)

    const { getByLabelText, queryByText } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <PopOverActionButtons
          destTypeId={1}
          destId={'test'}
          status="Circuit Breaker Thrown"
          hasActiveMaintenance={false}
          jurisdictionName="Test Jurisdiction"
          destType="Test Type"
          row={undefined}
          updateRow={function (row: any): void {
            throw new Error('Function not implemented.')
          }}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(queryByText('Reset Circuit Breaker')).not.toBeInTheDocument()
  })
})
