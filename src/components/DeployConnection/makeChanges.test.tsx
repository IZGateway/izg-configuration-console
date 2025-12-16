import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import MakeChanges from './makeChanges'

jest.mock('./reScheduleDialog', () => jest.fn().mockReturnValue(null))
jest.mock('./cancelRequestDialog', () => jest.fn().mockReturnValue(null))

describe('MakeChanges', () => {
  it('renders component properly', () => {
    const props = {
      destId: 'sampleDestId',
      destTypeId: 'sampleDestTypeId',
    }
    const ts = new Date()
    const { getByText } = render(
      <MakeChanges
        createdBy={'System'} createdOn={ts} 
        updatedBy={'System'} updatedOn={ts} 
        id={0}
        destType={undefined}
        jiraId={''}
        requestedAt={undefined}
        requestedBy={''}
        isDraft={false}
        requested={undefined}
        {...props}      />
    )
    expect(getByText('Need to make changes?')).toBeInTheDocument()
  })
})
