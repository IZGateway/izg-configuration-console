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
import {
  hubOperationLevel,
  regionsNotComplete,
} from '../../lib/utils/hubregionstatus'

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
        // IGDD-3599: the hub resets the breaker on every instance it runs and
        // reports a status per region. `regions` is taken out before the
        // merge, because the row is a data-grid row and the column
        // definitions do not expect it. The `status` in the rest of the body
        // describes the instance that answered, so it is still the right
        // value for the row — but it does not say the whole fleet recovered.
        const { regions, ...updatedStatus } = await response.json()
        props.updateRow({ ...props.row, ...updatedStatus })
        props.handleClose()

        // The hub answers 200 even when a region did not fully reset, so the
        // status code cannot decide this. An older hub sends no block, and the
        // level is then undefined: keep the pre-IGDD-3599 message.
        const level = hubOperationLevel(regions)
        const destination = `${props.jurisdictionName} ${' '} ${props.destType}`

        if (level === 'warning' || level === 'error') {
          setAlert({
            level: level,
            message: `Circuit breaker for ${destination} was not reset on every Hub instance. Still not complete: ${regionsNotComplete(
              regions
            ).join(', ')}.`,
            persistent: true,
          })
        } else {
          setAlert({
            level: 'success',
            message: `Circuit breaker for ${destination} has been reset successfully!`,
          })
        }
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
