import * as React from 'react'
import {
  Container,
  Typography,
  Box,
  ButtonGroup,
  Button,
  Tooltip,
} from '@mui/material'
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
import { mutate } from 'swr'
import { useSession } from 'next-auth/react'
import Schedule from './schedule'
import changeRequestValidation from '../../lib/changerequestvalidation'
import * as _ from 'lodash'

interface editConnectionProps {
  destId: string
  destTypeId: string
}

const steps = [
  'SERVICE AGREEMENT',
  'JURISDICTION',
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
  const { clearValue } = useContext(CombinedContext)
  const [formErrors, setFormErrors] = useState(null)
  const [activeStep, setActiveStep] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState(null)
  const [asapSelected, setAsapSelected] = useState(false)
  const [formValues, setFormValues] = useState(null)
  const [formValuesDelta, setFormValuesDelta] = useState(null)
  const [defaultFormValues, setDefaultFormValues] = useState(null)
  const [
    hasCreateChangeRequestTicketError,
    setHasCreateChangeRequestTicketError,
  ] = useState(false)

  const {
    data: destData,
    error: destError,
    isLoading: isDestLoading,
  } = useSWR(`/api/destinations/${props.destTypeId}/${props.destId}`)

  const isFormChanged = !_.isEqual(formValues, defaultFormValues)

  useEffect(() => {
    if (hasCreateChangeRequestTicketError) {
      throw new Error('Error creating change request ticket.')
    }
  }, [hasCreateChangeRequestTicketError])

  useEffect(() => {
    if (destData) {
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
      setFormErrors(null)
      setFormValuesDelta(null)
      const changedValues = getDelta(defaultFormValues, formValues)
      setFormValuesDelta(changedValues)
      const validationErrors = changeRequestValidation(
        changedValues,
        changedValues.facility_id || defaultFormValues.facility_id
      ).errors
      setFormErrors(validationErrors)
    }
  }, [activeStep, defaultFormValues, formValues, formErrors])

  if (destError) throw new Error(destError.message)
  if (isDestLoading) return <div>loading...</div>

  const handleIAgreeButton = () => {
    setAgreed(true)
  }

  const handleSubmit = async () => {
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
        }),
      })
    } catch (error) {
      console.error(`Error communicating with Jira: ${error}`)
      clearValue()
      setHasCreateChangeRequestTicketError(true)
    }
    clearValue()
    if (response.ok) {
      router.push('/manage')
    } else {
      console.error(
        `Error creating change request: status is ${response.status}, message: ${response.message}`
      )
      setHasCreateChangeRequestTicketError(true)
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

  const handlePrevious = (e) => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
    setFormErrors(null)
    setAsapSelected(false)
    setScheduledDateTime(null)
  }

  const handleNext = (e) => {
    if (_.isEmpty(formErrors)) {
      advanceStepper(1)
    }
  }

  const advanceStepper = (advanceBy: number) => {
    setActiveStep((prevActiveStep) => prevActiveStep + advanceBy)
  }

  const actionButtons = () => (
    <Box
      sx={{
        textAlign: 'center',
      }}
    >
      <ButtonGroup
        variant="contained"
        fullWidth
        size="large"
        sx={{
          margin: '1em',
          alignItems: 'center',
          borderRadius: '30px',
        }}
      >
        <Button
          id="previous"
          color="primary"
          variant="outlined"
          disabled={activeStep === 0}
          onClick={handlePrevious}
          sx={{
            borderRadius: '30px',
          }}
        >
          PREVIOUS
        </Button>
        {activeStep === steps.length - 1 ? (
          <Tooltip
            arrow
            placement="bottom"
            title="Please select date and time"
            open={
              (asapSelected ? !asapSelected : !scheduledDateTime) ? true : false
            }
          >
            <Button
              id="schedule"
              type="submit"
              color="primary"
              variant="contained"
              disabled={asapSelected ? !asapSelected : !scheduledDateTime}
              onClick={handleSubmit}
              sx={{
                borderRadius: '30px',
              }}
            >
              SCHEDULE
            </Button>
          </Tooltip>
        ) : (
          <Button
            id="next"
            type="submit"
            color="primary"
            variant="contained"
            onClick={handleNext}
            disabled={
              (activeStep === 2 && !isFormChanged) || !_.isEmpty(formErrors)
            }
            sx={{
              borderRadius: '30px',
            }}
          >
            NEXT
          </Button>
        )}
      </ButtonGroup>
    </Box>
  )

  const acceptButton = () => (
    <Box sx={{ textAlign: 'center' }}>
      <Button
        id="accept"
        variant="contained"
        color="primary"
        size="large"
        onClick={handleAccept}
        disabled={!agreed}
        sx={{
          background: 'secondary',
          borderRadius: '37.5px',
          margin: '1em',
          alignItems: 'center',
          width: 350,
        }}
      >
        ACCEPT
      </Button>
    </Box>
  )

  return (
    <div>
      <Close />
      <Container maxWidth="sm">
        <div>
          <Box sx={{ marginTop: 4 }}>
            <Typography
              align="center"
              variant="h1"
              fontWeight={700}
              fontSize="32px"
              id="add-connecton"
            >
              Editing {destData?.jurisdiction.description}{' '}
              {destData.destination_type.type}
            </Typography>
            <Typography gutterBottom align="center" variant="body1">
              Use the stepper to edit & manage sections of your connection
            </Typography>
          </Box>
          <Box mt={4} mb={4}>
            <StepperComponent activeStep={activeStep} steps={steps} />
          </Box>

          {activeStep === 0 && (
            <ServiceAgreement
              clickOnAgree={handleIAgreeButton}
              agreed={agreed}
            />
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
            {activeStep === 0 ? acceptButton() : actionButtons()}
          </Container>
        </div>
      </Container>
    </div>
  )
}

export default EditConnection
