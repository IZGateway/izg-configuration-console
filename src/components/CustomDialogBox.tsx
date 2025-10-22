import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import palette from '../styles/theme/palette'

interface CustomDialogBoxProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  titleText?: string
  showCloseIcon?: boolean
  content?: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
}

const CustomDialogBox: React.FC<CustomDialogBoxProps> = ({
  open,
  onClose,
  title,
  titleText,
  showCloseIcon = false,
  content,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
}) => {
  // Render title with optional close icon
  const renderTitle = () => {
    if (title) return title
    if (titleText) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '8px',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {titleText}
          </Typography>
          {showCloseIcon && (
            <IconButton
              onClick={onClose}
              sx={{
                textTransform: 'none',
                color: palette.primary,
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      )
    }
    return null
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          boxShadow: 'none',
          border: `1px solid ${palette.border}`,
        },
      }}
    >
      {(title || titleText) && <DialogTitle>{renderTitle()}</DialogTitle>}
      {content && <DialogContent>{content}</DialogContent>}
      {actions && (
        <DialogActions sx={{ padding: '16px 24px' }}>{actions}</DialogActions>
      )}
    </Dialog>
  )
}

export default CustomDialogBox
