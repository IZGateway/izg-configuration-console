import * as React from 'react'
import {
  Container,
  Typography,
  Stepper,
  Box,
  Step,
  ButtonGroup,
  Button,
  StepLabel,
} from '@mui/material'
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector'
import { styled } from '@mui/material/styles'
import { gql, useMutation, useQuery } from '@apollo/client'
import { FETCH_DESTINATION } from '../../lib/queries/fetch'
import ServiceAgreement from './serviceAgreement'
import Identify from './identify'
import Verify from './verify'
import Jurisdiction from './jurisdiction'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import AlertDialog from './alertDialog'
import Loader from '../Loader'
import { validate as uuidValidate } from 'uuid'
// interface editConnectionProps { }

export const UPDATE_CONNECTION = gql`
  mutation Mutation($data: DestinationUpdateInput!, $destId: String!) {
    updateDestination(data: $data, dest_id: $destId) {
      username
      password
      facility_id
      MSH3
      MSH4
      MSH5
      MSH6
      MSH22
      RXA11
    }
  }
`

const steps = ['SERVICE AGREEMENT', 'JURISDICTION', 'IDENTIFY', 'VERIFY']

const EditConnection = (props: any) => {
  const router = useRouter()

  const [updateConnection, { loading: mutationLoading, error: mutationError }] =
    useMutation(UPDATE_CONNECTION)
  const {
    loading: queryLoading,
    error: queryError,
    data,
  } = useQuery(FETCH_DESTINATION, {
    variables: { destId: props.destId },
    fetchPolicy: 'no-cache',
  })

  useEffect(() => {
    if (!queryLoading) {
      setFormValues(initialValues)
    }
  }, [queryLoading])

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
  let testResult
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
  const [openAlert, setOpenAlert] = React.useState(false)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [isNextButtonClicked, setIsNextButtonClicked] = useState(false)
  const [formErrors, setFormErrors] = React.useState(emptyErrors)
  const { id } = router.query

  useEffect(() => {
    if (!router.isReady) return
    if (activeStep === 2 && isFormDirty) {
      setIsTestRunning(true)
      const testSuite = ['qbp'];
      fetch(`/api/tests/connectiontest/${id}`, {
        method: 'POST',
        body: JSON.stringify({ testSuite }),
      })
        .then((res) => {
          if (!res.ok) {
            setOpenAlert(true)
          }
          return res.json()
        })
        .then((data) => {
          testResult = data.testResults[0].status
          setIsTestRunning(false)
          setIsFormDirty(false)
          if (testResult === 'FAIL') {
            setActiveStep((prevActiveStep) => prevActiveStep + 1)
          } else {
            setOpenAlert(true)
          }
        })
        .catch((err) => {
          throw new Error(err.message)
        })
    }
  }, [isFormDirty])

  if (mutationLoading || queryLoading) {
    return <div>Loading...</div>
  }

  if (mutationError || queryError) {
    throw new Error(mutationError?.message || queryError?.message)
  }

  const initialValues = {
    username: data.destinationById.username,
    password: data.destinationById.password,
    newPassword: '',
    confirmPassword: '',
    facility_id: data.destinationById.facility_id,
    MSH3: data.destinationById.MSH3,
    MSH4: data.destinationById.MSH4,
    MSH5: data.destinationById.MSH5,
    MSH6: data.destinationById.MSH6,
    MSH22: data.destinationById.MSH22,
    RXA11: data.destinationById.RXA11,
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

  const isFormChanged =
    JSON.stringify(formValues) !== JSON.stringify(initialValues)

  const handleCloseAlert = () => {
    setOpenAlert(false)
    setIsFormDirty(false)
  }

  const handleIAgreeButton = () => {
    setAgreed(true)
  }

  const handleSubmit = async () => {
    const response = await updateConnection({
      variables: {
        data: formValues,
        destId: data.destinationById.dest_id,
      },
    })
    if (response && response.data) {
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
    if (isFormChanged && activeStep === 2) {
      e.preventDefault()
      setIsNextButtonClicked(true)
      let hasErrors = false
      for (const field in formValues) {
        if (formValues[field] !== initialValues[field]) {
          // Added this so that it wont perform validation on existing values
          if (formValues[field] === '') {
            if (formValues.username === '') {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                username: `Username cannot be empty`,
              }))
              hasErrors = true
            } else if (formValues.MSH3 === '' && formValues.MSH4 === '') {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                MSH3: `At least one of MSH-3 and MSH-4 must be provided`,
              }))
              hasErrors = true
            } else if (formValues.MSH5 === '' && formValues.MSH6 === '') {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                MSH5: `At least one of MSH-5 and MSH-6 must be provided`,
              }))
              hasErrors = true
            }
          } else if (formValues[field] !== '') {
            if (!validationRules[field].test(formValues[field])) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                [field]: `${errorMessages[field]}`,
              }))
              hasErrors = true
            } else if (uuidValidate(formValues.newPassword)) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                newPassword: `Password can not be in the form of UUID`,
              }))
              hasErrors = true
            } else if (formValues.newPassword !== formValues.confirmPassword) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                confirmPassword: `Both New Password and Confirm New Password should match`,
              }))
              hasErrors = true
            } else if (
              formValues[field] !== null &&
              formValues.confirmPassword === formValues.facility_id
            ) {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                confirmPassword: `Password can not be same as Facility ID`,
              }))
              hasErrors = true
            } else {
              setFormErrors((prevErrors) => ({
                ...prevErrors,
                [field]: ``,
              }))
            }
          }
        }
      }
      if (!hasErrors) {
        if (
          formValues.newPassword !== '' &&
          formValues.confirmPassword !== ''
        ) {
          setFormValues((prevValues) => ({
            ...prevValues,
            password: formValues.newPassword,
          }))
        } else {
          setFormValues((prevValues) => ({
            ...prevValues,
            password: initialValues.password,
          }))
        }
        setIsFormDirty(true)
      }
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1)
    }
  }

  const StepperLine = styled(StepConnector)(() => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: '#EEEEEE',
      },
      top: 18,
      left: 'calc(-50% + 18px)',
      right: 'calc(50% + 18px)',
    },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: '#00D998',
      },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: '#00D998',
      },
    },
    [`& .${stepConnectorClasses.line}`]: {
      top: '18px',
      borderTopWidth: 2,
      borderRadius: 1,
    },
  }))

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
            Editing {data.destinationById.jurisdiction.description}{' '}
            {data.destinationById.dest_type.type}
          </Typography>
          <Typography gutterBottom align="center" variant="body1">
            Use the stepper to edit & manage sections of your connection
          </Typography>
        </Box>
        <Box mt={4} mb={4}>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            connector={<StepperLine />}
          >
            {steps.map((label, index) => {
              const stepProps: { completed?: boolean } = {}
              const labelProps: {
                optional?: React.ReactNode
              } = {}

              return (
                <Step key={label} {...stepProps}>
                  <StepLabel {...labelProps}>{label}</StepLabel>
                </Step>
              )
            })}
          </Stepper>
        </Box>

        {activeStep === 0 && (
          <ServiceAgreement clickOnAgree={handleIAgreeButton} agreed={agreed} />
        )}
        {activeStep === 1 && <Jurisdiction {...data} />}
        {activeStep === 2 &&
          (!isTestRunning ? (
            <Identify
              {...data}
              handleChange={handleFormFieldChange}
              value={formValues}
              formErrors={formErrors}
              isNextButtonClicked={isNextButtonClicked}
            />
          ) : (
            <Loader open={true} />
          ))}
        {openAlert && <AlertDialog open={openAlert} close={handleCloseAlert} />}
        {activeStep === 3 && <Verify {...data} value={formValues} />}

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
  )
}

export default EditConnection
