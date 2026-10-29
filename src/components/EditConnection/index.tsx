import * as React from 'react'
import { Container, Typography, Box } from '@mui/material'
import ServiceAgreement from './serviceAgreement'
import Identify from './identify'
import Verify from './verify'
import Jurisdiction from './jurisdiction'
import { useRouter } from 'next/router'
import { useState, useEffect, useContext, useCallback, useRef } from 'react'
import StepperComponent from '../Stepper'
import CombinedContext from '../../contexts/app'
import Close from '../Close'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import Schedule from './schedule'
import changeRequestValidation from '../../lib/changerequestvalidation'
import TestDrawer from './testDrawer'
import CustomSnackbar from '../SnackBar'
import _ from 'lodash'
import moment from 'moment-timezone'
import FloatingActionButtons from './floatingActionButtons'
import ActionButtons from './actionButtons'
import AcceptButton from './acceptButton'
import { Destination } from '../../lib/type/Destination'
import { DestinationChangeRequest } from '../../lib/type/DestinationChangeRequest'
interface editConnectionProps {
  destId: string
  destTypeId: string
}

const authorizationAgreementKey = `authorization-agreement-accepted`

// IGDD-3566: after a slow response the console looks up the change request record
// itself rather than asking the user to go and check. The record is the same one
// that lights the Change Request icon on the connection list.
const CONFIRM_POLL_INTERVAL_MS = 3000
const CONFIRM_POLL_LIMIT_MS = 90000

// IGDD-3566: two failure messages, grouped by what the user must do. A user cannot
// act on the difference between Jira being unreachable, Jira refusing the request,
// and the request never being sent: all three mean nothing was created. Nor on the
// difference between the wait expiring and Jira creating a ticket we could not
// record: both mean the outcome is uncertain.
//
// Neither message claims anything about the server. The earlier wording opened
// "The server did not respond", which was false whenever the server answered with
// a 5xx of its own.
const NOTHING_CREATED_MESSAGE =
  'There was a problem creating your change request, and nothing was created. ' +
  'Please try again later.'

// Must never invite a retry. On one of its paths a ticket already exists, and a
// retry would raise a second one.
const UNCERTAIN_OUTCOME_MESSAGE =
  'There may have been an issue creating your change request. ' +
  'Please verify in Manage Connections or contact support.'

const CONFIRMED_MESSAGE =
  'The server was slow to respond, but your change request was created.'

// IGDD-3566: there is one change request record per destination, so a draft write
// and a submission race for the same row. A draft write sets jiraId to null and a
// reset deletes the row, so whichever lands last wins. Either order can erase the
// link to a live ticket and leave it untracked, which is the orphaned ticket this
// change exists to prevent. Both directions are therefore refused, with a message:
// a silent refusal is what started this incident.
const PENDING_SUBMISSION_MESSAGE =
  'Your change request is still being submitted. Please wait for the result ' +
  'before you change this draft.'

const PENDING_DRAFT_WRITE_MESSAGE =
  'Your draft is still being saved. Please wait for it to finish before you ' +
  'schedule this change request.'

const steps = [
  'SERVICE AGREEMENT',
  'ORGANIZATION',
  'IDENTIFY',
  'VERIFY',
  'SCHEDULE',
]

const getDelta = (a, b) =>
  Object.fromEntries(
    Object.entries(b).filter(([key, val]) => key in a && a[key] !== val)
  )

const EditConnection = (props: editConnectionProps) => {
  const router = useRouter()
  const { data: session } = useSession()
  const { clearValue, setAlert, alert } = useContext(CombinedContext)
  const [formErrors, setFormErrors] = useState(null)
  const [activeStep, setActiveStep] = useState(0)
  const [agreed, setAgreed] = useState(hasAcceptedAgreement())
  const [scheduledDateTime, setScheduledDateTime] = useState(null)
  const [asapSelected, setAsapSelected] = useState(false)
  const [futureDateTimeSelected, setfutureDateTimeSelected] = useState(false)
  const [formValues, setFormValues] = useState(null)
  const [, setFormValuesDelta] = useState(null)
  const [defaultFormValues, setDefaultFormValues] = useState(null)
  const [open, setOpen] = React.useState(false)
  const [testResults, setTestResults] = useState(null)
  const [isLoadingTest, setIsLoadingTest] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)
  const [isValidatingDestUri, setIsValidatingDestUri] = useState(false)

  // IGDD-3566: the ref is the gate that blocks a second submission and the state
  // drives the pending UI. React batches state updates, so two fast activations
  // would both read a stale `false`. A ref updates synchronously.
  const isSubmittingRef = useRef(false)
  // How many draft writes are in flight. Synchronous, for the same reason the
  // submission gate is: state updates are batched, so a check against state can
  // read stale between a click and the next render.
  //
  // A count rather than a flag. The Save control is disabled only while the form
  // is unchanged, so two writes can overlap. With a flag, the first to finish
  // clears it while the second is still travelling, the scheduling gate opens
  // early, and the late write erases the ticket link anyway. Save followed by
  // Reset is the reachable version, because the confirmation dialog puts a
  // human-scale gap between the two.
  const draftWritesInFlightRef = useRef(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const {
    data: destData,
    error: destError,
    isLoading: isDestLoading,
  } = useSWR<Destination>(
    `/api/destinations/${props.destTypeId}/${props.destId}`
  )
  const {
    data: draftData,
    error: draftError,
    isLoading: isDraftLoading,
    mutate,
  } = useSWR<DestinationChangeRequest>(
    `/api/changerequest/${props.destTypeId}/${props.destId}`
  )

  const getNextBusinessDay = (date, daysToAdd) => {
    let remainingDays = daysToAdd
    while (remainingDays > 0) {
      date = date.clone().add(1, 'days')
      if (date.isoWeekday() < 6) {
        remainingDays--
      }
    }
    return date
  }

  const getDefaultDate = useCallback(() => {
    const currentDate = moment.tz('America/New_York')
    const businessDate = getNextBusinessDay(currentDate, 2)
    return businessDate.hour(8).minute(0).second(0) // Set time to 8:00 AM
  }, [])

  useEffect(() => {
    if (scheduledDateTime === null) {
      setScheduledDateTime(getDefaultDate())
    }
  }, [scheduledDateTime, getDefaultDate])
  useEffect(() => {
    if (draftData) {
      setFormValues({
        destUri: draftData.requested.destUri,
        username: draftData.requested.username,
        newPassword: '',
        confirmPassword: '',
        facilityId: draftData.requested.facilityId,
        MSH3: draftData.requested.MSH3,
        MSH4: draftData.requested.MSH4,
        MSH5: draftData.requested.MSH5,
        MSH6: draftData.requested.MSH6,
        MSH11: draftData.requested.MSH11,
        MSH22: draftData.requested.MSH22,
        RXA11: draftData.requested.RXA11,
      })
      setDefaultFormValues({
        destUri: destData?.destUri,
        username: draftData?.current.username,
        newPassword: '',
        confirmPassword: '',
        facilityId: draftData?.current.facilityId,
        MSH3: draftData?.current.MSH3,
        MSH4: draftData?.current.MSH4,
        MSH5: draftData?.current.MSH5,
        MSH6: draftData?.current.MSH6,
        MSH11: draftData?.current.MSH11,
        MSH22: draftData?.current.MSH22,
        RXA11: draftData?.current.RXA11,
      })
    } else {
      setFormValues({
        destUri: destData?.destUri,
        username: destData?.username,
        newPassword: '',
        confirmPassword: '',
        facilityId: destData?.facilityId,
        MSH3: destData?.MSH3,
        MSH4: destData?.MSH4,
        MSH5: destData?.MSH5,
        MSH6: destData?.MSH6,
        MSH11: destData?.MSH11,
        MSH22: destData?.MSH22,
        RXA11: destData?.RXA11,
      })
      setDefaultFormValues({
        destUri: destData?.destUri,
        username: destData?.username,
        newPassword: '',
        confirmPassword: '',
        facilityId: destData?.facilityId,
        MSH3: destData?.MSH3,
        MSH4: destData?.MSH4,
        MSH5: destData?.MSH5,
        MSH6: destData?.MSH6,
        MSH11: destData?.MSH11,
        MSH22: destData?.MSH22,
        RXA11: destData?.RXA11,
      })
    }
  }, [destData, draftData])

  // IGDD-3566: this gate opens the snackbar on IDENTIFY only, so an alert raised
  // on any other step stays hidden until that step calls setShowSnackbar itself.
  // Removing the gate needs alert lifecycle work first, because `alert` lives in
  // application context and would re-open on every later step. Tracked separately.
  useEffect(() => {
    if (activeStep === 2) {
      if (!_.isEmpty(alert.level)) {
        setShowSnackbar(true)
      } else {
        setShowSnackbar(false)
      }
    }
  }, [activeStep, alert])

  useEffect(() => {
    if (activeStep === 2 && destData && defaultFormValues && formValues) {
      setFormErrors(null)
      setFormValuesDelta(null)
      const changedValues = getDelta(defaultFormValues, formValues)
      const validationErrors = changeRequestValidation(
        changedValues,
        changedValues.facilityId || defaultFormValues.facilityId,
        destData.destinationType.type
      ).errors

      setFormValuesDelta(changedValues)
      setFormErrors(validationErrors)
    }
  }, [activeStep, defaultFormValues, formValues, destData])

  useEffect(() => {
    // Skip agreement acknowledgement if already accepted this session
    if (hasAcceptedAgreement() && activeStep === 0) {
      setActiveStep(1)
    }
  }, [props.destId, props.destTypeId, activeStep])

  if (destError || draftError)
    throw new Error(destError.message || draftError.message)
  if (isDestLoading || isDraftLoading) return <div>loading...</div>

  const isFormChanged = !_.isEqual(formValues, defaultFormValues)
  const isResetButtonDisabled = _.isNull(draftData)
  const isNextButtonDisabled =
    (activeStep === 2 && !isFormChanged && _.isNull(draftData)) ||
    !_.isEmpty(formErrors) ||
    isValidatingDestUri
  const isScheduleButtonDisabled = !asapSelected && !futureDateTimeSelected

  const toggleTestDrawer = async () => {
    setOpen(!open)
    setIsLoadingTest(true)
    try {
      const response = await fetch(
        `/api/tests/connectiontest/${props.destTypeId}/${props.destId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: { ...destData, ...formValues },
          }),
        }
      )
      if (!response.ok) {
        setIsLoadingTest(false)
        const message = `An error has occured: ${response.status}`
        throw new Error(message)
      }
      const results = await response.json()
      setTestResults(results.testResults)
      setIsLoadingTest(false)
    } catch (error) {
      setIsLoadingTest(false)
      throw new Error(error)
    }
  }

  const handleCloseSnackBar = () => {
    setShowSnackbar(false)
    setAlert({
      level: '',
      jurisdiction: '',
      dest_type: '',
      message: '',
    })
  }

  const handleIAgreeButton = () => {
    setAgreed(true)
  }

  const handleSchedule = async () => {
    if (isSubmittingRef.current) {
      return
    }
    // A draft write is still in flight. It carries jiraId null, or it deletes the
    // record, and it writes the same row this submission is about to fill in. If
    // it lands after the server stores the ticket, the link is erased. Refuse and
    // say so, rather than racing it.
    if (draftWritesInFlightRef.current > 0) {
      setAlert({
        level: 'warning',
        jurisdiction: destData?.jurisdiction?.description,
        dest_type: destData?.destinationType?.type,
        message: PENDING_DRAFT_WRITE_MESSAGE,
      })
      setShowSnackbar(true)
      return
    }
    isSubmittingRef.current = true
    setIsSubmitting(true)
    try {
      await submitChangeRequest()
    } catch (error) {
      // A throw that escapes submitChangeRequest happened before or around the
      // request rather than in response to it, so report a failure to send. The
      // request body is built outside that function's try for the same reason.
      console.error(`Unhandled failure while scheduling: ${error}`)
      setAlert({
        level: 'error',
        jurisdiction: destData?.jurisdiction?.description,
        dest_type: destData?.destinationType?.type,
        message: NOTHING_CREATED_MESSAGE,
      })
      setShowSnackbar(true)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
      setIsConfirming(false)
    }
  }

  const submitChangeRequest = async () => {
    let response
    // Held before the submit so that the confirmation poll can tell a new ticket
    // from one that already existed. A draft record carries a null jiraId.
    const previousJiraId = draftData?.jiraId ?? null
    const scheduleAt = asapSelected
      ? new Date().toISOString()
      : scheduledDateTime
    // Built before the try. A throw while reading session or destination values is
    // not a transport failure, and reporting it as one would tell the user their
    // request may still have been created when it was never sent. Outside the try
    // it reaches the backstop in handleSchedule instead.
    const requestBody = JSON.stringify({
      id: draftData?.id || null,
      requested: {
        ...formValues,
        password: formValues.newPassword,
        ..._.omit(formValues, ['newPassword', 'confirmPassword']),
      },
      current: {
        ...defaultFormValues,
      },
      destId: destData.destId,
      destType: {
        typeId: destData.destinationType.typeId,
        type: destData.destinationType.type,
      },
      isAsap: asapSelected,
      scheduledAt: moment.utc(scheduleAt).tz('America/New_York'),
      requestedBy: session.user.email,
      isDraft: false,
    })

    try {
      response = await fetch(`/api/changerequest`, {
        method: 'POST',
        body: requestBody,
      })
    } catch (error) {
      console.error(`Error submitting the change request: ${error}`)
      await confirmOutcome(previousJiraId)
    }
    clearValue()
    if (!response) {
      // fetch itself threw; the catch above already raised the error alert.
      return
    }
    if (response.ok) {
      setAlert({
        level: 'success',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destinationType.type,
        message: `Change request is created successfully for ${destData.jurisdiction.description} on environment ${destData.destinationType.type}!`,
      })
      // The snackbar auto-opens only on the IDENTIFY step, so open it here. The
      // confirmed-success path does the same, which keeps the two paths alike.
      setShowSnackbar(true)
      router.push('/manageconnections')
    } else if (response.status === 400) {
      // The server rejected a submitted value - today, a destUri outside the
      // destination URL specification. Stay on the form and report the
      // server's own reason: navigating to /manageconnections here would throw
      // away the request the user just filled in and replace a specific,
      // fixable message with a generic one.
      let message =
        'The change request was rejected. Please review the values and try again.'
      try {
        const body = await response.json()
        if (body?.error) {
          message = body.error
        }
      } catch {
        // no JSON body - keep the generic message
      }
      setAlert({
        level: 'error',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destinationType.type,
        message,
      })
      // The snackbar auto-opens only on the IDENTIFY step, so open it here.
      setShowSnackbar(true)
      console.error(`Change request rejected: ${message}`)
    } else if (response.status >= 500) {
      console.error(
        `Error creating change request: status is ${response.status}, message: ${response.statusText}`
      )
      // Only the route knows whether the Jira ticket exists, and when it answers
      // there is nothing to confirm. Report at once in both directions. Only a
      // silent response falls to the record lookup: an unparsable body, or a 504
      // from the gateway, which carries no JSON at all.
      const ticketCreated = await ticketCreatedFlag(response)
      if (ticketCreated === false) {
        setAlert({
          level: 'error',
          jurisdiction: destData?.jurisdiction?.description,
          dest_type: destData?.destinationType?.type,
          message: NOTHING_CREATED_MESSAGE,
        })
        setShowSnackbar(true)
        return
      }
      if (ticketCreated === true) {
        // The ticket exists, so polling for its jiraId is futile: the only steps
        // after creation are the password read and the write that stores that
        // jiraId, so a throw here means the record was never updated.
        setAlert({
          level: 'warning',
          jurisdiction: destData?.jurisdiction?.description,
          dest_type: destData?.destinationType?.type,
          message: UNCERTAIN_OUTCOME_MESSAGE,
          persistent: true,
        })
        setShowSnackbar(true)
        return
      }
      // Stay on this step while the record lookup runs. Navigating away would
      // discard the completed form and replace a specific report with nothing the
      // user can act on.
      await confirmOutcome(previousJiraId)
    } else {
      setAlert({
        level: 'error',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destinationType.type,
        message: NOTHING_CREATED_MESSAGE,
      })
      setShowSnackbar(true)
      console.error(
        `Change request refused: status is ${response.status}, message: ${response.statusText}`
      )
    }
  }

  /**
   * Reads `ticketCreated` from a failure body. Returns null when the body is absent,
   * unparsable, or silent on the question, which keeps the caller on the safe path.
   */
  const ticketCreatedFlag = async (response: Response) => {
    try {
      const body = await response.json()
      return typeof body?.ticketCreated === 'boolean'
        ? body.ticketCreated
        : null
    } catch {
      return null
    }
  }

  /**
   * Reads the change request record until its jiraId differs from the value held
   * before the submit. Returns the new jiraId, or null when the bounded wait ends
   * first. The comparison uses the earlier value rather than null, because a draft
   * record exists with a null jiraId and a change request may already exist.
   */
  const pollForChangeRequest = async (previousJiraId: string | null) => {
    const deadline = Date.now() + CONFIRM_POLL_LIMIT_MS
    while (Date.now() < deadline) {
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS)
      )
      // The bound has to hold on elapsed time, not on iterations started. A
      // lookup carries no limit of its own, so one that stalls while reading
      // headers or the body never settles. The loop would then never test the
      // deadline again, the uncertain-outcome message would never appear, and
      // SCHEDULE would stay disabled until the user reloaded the page.
      const remaining = deadline - Date.now()
      if (remaining <= 0) break
      try {
        const lookup = await fetch(
          `/api/changerequest/${props.destTypeId}/${props.destId}`,
          { signal: AbortSignal.timeout(remaining) }
        )
        if (lookup.ok) {
          const record = await lookup.json()
          if (record?.jiraId && record.jiraId !== previousJiraId) {
            return record.jiraId
          }
        }
      } catch (error) {
        // A failed lookup is not an answer. Keep waiting until the deadline.
        console.error(`Change request lookup failed: ${error}`)
      }
    }
    return null
  }

  const confirmOutcome = async (previousJiraId: string | null) => {
    setIsConfirming(true)
    const jiraId = await pollForChangeRequest(previousJiraId)
    if (jiraId) {
      console.info(
        `Change request confirmed after a slow response: ${jiraId} for destination ${props.destId}`
      )
      setAlert({
        level: 'success',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destinationType.type,
        message: CONFIRMED_MESSAGE,
      })
      setShowSnackbar(true)
      router.push('/manageconnections')
      return
    }
    reportUnknownOutcome()
  }

  const reportUnknownOutcome = () => {
    // Optional reads: this also runs from the backstop catch in handleSchedule. A
    // throw caused by missing destData must not make the backstop throw as well,
    // because then the submission would end with no message at all. The message
    // itself does not depend on either field.
    setAlert({
      level: 'warning',
      jurisdiction: destData?.jurisdiction?.description,
      dest_type: destData?.destinationType?.type,
      message: UNCERTAIN_OUTCOME_MESSAGE,
      persistent: true,
    })
    // The snackbar auto-opens only on the IDENTIFY step, so open it here.
    setShowSnackbar(true)
  }

  const handleAccept = () => {
    setAcceptedAgreement()
    advanceStepper(1)
  }

  const handleFormFieldChange = (fieldName: string, value: string) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [fieldName]: value,
    }))
  }

  const handlePrevious = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
    setFormErrors(null)
    setAsapSelected(false)
    setfutureDateTimeSelected(false)
    setScheduledDateTime(null)
  }

  /**
   * Runs the real destination URL guard server-side before leaving the step
   * where the URI is edited. Only the guard knows the approved TLDs and
   * whether the host resolves to a routable address, so the check is made
   * there rather than duplicated in the browser.
   *
   * Returns false when the URI was rejected, having raised the snackbar.
   */
  const isDestUriAccepted = async (): Promise<boolean> => {
    const destUri = formValues?.destUri
    // Only worth a round-trip when the user actually changed the URI.
    if (!destUri || destUri === defaultFormValues?.destUri) {
      return true
    }
    setIsValidatingDestUri(true)
    try {
      const response = await fetch('/api/destinationuri/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destId: destData.destId,
          destTypeId: destData.destinationType.typeId,
          destUri,
        }),
      })
      if (response.ok) {
        return true
      }
      let message =
        'This destination URL is not permitted. Please correct it and try again.'
      try {
        const body = await response.json()
        if (body?.error) {
          message = body.error
        }
      } catch {
        // no JSON body - keep the generic message
      }
      setAlert({
        level: 'error',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destinationType.type,
        message,
      })
      setShowSnackbar(true)
      return false
    } catch (error) {
      // The check could not be completed. Do not advance on an unknown
      // result: POST /api/changerequest would reject it later anyway, and
      // failing here keeps the message next to the field.
      setAlert({
        level: 'error',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destinationType.type,
        message: `The destination URL could not be validated: ${error}. Please try again.`,
      })
      setShowSnackbar(true)
      return false
    } finally {
      setIsValidatingDestUri(false)
    }
  }

  const handleNext = async () => {
    if (_.isEmpty(formErrors)) {
      // The URI is edited on IDENTIFY, so validate on the way out of it.
      if (activeStep === 2 && !(await isDestUriAccepted())) {
        return
      }
      advanceStepper(1)
    }
    if (activeStep === 1 && !_.isNull(draftData)) {
      setAlert({
        level: 'info',
        message: `You are working on the latest draft. Last draft was saved by ${
          draftData.requestedBy
        } on ${moment(new Date(draftData.scheduledAt)).format(
          'MMM DD, YYYY [at] h:mm A'
        )}. NOTE: Passwords are not saved as part of a draft`,
      })
    }
  }

  const advanceStepper = (advanceBy: number) => {
    setActiveStep((prevActiveStep) => prevActiveStep + advanceBy)
  }

  const saveDraft = async () => {
    if (isSubmittingRef.current) {
      setAlert({
        level: 'warning',
        message: PENDING_SUBMISSION_MESSAGE,
      })
      return
    }

    draftWritesInFlightRef.current += 1
    try {
      const response = await fetch(`/api/changerequest`, {
        method: 'POST',
        body: JSON.stringify({
          id: draftData?.id || null,
          requested: {
            ...formValues,
          },
          current: {
            ...defaultFormValues,
          },
          destId: destData.destId,
          destType: {
            typeId: destData.destinationType.typeId,
            type: destData.destinationType.type,
          },
          jiraId: null,
          requestedBy: session.user.email,
          isDraft: true,
          scheduledAt: new Date().toISOString(),
        }),
      })
      if (response.ok) {
        await mutate()
        setAlert({
          level: 'success',
          message: `Your draft was saved. Note: Passwords are not saved as part of a draft`,
        })
      } else {
        setAlert({
          level: 'error',
          message: `Error saving the draft`,
        })
        console.error(`Error saving the draft`)
      }
    } finally {
      draftWritesInFlightRef.current -= 1
    }
  }

  const resetDraftValues = async () => {
    // Guarded before the form state is touched. A reset that wiped the entered
    // values and then declined to delete the record would be worse than either.
    if (isSubmittingRef.current) {
      setAlert({
        level: 'warning',
        message: PENDING_SUBMISSION_MESSAGE,
      })
      return
    }

    setDefaultFormValues({
      destUri: destData?.destUri,
      username: destData?.username,
      newPassword: '',
      confirmPassword: '',
      facilityId: destData?.facilityId,
      MSH3: destData?.MSH3,
      MSH4: destData?.MSH4,
      MSH5: destData?.MSH5,
      MSH6: destData?.MSH6,
      MSH11: destData?.MSH11,
      MSH22: destData?.MSH22,
      RXA11: destData?.RXA11,
    })
    setFormValues({
      destUri: destData?.destUri,
      username: destData?.username,
      newPassword: '',
      confirmPassword: '',
      facilityId: destData?.facilityId,
      MSH3: destData?.MSH3,
      MSH4: destData?.MSH4,
      MSH5: destData?.MSH5,
      MSH6: destData?.MSH6,
      MSH11: destData?.MSH11,
      MSH22: destData?.MSH22,
      RXA11: destData?.RXA11,
    })
    draftWritesInFlightRef.current += 1
    try {
      const response = await fetch(`/api/changerequest/${draftData.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setAlert({
          level: 'success',
          message: `Your draft was reset!`,
        })
      } else {
        setAlert({
          level: 'error',
          message: `Error resetting draft`,
        })
        console.error(`Error resetting draft`)
      }
      await mutate()
    } finally {
      draftWritesInFlightRef.current -= 1
    }
  }

  return (
    <div>
      <Close buttonText="Cancel" />
      <Container sx={{ mb: 16 }} maxWidth="sm">
        <Box sx={{ marginTop: 4 }}>
          <Typography
            align="center"
            variant="h1"
            fontWeight={700}
            fontSize="32px"
            id="add-connecton"
            paddingBottom={2}
          >
            Create Change Request
          </Typography>
          <Box
            sx={{
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              mb: 2,
              '@media (max-width: 768px)': {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: 'none',
                borderRadius: 0,
              },
            }}
          >
            {/* Desktop view */}
            <Box
              sx={{
                display: 'table',
                width: '100%',
                '@media (max-width: 768px)': {
                  display: 'none',
                },
              }}
            >
              <Box
                sx={{
                  display: 'table-row',
                  background: '#005daa',
                  color: 'white',
                }}
              >
                <Box
                  component="div"
                  sx={{
                    display: 'table-cell',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    width: '50%',
                  }}
                >
                  DESTINATION ID
                </Box>
                <Box
                  component="div"
                  sx={{
                    display: 'table-cell',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    width: '50%',
                  }}
                >
                  ENVIRONMENT
                </Box>
              </Box>
              <Box sx={{ display: 'table-row' }}>
                <Box
                  component="div"
                  sx={{
                    display: 'table-cell',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    borderRight: '1px solid #ddd',
                  }}
                >
                  {destData?.destId} ({destData?.jurisdiction.description})
                </Box>
                <Box
                  component="div"
                  sx={{
                    display: 'table-cell',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {destData.destinationType.type}
                </Box>
              </Box>
            </Box>

            {/* Mobile stacked view */}
            <Box
              sx={{
                display: 'none',
                '@media (max-width: 768px)': {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                },
              }}
            >
              {/* Destination ID Section */}
              <Box
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    background: '#005daa',
                    color: 'white',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  DESTINATION ID
                </Box>
                <Box
                  sx={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: 'white',
                  }}
                >
                  {destData?.destId} ({destData?.jurisdiction.description})
                </Box>
              </Box>

              {/* Environment Section */}
              <Box
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    background: '#005daa',
                    color: 'white',
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  ENVIRONMENT
                </Box>
                <Box
                  sx={{
                    padding: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    backgroundColor: 'white',
                  }}
                >
                  {destData?.destinationType.type}
                </Box>
              </Box>
            </Box>
          </Box>
          <Typography
            gutterBottom
            align="center"
            variant="body1"
            paddingTop={2}
          >
            Use the stepper to edit & manage sections of your connection
          </Typography>
        </Box>
        <Box mt={4} mb={4}>
          <StepperComponent activeStep={activeStep} steps={steps} />
        </Box>

        {activeStep === 0 && (
          <ServiceAgreement clickOnAgree={handleIAgreeButton} agreed={agreed} />
        )}
        {activeStep === 1 && (
          <Jurisdiction
            jurisdictionName={destData?.jurisdiction.description}
            destType={destData?.destinationType.type}
          />
        )}
        {activeStep === 2 && (
          <Identify
            {...destData}
            handleChange={handleFormFieldChange}
            value={formValues}
            formErrors={formErrors}
          />
        )}

        {activeStep === 3 && <Verify {...destData} value={formValues} />}
        {activeStep === 4 && (
          <Schedule
            scheduledDateTime={scheduledDateTime}
            setScheduledDateTime={setScheduledDateTime}
            setAsapSelected={setAsapSelected}
            setfutureDateTimeSelected={setfutureDateTimeSelected}
          />
        )}
        <Container
          maxWidth="sm"
          sx={{
            marginTop: 4,
          }}
        >
          {activeStep === 0 ? (
            <AcceptButton handleAccept={handleAccept} agreed={agreed} />
          ) : (
            <ActionButtons
              activeStep={activeStep}
              handlePrevious={handlePrevious}
              steps={steps}
              isScheduleButtonDisabled={isScheduleButtonDisabled}
              isSubmitting={isSubmitting}
              isConfirming={isConfirming}
              handleSchedule={handleSchedule}
              handleNext={handleNext}
              isNextButtonDisabled={isNextButtonDisabled}
            />
          )}
        </Container>
        <CustomSnackbar
          open={showSnackbar}
          severity={alert.level}
          message={alert.message}
          onClose={handleCloseSnackBar}
          // IGDD-3566: an alert marked persistent waits for a dismissal. Every
          // other message keeps the 6 second default.
          autoHideDuration={alert.persistent ? null : undefined}
        />
      </Container>
      {activeStep === 2 && !open ? (
        <FloatingActionButtons
          toggleTestDrawer={toggleTestDrawer}
          isFormChanged={isFormChanged}
          saveDraft={saveDraft}
          isResetButtonDisabled={isResetButtonDisabled}
          resetDraft={resetDraftValues}
        />
      ) : (
        <TestDrawer
          open={open}
          onClose={() => {
            setOpen(!open)
          }}
          isLoading={isLoadingTest}
          testResults={testResults}
        />
      )}
    </div>
  )
}

export const hasAcceptedAgreement = (): boolean => {
  return sessionStorage.getItem(authorizationAgreementKey) === 'true'
}

export const setAcceptedAgreement = () => {
  sessionStorage.setItem(authorizationAgreementKey, 'true')
}

export default EditConnection
