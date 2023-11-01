import * as React from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Radio,
  Divider,
  Typography,
  FormControlLabel,
  RadioGroup,
} from '@mui/material'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'

const Schedule = (props: any) => {
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = React.useState(false)

  const handleASAPPicker = () => {
    props.setAsapSelected(true)
    props.setScheduledDateTime(null)
    setIsDateTimePickerOpen(false)
  }
  const handleDateTimePicker = () => {
    props.setAsapSelected(false)
    setIsDateTimePickerOpen(true)
  }

  return (
    <div>
      <Card sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}>
        <CardHeader
          title={
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              Scheduling Your Changes
            </Typography>
          }
        />
        <Divider />
        <CardContent>
          <div>
            Thank you for making the necessary changes! We are excited to help
            you implement them seamlessly. You have two options for scheduling
            the implementation of your changes:
          </div>

          <RadioGroup name="schedule-change-radio-buttons-group">
            <FormControlLabel
              value="ScheduleASAP"
              control={<Radio />}
              onChange={handleASAPPicker}
              label="Schedule ASAP"
            />
            <FormControlLabel
              value="ScheduleFuture"
              control={<Radio />}
              onChange={handleDateTimePicker}
              label="Schedule at a future date and time (Eastern Standard Time)"
            />
            {isDateTimePickerOpen && (
              <LocalizationProvider dateAdapter={AdapterMoment}>
                <DateTimePicker
                  label="Deployment date and time"
                  disablePast
                  value={props.scheduledDateTime}
                  onChange={(date) => {
                    props.setScheduledDateTime(date)
                  }}
                />
              </LocalizationProvider>
            )}
            {/* <Tooltip title="We need some description text">
            <InfoIcon size="small" color="primary" />
          </Tooltip> */}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )
}

export default Schedule
