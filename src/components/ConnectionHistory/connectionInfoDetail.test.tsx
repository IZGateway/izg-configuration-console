import React from 'react'
import { render } from '@testing-library/react'
import ConnectionInfoDetail from './connectionInfoDetail'
import useSWR from 'swr'
import { Destination } from '../../lib/type/Destination'

jest.mock('../../lib/desttypehelper', () => ({
  destTypeFormattedToSyncWithApi: jest.fn((type: string) => type),
}))

jest.mock('swr')

describe('ConnectionInfoDetail component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders connection info details correctly', () => {
    const ts = new Date()
    const destination: Destination = {
      jurisdiction: {
        description: 'Organization Description',
        jurisdictionId: 1,
        name: 'Organization Name',
        createdBy: 'System',
        createdOn: ts,
        updatedBy: 'System',
        updatedOn: ts,
      },
      destinationType: { type: 'Test', typeId: 1 },
      destUri: 'http://example.com',
      username: 'user123',
      facilityId: 'facility123',
      MSH3: 'MSH3',
      MSH4: 'MSH4',
      MSH5: 'MSH5',
      MSH6: 'MSH6',
      MSH22: 'MSH22',
      MSH11: 'P',
      RXA11: 'RXA11',
      destId: 'test',
      passExpiry: new Date('2023-01-01T00:00:00Z'),
      maintReason: 'Routine Maintenance',
      maintStart: new Date('2023-01-01T00:00:00Z'),
      maintEnd: new Date('2023-01-01T00:00:00Z'),
      createdBy: 'System',
      createdOn: ts,
      updatedBy: 'System',
      updatedOn: ts,
    }

    ;(useSWR as jest.Mock).mockReturnValueOnce({
      data: destination,
      error: undefined,
      isLoading: false,
    })
    const displayMock = jest.fn()

    const { getByText, getByLabelText } = render(
      <ConnectionInfoDetail
        destination={destination}
        open={true}
        display={displayMock}
      />
    )

    expect(getByText('Connection Info')).toBeInTheDocument()
    expect(
      getByText(
        'View connection information below. Editing is not available on this panel.'
      )
    ).toBeInTheDocument()
    expect(getByLabelText('Organization')).toHaveValue(
      'Organization Description'
    )
    expect(getByLabelText('Type of Connection')).toHaveValue('Test')
    expect(getByLabelText('Endpoint URL')).toHaveValue('http://example.com')
    expect(getByLabelText('Username')).toHaveValue('user123')
    expect(getByLabelText('Facility ID')).toHaveValue('facility123')
    expect(getByLabelText('MSH-3')).toHaveValue('MSH3')
    expect(getByLabelText('MSH-4')).toHaveValue('MSH4')
    expect(getByLabelText('MSH-5')).toHaveValue('MSH5')
    expect(getByLabelText('MSH-6')).toHaveValue('MSH6')
    expect(getByLabelText('MSH-22')).toHaveValue('MSH22')
    expect(getByLabelText('MSH-11')).toHaveValue('P')
    expect(getByLabelText('RXA-11')).toHaveValue('RXA11')
  })
})
