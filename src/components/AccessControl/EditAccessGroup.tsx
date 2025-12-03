import React, { useState, useEffect } from 'react'
import { Box, Typography, TextField, Button } from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import { type AccessGroup } from './AccessGroups'
import SearchableMultiSelect from '../Dropdown/SearchableMultiSelect'
import EnvironmentSelect from '../Dropdown/EnvironmentSelect'

interface EditAccessGroupProps {
  group?: AccessGroup
  onSave: (group: AccessGroup) => void
  onCancel: () => void
  availableMembers?: string[]
  isLoadingMembers?: boolean
}

const EditAccessGroup: React.FC<EditAccessGroupProps> = ({
  group,
  onSave,
  onCancel,
  availableMembers = [],
  isLoadingMembers = false,
}) => {
  const [formData, setFormData] = useState<AccessGroup>({
    id: group?.id || '',
    groupName: group?.groupName || '',
    description: group?.description || '',
    memberCount: group?.memberCount || 0,
    roles: group?.roles || [],
    members: group?.members || [],
    environment: group?.environment || '3', // Default to ONBOARD
  })

  // Update formData when group prop changes
  useEffect(() => {
    if (group) {
      setFormData({
        id: group.id || '',
        groupName: group.groupName || '',
        description: group.description || '',
        memberCount: group.memberCount || 0,
        roles: group.roles || [],
        members: group.members || [],
        environment: group.environment || '3',
      })
    }
  }, [group])

  // Static roles list as requested
  const availableRoles = ['admin', 'internal', 'operations', 'soap', 'users']

  // Filter out the current group from available members to prevent self-reference
  const filteredMembers = React.useMemo(() => {
    if (!group?.groupName) return availableMembers
    return availableMembers.filter((member) => member !== group.groupName)
  }, [availableMembers, group?.groupName])

  const handleInputChange = (
    field: keyof AccessGroup,
    value: string | number | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Update member count when members change
      ...(field === 'members' &&
        Array.isArray(value) && { memberCount: (value as string[]).length }),
    }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  const isEditing = Boolean(group?.id)

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
              {!isEditing
                ? 'Add New Access Group'
                : `Edit Access Group: ${formData.groupName}`}
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
            {!isEditing
              ? 'Create a new access group to organize users with similar permissions'
              : `Modify the access group settings, roles, and member assignments`}
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
            maxWidth: '800px',
          }}
        >
          Use this form to {isEditing ? 'edit an existing' : 'create a new'}{' '}
          access group. Define the group name, description, assign roles, and
          add members. Groups help organize users with similar access
          requirements.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Group Name */}
          <TextField
            label="Group Name"
            placeholder="Enter a descriptive name for this access group"
            value={formData.groupName}
            onChange={(e) => handleInputChange('groupName', e.target.value)}
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
              '& .MuiInputLabel-asterisk': {
                color: palette.error,
              },
            }}
          />

          {/* Environment */}
          <EnvironmentSelect
            value={formData.environment}
            onChange={(value) => handleInputChange('environment', value)}
            required
            disabled={isEditing}
            helperText={
              isEditing ? 'Environment cannot be changed after creation' : ''
            }
          />

          {/* Description */}
          <TextField
            label="Description"
            placeholder="Provide a detailed description of this group's purpose and responsibilities"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />

          {/* Members Section */}
          <SearchableMultiSelect
            label={`Members (${formData.members.length})`}
            value={formData.members}
            options={filteredMembers}
            onChange={(newValue) => handleInputChange('members', newValue)}
            placeholder="Search and select members for this group"
            disabled={isLoadingMembers}
            chipColor="primary"
          />

          {/* Roles Section */}
          <SearchableMultiSelect
            label="Roles"
            value={formData.roles}
            options={availableRoles}
            onChange={(newValue) => handleInputChange('roles', newValue)}
            placeholder="Search and select roles for this group"
            required
            chipColor="default"
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
        <Button
          variant="outlined"
          onClick={handleSave}
          disabled={!formData.groupName.trim() || formData.roles.length === 0}
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
          {isEditing ? 'Update Group' : 'Create Group'}
        </Button>
      </Box>
    </Box>
  )
}

export default EditAccessGroup
