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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
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

  // Helper function to create labels with red asterisks
  const createLabelWithRedAsterisk = (text: string) => (
    <>
      {text.replace(' *', '')}{' '}
      <Box component="span" sx={{ color: palette.error }}>
        *
      </Box>
    </>
  )

  // Available sender options for dropdown in add mode
  const availableSenders = [
    { name: 'CDC Atlanta IIS', certificate: 'cdc-atlanta.immunizations.gov' },
    {
      name: 'State Health Department IIS',
      certificate: 'state-health-dept.gov',
    },
    { name: 'Regional Medical Center', certificate: 'regional-med-center.com' },
    { name: 'County Public Health', certificate: 'county-public-health.org' },
    {
      name: 'University Hospital System',
      certificate: 'university-hospital.edu',
    },
    {
      name: 'Private Practice Network',
      certificate: 'private-practice-net.com',
    },
    { name: 'Pharmacy Chain IIS', certificate: 'pharmacy-chain.com' },
    {
      name: 'Laboratory Information System',
      certificate: 'lab-info-system.net',
    },
    { name: 'Electronic Health Record System', certificate: 'ehr-system.com' },
    {
      name: 'Other Healthcare Provider',
      certificate: 'healthcare-provider.org',
    },
  ]

  const handleInputChange = (
    field: keyof SenderData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSenderChange = (senderName: string) => {
    const selectedSender = availableSenders.find(
      (sender) => sender.name === senderName
    )
    setFormData((prev) => ({
      ...prev,
      sender: senderName,
      senderDetails: selectedSender?.certificate || '',
    }))
  }

  // Form validation for required fields
  const isFormValid = () => {
    const requiredFields = [
      'id',
      'sender',
      'senderDetails',
      'destination',
      'destinationCode',
      'msh3',
      'msh4',
      'facilityId',
      'status',
    ]

    return requiredFields.every((field) => {
      const value = formData[field as keyof SenderData]
      return value !== null && value !== undefined && value !== ''
    })
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
              justifyContent: 'space-between',
            }}
          >
            <Typography
              id="title-table"
              sx={{ fontSize: '1.75rem', fontWeight: 700 }}
            >
              {isAddMode ? 'Add New Sender' : `Edit Sender: ${formData.sender}`}
            </Typography>
            <Button
              onClick={onCancel}
              variant="text"
              size="small"
              endIcon={<CloseIcon />}
              sx={{
                color: palette.primary,
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
              }}
            >
              Close
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {isAddMode ? (
              'Create a new sender entry for the onboarding system'
            ) : (
              <>
                Reference - Destination: {formData.destination} • Status:{' '}
                {formData.status} • Certificate: {formData.senderDetails}
              </>
            )}
          </Typography>
        </Box>
      </Box>

      {/* Main Form Container */}
      <Box
        sx={{
          backgroundColor: 'white',
          borderRadius: '0 0 32px 32px',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          margin: '0 auto',
          padding: '32px 16px',
        }}
      >
        {/* Instructions */}
        <Typography
          variant="body1"
          sx={{
            marginBottom: '24px',
            color: palette.black,
            lineHeight: 1.3,
            maxWidth: '1000px',
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
              label={createLabelWithRedAsterisk('Sender Identifier *')}
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
            {isAddMode ? (
              <FormControl fullWidth size="medium">
                <InputLabel>
                  {createLabelWithRedAsterisk('Sender Name *')}
                </InputLabel>
                <Select
                  value={formData.sender}
                  label="Sender Name *"
                  onChange={(e) => handleSenderChange(e.target.value)}
                  sx={{
                    borderRadius: '8px',
                  }}
                >
                  {availableSenders.map((sender) => (
                    <MenuItem key={sender.name} value={sender.name}>
                      {sender.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label={createLabelWithRedAsterisk('Sender Name *')}
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
            )}
            <TextField
              label={createLabelWithRedAsterisk('Sender Certificate Name *')}
              value={formData.senderDetails}
              variant="outlined"
              fullWidth
              size="medium"
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  backgroundColor: '#f5f5f5',
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  cursor: 'default',
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
              label={createLabelWithRedAsterisk('Destination *')}
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
              label={createLabelWithRedAsterisk('Destination Code *')}
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
              label={createLabelWithRedAsterisk('MSH-3 *')}
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
              label={createLabelWithRedAsterisk('MSH-4 *')}
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
              label={createLabelWithRedAsterisk('Facility ID *')}
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

        {/* Connection Type Callout - Only shown in Add Mode */}
        {isAddMode && (
          <Box sx={{ marginBottom: '32px' }}>
            <Box
              sx={{
                backgroundColor: '#f5f5f5',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <strong>Connection Type:</strong> New senders must start with
                onboarding connection type and can be upgraded to production
                after validation.
              </Typography>
            </Box>
          </Box>
        )}

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 1,
            mb: -2,
          }}
        >
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
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <Switch
              checked={formData.isConnected}
              onChange={(e) =>
                handleInputChange('isConnected', e.target.checked)
              }
              color="secondary"
              sx={{
                width: 62,
                height: 30,
                padding: 0,
                '& .MuiSwitch-switchBase': {
                  padding: 0,
                  boxShadow: 'none',

                  transitionDuration: '300ms',
                  '&.Mui-checked': {
                    transform: 'translateX(32px)',
                    color: '#fff',
                    '& + .MuiSwitch-track': {
                      opacity: 1,
                      border: 0,
                      boxShadow: 'none',
                    },
                    '&.Mui-disabled + .MuiSwitch-track': {},
                  },
                  '&.Mui-focusVisible .MuiSwitch-thumb': {
                    color: palette.secondary,
                  },
                  '&.Mui-disabled .MuiSwitch-thumb': {
                    color: '#fafafa',
                  },
                  '&.Mui-disabled + .MuiSwitch-track': {
                    opacity: 0.3,
                  },
                },
                '& .MuiSwitch-thumb': {
                  boxShadow: 'none',
                  width: 30,
                  height: 30,
                  border: `1px solid ${palette.secondary}`,
                },
                '& .MuiSwitch-track': {
                  borderRadius: 64 / 2,
                  backgroundColor: '#E9E9EA',
                  opacity: 1,
                  transition: 'background-color 0.3s',
                  position: 'relative',
                  dropShadow: 'none',

                  '&::before, &::after': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                  },
                  '&::before': {
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' height='16' width='16' viewBox='0 0 24 24'><text x='50%' y='50%' text-anchor='middle' dy='0.3em' font-family='Arial' font-size='8' fill='white'>ON</text></svg>")`,
                    left: 8,
                  },
                  '&::after': {
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' height='16' width='16' viewBox='0 0 24 24'><text x='50%' y='50%' text-anchor='middle' dy='0.3em' font-family='Arial' font-size='7' fill='%23666'>OFF</text></svg>")`,
                    right: 8,
                  },
                },
              }}
            />
          </Box>
        </Box>
        <Typography mb={2} variant="caption" color={'ButtonText'}>
          {formData.isConnected
            ? 'The connection is connected'
            : 'The connection is disconnected'}
        </Typography>
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
          borderRadius: '64px',
          padding: '16px',
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

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1,
          }}
        >
          <Tooltip
            title={
              isAddMode && !isFormValid()
                ? 'Please fill out all required fields before submitting'
                : ''
            }
            placement="top"
            arrow
          >
            <span>
              <Button
                variant="outlined"
                onClick={handleSave}
                disabled={isAddMode && !isFormValid()}
                sx={{
                  borderRadius: '24px',
                  padding: '12px 32px',
                  textTransform: 'none',
                  fontWeight: 500,
                  borderColor:
                    isAddMode && !isFormValid()
                      ? 'rgba(0, 0, 0, 0.23)'
                      : palette.primary,
                  color:
                    isAddMode && !isFormValid()
                      ? 'rgba(0, 0, 0, 0.26)'
                      : palette.primary,
                  '&:hover': {
                    borderColor:
                      isAddMode && !isFormValid()
                        ? 'rgba(0, 0, 0, 0.23)'
                        : palette.primaryDark,
                    backgroundColor:
                      isAddMode && !isFormValid()
                        ? 'transparent'
                        : 'rgba(25, 118, 210, 0.04)',
                  },
                  '&:disabled': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)',
                  },
                }}
              >
                {isAddMode ? 'Add Sender' : 'Save Changes'}
              </Button>
            </span>
          </Tooltip>
        </Box>
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
            <Button
              onClick={() => setStatusInfoOpen(false)}
              sx={{
                textTransform: 'none',
                color: palette.primary,
              }}
            >
              <CloseIcon />
            </Button>
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
