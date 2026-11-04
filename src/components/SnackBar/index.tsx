import * as React from 'react'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps } from '@mui/material/Alert'

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

// IGDD-3566: autoHideDuration is optional so that one caller can make a message
// wait for a dismissal. Pass null to keep it on screen. Every other caller keeps
// the 6 second default.
const CustomSnackbar = ({
  open,
  severity,
  message,
  onClose,
  autoHideDuration = 6000,
}) => {
  const vertical = 'bottom'
  const horizontal = 'center'

  const handleClose = (
    event: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return
    }

    onClose()
  }

  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical, horizontal }}
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={handleClose}
        key={vertical + horizontal}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          sx={{ width: '100%', borderRadius: '30px' }}
        >
          {message || `This is a ${severity} message!`}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default CustomSnackbar
