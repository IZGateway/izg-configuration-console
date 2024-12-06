import * as React from 'react'
import { Container, Typography, Box } from '@mui/material'
import ServiceAgreement from './serviceAgreement'
import Identify from './identify'
import Verify from './verify'
import Jurisdiction from './jurisdiction'
import { useRouter } from 'next/router'
import { useState, useEffect, useContext } from 'react'
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
interface editConnectionProps {
  destId: string
  destTypeId: string
}

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
  const [agreed, setAgreed] = useState(false)
  const [, setAccepted] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState(null)
  const [asapSelected, setAsapSelected] = useState(false)
  const [formValues, setFormValues] = useState(null)
  const [, setFormValuesDelta] = useState(null)
  const [defaultFormValues, setDefaultFormValues] = useState(null)
  const [open, setOpen] = React.useState(false)
  const [testResults, setTestResults] = useState(null)
  const [isLoadingTest, setIsLoadingTest] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)

  const [
    hasCreateChangeRequestTicketError,
    setHasCreateChangeRequestTicketError,
  ] = useState(false)
  const {
    data: destData,
    error: destError,
    isLoading: isDestLoading,
  } = useSWR(`/api/destinations/${props.destTypeId}/${props.destId}`)
  const {
    data: draftData,
    error: draftError,
    isLoading: isDraftLoading,
    mutate,
  } = useSWR(`/api/destinationdraft/${props.destTypeId}/${props.destId}`)

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

  const getDefaultDate = () => {
    const currentDate = moment.tz('America/New_York')
    const businessDate = getNextBusinessDay(currentDate, 2)
    return businessDate.hour(8).minute(0).second(0) // Set time to 8:00 AM
  }

  useEffect(() => {
    if (scheduledDateTime === null) {
      setScheduledDateTime(getDefaultDate())
    }
  }, [scheduledDateTime])
  useEffect(() => {
    if (hasCreateChangeRequestTicketError) {
      setAlert({
        level: 'error',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destination_type.type,
        message: `Error creating change request ticket for ${destData.jurisdiction.description} on environment ${destData.destination_type.type}. Please try again later!`,
      })
    }
  }, [hasCreateChangeRequestTicketError])

  useEffect(() => {
    if (draftData) {
      setFormValues({
        username: draftData?.username,
        newPassword: '',
        confirmPassword: '',
        facility_id: draftData?.facility_id,
        MSH3: draftData?.MSH3,
        MSH4: draftData?.MSH4,
        MSH5: draftData?.MSH5,
        MSH6: draftData?.MSH6,
        MSH22: draftData?.MSH22,
        RXA11: draftData?.RXA11,
      })
      setDefaultFormValues({
        username: draftData?.username,
        newPassword: '',
        confirmPassword: '',
        facility_id: draftData?.facility_id,
        MSH3: draftData?.MSH3,
        MSH4: draftData?.MSH4,
        MSH5: draftData?.MSH5,
        MSH6: draftData?.MSH6,
        MSH22: draftData?.MSH22,
        RXA11: draftData?.RXA11,
      })
    } else if (destData) {
      setFormValues({
        username: destData?.username,
        newPassword: '',
        confirmPassword: '',
        facility_id: destData?.facility_id,
        MSH3: destData?.MSH3,
        MSH4: destData?.MSH4,
        MSH5: destData?.MSH5,
        MSH6: destData?.MSH6,
        MSH22: destData?.MSH22,
        RXA11: destData?.RXA11,
      })
      setDefaultFormValues({
        username: destData?.username,
        newPassword: '',
        confirmPassword: '',
        facility_id: destData?.facility_id,
        MSH3: destData?.MSH3,
        MSH4: destData?.MSH4,
        MSH5: destData?.MSH5,
        MSH6: destData?.MSH6,
        MSH22: destData?.MSH22,
        RXA11: destData?.RXA11,
      })
    }
  }, [destData])

  useEffect(() => {
    if (activeStep === 2) {
      if (!_.isEmpty(alert.level)) {
        setShowSnackbar(true)
      } else {
        setShowSnackbar(false)
      }
    }
  }, [alert])

  useEffect(() => {
    if (activeStep === 2) {
      setFormErrors(null)
      setFormValuesDelta(null)
      const changedValues = getDelta(defaultFormValues, formValues)
      const validationErrors = changeRequestValidation(
        changedValues,
        changedValues.facility_id || defaultFormValues.facility_id
      ).errors

      setFormValuesDelta(changedValues)
      setFormErrors(validationErrors)
    }
  }, [activeStep, defaultFormValues, formValues])

  if (destError || draftError)
    throw new Error(destError.message || draftError.message)
  if (isDestLoading || isDraftLoading) return <div>loading...</div>

  const isFormChanged = !_.isEqual(formValues, defaultFormValues)
  const isResetButtonDisabled = _.isNull(draftData)
  const isNextButtonDisabled =
    (activeStep === 2 && !isFormChanged && _.isNull(draftData)) ||
    !_.isEmpty(formErrors)
  const isScheduleButtonDisabled = asapSelected
    ? !asapSelected
    : !scheduledDateTime

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
    let response
    const scheduleAt = asapSelected
      ? new Date().toISOString()
      : scheduledDateTime
    try {
      response = await fetch(`/api/changerequest`, {
        method: 'POST',
        body: JSON.stringify({
          requested: {
            ...formValues,
          },
          current: {
            ...defaultFormValues,
          },
          dest_id: destData.dest_id,
          dest_uri: destData.dest_uri,
          dest_type_id: destData.destination_type.type_id,
          dest_type: destData.destination_type.type,
          jira_id: null,
          isAsap: asapSelected,
          scheduledAt: scheduleAt,
          requestedBy: session.user.email,
          draft: false,
        }),
      })
    } catch (error) {
      console.error(`Error communicating with Jira: ${error}`)
      clearValue()
      setHasCreateChangeRequestTicketError(true)
    }
    clearValue()
    if (response.ok) {
      setAlert({
        level: 'success',
        jurisdiction: destData.jurisdiction.description,
        dest_type: destData.destination_type.type,
        message: `Change request is created successfully for ${destData.jurisdiction.description} on environment ${destData.destination_type.type}!`,
      })
      router.push('/manageconnections')
    } else {
      setHasCreateChangeRequestTicketError(true)
      router.push('/manageconnections')
      console.error(
        `Error creating change request: status is ${response.status}, message: ${response.message}`
      )
    }
  }

  const handleAccept = () => {
    setAccepted(true)
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
    setScheduledDateTime(null)
  }

  const handleNext = () => {
    if (_.isEmpty(formErrors)) {
      advanceStepper(1)
    }
    if (activeStep === 1 && !_.isNull(draftData)) {
      setAlert({
        level: 'info',
        message: `You are working on the latest draft. Last draft was saved by ${
          draftData.requestedBy
        } on ${moment(new Date(draftData.scheduledAt)).format(
          'MMM DD, YYYY [at] h:mm A'
        )}`,
      })
    }
  }

  const advanceStepper = (advanceBy: number) => {
    setActiveStep((prevActiveStep) => prevActiveStep + advanceBy)
  }

  const saveDraft = async () => {
    const scheduleAt = new Date().toISOString()
    const response = await fetch(`/api/changerequest`, {
      method: 'POST',
      body: JSON.stringify({
        requested: {
          ...formValues,
        },
        current: {
          ...defaultFormValues,
        },
        dest_id: destData.dest_id,
        dest_uri: destData.dest_uri,
        dest_type_id: destData.destination_type.type_id,
        dest_type: destData.destination_type.type,
        jira_id: null,
        isAsap: true,
        scheduledAt: scheduleAt,
        requestedBy: session.user.email,
        draft: true,
      }),
    })
    if (response.ok) {
      await mutate()
      setAlert({
        level: 'success',
        message: `Your draft was saved!`,
      })
    } else {
      setAlert({
        level: 'error',
        message: `Error saving the draft`,
      })
      console.error(`Error saving the draft`)
    }
  }

  const resetDraftValues = async () => {
    setDefaultFormValues({
      username: destData?.username,
      newPassword: '',
      confirmPassword: '',
      facility_id: destData?.facility_id,
      MSH3: destData?.MSH3,
      MSH4: destData?.MSH4,
      MSH5: destData?.MSH5,
      MSH6: destData?.MSH6,
      MSH22: destData?.MSH22,
      RXA11: destData?.RXA11,
    })
    setFormValues({
      username: destData?.username,
      newPassword: '',
      confirmPassword: '',
      facility_id: destData?.facility_id,
      MSH3: destData?.MSH3,
      MSH4: destData?.MSH4,
      MSH5: destData?.MSH5,
      MSH6: destData?.MSH6,
      MSH22: destData?.MSH22,
      RXA11: destData?.RXA11,
    })
    const response = await fetch(
      `/api/changerequest/draft/${props.destTypeId}/${props.destId}/${draftData.id}`,
      {
        method: 'DELETE',
      }
    )
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
  }

  return (
    <div>
      <Close />
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
          <table border={0} cellPadding={5} width={'100%'}>
            <thead style={{ background: '#005daa', color: 'white' }}>
              <tr>
                <th colSpan={2}>DESTINATION ID</th>
                <th colSpan={2}>ENVIRONMENT</th>
              </tr>
            </thead>
            <tr style={{ fontWeight: 'bold' }}>
              <td colSpan={2} align="center">
                {destData?.dest_id} ({destData?.jurisdiction.description})
              </td>

              <td colSpan={2} align="center">
                {destData.destination_type.type}
              </td>
            </tr>
          </table>
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
            destType={destData?.destination_type.type}
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

export default EditConnection
