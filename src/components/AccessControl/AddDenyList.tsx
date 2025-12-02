import React, { useEffect, useState } from 'react'
import { Box, Typography, TextField, Button, Tooltip } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import { DenyListItem } from '../../lib/type/DenyList'
import StandardSelect from '../Dropdown/StandardSelect'
import EnvironmentSelect, {
  getFirstAvailableEnvironment,
} from '../Dropdown/EnvironmentSelect'

interface AddDenyListProps {
  onSave: (item: DenyListItem) => void
  onCancel: () => void
  userName: string
}

interface Organization {
  organizationName: string
  principalNames: string[]
}

const AddDenyList: React.FC<AddDenyListProps> = ({
  onSave,
  onCancel,
  userName,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null)
  const [formData, setFormData] = useState<Partial<DenyListItem>>({
    name: '',
    certificationName: '',
    environment: getFirstAvailableEnvironment(), // default to first available environment
    reason: '',
  })

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch('/api/organizations')

        if (!response.ok) {
          throw new Error('Failed to fetch organizations')
        }

        const orgData = await response.json()
        const processedOrgs: Organization[] = orgData.map(
          (org: Organization) => {
            let principalNames: string[] = []

            principalNames = Array.from(org.principalNames)

            return {
              organizationName: org.organizationName || 'Unknown Organization',
              principalNames: principalNames,
            }
          }
        )

        setOrganizations(processedOrgs)

        console.log(
          'Loaded organizations:',
          processedOrgs.map((org) => ({
            name: org.organizationName,
            principals: org.principalNames,
          }))
        )
      } catch (error) {
        console.error('Error fetching organizations:', error)
        setOrganizations([])
      }
    }

    fetchOrganizations()
  }, [])

  // Simple conversion between environment string ('1'-'5') and numeric index
  const envStringToIndex = (envString: string): number => {
    const num = parseInt(envString, 10)
    return num >= 1 && num <= 5 ? num : 3
  }

  const envIndexToString = (envIndex: number): string => {
    return envIndex >= 1 && envIndex <= 5 ? String(envIndex) : '3'
  }

  // We'll use MUI's built-in required asterisk and style it red via sx

  const isFormValid = () => {
    return (
      formData.name &&
      formData.certificationName &&
      formData.environment &&
      formData.reason
    )
  }

  const handleChange = (field: keyof DenyListItem, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleOrganizationChange = (organizationName: string) => {
    const org = organizations.find(
      (o) => o.organizationName === organizationName
    )
    setSelectedOrganization(org || null)

    setFormData((prev) => ({
      ...prev,
      name: organizationName,
      certificationName: '',
    }))
  }

  const handleSave = () => {
    if (!isFormValid()) return

    onSave({
      certificationName: formData.certificationName || '',
      environment: formData.environment as number,
      reason: formData.reason || '',
      deniedBy: userName,
      id: '',
      name: formData.name || '',
      createdBy: userName,
      createdOn: new Date(),
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
          <StandardSelect
            label="Name"
            value={formData.name || ''}
            options={organizations.map((org) => ({
              value: org.organizationName,
              label: org.organizationName,
            }))}
            onChange={handleOrganizationChange}
            required
            placeholder="Select an organization"
          />
          {/* Certificate Name */}
          <StandardSelect
            label="Certificate Name"
            value={formData.certificationName || ''}
            options={
              !selectedOrganization ||
              selectedOrganization.principalNames.length === 0
                ? []
                : selectedOrganization.principalNames.map((principal) => ({
                    value: principal,
                    label: principal,
                  }))
            }
            onChange={(value) => handleChange('certificationName', value)}
            required
            disabled={!selectedOrganization}
            placeholder={
              !selectedOrganization
                ? 'Select an organization first'
                : selectedOrganization.principalNames.length === 0
                ? 'No principals available'
                : 'Select a certificate'
            }
          />
          {/* Environment */}
          <EnvironmentSelect
            value={envIndexToString(formData.environment as number)}
            onChange={(value) =>
              handleChange('environment', envStringToIndex(value))
            }
            required
          />
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
