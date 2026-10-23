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
   * IGDD-3599. The hub resets the breaker on every instance it runs and
   * reports a status per region. It answers 200 even when one region did not
   * complete, so the dialog must read `regions` rather than the status code.
   */
  describe('per-region outcome', () => {
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

    it('reports a partial reset, names the region, and keeps the message on screen', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            destId: 'test',
            status: 'Connected',
            regions: { 'us-east-1': 'complete', 'us-west-1': 'partial' },
          }),
      })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(setAlert).toHaveBeenCalled())
      const alert = setAlert.mock.calls[0][0]
      expect(alert.level).toBe('warning')
      expect(alert.message).toContain('us-west-1')
      expect(alert.message).not.toContain('successfully')
      expect(alert.persistent).toBe(true)
    })

    it('does not write the regions block into the table row', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            destId: 'test',
            status: 'Connected',
            regions: { 'us-east-1': 'complete', 'us-west-1': 'partial' },
          }),
      })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(updateRow).toHaveBeenCalled())
      // The status still updates: it describes the instance that answered.
      expect(updateRow).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Connected' })
      )
      expect(updateRow.mock.calls[0][0]).not.toHaveProperty('regions')
    })

    it('reports an error when every region failed', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            destId: 'test',
            status: 'Circuit Breaker Thrown',
            regions: { 'us-east-1': 'failed', 'us-west-1': 'failed' },
          }),
      })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(setAlert).toHaveBeenCalled())
      expect(setAlert.mock.calls[0][0].level).toBe('error')
      expect(setAlert.mock.calls[0][0].persistent).toBe(true)
    })

    it('keeps the pre-IGDD-3599 success message against a hub that sends no regions', async () => {
      const handleClose = jest.fn()
      const updateRow = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ destId: 'test', status: 'Connected' }),
      })

      const { getByRole } = renderDialog(handleClose, updateRow)
      fireEvent.click(getByRole('button', { name: 'Confirm' }))

      await waitFor(() => expect(setAlert).toHaveBeenCalled())
      const alert = setAlert.mock.calls[0][0]
      expect(alert.level).toBe('success')
      expect(alert.message).toContain('has been reset successfully!')
      expect(alert.persistent).toBeUndefined()
    })
  })
})
