import { useContext, useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CombinedContext, { AppProvider, CombinedContextType } from './app'

/**
 * IGDD-3566: the provider used to rebuild its value object and its setAlert
 * wrapper on every render. Any consumer effect that listed setAlert as a
 * dependency and called it looped without end. These tests pin the identities
 * that stop that loop.
 */

const renders: CombinedContextType[] = []

const Consumer = () => {
  const ctx = useContext(CombinedContext)
  renders.push(ctx)
  return <span data-testid="render-count">{renders.length}</span>
}

// Forces a re-render of AppProvider's subtree without touching provider state.
const Rerenderer = ({ children }) => {
  const [tick, setTick] = useState(0)
  return (
    <>
      <button onClick={() => setTick(tick + 1)}>rerender</button>
      <span data-testid="tick">{tick}</span>
      {children}
    </>
  )
}

describe('AppProvider context identity', () => {
  beforeEach(() => {
    renders.length = 0
  })

  it('keeps the context value identity across a re-render that changes no state', () => {
    const { rerender } = render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    )

    rerender(
      <AppProvider>
        <Consumer />
      </AppProvider>
    )

    expect(renders.length).toBeGreaterThanOrEqual(2)
    expect(renders[renders.length - 1]).toBe(renders[0])
  })

  it('keeps setAlert and clearValue stable across a parent re-render', () => {
    render(
      <Rerenderer>
        <AppProvider>
          <Consumer />
        </AppProvider>
      </Rerenderer>
    )

    const first = renders[0]
    fireEvent.click(screen.getByText('rerender'))

    const last = renders[renders.length - 1]
    expect(screen.getByTestId('tick').textContent).toBe('1')
    expect(last.setAlert).toBe(first.setAlert)
    expect(last.clearValue).toBe(first.clearValue)
    expect(last.setPageSize).toBe(first.setPageSize)
  })

  it('produces a new context value when alert changes', () => {
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    )

    const before = renders[renders.length - 1]

    act(() => {
      before.setAlert({ level: 'error', message: 'boom' })
    })

    const after = renders[renders.length - 1]
    expect(after).not.toBe(before)
    expect(after.alert).toEqual({ level: 'error', message: 'boom' })
    expect(after.setAlert).toBe(before.setAlert)
  })
})
