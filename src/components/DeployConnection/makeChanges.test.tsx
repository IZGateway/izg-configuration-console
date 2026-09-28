import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import MakeChanges from './makeChanges'

jest.mock('./reScheduleDialog', () => jest.fn().mockReturnValue(null))
jest.mock('./cancelRequestDialog', () => jest.fn().mockReturnValue(null))

// NOTE: this suite is jsdom and does not run today — every jsdom suite fails
// at startup on `virtualConsole.sendTo is not a function`, from the jsdom@28
// override. Kept compiling and correct so it covers the gating below the
// moment that is fixed; until then the button visibility is verified by the
// manual per-role walkthrough.
describe('MakeChanges', () => {
  const changeRequest = {
    createdBy: 'System',
    createdOn: new Date(),
    updatedBy: 'System',
    updatedOn: new Date(),
    id: 0,
    destType: undefined,
    jiraId: '',
    requestedAt: undefined,
    requestedBy: '',
    isDraft: false,
    requested: undefined,
    destId: 'sampleDestId',
    destTypeId: 'sampleDestTypeId',
  }

  const renderWith = (
    canRescheduleRequest: boolean,
    canCancelRequest: boolean
  ) =>
    render(
      <MakeChanges
        {...changeRequest}
        canRescheduleRequest={canRescheduleRequest}
        canCancelRequest={canCancelRequest}
      />
    )

  it('renders component properly', () => {
    const { getByText } = renderWith(true, true)
    expect(getByText('Need to make changes?')).toBeInTheDocument()
  })

  // Reschedule and Cancel are separate capabilities and separate rows in the
  // target matrix. Holding one must not surface the other, because the API
  // routes behind them enforce different flags.
  //
  // One case per `it`, deliberately: RTL binds its queries to document.body,
  // so two renders in a single test would see each other's buttons and every
  // assertion would pass regardless.
  it('shows both actions when both capabilities are held', () => {
    const { queryByText } = renderWith(true, true)
    expect(queryByText('Reschedule')).toBeInTheDocument()
    expect(queryByText('CANCEL REQUEST')).toBeInTheDocument()
  })

  it('hides Cancel when only reschedule is held', () => {
    const { queryByText } = renderWith(true, false)
    expect(queryByText('Reschedule')).toBeInTheDocument()
    expect(queryByText('CANCEL REQUEST')).not.toBeInTheDocument()
  })

  it('hides Reschedule when only cancel is held', () => {
    const { queryByText } = renderWith(false, true)
    expect(queryByText('Reschedule')).not.toBeInTheDocument()
    expect(queryByText('CANCEL REQUEST')).toBeInTheDocument()
  })
})
