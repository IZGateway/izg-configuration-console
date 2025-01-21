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
  Box,
} from '@mui/material'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { DesktopTimePicker } from '@mui/x-date-pickers/DesktopTimePicker'
import Link from 'next/link'

const Schedule = (props: any) => {
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = React.useState(false)

  const handleASAPPicker = () => {
    props.setAsapSelected(true)
    props.setScheduledDateTime(null)
    setIsDateTimePickerOpen(false)
  }
  const handleDateTimePicker = () => {
    props.setAsapSelected(false)
    props.setfutureDateTimeSelected(true)
    setIsDateTimePickerOpen(true)
  }

  const shouldDisableDate = (date) => {
    const isWeekend = date.day() === 0 || date.day() === 6 // Sunday = 0, Saturday = 6
    return isWeekend
  }
  const subject = 'Urgent | Scheduling Change Request Assistance'
  const body = ''
  const email = 'izgateway@cdc.gov'
  const mailToLink = `mailto:${email}${
    subject ? `?subject=${encodeURIComponent(subject)}` : ''
  }${body ? `${subject ? '&' : '?'}body=${encodeURIComponent(body)}` : ''}`

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
            Thank you for submitting your configuration updates! We&apos;re here
            to help you implement them smoothly. Please note that an IZG
            Operations staff member will coordinate with you directly on the
            deployment timing. This is not an automated scheduling system, and
            the changes will not take effect immediately upon submission.
          </div>
          <Box mb={2}>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              You have two options for scheduling the implementation:
            </Typography>
            <ol>
              <li>
                <Typography variant="body1">
                  <strong>Future Time & Date:</strong>
                </Typography>
                <ul>
                  <li>Specify a preferred date and time for your changes.</li>
                  <li>All times must be in Eastern Time (ET).</li>
                  <li>
                    An IZG Operations staff member will coordinate with you.
                  </li>
                </ul>
              </li>
              <li>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>As Soon As Possible (ASAP):</strong>
                </Typography>
                <ul>
                  <li>
                    Choose this option if you&apos;d like the changes
                    implemented within the next 24–48 hours.
                  </li>
                  <li>
                    An IZG Operations staff member will contact you to finalize
                    and coordinate.
                  </li>
                </ul>
              </li>
            </ol>
          </Box>
          <Box mt={3}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Select a Method
            </Typography>
            <RadioGroup name="schedule-change-radio-buttons-group">
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel
                  value="Future Time & Date"
                  control={<Radio />}
                  onChange={handleDateTimePicker}
                  label="Future Time & Date"
                />
                <FormControlLabel
                  value="As Soon As Possible"
                  control={<Radio />}
                  onChange={handleASAPPicker}
                  label="As Soon As Possible"
                />
              </Box>
              {isDateTimePickerOpen && (
                <LocalizationProvider dateAdapter={AdapterMoment}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      mt: 2,
                    }}
                  >
                    <DatePicker
                      label="Date for Change"
                      disablePast
                      value={props.scheduledDateTime}
                      shouldDisableDate={shouldDisableDate}
                      onChange={(date) => {
                        props.setScheduledDateTime(date)
                      }}
                    />
                    <DesktopTimePicker
                      label="Time"
                      value={props.scheduledDateTime}
                      onChange={(date) => {
                        props.setScheduledDateTime(date)
                      }}
                      slotProps={{
                        textField: {
                          helperText:
                            '*Required with Date. Eastern Time Zone(ET)',
                        },
                        popper: {
                          sx: {
                            '& .MuiPaper-root': {
                              minWidth: '300px', // Set the minimum width for the pop-up
                            },
                            '& .css-bmoxj4-MuiList-root-MuiMultiSectionDigitalClockSection-root':
                              {
                                width: '100px',
                              },
                            '& .css-kjsgzp-MuiButtonBase-root-MuiMenuItem-root-MuiMultiSectionDigitalClockSection-item':
                              {
                                minWidth: '95%',
                              },
                            '& .css-1ed1o9w-MuiList-root-MuiMultiSectionDigitalClockSection-root':
                              {
                                width: '100%',
                              },
                          },
                        },
                      }}
                    />
                  </Box>
                </LocalizationProvider>
              )}
            </RadioGroup>
          </Box>
          <Typography variant="body2" gutterBottom sx={{ pt: 2 }}>
            Need help? Or have a urgent requests, please contact:
            <Link href={mailToLink}> izgateway@cdc.gov</Link>
          </Typography>
        </CardContent>
      </Card>
    </div>
  )
}

export default Schedule
