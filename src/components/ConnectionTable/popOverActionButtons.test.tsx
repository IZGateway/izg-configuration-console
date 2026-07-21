/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
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
          updateRow={jest.fn()}
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
          updateRow={jest.fn()}
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
          updateRow={jest.fn()}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(getByText('Reset Circuit Breaker')).toBeInTheDocument()
  })

  it('clicking Reset Circuit Breaker opens the confirmation dialog', async () => {
    const { getByLabelText, getByText, getByRole, queryByRole, queryByText } =
      render(
        <CombinedContext.Provider value={combinedContextValueMock}>
          <PopOverActionButtons
            destTypeId={1}
            destId={'test'}
            status="Circuit Breaker Thrown"
            hasActiveMaintenance={false}
            jurisdictionName="Test Jurisdiction"
            destType="Test Type"
            row={{ destUri: 'https://mdexample.net/' }}
            updateRow={jest.fn()}
          />
        </CombinedContext.Provider>
      )
    // The dialog uses `keepMounted`, so its content exists in the DOM (just
    // visually hidden) before it's opened — assert on role visibility
    // (which respects CSS `visibility: hidden`), not just text presence.
    expect(queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(getByLabelText('moreactions'))
    fireEvent.click(getByText('Reset Circuit Breaker'))
    expect(getByRole('dialog')).toBeInTheDocument()
    expect(
      getByText(
        (_, node) =>
          node?.textContent ===
          'Are you sure you want to reset the circuit breaker for Test Jurisdiction — https://mdexample.net/ (Test Type)? This action will restore connectivity and log the reset.'
      )
    ).toBeInTheDocument()
    // Wait for the menu popover's exit transition to fully finish (it isn't
    // `keepMounted`, so "History" disappears only once it's actually gone)
    // so its transition timer doesn't fire after this test unmounts and log
    // an unmounted-component warning during a later test.
    await waitFor(() => expect(queryByText('History')).not.toBeInTheDocument())
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
          updateRow={jest.fn()}
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
          updateRow={jest.fn()}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByLabelText('moreactions'))
    expect(queryByText('Reset Circuit Breaker')).not.toBeInTheDocument()
  })
})
