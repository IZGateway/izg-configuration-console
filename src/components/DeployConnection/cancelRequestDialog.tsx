import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Container,
  Button,
  Slide,
  Typography,
  Divider,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'
import { useContext } from 'react'
import CombinedContext from '../../contexts/app'
import CloseIcon from '@mui/icons-material/Close'
import { useRouter } from 'next/router'

interface cancelRequestDialogProps {
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

const CancelRequestDialog = (props: cancelRequestDialogProps) => {
  const { setAlert } = useContext(CombinedContext)
  const router = useRouter()

  const handleCancelRequest = async () => {
    const response = await fetch(
      `/api/changerequest/cancel/${props.destTypeId}/${props.destId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          requestedAt: new Date(),
        }),
      }
    )
    if (response.ok) {
      props.handleClose()
      router.push('/manage')
      setAlert({
        level: 'success',
        message: `Change request is cancelled successfully!`,
      })
    } else {
      setAlert({
        level: 'error',
        message: `Change request cancellation was not successful!. Please try again later!`,
      })
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
          aria-describedby="reschedule-dialog-slide-description"
          sx={{ minWidth: 275, borderRadius: '0px 0px 30px 30px' }}
        >
          <DialogTitle>
            <Typography component="h2" sx={{ fontWeight: 'bold' }} variant="h6">
              Cancel Request
            </Typography>
          </DialogTitle>
          <Button
            variant="text"
            color="primary"
            sx={{ float: 'right', marginTop: -8 }}
            onClick={props.handleClose}
            id="close"
          >
            CLOSE
            <CloseIcon sx={{ marginLeft: 1 }} />
          </Button>
          <Divider />
          <DialogContent>
            <DialogContentText>
              <Typography
                id="reschedule-dialog-slide-description"
                variant="body1"
                color={palette.greyDarkTypography}
              >
                Please be aware that by proceeding, you&apos;ll be canceling
                your current request.Once you cancel your change, please note
                that any information related to it will not be saved.
              </Typography>
            </DialogContentText>
          </DialogContent>
          <Button
            id="cancel"
            color="primary"
            variant="contained"
            onClick={handleCancelRequest}
            sx={{
              borderRadius: '30px',
            }}
          >
            Cancel Request
          </Button>
        </Dialog>
      </Container>
    </div>
  )
}

export default CancelRequestDialog
