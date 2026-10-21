import React, { useContext } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import useSWR from 'swr'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import EditConnection from './index'
import CombinedContext, {
  AppProvider,
  CombinedContextType,
} from '../../contexts/app'

jest.mock('swr')
jest.mock('next/router', () => ({ useRouter: jest.fn() }))
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

const mockedSWR = useSWR as jest.Mock
const mockedRouter = useRouter as jest.Mock
const mockedSession = useSession as jest.Mock

const destData = {
  destId: 'ak',
  destUri: 'https://akexample.net/',
  username: 'akuser',
  facilityId: 'FAC1',
  MSH3: 'M3',
  MSH4: 'M4',
  MSH5: 'M5',
  MSH6: 'M6',
  MSH11: 'P',
  MSH22: 'M22',
  RXA11: 'R11',
  jurisdiction: { description: 'Alaska' },
  destinationType: { typeId: 5, type: 'DEV' },
}

// A non-null draft keeps NEXT enabled on IDENTIFY without editing the form, and an
// unchanged destUri keeps isDestUriAccepted from making a round trip. jiraId is null
// on a draft, which is what the confirmation poll compares against.
const draftData = {
  id: 42,
  jiraId: null,
  requestedBy: 'someone@example.com',
  scheduledAt: '2026-10-20T12:00:00.000Z',
  requested: { ...destData },
  current: { ...destData },
}

const jsonResponse = (status: number, body?: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: `status ${status}`,
  json: async () => body,
})

const SUBMIT_URL = '/api/changerequest'
const LOOKUP_URL = '/api/changerequest/5/ak'

// The POST responder and the record the lookup returns are set per test.
let submitResponder: () => Promise<unknown>
let lookupRecord: unknown

const changeRequestCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(([url]) => url === SUBMIT_URL)

const lookupCalls = () =>
  (global.fetch as jest.Mock).mock.calls.filter(([url]) => url === LOOKUP_URL)

let push: jest.Mock
let seen: CombinedContextType[]
let draft: typeof draftData

const ContextProbe = () => {
  const ctx = useContext(CombinedContext)
  seen.push(ctx)
  return null
}

const latestAlert = () => seen[seen.length - 1].alert

const Harness = () => (
  <AppProvider>
    <ContextProbe />
    <EditConnection destId="ak" destTypeId="5" />
  </AppProvider>
)

// `onIdentify` runs while the IDENTIFY step is on screen, which is the only
// place the form fields exist. A test that needs an unsaved edit must make it
// there, because seeding the draft record cannot prove that form state survived.
const renderAtScheduleStep = async (onIdentify?: () => void) => {
  render(<Harness />)
  // SERVICE AGREEMENT auto-advances because the agreement is already accepted.
  for (let step = 1; step <= 3; step++) {
    const next = await screen.findByRole('button', { name: 'NEXT' })
    await waitFor(() => expect(next).not.toBeDisabled())
    if (step === 2 && onIdentify) onIdentify()
    fireEvent.click(next)
  }
  fireEvent.click(await screen.findByLabelText('As Soon As Possible'))
  return screen.findByRole('button', { name: 'SCHEDULE' })
}

// Runs the confirmation poll forward. 95 seconds clears the 90 second bound.
const runConfirmWindow = async (ms = 95000) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms)
  })
}

describe('EditConnection change request submission (IGDD-3566)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    sessionStorage.setItem('authorization-agreement-accepted', 'true')
    seen = []
    draft = { ...draftData }
    lookupRecord = null
    submitResponder = () => Promise.resolve(jsonResponse(200, 'ok'))
    push = jest.fn()
    mockedRouter.mockReturnValue({
      push,
      query: {},
      events: { on: jest.fn(), off: jest.fn() },
    })
    mockedSession.mockReturnValue({
      data: { user: { email: 'tester@example.com' } },
    })
    mockedSWR.mockImplementation((key: string) => {
      if (typeof key === 'string' && key.startsWith('/api/destinations/')) {
        return { data: destData, error: undefined, isLoading: false }
      }
      if (typeof key === 'string' && key.startsWith('/api/changerequest/')) {
        return {
          data: draft,
          error: undefined,
          isLoading: false,
          mutate: jest.fn(),
        }
      }
      return {
        data: undefined,
        error: undefined,
        isLoading: false,
        mutate: jest.fn(),
      }
    })
    global.fetch = jest.fn((url: string) => {
      if (url === SUBMIT_URL) {
        return submitResponder()
      }
      if (url === LOOKUP_URL) {
        return Promise.resolve(jsonResponse(200, lookupRecord))
      }
      return Promise.resolve(jsonResponse(200, {}))
    }) as jest.Mock
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('one submission at a time', () => {
    it('sends one submission when SCHEDULE is activated twice before React re-renders', async () => {
      submitResponder = () => new Promise(() => undefined)
      const schedule = await renderAtScheduleStep()

      // Both clicks are dispatched inside one act, so React cannot commit the
      // disabled attribute between them. Both handlers run, which means only the
      // synchronous ref can stop the second submission. Three fireEvent.click
      // calls would not prove this: the first commit disables the button, and a
      // disabled button dispatches no onClick.
      await act(async () => {
        schedule.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        schedule.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(changeRequestCalls()).toHaveLength(1)
    })

    it('disables the button after the first activation', async () => {
      submitResponder = () => new Promise(() => undefined)
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      fireEvent.click(schedule)

      // Only the disabled state is load-bearing here. A one-POST assertion would
      // pass with the ref guard deleted, because React dispatches no click to a
      // disabled button. The ref is proved by the test above instead.
      expect(
        await screen.findByRole('button', { name: /SCHEDULING/i })
      ).toBeDisabled()
    })

    it('sends a new submission after an earlier one ends', async () => {
      submitResponder = () =>
        Promise.resolve(jsonResponse(400, { error: 'bad destination URL' }))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await waitFor(() => expect(changeRequestCalls()).toHaveLength(1))

      const again = await screen.findByRole('button', { name: 'SCHEDULE' })
      await waitFor(() => expect(again).not.toBeDisabled())
      fireEvent.click(again)

      await waitFor(() => expect(changeRequestCalls()).toHaveLength(2))
    })

    it('sends nothing when SCHEDULE is activated while the console confirms', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      const checking = await screen.findByRole('button', {
        name: /CHECKING/i,
      })

      fireEvent.click(checking)
      fireEvent.click(checking)

      expect(changeRequestCalls()).toHaveLength(1)
      await runConfirmWindow()
    })
  })

  describe('visible progress', () => {
    it('shows the pending state while the submission is in flight', async () => {
      submitResponder = () => new Promise(() => undefined)
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      const pending = await screen.findByRole('button', { name: /SCHEDULING/i })
      expect(pending).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'SCHEDULE' })).toBeNull()
    })

    it('shows a distinct state while it confirms the outcome', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      const checking = await screen.findByRole('button', { name: /CHECKING/i })
      expect(checking).toBeDisabled()
      expect(screen.queryByRole('button', { name: /SCHEDULING/i })).toBeNull()
      await runConfirmWindow()
    })
  })

  describe('every outcome produces a visible message', () => {
    it('reports success with the jurisdiction and the environment', async () => {
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() => expect(latestAlert().level).toBe('success'))
      expect(latestAlert().message).toContain('Alaska')
      expect(latestAlert().message).toContain('DEV')
      // Both success paths open the snackbar, so the message renders here. The
      // router is mocked, so this proves EditConnection renders it, not that it
      // survives the real navigation to /manageconnections. That hand-off is not
      // covered by this suite.
      expect(
        await screen.findByText(/created successfully for Alaska/i)
      ).toBeInTheDocument()
      expect(push).toHaveBeenCalledWith('/manageconnections')
    })

    it('reports the reason the server gave for a rejection', async () => {
      submitResponder = () =>
        Promise.resolve(jsonResponse(400, { error: 'bad destination URL' }))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      expect(await screen.findByText('bad destination URL')).toBeInTheDocument()
    })

    it('reports a visible message when the server fails and cannot say what happened', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(500))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      expect(latestAlert().level).toBe('warning')
      expect(latestAlert().message).toMatch(/may have been an issue/i)
    })

    it('reports a visible message when the browser cannot reach the server', async () => {
      submitResponder = () => Promise.reject(new Error('network down'))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      expect(latestAlert().level).toBe('warning')
      expect(latestAlert().message).toMatch(/may have been an issue/i)
    })
  })

  describe('a refusal is not reported as an unknown outcome', () => {
    it('reports a definite failure when the route refuses the request', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(403))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() => expect(latestAlert().level).toBe('error'))
      const message = latestAlert().message
      expect(message).toMatch(/try again/i)
      // A refusal is certain, so it must not read as an unknown outcome.
      expect(message).not.toMatch(/may have been an issue/i)
      expect(message).not.toMatch(/Manage Connections/i)
      expect(lookupCalls()).toHaveLength(0)
    })

    it('treats an expired session the same way', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(401))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() => expect(latestAlert().level).toBe('error'))
      expect(latestAlert().message).toMatch(/try again/i)
      expect(latestAlert().message).not.toMatch(/may have been an issue/i)
    })
  })

  describe('a failure before the request is sent', () => {
    it('reports that nothing was created and says nothing about the server', async () => {
      // No session means session.user.email throws while the body is built, which
      // happens outside submitChangeRequest's try, so the backstop handles it.
      mockedSession.mockReturnValue({ data: null })
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() => expect(latestAlert().level).toBe('error'))
      const message = latestAlert().message
      expect(message).toMatch(/nothing was created/i)
      expect(message).toMatch(/try again/i)
      expect(message).not.toMatch(/server/i)
      expect(message).not.toMatch(/may have been an issue/i)
      // Nothing was sent, and nothing was looked up.
      expect(changeRequestCalls()).toHaveLength(0)
      expect(lookupCalls()).toHaveLength(0)
    })
  })

  describe('a confirmed failure is reported at once', () => {
    it('reports the failure with no wait when the route says nothing was created', async () => {
      submitResponder = () =>
        Promise.resolve(jsonResponse(502, { ticketCreated: false }))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() => expect(latestAlert().level).toBe('error'))
      expect(latestAlert().message).toMatch(/nothing was created/i)
      expect(latestAlert().message).toMatch(/try again/i)
      // No record lookup, and no confirming state.
      expect(lookupCalls()).toHaveLength(0)
      expect(screen.queryByRole('button', { name: /CHECKING/i })).toBeNull()
      expect(push).not.toHaveBeenCalled()
    })

    it('reports at once when the route says the ticket exists but was not recorded', async () => {
      // The route answers ticketCreated true only when the throw came after the
      // ticket was raised, so the record never got the new jiraId. Polling for it
      // would be futile, and "may have been an issue" would be too vague.
      submitResponder = () =>
        Promise.resolve(jsonResponse(500, { ticketCreated: true }))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() => expect(latestAlert().level).toBe('warning'))
      const message = latestAlert().message
      expect(message).toMatch(/may have been an issue/i)
      expect(message).toMatch(/Manage Connections/i)
      // A ticket already exists on this path, so the message must never invite a
      // retry. That is the floor the spec keeps after the explicit warning went.
      expect(message).not.toMatch(/try again/i)
      expect(latestAlert().persistent).toBe(true)
      // No lookup and no confirming state: the answer was already definite.
      expect(lookupCalls()).toHaveLength(0)
      expect(screen.queryByRole('button', { name: /CHECKING/i })).toBeNull()
      expect(push).not.toHaveBeenCalled()
    })

    it('still confirms when the failure body does not parse', async () => {
      submitResponder = () =>
        Promise.resolve({
          ok: false,
          status: 504,
          statusText: 'Gateway Timeout',
          json: async () => {
            throw new Error('not json')
          },
        })
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await screen.findByRole('button', { name: /CHECKING/i })
      await runConfirmWindow()

      expect(lookupCalls().length).toBeGreaterThan(1)
      expect(latestAlert().level).toBe('warning')
    })
  })

  describe('the console confirms the outcome of a slow submission', () => {
    it('reports a confirmed success when the record gains a ticket', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await screen.findByRole('button', { name: /CHECKING/i })

      lookupRecord = { jiraId: 'FAKE-7' }
      await runConfirmWindow(4000)

      expect(latestAlert().level).toBe('success')
      expect(latestAlert().message).toMatch(/was created/i)
      // The Jira key is internal and must not reach the user.
      expect(latestAlert().message).not.toContain('FAKE-7')
      expect(push).toHaveBeenCalledWith('/manageconnections')
    })

    it('does not read a change request that already existed as a success', async () => {
      // The user reached the form with a ticket already on the record.
      draft = { ...draftData, jiraId: 'FAKE-1' }
      lookupRecord = { jiraId: 'FAKE-1' }
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      expect(latestAlert().level).toBe('warning')
      expect(latestAlert().message).toMatch(/may have been an issue/i)
      expect(push).not.toHaveBeenCalled()
    })

    it('reports an uncertain outcome when the record never gains a ticket', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      expect(lookupCalls().length).toBeGreaterThan(1)
      expect(latestAlert().level).toBe('warning')
      expect(latestAlert().message).toMatch(/may have been an issue/i)
      expect(latestAlert().message).not.toMatch(/\bfailed\b/i)
      // Carried on the alert, so the guarantee holds on whichever screen shows it.
      expect(latestAlert().persistent).toBe(true)
    })
  })

  describe('the uncertain-outcome message waits for a dismissal', () => {
    it('stays past the auto-hide window and clears when dismissed', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      const message = await screen.findByText(/may have been an issue/i)
      await act(async () => {
        await jest.advanceTimersByTimeAsync(30000)
      })
      expect(message).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /close/i }))
      await waitFor(() =>
        expect(screen.queryByText(/may have been an issue/i)).toBeNull()
      )
    })

    it('lets a rejection message clear on its own', async () => {
      submitResponder = () =>
        Promise.resolve(jsonResponse(400, { error: 'bad destination URL' }))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await screen.findByText('bad destination URL')

      await act(async () => {
        await jest.advanceTimersByTimeAsync(7000)
      })

      await waitFor(() =>
        expect(screen.queryByText('bad destination URL')).toBeNull()
      )
    })
  })

  describe('the entered values survive a failed submission', () => {
    it('keeps the user on the Schedule step after an unconfirmed 5xx', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      expect(
        await screen.findByRole('button', { name: 'SCHEDULE' })
      ).toBeInTheDocument()
      expect(push).not.toHaveBeenCalled()
    })

    it('keeps the entered values available for a retry', async () => {
      // The value is typed into the form and never written to the draft record.
      // Seeding the record instead would prove nothing: the form initialises from
      // the record, so a regression that refilled the form from the record after
      // a failure would still find the value and the test would still pass.
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep(() => {
        fireEvent.change(screen.getByLabelText('Username'), {
          target: { value: 'typed-by-user' },
        })
      })

      fireEvent.click(schedule)
      await runConfirmWindow()

      // The schedule choice survived, so SCHEDULE is live again.
      const again = await screen.findByRole('button', { name: 'SCHEDULE' })
      await waitFor(() => expect(again).not.toBeDisabled())

      // Step back to VERIFY, which lists what is about to be submitted.
      fireEvent.click(screen.getByRole('button', { name: 'PREVIOUS' }))
      expect(await screen.findByText('typed-by-user')).toBeInTheDocument()
      // The record never held this value, so the value on screen can only have
      // come from the form state that the submission failure left alone.
      expect(draft.requested.username).not.toBe('typed-by-user')
      expect(destData.username).not.toBe('typed-by-user')
    })

    it('returns to the connection list after success', async () => {
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)

      await waitFor(() =>
        expect(push).toHaveBeenCalledWith('/manageconnections')
      )
    })
  })

  describe('the console stays responsive after a failed submission', () => {
    it('accepts another action and does not re-render without end', async () => {
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()
      expect(latestAlert().level).toBe('warning')

      const rendersAfterError = seen.length
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50)
      })
      // The old loop pushed past React's 50-update cap within a tick.
      expect(seen.length - rendersAfterError).toBeLessThan(10)

      const again = await screen.findByRole('button', { name: 'SCHEDULE' })
      await waitFor(() => expect(again).not.toBeDisabled())
      fireEvent.click(again)
      await waitFor(() => expect(changeRequestCalls()).toHaveLength(2))
    })
  })

  describe('the bounded wait cannot be held open or undone', () => {
    it('bounds every record lookup so a stalled read cannot hold the wait open', async () => {
      // The loop tests its deadline between iterations only. A lookup with no
      // limit of its own can stall for ever while reading headers or the body,
      // and then the deadline is never tested again: the uncertain-outcome
      // message never appears and SCHEDULE stays disabled until a page reload.
      submitResponder = () => Promise.resolve(jsonResponse(504))
      const schedule = await renderAtScheduleStep()

      fireEvent.click(schedule)
      await runConfirmWindow()

      expect(lookupCalls().length).toBeGreaterThan(0)
      lookupCalls().forEach(([, options]) => {
        expect(options?.signal).toBeInstanceOf(AbortSignal)
      })
    })

    it('refuses a draft save while the outcome is still unsettled', async () => {
      // A draft write sends jiraId: null for this destination, and the record is
      // keyed by destination, so it overwrites whatever the submission wrote. If
      // the server stores its ticket first, that write unlinks a live ticket and
      // leaves it untracked. resetDraftValues carries the same guard, and it
      // deletes the record outright.
      submitResponder = () => Promise.resolve(jsonResponse(504))
      // The form must be edited, or the save control is disabled and the click
      // does nothing. A test that passed on a disabled button would prove only
      // that nothing happened, which is what it claims to be testing.
      const schedule = await renderAtScheduleStep(() => {
        fireEvent.change(screen.getByLabelText('Username'), {
          target: { value: 'typed-by-user' },
        })
      })

      fireEvent.click(schedule)
      // Part way into the wait, not past it. The outcome is still unsettled.
      await runConfirmWindow(6000)

      // Back to IDENTIFY, the only step that shows the save control.
      fireEvent.click(screen.getByRole('button', { name: 'PREVIOUS' }))
      fireEvent.click(await screen.findByRole('button', { name: 'PREVIOUS' }))
      const save = await screen.findByRole('button', { name: 'save' })
      expect(save).toBeEnabled()
      fireEvent.click(save)

      // Asserted without waitFor. The guard runs before saveDraft's first await,
      // so the alert is already rendered. waitFor would advance the fake clock
      // past the snackbar's 6 second auto-hide, and handleCloseSnackBar would
      // clear the very alert being asserted.
      expect(latestAlert().level).toBe('warning')
      expect(latestAlert().message).toMatch(/still being submitted/i)

      const draftWrites = changeRequestCalls().filter(([, options]) => {
        try {
          return JSON.parse(options?.body)?.isDraft === true
        } catch {
          return false
        }
      })
      expect(draftWrites).toHaveLength(0)
    })
  })
})
