import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogContentText,
  ButtonGroup,
  Container,
  Button,
  Slide,
  Typography,
  Divider,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'

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

const customPaperStyles = {
  borderRadius: '0px 0px 30px 30px',
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
  paddingBottom: '16px',
}

const ResetDialog = (props: resetDialogProps) => {
  return (
    <Container maxWidth="sm">
      <Dialog
        PaperProps={{
          style: customPaperStyles,
        }}
        open={props.open}
        TransitionComponent={Transition}
        onClose={props.handleClose}
        keepMounted
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>
          {
            'Are you sure you want to delete this draft and revert all data fields to their current production values?'
          }
        </DialogTitle>
        <Divider />
        <DialogContent>
          <DialogContentText>
            <Typography
              id="alert-dialog-slide-description"
              variant="body1"
              color={palette.greyDarkTypography}
              component={'span'}
            >
              All data fields will be reset to their orginial values once you
              have confirmed. Please be sure you want to take this action.
            </Typography>
          </DialogContentText>
        </DialogContent>
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
              fullWidth
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
              fullWidth
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
      </Dialog>
    </Container>
  )
}

export default ResetDialog
