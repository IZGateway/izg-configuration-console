import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Container,
  Button,
  Slide,
  Typography,
  Divider,
  Box,
  IconButton,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useContext, useState } from 'react'
import CombinedContext from '../../contexts/app'
import CloseIcon from '@mui/icons-material/Close'
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

const MaintenanceDialog = (props: resetDialogProps) => {
  const { setAlert } = useContext(CombinedContext)

  const [reinstatementDateTime, setReinstatementDateTime] = useState(null)
  const [startDateTime, setStartDateTime] = useState(null)
  const isDisableConnectionButtonDisabled =
    !reinstatementDateTime || !startDateTime
  const handleDisableConnection = () => {}
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
          <Divider />
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
          <Box sx={{ paddingLeft: 4 }}>
            <LocalizationProvider dateAdapter={AdapterMoment}>
              <DateTimePicker
                label="Start date and time"
                disablePast
                onChange={(date) => {
                  setStartDateTime(date)
                }}
                slotProps={{
                  textField: {
                    required: true,
                  },
                }}
                sx={{ marginRight: 4, marginTop: 2 }}
              />
              <DateTimePicker
                label="Reinstatement date and time*"
                disablePast
                onChange={(date) => {
                  setReinstatementDateTime(date)
                }}
                sx={{ marginRight: 4, marginTop: 2 }}
              />
            </LocalizationProvider>
          </Box>
          <Button
            id="disable"
            color="error"
            variant="outlined"
            onClick={handleDisableConnection}
            disabled={isDisableConnectionButtonDisabled}
            sx={{
              alignItems: 'center',
              borderRadius: '30px',
              marginTop: 2,
            }}
          >
            Disable connection
          </Button>
        </Dialog>
      </Container>
    </div>
  )
}

export default MaintenanceDialog
