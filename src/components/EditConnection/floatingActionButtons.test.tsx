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
        canRunDraftConnectionTest
        canSaveDraft
        canResetDraft
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
        canRunDraftConnectionTest
        canSaveDraft
        canResetDraft
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
        canRunDraftConnectionTest
        canSaveDraft
        canResetDraft
      />
    )
    expect(screen.getByLabelText('test')).toBeDisabled()
    expect(screen.getByLabelText('save')).toBeDisabled()
    expect(screen.getByLabelText('reset')).toBeDisabled()
  })

  // protect-connection-pages-and-endpoints (IGDD-3545): each Fab is gated on
  // its own capability, independently of the others.
  it('renders no Fab for a capability the caller does not hold', () => {
    render(
      <FloatingActionButtons
        toggleTestDrawer={jest.fn()}
        isFormChanged={true}
        saveDraft={jest.fn()}
        isResetButtonDisabled={false}
        resetDraft={jest.fn()}
        canRunDraftConnectionTest={false}
        canSaveDraft={false}
        canResetDraft={false}
      />
    )
    expect(screen.queryByLabelText('test')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('save')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('reset')).not.toBeInTheDocument()
  })

  it('renders only the Fab whose capability is held', () => {
    render(
      <FloatingActionButtons
        toggleTestDrawer={jest.fn()}
        isFormChanged={true}
        saveDraft={jest.fn()}
        isResetButtonDisabled={false}
        resetDraft={jest.fn()}
        canSaveDraft
      />
    )
    expect(screen.getByLabelText('save')).toBeInTheDocument()
    expect(screen.queryByLabelText('test')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('reset')).not.toBeInTheDocument()
  })
})
