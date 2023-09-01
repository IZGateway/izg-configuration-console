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
  TextField,
  Stack,
} from '@mui/material'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import InfoIcon from '@mui/icons-material/Info'
import { styled } from '@mui/material/styles'

const Schedule = (props: any) => {
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = React.useState(false)

  const handleASAPPicker = (event) => {
    props.setAsapSelected(true)
    props.setSelectedDate(null)
    props.setSelectedTime(null)
    setIsDateTimePickerOpen(false)
  }
  const handleDateTimePicker = (event) => {
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
            the implementation of your changes: submitting.
          </div>

          <RadioGroup
            aria-labelledby="demo-controlled-radio-buttons-group"
            name="controlled-radio-buttons-group"
            // onChange={props.setSchedule}
          >
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
              label="Schedule at a future date and time"
            />
            {isDateTimePickerOpen && (
              <LocalizationProvider dateAdapter={AdapterMoment}>
                <DatePicker
                  label="Date For Change *"
                  sx={{ marginBottom: 2, marginTop: 2 }}
                  onChange={(date) => {
                    props.setSelectedDate(date)
                  }}
                />
                <TimePicker
                  label="Time *"
                  onChange={(time) => {
                    props.setSelectedTime(time)
                  }}
                  format="HH:mm"
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
