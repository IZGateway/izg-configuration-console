import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import FloatingActionButtons from './floatingActionButtons'

describe('FloatingActionButtons', () => {
  it('renders the component correctly', () => {
    const mockToggleTestDrawer = jest.fn()
    const mockSaveDraft = jest.fn()
    const mockResetDraft = jest.fn()

    render(
      <FloatingActionButtons
        toggleTestDrawer={mockToggleTestDrawer}
        isFormChanged={true}
        saveDraft={mockSaveDraft}
        isResetButtonDisabled={false}
        resetDraft={mockResetDraft}
      />
    )
    expect(screen.getByLabelText('test')).toBeInTheDocument()
    expect(screen.getByLabelText('save')).toBeInTheDocument()
    expect(screen.getByLabelText('reset')).toBeInTheDocument()
  })

  it('calls the correct functions when buttons are clicked', () => {
    const mockToggleTestDrawer = jest.fn()
    const mockSaveDraft = jest.fn()
    const mockResetDraft = jest.fn()

    render(
      <FloatingActionButtons
        toggleTestDrawer={mockToggleTestDrawer}
        isFormChanged={true}
        saveDraft={mockSaveDraft}
        isResetButtonDisabled={false}
        resetDraft={mockResetDraft}
      />
    )
    fireEvent.click(screen.getByLabelText('test'))
    expect(mockToggleTestDrawer).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByLabelText('save'))
    expect(mockSaveDraft).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when isFormChanged is false or isResetButtonDisabled is true', () => {
    const mockToggleTestDrawer = jest.fn()
    const mockSaveDraft = jest.fn()
    const mockResetDraft = jest.fn()

    render(
      <FloatingActionButtons
        toggleTestDrawer={mockToggleTestDrawer}
        isFormChanged={false}
        saveDraft={mockSaveDraft}
        isResetButtonDisabled={true}
        resetDraft={mockResetDraft}
      />
    )
    expect(screen.getByLabelText('test')).toBeDisabled()
    expect(screen.getByLabelText('save')).toBeDisabled()
    expect(screen.getByLabelText('reset')).toBeDisabled()
  })
})
