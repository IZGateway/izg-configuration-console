/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import ResetCircuitBreakerDialog from './resetCircuitBreakerDialog'
import CombinedContext from '../../contexts/app'

const mockFetch = jest.fn()
global.fetch = mockFetch as any

describe('ResetCircuitBreakerDialog component', () => {
  const setAlert = jest.fn()
  const combinedContextValueMock = {
    pageSize: 0,
    setPageSize: jest.fn(),
    isChangePasswordClicked: true,
    setIsChangePasswordClicked: jest.fn(),
    clearValue: jest.fn(),
    alert: { level: '', message: '' },
    setAlert,
  }

  beforeEach(() => {
    mockFetch.mockReset()
    setAlert.mockReset()
  })

  it('renders correctly', () => {
    const handleClose = jest.fn()
    const updateRow = jest.fn()
    const { getByText, getByRole } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <ResetCircuitBreakerDialog
          open={true}
          handleClose={handleClose}
          destTypeId={1}
          destId={'test'}
          jurisdictionName="Maryland"
          destType="Production"
          row={{ destUri: 'https://mdexample.net/' }}
          updateRow={updateRow}
        />
      </CombinedContext.Provider>
    )
    expect(getByText('Reset Circuit Breaker')).toBeInTheDocument()
    expect(
      getByText(
        (_, node) =>
          node?.textContent ===
          'Are you sure you want to reset the circuit breaker for Maryland — https://mdexample.net/ (Production)? This action will restore connectivity and log the reset.'
      )
    ).toBeInTheDocument()
    expect(getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('does not call fetch when Cancel is clicked, and calls handleClose', () => {
    const handleClose = jest.fn()
    const updateRow = jest.fn()
    const { getByRole } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <ResetCircuitBreakerDialog
          open={true}
          handleClose={handleClose}
          destTypeId={1}
          destId={'test'}
          jurisdictionName="Maryland"
          destType="Production"
          row={{ destUri: 'https://mdexample.net/' }}
          updateRow={updateRow}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByRole('button', { name: 'Cancel' }))
    expect(mockFetch).not.toHaveBeenCalled()
    expect(handleClose).toHaveBeenCalled()
    expect(updateRow).not.toHaveBeenCalled()
  })

  it('resets the circuit breaker, updates the row, and shows a success alert on Confirm', async () => {
    const handleClose = jest.fn()
    const updateRow = jest.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: null, statusAt: null }),
    })

    const { getByRole } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <ResetCircuitBreakerDialog
          open={true}
          handleClose={handleClose}
          destTypeId={1}
          destId={'test'}
          jurisdictionName="Maryland"
          destType="Production"
          row={{ destUri: 'https://mdexample.net/' }}
          updateRow={updateRow}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(updateRow).toHaveBeenCalled())
    expect(mockFetch).toHaveBeenCalledWith('/api/status/reset/1/test', {
      method: 'POST',
    })
    expect(updateRow).toHaveBeenCalledWith(
      expect.objectContaining({ status: null, statusAt: null })
    )
    expect(handleClose).toHaveBeenCalled()
    expect(setAlert).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'success' })
    )
  })

  it('shows an error alert and does not update the row when the reset request fails', async () => {
    const handleClose = jest.fn()
    const updateRow = jest.fn()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })

    const { getByRole } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <ResetCircuitBreakerDialog
          open={true}
          handleClose={handleClose}
          destTypeId={1}
          destId={'test'}
          jurisdictionName="Maryland"
          destType="Production"
          row={{ destUri: 'https://mdexample.net/' }}
          updateRow={updateRow}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(setAlert).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error' })
      )
    )
    expect(updateRow).not.toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('shows an error alert and does not update the row when fetch rejects with a network error', async () => {
    const handleClose = jest.fn()
    const updateRow = jest.fn()
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    const { getByRole } = render(
      <CombinedContext.Provider value={combinedContextValueMock}>
        <ResetCircuitBreakerDialog
          open={true}
          handleClose={handleClose}
          destTypeId={1}
          destId={'test'}
          jurisdictionName="Maryland"
          destType="Production"
          row={{ destUri: 'https://mdexample.net/' }}
          updateRow={updateRow}
        />
      </CombinedContext.Provider>
    )
    fireEvent.click(getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(setAlert).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error' })
      )
    )
    expect(updateRow).not.toHaveBeenCalled()
    expect(handleClose).not.toHaveBeenCalled()
  })

  /**
   * IGDD-3599. The hub clears the breaker on every instance it runs and
   * answers 200 even when it did not reach them all, so the dialog reads
   * `resetComplete` rather than the status code.
   *
   * A reset that did not reach every instance is reported with the plain
   * failure message this dialog has always used. Manage Connections is
   * reachable by `Jurisdiction Operations`, and the detail behind a partial
   * reset is Hub topology a jurisdiction operator does not own. The per-region
   * view belongs to Admin Operations, which only `IZG Operations` can reach.
   */
  describe('a reset that did not reach every Hub instance', () => {
    const renderDialog = (handleClose: jest.Mock, updateRow: jest.Mock) =>
      render(
        <CombinedContext.Provider value={combinedContextValueMock}>
          <ResetCircuitBreakerDialog
            open={true}
            handleClose={handleClose}
            destTypeId={1}
            destId={'test'}
            jurisdictionName="Maryland"
            destType="Production"
            row={{ destUri: 'https://mdexample.net/' }}
            updateRow={updateRow}
          />
        </CombinedContext.Provider>
      )

    const respondWith = (body: Record<string, unknown>) =>
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(body) })

    it('shows the ordinary failure message, with no mention of regions', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      respondWith({ destId: 'test', status: 'Connected', resetComplete: false })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(setAlert).toHaveBeenCalled())
      const alert = setAlert.mock.calls[0][0]
      expect(alert.level).toBe('error')
      expect(alert.message).toBe(
        'Request to reset the circuit breaker for Maryland Production was not successful. Please try again later.'
      )
      expect(alert.message).not.toMatch(/region|us-east|us-west|instance/i)
      expect(alert.persistent).toBeUndefined()
    })

    it('leaves the row and the dialog alone, exactly as a failure does', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      respondWith({ destId: 'test', status: 'Connected', resetComplete: false })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(setAlert).toHaveBeenCalled())
      // The row keeps the tripped indicator rather than a status that would
      // contradict the message.
      expect(updateRow).not.toHaveBeenCalled()
      expect(handleClose).not.toHaveBeenCalled()
    })

    it('reports success and updates the row when every instance completed', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      respondWith({ destId: 'test', status: 'Connected', resetComplete: true })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(updateRow).toHaveBeenCalled())
      expect(setAlert.mock.calls[0][0].level).toBe('success')
      expect(updateRow).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Connected' })
      )
      expect(updateRow.mock.calls[0][0]).not.toHaveProperty('resetComplete')
      expect(handleClose).toHaveBeenCalled()
    })

    it('keeps the pre-IGDD-3599 success path against a hub that sends no verdict', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      respondWith({ destId: 'test', status: 'Connected' })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(setAlert).toHaveBeenCalled())
      const alert = setAlert.mock.calls[0][0]
      expect(alert.level).toBe('success')
      expect(alert.message).toContain('has been reset successfully!')
      expect(updateRow).toHaveBeenCalled()
    })
  })
})
