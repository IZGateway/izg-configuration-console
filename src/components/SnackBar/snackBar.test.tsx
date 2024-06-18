import React from 'react'
import { render, screen } from '@testing-library/react'
import CustomSnackbar from './index'

describe('CustomSnackbar component', () => {
  test('it renders with default message', () => {
    const onCloseMock = jest.fn()
    render(
      <CustomSnackbar
        open={true}
        severity="info"
        message=""
        onClose={onCloseMock}
      />
    )
    const snackbarElement = screen.getByText('This is a info message!')
    expect(snackbarElement).toBeInTheDocument()
  })

  test('it renders with custom message', () => {
    const onCloseMock = jest.fn()
    render(
      <CustomSnackbar
        open={true}
        severity="error"
        message="Custom error message"
        onClose={onCloseMock}
      />
    )
    const snackbarElement = screen.getByText('Custom error message')
    expect(snackbarElement).toBeInTheDocument()
  })
})
