import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChangeHistory from './changeHistory'

describe('Change History component', () => {
  it('renders without throwing any errors', () => {
    expect(() => {
      render(<ChangeHistory destId={'ak'} destTypeId={'2'} />)
    }).not.toThrow()
  })
})
