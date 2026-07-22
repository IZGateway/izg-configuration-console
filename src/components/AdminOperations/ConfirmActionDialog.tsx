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

interface ConfirmActionDialogProps {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmActionDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-action-title"
      aria-describedby="confirm-action-description"
      PaperProps={{ sx: { borderRadius: 2, p: 1, maxWidth: 480 } }}
    >
      <DialogTitle id="confirm-action-title" sx={{ fontWeight: 700 }}>
        {title}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Typography id="confirm-action-description">{message}</Typography>
      </DialogContent>
      <Box sx={{ display: 'flex', gap: 2, px: 3, pb: 2 }}>
        <Button
          id="confirm-action"
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={loading}
          sx={{ borderRadius: 6, px: 4, textTransform: 'uppercase' }}
        >
          {confirmLabel}
        </Button>
        <Button
          id="cancel-action"
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

export default ConfirmActionDialog
