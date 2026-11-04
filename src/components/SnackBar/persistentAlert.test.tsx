import fs from 'fs'
import path from 'path'
import React, { useContext, useEffect, useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CombinedContext, { AppProvider } from '../../contexts/app'
import CustomSnackbar from './index'

/**
 * IGDD-3566: the shared alert lives above the page, so a message raised on one
 * screen can surface on another. The unknown-outcome message must wait for a
 * dismissal wherever it lands, so it carries `persistent` and every screen that
 * renders the shared alert reads it.
 *
 * These harnesses mirror the snackbar wiring of the two screens that render the
 * shared alert besides EditConnection: manageconnections/index.tsx:26-28,47-52
 * and AccessControl/index.tsx:51,281,663-667. Both open the snackbar from the
 * alert level and pass the same four props plus autoHideDuration.
 */
const ScreenHarness = () => {
  const { alert, setAlert } = useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    setShowSnackbar(!!alert.level)
  }, [alert])

  const handleClose = () => {
    setShowSnackbar(false)
    setAlert({ level: '', message: '' })
  }

  return (
    <>
      <button onClick={() => setAlert({ level: 'success', message: 'saved' })}>
        raise fading
      </button>
      <button
        onClick={() =>
          setAlert({
            level: 'warning',
            message: 'may have been an issue',
            persistent: true,
          })
        }
      >
        raise persistent
      </button>
      <CustomSnackbar
        open={showSnackbar}
        severity={alert.level}
        message={alert.message}
        onClose={handleClose}
        autoHideDuration={alert.persistent ? null : undefined}
      />
    </>
  )
}

describe('a persistent alert on a screen other than EditConnection', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('waits for a dismissal rather than fading', async () => {
    render(
      <AppProvider>
        <ScreenHarness />
      </AppProvider>
    )

    fireEvent.click(screen.getByText('raise persistent'))
    const message = await screen.findByText('may have been an issue')

    await act(async () => {
      await jest.advanceTimersByTimeAsync(30000)
    })
    expect(message).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByText('may have been an issue')).toBeNull()
  })

  it('lets an ordinary alert fade on the same screen', async () => {
    render(
      <AppProvider>
        <ScreenHarness />
      </AppProvider>
    )

    fireEvent.click(screen.getByText('raise fading'))
    expect(await screen.findByText('saved')).toBeInTheDocument()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(7000)
    })
    expect(screen.queryByText('saved')).toBeNull()
  })
})

/**
 * The harness above proves the behavior but mirrors the screens rather than
 * mounting them, so it would still pass if a screen stopped passing the prop.
 * This reads the real call sites instead. It is a wiring check, not a behavior
 * test, and it is here so that removing the prop fails the suite.
 */
describe('every screen that renders the shared alert honours persistence', () => {
  const callSites = [
    'src/pages/manageconnections/index.tsx',
    'src/components/AccessControl/index.tsx',
    'src/components/EditConnection/index.tsx',
  ]

  it.each(callSites)('%s passes autoHideDuration from the alert', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    expect(source).toContain('severity={alert.level}')
    expect(source).toContain(
      'autoHideDuration={alert.persistent ? null : undefined}'
    )
  })
})
