import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  IconButton,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { Info as InfoIcon, Close as CloseIcon } from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import { type SenderData } from './mockData'

interface EditSenderProps {
  senderData: SenderData
  onSave: (data: SenderData) => void
  onCancel: () => void
  isAddMode?: boolean
}

const EditSender: React.FC<EditSenderProps> = ({
  senderData,
  onSave,
  onCancel,
  isAddMode = false,
}) => {
  const [formData, setFormData] = useState<SenderData>(senderData)
  const [statusInfoOpen, setStatusInfoOpen] = useState(false)

  const handleInputChange = (
    field: keyof SenderData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const getStatusOptions = () => {
    if (formData.connectionType === 'production') {
      return [
        { value: 'Production Live', label: 'Production Live' },
        { value: 'Production Ready', label: 'Production Ready' },
      ]
    } else {
      return [
        { value: 'Test Validate', label: 'Test Validate' },
        { value: 'Testing Ready', label: 'Testing Ready' },
      ]
    }
  }

  const getStatusInfoData = () => {
    if (formData.connectionType === 'production') {
      return [
        {
          status: 'Production Live',
          description: 'Sender is actively transmitting production data',
          requirements: 'Full validation complete, certificates verified',
        },
        {
          status: 'Production Ready',
          description: 'Sender is approved for production but not yet active',
          requirements: 'All testing passed, awaiting go-live approval',
        },
      ]
    } else {
      return [
        {
          status: 'Test Validate',
          description: 'Sender is currently undergoing validation testing',
          requirements: 'Initial setup complete, testing in progress',
        },
        {
          status: 'Testing Ready',
          description: 'Sender is configured and ready for testing',
          requirements: 'Configuration validated, awaiting test data',
        },
      ]
    }
  }

  const handleSave = () => {
    // Auto-generate the lastUpdated field with current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })

    const updatedFormData = {
      ...formData,
      lastUpdated: currentDate,
    }

    onSave(updatedFormData)
  }

  return (
    <Box
      sx={{
        width: '100%',
      }}
    >
      {/* Title Header */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          height: 'auto',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
          marginBottom: '-16px',
          backgroundColor: palette.white,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            padding: 2,
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography
              id="title-table"
              sx={{ fontSize: '1.75rem', fontWeight: 700 }}
              flexGrow={1}
            >
              {isAddMode ? 'Add New Sender' : `Edit Sender: ${formData.sender}`}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {isAddMode
              ? 'Create a new sender entry for the onboarding system'
              : `Destination: ${formData.destination} • Status: ${formData.status} • Certificate: ${formData.senderDetails}`}
          </Typography>
        </Box>
      </Box>

      {/* Main Form Container */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          margin: '0 auto',
          padding: '32px 16px',
          marginTop: '16px',
        }}
      >
        {/* Instructions */}
        <Typography
          variant="body1"
          sx={{
            marginBottom: '24px',
            color: palette.black,
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          {isAddMode
            ? 'Use this form to create a new sender entry for onboarding. Fill in the required details for the sender, their intended destination, MSH information, and initial status. All fields marked with * are required.'
            : 'Use this form to edit an existing sender entry. Update the details for the sender, their intended destination, MSH information, and current status. The last updated date will be automatically set when you save your changes.'}
        </Typography>

        {/* Sender Info Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              marginBottom: '16px',
              color: palette.black,
            }}
          >
            Sender Info
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <TextField
              label="Sender Identifier *"
              value={formData.id}
              onChange={(e) => handleInputChange('id', e.target.value)}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: '16px',
            }}
          >
            <TextField
              label="Sender Name *"
              value={formData.sender}
              onChange={(e) => handleInputChange('sender', e.target.value)}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Sender Certificate Name *"
              value={formData.senderDetails}
              onChange={(e) =>
                handleInputChange('senderDetails', e.target.value)
              }
              variant="outlined"
              fullWidth
              size="medium"
              disabled={!isAddMode}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                },
              }}
            />
          </Box>
        </Box>

        {/* Destination Info Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              marginBottom: '16px',
              color: palette.black,
            }}
          >
            Destination Info
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: '16px',
            }}
          >
            <TextField
              label="Destination *"
              value={formData.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Destination Code *"
              value={formData.destinationCode}
              onChange={(e) =>
                handleInputChange('destinationCode', e.target.value)
              }
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>
        </Box>

        {/* MSH and Facility Info Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              marginBottom: '16px',
              color: palette.black,
            }}
          >
            MSH and Facility Info
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
              gap: '16px',
            }}
          >
            <TextField
              label="MSH-3 *"
              value={formData.msh3}
              onChange={(e) => handleInputChange('msh3', e.target.value)}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="MSH-4 *"
              value={formData.msh4}
              onChange={(e) => handleInputChange('msh4', e.target.value)}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
            <TextField
              label="Facility ID *"
              value={formData.facilityId}
              onChange={(e) => handleInputChange('facilityId', e.target.value)}
              variant="outlined"
              fullWidth
              size="medium"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Box>
        </Box>

        {/* Connection Type Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <FormLabel
            component="legend"
            sx={{
              fontWeight: 600,
              fontSize: '1.25rem',
              color: palette.black,
              marginBottom: '16px',
            }}
          >
            Connection Type
          </FormLabel>
          <RadioGroup
            value={formData.connectionType}
            onChange={(e) =>
              handleInputChange(
                'connectionType',
                e.target.value as 'production' | 'onboarding'
              )
            }
            row
          >
            <FormControlLabel
              value="onboarding"
              control={<Radio color="secondary" />}
              label="Onboarding"
            />
            <FormControlLabel
              value="production"
              control={<Radio color="secondary" />}
              label="Production"
            />
          </RadioGroup>
        </Box>

        {/* Status Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <FormLabel
            component="legend"
            sx={{
              fontWeight: 600,
              fontSize: '1.25rem',
              color: palette.black,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            Status
            <IconButton
              size="small"
              sx={{ color: palette.secondary }}
              onClick={() => setStatusInfoOpen(true)}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </FormLabel>
          <RadioGroup
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            row
          >
            {getStatusOptions().map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio color="secondary" />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        </Box>

        {/* Connection Section */}
        <Box sx={{ marginBottom: '32px' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              marginBottom: '16px',
              color: palette.black,
            }}
          >
            Connection
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Switch
              checked={formData.isConnected}
              onChange={(e) =>
                handleInputChange('isConnected', e.target.checked)
              }
              color="secondary"
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formData.isConnected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>
        </Box>

        {/* Help Text */}
        <Box>
          <Typography variant="body2" color="text.secondary">
            Need help? Or have a unique requests, please contact:{' '}
            <Box
              component="span"
              sx={{
                color: palette.primary,
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              izgateway@cdc.gov
            </Box>
          </Typography>
        </Box>
      </Box>

      {/* Action Buttons Card */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px 32px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          margin: '16px auto 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button
          variant="outlined"
          onClick={onCancel}
          color="error"
          sx={{
            borderRadius: '24px',
            padding: '12px 32px',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: 'rgba(211, 47, 47, 0.04)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="outlined"
          onClick={handleSave}
          sx={{
            borderRadius: '24px',
            padding: '12px 32px',
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
          {isAddMode ? 'Add Sender' : 'Save Changes'}
        </Button>
      </Box>

      {/* Status Information Dialog */}
      <Dialog
        open={statusInfoOpen}
        onClose={() => setStatusInfoOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            boxShadow: 'none',
            border: `1px solid ${palette.border}`,
          },
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Status Information -{' '}
              {formData.connectionType === 'production'
                ? 'Production'
                : 'Onboarding'}{' '}
            </Typography>
            <IconButton
              onClick={() => setStatusInfoOpen(false)}
              sx={{
                textTransform: 'none',
                color: palette.primary,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Requirements</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getStatusInfoData().map((statusInfo) => (
                  <TableRow key={statusInfo.status}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {statusInfo.status}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {statusInfo.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {statusInfo.requirements}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default EditSender
