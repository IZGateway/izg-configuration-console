import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogContentText,
} from '@mui/material'

const AlertDialog = (props: any) => {
  return (
    <div>
      <Dialog
        open={props.open}
        onClose={props.close}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {'It looks like a value that you entered is incorrect'}
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
