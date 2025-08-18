import React from 'react'
import { Step, StepLabel, Stepper } from '@mui/material'
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector'
import { styled } from '@mui/material/styles'
import palette from '../../styles/theme/palette'

interface stepperProps {
  activeStep: number
  steps: string[]
}

const StepperLine = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: palette.greyMain,
    },
    top: 12,
    left: 'calc(-50% + 18px)',
    right: 'calc(50% + 18px)',
    '@media (max-width: 768px)': {
      display: 'none', // Hide connectors on mobile for vertical layout
    },
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: palette.primaryLight,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: palette.primaryLight,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    top: '18px',
    borderTopWidth: 2,
    borderRadius: 1,
  },
  // Vertical connector for mobile
  '@media (max-width: 768px)': {
    [`&.${stepConnectorClasses.vertical}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: palette.greyMain,
        borderLeftWidth: 2,
        minHeight: 20,
      },
    },
    [`&.${stepConnectorClasses.active}.${stepConnectorClasses.vertical}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: palette.primaryLight,
      },
    },
    [`&.${stepConnectorClasses.completed}.${stepConnectorClasses.vertical}`]: {
      [`& .${stepConnectorClasses.line}`]: {
        borderColor: palette.primaryLight,
      },
    },
  },
}))

const StepperComponent = (props: stepperProps) => {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize() // Set initial value
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <Stepper
      activeStep={props.activeStep}
      alternativeLabel={!isMobile}
      orientation={isMobile ? 'vertical' : 'horizontal'}
      connector={<StepperLine />}
      sx={{
        '@media (max-width: 768px)': {
          padding: '16px 0',
          '& .MuiStepLabel-root': {
            padding: '8px 0',
          },
          '& .MuiStepLabel-label': {
            fontSize: '0.875rem',
            fontWeight: 500,
          },
          '& .MuiStepIcon-root': {
            fontSize: '1.5rem',
          },
        },
      }}
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
