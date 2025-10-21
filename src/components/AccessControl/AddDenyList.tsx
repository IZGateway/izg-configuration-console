import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import { mockDenyListData, type DenyListItem } from './mockData'

interface AddDenyListProps {
  onSave: (item: DenyListItem) => void
  onCancel: () => void
  userName: string
}

const AddDenyList: React.FC<AddDenyListProps> = ({
  onSave,
  onCancel,
  userName,
}) => {
  const nameOptions = Array.from(
    new Set(mockDenyListData.map((item) => item.name))
  )
  const [formData, setFormData] = useState<Partial<DenyListItem>>({
    name: '',
    certificationName: '',
    environment: 'Production' as 'Production' | 'Onboarding', // default
    reason: '',
  })

  // We'll use MUI's built-in required asterisk and style it red via sx

  const isFormValid = () => {
    return (
      formData.name &&
      formData.certificationName &&
      formData.environment &&
      formData.reason
    )
  }

  const handleChange = (
    field: keyof DenyListItem,
    value: string | ('Production' | 'Onboarding')
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!isFormValid()) return
    const now = new Date()
    const dateDenied = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
    const environmentValue =
      (formData.environment as 'Production' | 'Onboarding') || 'Production'

    onSave({
      id: `${Date.now()}`,
      name: formData.name || '',
      certificationName: formData.certificationName || '',
      environment: environmentValue,
      reason: formData.reason || '',
      deniedBy: userName,
      dateDenied,
    })
  }

  return (
    <Box sx={{ width: '100%' }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 2, gap: 1 }}>
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
              Add to Deny List
            </Typography>
            <Button
              onClick={onCancel}
              endIcon={<CloseIcon />}
              size="small"
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
            Use this form to add a new entry to the Deny List. All fields marked
            with * are required.
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
        <Typography
          variant="body1"
          sx={{
            marginBottom: '24px',
            color: palette.black,
            lineHeight: 1.3,
            maxWidth: '800px',
          }}
        >
          Use this form to create a new deny list entry. Fill in the required
          details. All fields marked with * are required.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Name Dropdown */}
          <FormControl
            fullWidth
            required
            sx={{ '& .MuiFormLabel-asterisk': { color: palette.error } }}
          >
            <InputLabel>Name</InputLabel>
            <Select
              value={formData.name}
              label="Name *"
              onChange={(e) => handleChange('name', e.target.value)}
              sx={{ borderRadius: '8px' }}
            >
              {nameOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Certification Name */}
          <TextField
            label="Certification Name"
            value={formData.certificationName}
            onChange={(e) => handleChange('certificationName', e.target.value)}
            variant="outlined"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              '& .MuiFormLabel-asterisk': { color: palette.error },
            }}
          />
          {/* Environment */}
          <FormControl
            fullWidth
            required
            sx={{
              '& .MuiFormLabel-asterisk': { color: palette.error },
            }}
          >
            <InputLabel>Environment</InputLabel>
            <Select
              value={formData.environment}
              label="Environment"
              onChange={(e) => handleChange('environment', e.target.value)}
              sx={{ borderRadius: '8px' }}
            >
              <MenuItem value="Onboarding">Onboarding</MenuItem>
              <MenuItem value="Production">Production</MenuItem>
            </Select>
          </FormControl>
          {/* Reason */}
          <TextField
            label="Reason"
            value={formData.reason}
            onChange={(e) => handleChange('reason', e.target.value)}
            variant="outlined"
            fullWidth
            required
            multiline
            minRows={2}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              '& .MuiFormLabel-asterisk': { color: palette.error },
            }}
          />
          {/* Denied By and Date Denied are set automatically on save */}
        </Box>

        {/* Help Text */}
        <Box sx={{ mt: 4 }}>
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
        <Tooltip
          title={
            !isFormValid()
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
              disabled={!isFormValid()}
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
                '&:disabled': {
                  borderColor: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)',
                },
              }}
            >
              Add to Deny List
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default AddDenyList
