import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogContentText,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface alertDialogProps {
  open: boolean
  close: any
}

const AlertDialog = (props: alertDialogProps) => {
  return (
    <div>
      <Dialog
        open={props.open}
        onClose={props.close}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ color: 'red' }}>
          {'It looks like a value that you entered is incorrect'}
          <IconButton
            onClick={props.close}
            sx={{ float: 'right', color: 'grey' }}
          >
            <CloseIcon sx={{ float: 'right', color: 'grey' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            It seems like there was an error in the information you provided.
            Please review your inputs and ensure that all required fields are
            filled out correctly. If you continue to experience difficulties,
            please provide more specific information about the issue so that I
            can better assist you. Thank you.
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AlertDialog
