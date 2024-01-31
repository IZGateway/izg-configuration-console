import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogContentText,
  DialogActions,
  ButtonGroup,
  Container,
  Button,
  Slide,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'

interface resetDialogProps {
  open: boolean
  handleClose: any
  resetDraft: any
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />
})

const ResetDialog = (props: resetDialogProps) => {
  return (
    <div>
      <Container maxWidth="sm">
        <Dialog
          open={props.open}
          TransitionComponent={Transition}
          onClose={props.handleClose}
          keepMounted
          aria-describedby="alert-dialog-slide-description"
          sx={{ borderRadius: '0px 0px 30px 30px' }}
        >
          <DialogTitle>
            {
              'Are you sure you want to revert to production values and lost this draft?'
            }
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-slide-description">
              All data fields will be reset to their orginial values once you
              have confirmed. Please be sure you want to take this action.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Container maxWidth="sm">
              <ButtonGroup
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  alignItems: 'center',
                  borderRadius: '30px',
                }}
              >
                <Button
                  id="no"
                  type="submit"
                  color="primary"
                  variant="outlined"
                  onClick={props.handleClose}
                  sx={{
                    borderRadius: '30px',
                  }}
                >
                  No
                </Button>
                <Button
                  id="yes"
                  type="submit"
                  color="primary"
                  variant="contained"
                  onClick={props.resetDraft}
                  sx={{
                    borderRadius: '30px',
                  }}
                >
                  Yes
                </Button>
              </ButtonGroup>
            </Container>
          </DialogActions>
        </Dialog>
      </Container>
    </div>
  )
}

export default ResetDialog
