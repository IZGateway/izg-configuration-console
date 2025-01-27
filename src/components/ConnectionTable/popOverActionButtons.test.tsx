import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import PopOverActionButtons from './popOverActionButtons'
import CombinedContext from '../../contexts/app'
import { ManageConnectionsPageAccessControl } from '../../lib/type/PageAccessControls'

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
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(getByText('History')).toBeInTheDocument()
  })
})
