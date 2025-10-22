import React, { useState } from 'react'
import {
  IconButton,
  Tooltip,
  Chip,
  Box,
  Button,
  Typography,
} from '@mui/material'
import {
  VerticalAlignBottom as VerticalAlignBottomIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import { SenderData } from './mockData'
import CustomDialogBox from '../CustomDialogBox'

interface StatusPromoteDemoteProps {
  sender: SenderData
  onStatusChange: (senderId: string, newStatus: string) => void
  size?: 'small' | 'medium'
}

const StatusPromoteDemote: React.FC<StatusPromoteDemoteProps> = ({
  sender,
  onStatusChange,
  size = 'medium',
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    direction: 'up' | 'down'
    newStatus: string
  } | null>(null)

  // Status color mapping function - always secondary
  const getStatusColor = (): 'secondary' => {
    return 'secondary'
  }

  // Status hierarchies based on connection type
  const getStatusHierarchy = (connectionType: 'production' | 'onboarding') => {
    if (connectionType === 'production') {
      return ['Production Ready', 'Production Live']
    } else {
      return ['Testing Ready', 'Test Validate']
    }
  }

  const statusHierarchy = getStatusHierarchy(sender.connectionType)

  const getNextStatus = (currentStatus: string, direction: 'up' | 'down') => {
    const currentIndex = statusHierarchy.findIndex(
      (status) => status.toLowerCase() === currentStatus.toLowerCase()
    )

    if (currentIndex === -1) return currentStatus

    if (direction === 'up' && currentIndex < statusHierarchy.length - 1) {
      return statusHierarchy[currentIndex + 1]
    } else if (direction === 'down' && currentIndex > 0) {
      return statusHierarchy[currentIndex - 1]
    }

    return currentStatus
  }

  const handleStatusChange = (direction: 'up' | 'down') => {
    const newStatus = getNextStatus(sender.status, direction)
    if (newStatus !== sender.status) {
      setPendingAction({ direction, newStatus })
      setConfirmOpen(true)
    }
  }

  const handleConfirm = () => {
    if (pendingAction) {
      onStatusChange(sender.id, pendingAction.newStatus)
    }
    setConfirmOpen(false)
    setPendingAction(null)
  }

  const handleCancel = () => {
    setConfirmOpen(false)
    setPendingAction(null)
  }

  // Determine if we should show promote or demote button (toggle logic)
  const getStatusAction = (status: string) => {
    const currentStatus = status.toLowerCase()
    const currentIndex = statusHierarchy.findIndex(
      (s) => s.toLowerCase() === currentStatus
    )

    // If at the bottom of hierarchy, show promote
    if (currentIndex === 0) return 'promote'
    // If at the top of hierarchy, show demote
    if (currentIndex === statusHierarchy.length - 1) return 'demote'
    // For middle statuses, default to promote
    return 'promote'
  }

  const canPromote = () => {
    const currentIndex = statusHierarchy.findIndex(
      (s) => s.toLowerCase() === sender.status.toLowerCase()
    )
    return currentIndex < statusHierarchy.length - 1
  }

  const canDemote = () => {
    const currentIndex = statusHierarchy.findIndex(
      (s) => s.toLowerCase() === sender.status.toLowerCase()
    )
    return currentIndex > 0
  }

  const action = getStatusAction(sender.status)
  const buttonSize = size === 'small' ? 22 : 22

  const buttonStyle = {
    borderRadius: 90,
    background: '#FFFFFF',
    width: buttonSize,
    padding: '12px',
    height: buttonSize,
    marginLeft: '-0.5px',
    border: `1px solid ${palette.secondary}`,
  }

  const promoteStyle = {
    ...buttonStyle,
    marginRight: 4,
  }

  const demoteStyle = {
    ...buttonStyle,
    marginRight: 4,
  }

  if (action === 'promote' && canPromote()) {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={sender.status}
            size="small"
            color={getStatusColor()}
            variant="outlined"
            avatar={
              <Tooltip
                title={`Promote to ${getNextStatus(sender.status, 'up')}`}
              >
                <IconButton
                  style={promoteStyle}
                  size={size}
                  color="secondary"
                  onClick={() => handleStatusChange('up')}
                  sx={{ py: 1.5, pr: 1 }}
                >
                  <UpgradeIcon
                    sx={{
                      color: palette.secondary,
                      fontSize: size === 'small' ? '14px' : '16px',
                    }}
                  />
                </IconButton>
              </Tooltip>
            }
          />
        </Box>

        {/* Confirmation Dialog */}
        <CustomDialogBox
          open={confirmOpen}
          onClose={handleCancel}
          maxWidth="sm"
          fullWidth
          titleText="Confirm Status Change"
          showCloseIcon
          content={
            <>
              <Typography variant="body1" sx={{ marginBottom: 2 }}>
                Are you sure you want to{' '}
                {pendingAction?.direction === 'up' ? 'promote' : 'demote'} this
                sender?
              </Typography>
              <Box
                sx={{
                  backgroundColor: palette.grey[50],
                  padding: 2,
                  borderRadius: 1,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, marginBottom: 1 }}
                >
                  Status Change Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Sender:</strong> {sender.sender}
                </Typography>
                <Typography variant="body2">
                  <strong>Current Status:</strong> {sender.status}
                </Typography>
                <Typography variant="body2">
                  <strong>New Status:</strong> {pendingAction?.newStatus}
                </Typography>
                <Typography variant="body2">
                  <strong>Connection Type:</strong> {sender.connectionType}
                </Typography>
              </Box>
            </>
          }
          actions={
            <Button
              onClick={handleConfirm}
              variant="outlined"
              sx={{
                borderRadius: '24px',
                padding: '8px 24px',
                textTransform: 'none',
                fontWeight: 500,
                borderColor: palette.primary,
                color: palette.primary,
                '&:hover': {
                  borderColor: palette.primaryDark,
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
              }}
            >
              Confirm {pendingAction?.direction === 'up' ? 'Promote' : 'Demote'}
            </Button>
          }
        />
      </>
    )
  }

  if (action === 'demote' && canDemote()) {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={sender.status}
            size="small"
            color={getStatusColor()}
            variant="outlined"
            sx={{ py: 1.5, pr: 1 }}
            avatar={
              <Tooltip
                title={`Demote to ${getNextStatus(sender.status, 'down')}`}
              >
                <IconButton
                  style={demoteStyle}
                  size={size}
                  onClick={() => handleStatusChange('down')}
                >
                  <VerticalAlignBottomIcon
                    sx={{
                      color: palette.secondary,
                      fontSize: size === 'small' ? '14px' : '16px',
                    }}
                  />
                </IconButton>
              </Tooltip>
            }
          />
        </Box>

        {/* Confirmation Dialog */}
        <CustomDialogBox
          open={confirmOpen}
          onClose={handleCancel}
          maxWidth="sm"
          fullWidth
          titleText="Confirm Status Change"
          showCloseIcon={true}
          content={
            <>
              <Typography variant="body1" sx={{ marginBottom: 2 }}>
                Are you sure you want to{' '}
                {pendingAction?.direction === 'up' ? 'promote' : 'demote'} this
                sender?
              </Typography>
              <Box
                sx={{
                  backgroundColor: palette.grey[50],
                  padding: 2,
                  borderRadius: 1,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, marginBottom: 1 }}
                >
                  Status Change Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Sender:</strong> {sender.sender}
                </Typography>
                <Typography variant="body2">
                  <strong>Current Status:</strong> {sender.status}
                </Typography>
                <Typography variant="body2">
                  <strong>New Status:</strong> {pendingAction?.newStatus}
                </Typography>
                <Typography variant="body2">
                  <strong>Connection Type:</strong> {sender.connectionType}
                </Typography>
              </Box>
            </>
          }
          actions={
            <Button
              onClick={handleConfirm}
              variant="outlined"
              sx={{
                borderRadius: '24px',
                padding: '8px 24px',
                textTransform: 'none',
                fontWeight: 500,
                borderColor: palette.primary,
                color: palette.primary,
                '&:hover': {
                  borderColor: palette.primaryDark,
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
              }}
            >
              Confirm {pendingAction?.direction === 'up' ? 'Promote' : 'Demote'}
            </Button>
          }
        />
      </>
    )
  }

  // If no action available, just show the status chip
  return (
    <>
      <Chip
        label={sender.status}
        size="small"
        color={getStatusColor()}
        variant="outlined"
      />

      {/* Confirmation Dialog */}
      <CustomDialogBox
        open={confirmOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        titleText="Confirm Status Change"
        showCloseIcon={true}
        content={
          <>
            <Typography variant="body1" sx={{ marginBottom: 2 }}>
              Are you sure you want to{' '}
              {pendingAction?.direction === 'up' ? 'promote' : 'demote'} this
              sender?
            </Typography>
            <Box
              sx={{
                backgroundColor: palette.grey[50],
                padding: 2,
                borderRadius: 1,
                border: `1px solid ${palette.border}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, marginBottom: 1 }}
              >
                Status Change Details:
              </Typography>
              <Typography variant="body2">
                <strong>Sender:</strong> {sender.sender}
              </Typography>
              <Typography variant="body2">
                <strong>Current Status:</strong> {sender.status}
              </Typography>
              <Typography variant="body2">
                <strong>New Status:</strong> {pendingAction?.newStatus}
              </Typography>
              <Typography variant="body2">
                <strong>Connection Type:</strong> {sender.connectionType}
              </Typography>
            </Box>
          </>
        }
        actions={
          <Button
            onClick={handleConfirm}
            variant="outlined"
            sx={{
              borderRadius: '24px',
              padding: '8px 24px',
              textTransform: 'none',
              fontWeight: 500,
              borderColor: palette.primary,
              color: palette.primary,
              '&:hover': {
                borderColor: palette.primaryDark,
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
          >
            Confirm {pendingAction?.direction === 'up' ? 'Promote' : 'Demote'}
          </Button>
        }
      />
    </>
  )
}

export default StatusPromoteDemote
