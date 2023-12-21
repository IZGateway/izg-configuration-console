import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TestDrawer from './testDrawer'

describe('TestDrawer component', () => {
  const onCloseMock = jest.fn()
  it('renders correctly with loading skeleton', () => {
    const testResults = null // Set your test results accordingly
    const isLoading = true

    render(
      <TestDrawer
        open={true}
        onClose={onCloseMock}
        isLoading={isLoading}
        testResults={testResults}
      />
    )
    expect(
      screen.getByText('Run health check with the new edits')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Some text needed for this section')
    ).toBeInTheDocument()
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('renders correctly with test results', () => {
    const testResults = [
      {
        name: 'Test 1',
        order: 1,
        message: '',
        detail: '',
        status: 'PASS',
      },
      {
        name: 'Test 2',
        order: 2,
        message: '',
        detail: null,
        status: 'FAIL',
      },
    ]
    const isLoading = false

    render(
      <TestDrawer
        open={true}
        onClose={onCloseMock}
        isLoading={isLoading}
        testResults={testResults}
      />
    )
    expect(screen.getByText('Test 1')).toBeInTheDocument()
  })

  it('calls onClose when CLOSE button is clicked', () => {
    const onCloseMock = jest.fn()
    const testResults = [
      {
        name: 'Test 1',
        order: 1,
        message: '',
        detail: '',
        status: 'PASS',
      },
      {
        name: 'Test 2',
        order: 2,
        message: '',
        detail: null,
        status: 'FAIL',
      },
    ]
    const isLoading = false

    render(
      <TestDrawer
        open={true}
        onClose={onCloseMock}
        isLoading={isLoading}
        testResults={testResults}
      />
    )
    fireEvent.click(screen.getByTestId('close'))
    expect(onCloseMock).toHaveBeenCalled()
  })
})
