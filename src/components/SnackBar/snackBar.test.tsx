import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CustomSnackbar from './index'

describe('CustomSnackbar component', () => {
  test('it renders with default message', () => {
    render(<CustomSnackbar severity="info" message="" />)
    const snackbarElement = screen.getByText('This is a info message!')
    expect(snackbarElement).toBeInTheDocument()
  })

  test('it renders with custom message', () => {
    render(<CustomSnackbar severity="error" message="Custom error message" />)
    const snackbarElement = screen.getByText('Custom error message')
    expect(snackbarElement).toBeInTheDocument()
  })
})
