/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Tooltip,
  Box,
  ButtonGroup,
  Button,
  CircularProgress,
} from '@mui/material'
const ActionButtons = (props: {
  activeStep: number
  handlePrevious: any
  steps: any
  isScheduleButtonDisabled: boolean
  isSubmitting?: boolean
  isConfirming?: boolean
  handleSchedule: any
  handleNext: any
  isNextButtonDisabled: boolean
}) => {
  return (
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
          alignItems: 'center',
          borderRadius: '30px',
        }}
      >
        <Button
          id="previous"
          color="primary"
          variant="outlined"
          disabled={props.activeStep === 0}
          onClick={props.handlePrevious}
          sx={{
            borderRadius: '30px',
          }}
        >
          PREVIOUS
        </Button>
        {props.activeStep === props.steps.length - 1 ? (
          // IGDD-3566: the Tooltip stays bound to isScheduleButtonDisabled alone.
          // isSubmitting also disables the button, but it must not pop the date
          // prompt. The span is required because MUI cannot attach listeners to a
          // disabled child.
          <Tooltip
            arrow
            placement="bottom"
            title="Please select date and time"
            open={props.isScheduleButtonDisabled ? true : false}
          >
            <span style={{ width: '100%', display: 'inline-flex' }}>
              <Button
                id="schedule"
                type="submit"
                color="primary"
                variant="contained"
                fullWidth
                disabled={
                  props.isScheduleButtonDisabled ||
                  props.isSubmitting ||
                  props.isConfirming
                }
                onClick={props.handleSchedule}
                startIcon={
                  props.isSubmitting || props.isConfirming ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
                sx={{
                  borderRadius: '30px',
                }}
              >
                {props.isConfirming
                  ? 'CHECKING...'
                  : props.isSubmitting
                  ? 'SCHEDULING...'
                  : 'SCHEDULE'}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button
            id="next"
            type="submit"
            color="primary"
            variant="contained"
            onClick={props.handleNext}
            disabled={props.isNextButtonDisabled}
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
}

export default ActionButtons
