import * as React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CircuitBreakerCard from './CircuitBreakerCard'
import type { HubEnvironment } from '../../lib/utils/izghubenvironments'

/**
 * IGDD-3599: the card reads the hub's per-region block, never the HTTP status.
 * The hub answers 200 even when one region did not fully reset.
 */

const PRODUCTION: HubEnvironment = {
  destinationTypeId: 1,
  destinationType: 'PRODUCTION',
  label: 'Production',
}

const respondWith = (
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}
) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch
}

const resetAndConfirm = async (onResult: jest.Mock) => {
  render(<CircuitBreakerCard environments={[PRODUCTION]} onResult={onResult} />)
  fireEvent.click(screen.getByRole('button', { name: /Reset Production/i }))
  fireEvent.click(screen.getByRole('button', { name: /^Confirm$/i }))
  await waitFor(() => expect(onResult).toHaveBeenCalled())
  return onResult.mock.calls[0][0]
}

describe('CircuitBreakerCard region reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reports success and lists both regions when every region completed', async () => {
    respondWith({
      success: true,
      result: {
        attempted: 1,
        succeeded: 1,
        failed: 0,
        regions: { 'us-east-1': 'complete', 'us-west-1': 'complete' },
      },
    })
    const onResult = jest.fn()

    const result = await resetAndConfirm(onResult)

    expect(result.level).toBe('success')
    expect(result.persistent).toBeUndefined()
    await screen.findByTestId('circuit-breaker-region-outcome')
    expect(screen.getByText(/us-east-1/)).toBeInTheDocument()
    expect(screen.getByText(/us-west-1/)).toBeInTheDocument()
  })

  it('reports a warning that names the region when one region is partial', async () => {
    respondWith({
      success: false,
      result: {
        attempted: 1,
        succeeded: 1,
        failed: 0,
        regions: { 'us-east-1': 'complete', 'us-west-1': 'partial' },
      },
    })
    const onResult = jest.fn()

    const result = await resetAndConfirm(onResult)

    expect(result.level).toBe('warning')
    expect(result.message).toContain('us-west-1')
    expect(result.message).not.toMatch(/were reset\.$/)
    // The operator must dismiss a partial result rather than watch it fade.
    expect(result.persistent).toBe(true)
  })

  it('reports an error when every region failed', async () => {
    respondWith({
      success: false,
      result: {
        attempted: 1,
        succeeded: 1,
        failed: 0,
        regions: { 'us-east-1': 'failed', 'us-west-1': 'failed' },
      },
    })
    const onResult = jest.fn()

    const result = await resetAndConfirm(onResult)

    expect(result.level).toBe('error')
    expect(result.persistent).toBe(true)
  })

  // Fail closed: a word added by a later hub release must not read as success.
  it('does not report success for an unrecognised status word', async () => {
    respondWith({
      success: false,
      result: {
        attempted: 1,
        succeeded: 1,
        failed: 0,
        regions: { 'us-east-1': 'draining' },
      },
    })
    const onResult = jest.fn()

    const result = await resetAndConfirm(onResult)

    expect(result.level).toBe('warning')
    expect(screen.getByText('draining')).toBeInTheDocument()
  })

  describe('against a hub that sends no regions block', () => {
    it('reports success from the HTTP status, as it did before IGDD-3599', async () => {
      respondWith({
        success: true,
        result: { attempted: 1, succeeded: 1, failed: 0 },
      })
      const onResult = jest.fn()

      const result = await resetAndConfirm(onResult)

      expect(result.level).toBe('success')
      expect(result.message).toBe('Production circuit breakers were reset.')
      expect(
        screen.queryByTestId('circuit-breaker-region-outcome')
      ).not.toBeInTheDocument()
    })

    it('reports an error from a failed HTTP status', async () => {
      respondWith(
        { success: false, error: 'Hub unreachable.' },
        { ok: false, status: 502 }
      )
      const onResult = jest.fn()

      const result = await resetAndConfirm(onResult)

      expect(result.level).toBe('error')
      expect(result.message).toContain('Hub unreachable.')
    })
  })

  it('reports an error when the request itself throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network')) as unknown as typeof fetch
    const onResult = jest.fn()

    const result = await resetAndConfirm(onResult)

    expect(result.level).toBe('error')
    expect(
      screen.queryByTestId('circuit-breaker-region-outcome')
    ).not.toBeInTheDocument()
  })
})
