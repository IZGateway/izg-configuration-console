import React from 'react'
import { render } from '@testing-library/react'
import useSWR from 'swr'
import ChangeRequestActionButtons from './ChangeRequestActionButtons'
import { ManageConnectionsPageAccessControl } from '../../lib/type/PageAccessControls'
import useRoleAccess from '../../lib/security/useRoleAccess'

jest.mock('swr')

jest.mock('next/router', () => ({
  useRouter() {
    return { pathname: '' }
  },
}))

jest.mock('../../lib/security/useRoleAccess', () => jest.fn())

describe('ChangeRequestActionButtons component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    })
  })

  // IGDD-3547 PR review (Paul Cahill, IGDD-3547 comment): an IZG Program user
  // opening Manage Connections on a row with an active draft got the error
  // page, because this component fetched the draft unconditionally while
  // only a canEditConnection role ever renders anything from the response.
  // The server-side 403 is correct; the bug was fetching at all.
  it('does not fetch the draft, and does not crash, for a role without canEditConnection', () => {
    ;(useRoleAccess as jest.Mock).mockReturnValue({
      canEditConnection: false,
      canViewChangeRequest: false,
    } as ManageConnectionsPageAccessControl)

    render(
      <ChangeRequestActionButtons
        destTypeId={1}
        destId="al"
        hasChangeRequest={false}
        hasActiveDraft={true}
        tabIndex={0}
      />
    )

    expect(useSWR).toHaveBeenCalledWith(null)
  })

  it('fetches the draft for a role with canEditConnection', () => {
    ;(useRoleAccess as jest.Mock).mockReturnValue({
      canEditConnection: true,
      canViewChangeRequest: true,
    } as ManageConnectionsPageAccessControl)
    ;(useSWR as jest.Mock).mockReturnValue({
      data: { requestedBy: 'Jane Doe', scheduledAt: new Date().toISOString() },
      error: undefined,
      isLoading: false,
    })

    render(
      <ChangeRequestActionButtons
        destTypeId={1}
        destId="al"
        hasChangeRequest={false}
        hasActiveDraft={true}
        tabIndex={0}
      />
    )

    expect(useSWR).toHaveBeenCalledWith('/api/changerequest/1/al')
  })
})
