import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Container,
  Button,
  ButtonGroup,
  Slide,
  Typography,
  Divider,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import palette from '../../styles/theme/palette'
import { useContext } from 'react'
import CombinedContext from '../../contexts/app'
import { useRouter } from 'next/router'

interface cancelRequestDialogProps {
  open: boolean
  handleClose: () => void
  changeRequestId: number
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement
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
      `/api/changerequest/${props.changeRequestId}`,
      {
        method: 'DELETE',
      }
    )
    if (response.ok) {
      props.handleClose()
      router.push('/manageconnections')
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
          sx={{ borderRadius: '0px 0px 30px 30px' }}
        >
          <DialogTitle>
            <div>
              <Typography
                component="h2"
                sx={{ fontWeight: 'bold' }}
                variant="h6"
              >
                Cancel Request
              </Typography>
            </div>
          </DialogTitle>

          <Divider />
          <DialogContent>
            <div>
              <Typography
                id="reschedule-dialog-slide-description"
                variant="body1"
                color={palette.greyDarkTypography}
              >
                Please be aware that by proceeding, you&apos;ll be canceling
                your current request.Once you cancel your change, please note
                that any information related to it will not be saved.
              </Typography>
            </div>
          </DialogContent>
          <ButtonGroup
            variant="contained"
            color="inherit"
            fullWidth
            disableElevation
            sx={{
              alignItems: 'center',
              borderRadius: '30px',
              px: 2,
              pb: 1,
            }}
          >
            <Button
              id="cancel"
              variant="outlined"
              color="error"
              onClick={handleCancelRequest}
              sx={{ borderRadius: '30px' }}
            >
              Cancel Request
            </Button>
            <Button
              sx={{ backgroundColor: palette.greyLight, borderRadius: '30px' }}
              variant="text"
              color="inherit"
              onClick={props.handleClose}
              id="close"
            >
              Close
            </Button>
          </ButtonGroup>
        </Dialog>
      </Container>
    </div>
  )
}

export default CancelRequestDialog
