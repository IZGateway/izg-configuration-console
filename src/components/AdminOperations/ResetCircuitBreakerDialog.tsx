import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  Divider,
  Box,
} from '@mui/material'

interface ResetCircuitBreakerDialogProps {
  open: boolean
  /** Human-readable description of what is being reset, e.g. "the Production environment". */
  target: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ResetCircuitBreakerDialog = ({
  open,
  target,
  loading = false,
  onConfirm,
  onCancel,
}: ResetCircuitBreakerDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="reset-circuit-breaker-title"
      aria-describedby="reset-circuit-breaker-description"
      PaperProps={{ sx: { borderRadius: 2, p: 1, maxWidth: 480 } }}
    >
      <DialogTitle id="reset-circuit-breaker-title" sx={{ fontWeight: 700 }}>
        Reset Circuit Breaker
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Typography id="reset-circuit-breaker-description" paragraph>
          Are you sure you want to reset the circuit breaker for {target}?
        </Typography>
        <Typography color="text.secondary">
          This action will restore connectivity and log the reset.
        </Typography>
      </DialogContent>
      <Box sx={{ display: 'flex', gap: 2, px: 3, pb: 2 }}>
        <Button
          id="confirm-reset-circuit-breaker"
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={loading}
          sx={{ borderRadius: 6, px: 4, textTransform: 'uppercase' }}
        >
          Confirm
        </Button>
        <Button
          id="cancel-reset-circuit-breaker"
          variant="outlined"
          color="primary"
          onClick={onCancel}
          disabled={loading}
          sx={{ borderRadius: 6, px: 4, textTransform: 'uppercase' }}
        >
          Cancel
        </Button>
      </Box>
    </Dialog>
  )
}

export default ResetCircuitBreakerDialog
