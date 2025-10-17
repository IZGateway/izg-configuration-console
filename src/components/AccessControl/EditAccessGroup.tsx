import React, { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import palette from '../../styles/theme/palette'
import { type AccessGroup } from './mockData'

interface EditAccessGroupProps {
  group?: AccessGroup
  onSave: (group: AccessGroup) => void
  onCancel: () => void
}

const EditAccessGroup: React.FC<EditAccessGroupProps> = ({
  group,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<AccessGroup>({
    id: group?.id || '',
    groupName: group?.groupName || '',
    description: group?.description || '',
    memberCount: group?.memberCount || 0,
    roles: group?.roles || [],
    members: group?.members || [],
  })

  // Available roles for selection
  const availableRoles = ['Admin', 'OPS', 'ADS', 'SOAP', 'User']

  // Available members for selection (in real app, this would come from API)
  const availableMembers = [
    'eHealthSign',
    'APHL OPS',
    'IZG OPS',
    'Administrations',
    'Security Team',
    'Data Analytics',
    'Support Staff',
  ]

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

  const handleRemoveRole = (roleToRemove: string) => {
    handleInputChange(
      'roles',
      formData.roles.filter((role) => role !== roleToRemove)
    )
  }

  const handleRemoveMember = (memberToRemove: string) => {
    handleInputChange(
      'members',
      formData.members.filter((member) => member !== memberToRemove)
    )
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
            }}
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
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />

          {/* Members Section */}
          <Box>
            <FormControl fullWidth>
              <InputLabel shrink>
                Members ({formData.members.length})
              </InputLabel>
              <Select
                multiple
                value={formData.members}
                onChange={(e) =>
                  handleInputChange('members', e.target.value as string[])
                }
                input={
                  <OutlinedInput
                    label={`Members (${formData.members.length})`}
                  />
                }
                displayEmpty
                renderValue={() => (
                  <Typography
                    variant="body1"
                    sx={{
                      color:
                        formData.members.length > 0
                          ? 'transparent'
                          : 'text.disabled',
                      fontSize: '1rem',
                    }}
                  >
                    {formData.members.length > 0
                      ? ''
                      : 'Select members for this group'}
                  </Typography>
                )}
                sx={{
                  borderRadius: '8px',
                }}
              >
                {availableMembers.map((member) => (
                  <MenuItem key={member} value={member}>
                    {member}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Selected Members Chips */}
            {formData.members.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {formData.members.map((member) => (
                  <Chip
                    key={member}
                    label={member}
                    onDelete={() => handleRemoveMember(member)}
                    deleteIcon={<CloseIcon />}
                    sx={{
                      backgroundColor: '#e3f2fd',
                      color: palette.primary,
                      fontSize: '0.875rem',
                      height: '32px',
                      border: `1px solid ${palette.primary}`,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Roles Section */}
          <Box>
            <FormControl fullWidth>
              <InputLabel shrink>Roles</InputLabel>
              <Select
                multiple
                value={formData.roles}
                onChange={(e) =>
                  handleInputChange('roles', e.target.value as string[])
                }
                input={<OutlinedInput label="Roles" />}
                displayEmpty
                renderValue={() => (
                  <Typography
                    variant="body1"
                    sx={{
                      color:
                        formData.roles.length > 0
                          ? 'transparent'
                          : 'text.disabled',
                      fontSize: '1rem',
                    }}
                  >
                    {formData.roles.length > 0
                      ? ''
                      : 'Select roles for this group'}
                  </Typography>
                )}
                sx={{
                  borderRadius: '8px',
                }}
              >
                {availableRoles.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Selected Roles Chips */}
            {formData.roles.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {formData.roles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    onDelete={() => handleRemoveRole(role)}
                    deleteIcon={<CloseIcon />}
                    sx={{
                      backgroundColor: '#f5f5f5',
                      color: 'text.primary',
                      fontSize: '0.875rem',
                      height: '32px',
                      border: '1px solid #d0d0d0',
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
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
          disabled={!formData.groupName.trim() || !formData.description.trim()}
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
