import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ResetDialog from './resetDialog'

describe('ResetDialog', () => {
  it('renders the dialog with correct content', () => {
    const open = true
    const handleClose = jest.fn()
    const resetDraft = jest.fn()

    render(
      <ResetDialog
        open={open}
        handleClose={handleClose}
        resetDraft={resetDraft}
      />
    )
    expect(
      screen.getByText(
        'Are you sure you want to revert to production values and lost this draft?'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'All data fields will be reset to their orginial values once you have confirmed. Please be sure you want to take this action.'
      )
    ).toBeInTheDocument()
  })

  it('calls the handleClose function when "No" button is clicked', () => {
    const open = true
    const handleClose = jest.fn()
    const resetDraft = jest.fn()

    render(
      <ResetDialog
        open={open}
        handleClose={handleClose}
        resetDraft={resetDraft}
      />
    )
    fireEvent.click(screen.getByText('No'))
    expect(handleClose).toHaveBeenCalledTimes(1)
    expect(resetDraft).not.toHaveBeenCalled()
  })

  it('calls the resetDraft function when "Yes" button is clicked', () => {
    const open = true
    const handleClose = jest.fn()
    const resetDraft = jest.fn()

    render(
      <ResetDialog
        open={open}
        handleClose={handleClose}
        resetDraft={resetDraft}
      />
    )
    fireEvent.click(screen.getByText('Yes'))
    expect(resetDraft).toHaveBeenCalledTimes(1)
    expect(handleClose).not.toHaveBeenCalled()
  })
})
