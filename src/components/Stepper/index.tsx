import React from 'react'
import { Step, StepLabel, Stepper } from '@mui/material'
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector'
import { styled } from '@mui/material/styles'

interface stepperProps {
  activeStep: number
  steps: string[]
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

const StepperComponent = (props: stepperProps) => {
  return (
    <Stepper
      activeStep={props.activeStep}
      alternativeLabel
      connector={<StepperLine />}
    >
      {props.steps.map((label) => {
        const stepProps: { completed?: boolean } = {}
        const labelProps: {
          optional?: React.ReactNode
        } = {}

        return (
          <Step key={label} {...stepProps}>
            <StepLabel data-testid="step-label" {...labelProps}>
              {label}
            </StepLabel>
          </Step>
        )
      })}
    </Stepper>
  )
}

export default StepperComponent
