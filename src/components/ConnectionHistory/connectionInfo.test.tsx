import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConnectionInfo from './connectionInfo'

describe('Connection info component', () => {
  it('renders without throwing any errors', () => {
    expect(() => {
      render(<ConnectionInfo destId={'ak'} />)
    }).not.toThrow()
  })
})