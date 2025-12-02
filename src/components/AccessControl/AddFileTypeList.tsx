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
import { mockFileTypeListData, type FileTypeListItem } from './mockData'

interface AddFileTypeListProps {
  onSave: (item: FileTypeListItem) => void
  onCancel: () => void
  userName: string
}

const AddFileTypeList = ({
  onSave,
  onCancel,
}: AddFileTypeListProps) => {
  const fileTypeOptions = Array.from(
    new Set(mockFileTypeListData.map((item) => item.name))
  )
  const [formData, setFormData] = useState<Partial<FileTypeListItem>>({
    id: '',
    name: '',
    description: '',
  })

  // We'll use MUI's built-in required asterisk and style it red via sx

  const isFormValid = () => {
    return (
      formData.id &&
      formData.name &&
      formData.description
    )
  }

  const handleChange = (
    field: keyof FileTypeListItem,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!isFormValid()) return

    onSave({
      id: formData.id || '',
      name: formData.name || '',
      description: formData.description || '',
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
              Add to File Type List
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
            Use this form to add a new entry to the File Type List. All fields marked
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
          Use this form to create a new file type list entry. Fill in the required
          details. All fields marked with * are required.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* File Type Dropdown */}
          <FormControl
            fullWidth
            required
            sx={{ '& .MuiFormLabel-asterisk': { color: palette.error } }}
          >
            <InputLabel>File Type</InputLabel>
            <Select
              value={formData.name}
              label="File Type"
              onChange={(e) => handleChange('name', e.target.value)}
              sx={{ borderRadius: '8px' }}
            >
              {fileTypeOptions.map((fileType) => (
                <MenuItem key={fileType} value={fileType}>
                  {fileType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* ID */}
          <TextField
            label="ID"
            value={formData.id}
            onChange={(e) => handleChange('id', e.target.value)}
            variant="outlined"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              '& .MuiFormLabel-asterisk': { color: palette.error },
            }}
          />
          {/* Description*/}
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
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
              Add to File Type List
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default AddFileTypeList
