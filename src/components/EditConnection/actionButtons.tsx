import { Tooltip, Box, ButtonGroup, Button } from '@mui/material'
import _ from 'lodash'
const ActionButtons = (props: {
  activeStep: number
  handlePrevious: any
  steps: any
  isScheduleButtonDisabled: boolean
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
          margin: '1em',
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
          <Tooltip
            arrow
            placement="bottom"
            title="Please select date and time"
            open={props.isScheduleButtonDisabled ? true : false}
          >
            <Button
              id="schedule"
              type="submit"
              color="primary"
              variant="contained"
              disabled={props.isScheduleButtonDisabled}
              onClick={props.handleSchedule}
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
