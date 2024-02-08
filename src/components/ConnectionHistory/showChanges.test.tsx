import React from 'react'
import { render } from '@testing-library/react'
import ShowChanges from './showChanges'

describe('ShowChanges component', () => {
  const fields: { [key: string]: { newValue: string; oldValue: string } } = {
    field1: { oldValue: 'oldValue1', newValue: 'newValue1' },
    field2: { oldValue: 'oldValue2', newValue: 'newValue2' },
  }
  const renderComponent = (props) => render(<ShowChanges {...props} />)

  it('renders table rows with correct data', () => {
    const { getByText } = renderComponent({ fields })

    expect(getByText('field1')).toBeInTheDocument()
    expect(getByText('oldValue1')).toBeInTheDocument()
    expect(getByText('newValue1')).toBeInTheDocument()

    expect(getByText('field2')).toBeInTheDocument()
    expect(getByText('oldValue2')).toBeInTheDocument()
    expect(getByText('newValue2')).toBeInTheDocument()
  })
})
