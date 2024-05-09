import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Container,
  Button,
  Slide,
  Typography,
  Box,
  IconButton,
  TextField,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useContext, useState } from 'react'
import CombinedContext from '../../contexts/app'
import CloseIcon from '@mui/icons-material/Close'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import _ from 'lodash'
interface maintenanceDialogProps {
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

const MaintenanceDialog = (props: maintenanceDialogProps) => {
  const { setAlert } = useContext(CombinedContext)
  const [reinstatementDateTime, setReinstatementDateTime] = useState(null)
  const [startDateTime, setStartDateTime] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const isDisableConnectionButtonDisabled = !startDateTime || !message
  const handleDisableConnection = async () => {
    try {
      const response = await fetch(
        `/api/maintenance/create/${props.destTypeId}/${props.destId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDateTime,
            reinstatementDateTime,
            message,
          }),
        }
      )
      if (response.ok) {
        setStartDateTime(null)
        setReinstatementDateTime(null)
        setMessage('')
        props.handleClose()
        setAlert({
          level: 'success',
          message: `Maintenance request is created successfully!`,
        })
      } else {
        setAlert({
          level: 'error',
          message: `Maintenance request creation was not successful!. Please try again later!`,
        })
      }
    } catch (error) {
      throw new Error(error)
    }
  }
  const handleChange = (event: SelectChangeEvent) => {
    setMessage(event.target.value as string)
  }
  const handleStartDateChange = (date) => {
    setStartDateTime(date)
    if (reinstatementDateTime && date && date > reinstatementDateTime) {
      setError('Start date must be before end date')
    }
  }
  const handleReinstateDateChange = (date) => {
    setReinstatementDateTime(date)
    if (startDateTime && date && date < startDateTime) {
      setError('End date must be after start date')
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
          aria-describedby="maintenance-dialog-slide-description"
          sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}
        >
          <DialogTitle
            id="maintenance-dialog-title"
            sx={{ fontWeight: 'bold' }}
          >
            {'Disable Traffic Request'}
            <IconButton
              onClick={props.handleClose}
              sx={{ float: 'right', color: 'grey' }}
            >
              <CloseIcon sx={{ float: 'right', color: 'grey' }} />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <div>
              <Typography
                id="maintenance-dialog-slide-description"
                variant="body1"
                color={palette.greyDarkTypography}
              >
                To better assist you in disabling your connection, please
                provide the fill out the fields. All fields are required.
              </Typography>
            </div>
          </DialogContent>
          <Box sx={{ padding: 2 }}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DateTimePicker
                label="Start date and time*"
                disablePast
                onChange={handleStartDateChange}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    error: !!error,
                    helperText: error,
                  },
                }}
                sx={{ width: '100%', marginBottom: '24px' }}
              />
              <DateTimePicker
                label="Reinstatement date and time"
                disablePast
                onChange={handleReinstateDateChange}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    error: !!error,
                    helperText: error,
                  },
                }}
                sx={{ width: '100%', marginBottom: '32px' }}
              />
            </LocalizationProvider>
            <FormControl fullWidth required>
              <InputLabel id="message-select-label">Message</InputLabel>
              <Select
                labelId="message-select-label"
                id="message-select"
                value={message}
                label="Message"
                onChange={handleChange}
              >
                <MenuItem value={'Maintenance'}>
                  <strong>Maintenance : </strong> Endpoint and data sharing will
                  be temporarily disabled for server maintenance and updates,
                  including password changes.
                </MenuItem>
                <MenuItem value={'Troubleshooting'}>
                  <strong>Troubleshooting : </strong> Endpoint and data sharing
                  will be temporarily disabled for troubleshooting to isolate
                  issues.
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ padding: 2 }}>
            <Button
              id="disable"
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={handleDisableConnection}
              disabled={isDisableConnectionButtonDisabled}
              sx={{
                alignItems: 'center',
                borderRadius: '30px',
                color: palette.error,
              }}
            >
              Disable connection
            </Button>
          </Box>
        </Dialog>
      </Container>
    </div>
  )
}

export default MaintenanceDialog
