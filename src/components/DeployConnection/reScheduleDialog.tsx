import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  ButtonGroup,
  Container,
  Button,
  Slide,
  Typography,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useContext, useState } from 'react'
import CombinedContext from '../../contexts/app'
import { useRouter } from 'next/router'
interface resetDialogProps {
  open: boolean
  handleClose: any
  destTypeId: any
  destId: any
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />
})

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const RescheduleDialog = (props: resetDialogProps) => {
  const { setAlert } = useContext(CombinedContext)
  const router = useRouter()

  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState(null)
  const [asapSelected, setAsapSelected] = useState(false)

  const handleASAPPicker = () => {
    setAsapSelected(true)
    setScheduledDateTime(null)
    setIsDateTimePickerOpen(false)
  }
  const handleDateTimePicker = () => {
    setAsapSelected(false)
    setIsDateTimePickerOpen(true)
  }
  const isScheduleButtonDisabled = asapSelected
    ? !asapSelected
    : !scheduledDateTime
  const handleReSchedule = async () => {
    const scheduledAt = asapSelected
      ? new Date().toISOString()
      : scheduledDateTime
    const response = await fetch(
      `/api/changerequest/update/${props.destTypeId}/${props.destId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          isAsap: asapSelected,
          scheduledAt: scheduledAt,
          requestedAt: new Date(),
        }),
      }
    )
    if (response.ok) {
      props.handleClose()
      router.push('/manageconnections')
      setAlert({
        level: 'success',
        message: `New scheduled Date Time is updated successfully!`,
      })
    } else {
      setAlert({
        level: 'error',
        message: `Updating new scheduled Date Time was not successful. Please try again later!`,
      })
    }
  }
  return (
    <div>
      <Container>
        <Dialog
          PaperProps={{
            style: customPaperStyles,
          }}
          open={props.open}
          TransitionComponent={Transition}
          onClose={props.handleClose}
          keepMounted
          aria-describedby="reschedule-dialog-slide-description"
          sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}
        >
          <DialogTitle>
            <div>
              <Typography
                component="h2"
                sx={{ fontWeight: 'bold' }}
                variant="h6"
              >
                Reschedule Options
              </Typography>
            </div>
          </DialogTitle>
          <Divider />
          <DialogContent>
            <div>
              <Typography
                id="reschedule-dialog-slide-description"
                variant="body1"
                color={palette.greyDarkTypography}
              >
                Before proceeding, please note that you&apos;re about to
                reschedule your change request. You have two options: you can
                reschedule it now, or you can choose a later date that suits you
                better.
              </Typography>
            </div>
          </DialogContent>
          <RadioGroup
            name="reschedule-change-radio-buttons-group"
            sx={{ paddingLeft: 4 }}
          >
            <FormControlLabel
              value="RescheduleASAP"
              control={<Radio />}
              onChange={handleASAPPicker}
              label="Reschedule ASAP"
            />
            <FormControlLabel
              value="RescheduleFuture"
              control={<Radio />}
              onChange={handleDateTimePicker}
              label="Reschedule at a future date and time (Eastern Standard Time)"
            />
            {isDateTimePickerOpen && (
              <LocalizationProvider dateAdapter={AdapterMoment}>
                <DateTimePicker
                  label="Deployment date and time"
                  disablePast
                  onChange={(date) => {
                    setScheduledDateTime(date)
                  }}
                  sx={{ marginRight: 4, marginTop: 2 }}
                />
              </LocalizationProvider>
            )}
          </RadioGroup>
          <ButtonGroup
            variant="contained"
            color="inherit"
            fullWidth
            disableElevation
            sx={{
              alignItems: 'center',
              borderRadius: '30px',
              px: 2,
              pt: 4,
              pb: 1,
            }}
          >
            <Button
              id="reschedule"
              fullWidth
              color="primary"
              variant="contained"
              onClick={handleReSchedule}
              disabled={isScheduleButtonDisabled}
              sx={{
                borderRadius: '30px',
              }}
            >
              Schedule Now
            </Button>
            <Button
              id="close"
              fullWidth
              sx={{ backgroundColor: palette.greyLight, borderRadius: '30px' }}
              onClick={props.handleClose}
            >
              Close
            </Button>
          </ButtonGroup>
        </Dialog>
      </Container>
    </div>
  )
}

export default RescheduleDialog
