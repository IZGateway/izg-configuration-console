import React from 'react'
import { render, fireEvent } from '@testing-library/react'
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
    const { getByText } = render(<MakeChanges {...props} />)
    expect(getByText('Need to make changes?')).toBeInTheDocument()
  })
})
