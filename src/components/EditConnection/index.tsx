import * as React from 'react'
import { Container, Typography, Box, ButtonGroup, Button } from '@mui/material'
import ServiceAgreement from './serviceAgreement'
import Identify from './identify'
import Verify from './verify'
import Jurisdiction from './jurisdiction'
import { useRouter } from 'next/router'
import { useState, useEffect, useContext } from 'react'
import AlertDialog from './alertDialog'
import Loader from '../Loader'
import { validate as uuidValidate } from 'uuid'
import StepperComponent from '../Stepper'
import CombinedContext from '../../contexts/app'
import Close from '../Close'
import { isEmpty } from 'underscore'
import useSWR from 'swr'
import { mutate } from 'swr'
interface editConnectionProps {
  destId: string
}

const steps = ['SERVICE AGREEMENT', 'JURISDICTION', 'IDENTIFY', 'VERIFY']

const emptyErrors = {
  username: '',
  newPassword: '',
  confirmPassword: '',
  facility_id: '',
  MSH3: '',
  MSH4: '',
  MSH5: '',
  MSH6: '',
  MSH22: '',
  RXA11: '',
}

const validationRules = {
  username: /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/,
  newPassword:
    /^(?=(?:.*\d){2})(?=(?:.*[a-z]){2})(?=(?:.*[A-Z]){2})(?=(?:.*[!@#$%^()&]){2}).{15,}$/,
  confirmPassword:
    /^(?=(?:.*\d){2})(?=(?:.*[a-z]){2})(?=(?:.*[A-Z]){2})(?=(?:.*[!@#$%^()&]){2}).{15,}$/,
  facility_id: /^[A-Za-z0-9_-]{0,25}$/,
  MSH3: /^[A-Za-z0-9_-]{0,25}$/,
  MSH4: /^[A-Za-z0-9_-]{0,25}$/,
  MSH5: /^[A-Za-z0-9_-]{0,25}$/,
  MSH6: /^[A-Za-z0-9_-]{0,25}$/,
  MSH22: /^[A-Za-z0-9_-]{0,25}$/,
  RXA11: /^[A-Za-z0-9_-]{0,25}$/,
}
const errorMessages = {
  username: 'Username value should meet requirement as below',
  newPassword: 'Password value should meet requirement as above',
  confirmPassword: 'Password value should meet requirement as above',
  facility_id: `Facility ID value should meet requirement as above`,
  MSH3: `MSH-3 value should meet requirement as above`,
  MSH4: `MSH-4 value should meet requirement as above`,
  MSH5: `MSH-5 value should meet requirement as above`,
  MSH6: `MSH-6 value should meet requirement as above`,
  MSH22: `MSH-22 value should meet requirement as above`,
  RXA11: `RXA-11 value should meet requirement as above`,
}

const EditConnection = (props: editConnectionProps) => {
  const router = useRouter()
  const { clearValue } = useContext(CombinedContext)
  const [openAlert, setOpenAlert] = useState(false)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [isNextButtonClicked, setIsNextButtonClicked] = useState(false)
  const [formErrors, setFormErrors] = useState(emptyErrors)
  const [activeStep, setActiveStep] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [formValues, setFormValues] = useState({
    username: '',
    newPassword: '',
    confirmPassword: '',
    facility_id: '',
    MSH3: '',
    MSH4: '',
    MSH5: '',
    MSH6: '',
    MSH22: '',
    RXA11: '',
  })

  const {
    data: destData,
    error: destError,
    isLoading: isDestLoading,
  } = useSWR(`/api/destinations/${props.destId}`)

  const {
    data: jurisdictionData,
    error: jurisdictionError,
    isLoading: isJurisdictionLoading,
  } = useSWR(`/api/jurisdictions/${props.destId}`)
  const testResult = React.useRef('')
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
    }
  }, [destData])

  useEffect(() => {
    if (activeStep === 2 && isFormDirty) {
      setIsTestRunning(true)
      fetch(`/api/edit/queryTest/${props.destId}`, {
        method: 'GET',
      })
        .then((res) => {
          if (!res.ok) {
            setOpenAlert(true)
            setFormErrors(emptyErrors)
          }
          return res.json()
        })
        .then((data) => {
          testResult.current = data.testResults[0].status
          setIsTestRunning(false)
          setIsFormDirty(false)
          if (testResult.current === 'PASS') {
            setActiveStep((prevActiveStep) => prevActiveStep + 1)
          } else {
            setOpenAlert(true)
            setFormErrors(emptyErrors)
          }
        })
        .catch((err) => {
          clearValue()
          throw new Error(err.message)
        })
    }
  }, [isFormDirty, activeStep, clearValue])

  if (destError && jurisdictionError) return <div>failed to load</div>
  if (isDestLoading && isJurisdictionLoading) return <div>loading...</div>
  const initialValue = {
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
  }
  const formValidation = (e) => {
    if (isFormChanged && activeStep === 2) {
      e.preventDefault()
      setIsNextButtonClicked(true)
      setFormErrors(emptyErrors)
      let hasErrors = false
      Object.keys(formValues).forEach((key) => {
        const value = formValues[key].trim()
        // Added this so that it wont perform validation on existing values
        if (value !== destData[key]) {
          if (isEmpty(value)) {
            if (isEmpty(formValues.username)) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                username: `Username cannot be empty`,
              }))
              hasErrors = true
            }
            if (isEmpty(formValues.MSH3) && isEmpty(formValues.MSH4)) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                MSH3: `At least one of MSH-3 and MSH-4 must be provided`,
              }))
              hasErrors = true
            }
            if (isEmpty(formValues.MSH5) && isEmpty(formValues.MSH6)) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                MSH5: `At least one of MSH-5 and MSH-6 must be provided`,
              }))
              hasErrors = true
            }
          } else if (!isEmpty(value)) {
            if (!validationRules[key].test(value)) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                [key]: `${errorMessages[key]}`,
              }))
              hasErrors = true
            } else if (uuidValidate(formValues.newPassword.trim())) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                newPassword: `Password can not be in the form of UUID`,
              }))
              hasErrors = true
            } else if (
              formValues.newPassword.trim() !==
              formValues.confirmPassword.trim()
            ) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                confirmPassword: `Both New Password and Confirm New Password should match`,
              }))
              hasErrors = true
            } else if (
              !isEmpty(value) &&
              formValues.confirmPassword.trim() ===
                formValues.facility_id.trim()
            ) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                confirmPassword: `Password can not be same as Facility ID`,
              }))
              hasErrors = true
            }
          }
        }
      })
      if (!hasErrors) {
        setIsFormDirty(true)
      }
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }
  }
  const isFormChanged =
    JSON.stringify(formValues) !== JSON.stringify(initialValue)

  const handleCloseAlert = () => {
    setOpenAlert(false)
    setIsFormDirty(false)
  }

  const handleIAgreeButton = () => {
    setAgreed(true)
  }

  const handleSubmit = async () => {
    let response
    const { newPassword, confirmPassword, ...submittingValue } = formValues
    if (
      isEmpty(formValues.newPassword) &&
      isEmpty(formValues.confirmPassword)
    ) {
      response = await fetch(`/api/update/${props.destId}`, {
        method: 'POST',
        body: JSON.stringify(submittingValue),
      })
    } else {
      response = await fetch(`/api/update/${props.destId}`, {
        method: 'POST',
        body: JSON.stringify(formValues),
      })
    }
    clearValue()
    if (response.ok) {
      // manually trigger revalidation to fetch the latest data from the server without refresh
      mutate(`/api/destinations/${props.destId}`)
      router.push('/manage')
    } else {
      throw new Error('Update was not successful. Please try again later')
    }
  }

  const handleAccept = () => {
    setAccepted(true)
    setActiveStep((prevActiveStep) => prevActiveStep + 1)
  }

  const handleFormFieldChange = (fieldName: string, value: string) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [fieldName]: value,
    }))
  }

  const handlePrevious = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1)
    setFormErrors(emptyErrors)
  }

  const handleNext = (e) => {
    formValidation(e)
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
          <Button
            id="submit"
            type="submit"
            color="primary"
            variant="contained"
            onClick={handleSubmit}
            sx={{
              borderRadius: '30px',
            }}
          >
            SUBMIT
          </Button>
        ) : (
          <Button
            id="next"
            type="submit"
            color="primary"
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 2 && !isFormChanged}
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
              Editing {jurisdictionData?.description}{' '}
              {destData?.destination_type.type}
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
              jurisdictionName={jurisdictionData?.description}
              destType={destData?.destination_type.type}
            />
          )}
          {activeStep === 2 &&
            (!isTestRunning ? (
              <Identify
                {...destData}
                handleChange={handleFormFieldChange}
                value={formValues}
                formErrors={formErrors}
                isNextButtonClicked={isNextButtonClicked}
              />
            ) : (
              <Loader open={true} />
            ))}
          {openAlert && (
            <AlertDialog open={openAlert} close={handleCloseAlert} />
          )}
          {activeStep === 3 && <Verify {...destData} value={formValues} />}

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
