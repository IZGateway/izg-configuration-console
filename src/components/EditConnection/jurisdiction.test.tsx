import React from 'react'
import { render } from '@testing-library/react'
import Jurisdiction from './jurisdiction'

describe('Jurisdiction component', () => {
  it('renders without throwing any errors', () => {
    expect(() => {
      render(
        <Jurisdiction
          jurisdictionName={'Test Jurisdiction'}
          destType={'TEST'}
        />
      )
    }).not.toThrow()
  })
})
