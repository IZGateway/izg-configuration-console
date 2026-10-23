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
import { useContext } from 'react'
import CombinedContext from '../../contexts/app'
import palette from '../../styles/theme/palette'

interface resetCircuitBreakerDialogProps {
  open: boolean
  handleClose: () => void
  destTypeId: number
  destId: string
  jurisdictionName: string
  destType: string
  row: { destUri?: string }
  updateRow: (row) => void
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

const ResetCircuitBreakerDialog = (props: resetCircuitBreakerDialogProps) => {
  const { setAlert } = useContext(CombinedContext)

  const handleConfirm = async () => {
    try {
      const response = await fetch(
        `/api/status/reset/${props.destTypeId}/${props.destId}`,
        {
          method: 'POST',
        }
      )
      if (response.ok) {
        // IGDD-3599: the hub clears the breaker on every instance it runs, and
        // answers 200 even when it did not reach them all. `resetComplete` is
        // the API's one-field verdict; it is absent against a hub older than
        // IGDD-3599, and the dialog then behaves as it did before.
        const { resetComplete, ...updatedStatus } = await response.json()

        // A reset that did not reach every instance is reported as a plain
        // failure, with the message this dialog has always used. Deliberate:
        // Manage Connections is reachable by `Jurisdiction Operations`, a
        // jurisdiction-scoped role, and the detail behind a partial reset is
        // Hub topology that a jurisdiction operator does not own and cannot
        // act on. The per-region view belongs to Admin Operations, which only
        // `IZG Operations` can reach. See the change's design D11.
        if (resetComplete === false) {
          setAlert({
            level: 'error',
            message: `Request to reset the circuit breaker for ${props.jurisdictionName} ${props.destType} was not successful. Please try again later.`,
          })
          return
        }

        // The row is left untouched above on the failure path, so it keeps
        // showing the tripped indicator rather than a status that contradicts
        // the message.
        props.updateRow({ ...props.row, ...updatedStatus })
        props.handleClose()
        setAlert({
          level: 'success',
          message: `Circuit breaker for ${props.jurisdictionName} ${' '} ${
            props.destType
          } has been reset successfully!`,
        })
      } else {
        setAlert({
          level: 'error',
          message: `Request to reset the circuit breaker for ${props.jurisdictionName} ${props.destType} was not successful. Please try again later.`,
        })
      }
    } catch {
      setAlert({
        level: 'error',
        message:
          'Failed to reset the circuit breaker due to a network error. Please try again later!',
      })
    }
  }

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
        aria-describedby="reset-circuit-breaker-dialog-slide-description"
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {'Reset Circuit Breaker'}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <DialogContentText>
            <Typography
              id="reset-circuit-breaker-dialog-slide-description"
              variant="body1"
              color={palette.greyDarkTypography}
              component={'span'}
            >
              Are you sure you want to reset the circuit breaker for{' '}
              {props.jurisdictionName} — {props.row?.destUri} (
              {props.destType})? This action will restore connectivity and log
              the reset.
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
              id="cancel"
              fullWidth
              type="submit"
              color="primary"
              variant="outlined"
              onClick={props.handleClose}
              sx={{
                borderRadius: '30px',
              }}
            >
              Cancel
            </Button>
            <Button
              id="confirm"
              fullWidth
              type="button"
              color="primary"
              variant="contained"
              onClick={handleConfirm}
              sx={{
                borderRadius: '30px',
              }}
            >
              Confirm
            </Button>
          </ButtonGroup>
        </Container>
      </Dialog>
    </Container>
  )
}

export default ResetCircuitBreakerDialog
