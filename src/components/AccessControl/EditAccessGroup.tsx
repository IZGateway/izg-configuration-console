import React, { useState, useEffect } from 'react'
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
import { Close as CloseIcon } from '@mui/icons-material'
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

  // Static roles list as requested
  const availableRoles = ['admin', 'internal', 'operations', 'soap', 'users']

  // Fetch available members from organization principals
  const [availableMembers, setAvailableMembers] = useState<string[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)

  useEffect(() => {
    const fetchMembersData = async () => {
      try {
        setIsLoadingMembers(true)

        // Fetch organization principals
        const orgsResponse = await fetch('/api/organizations')
        if (!orgsResponse.ok) {
          throw new Error('Failed to fetch organizations')
        }
        const orgData = await orgsResponse.json()

        // Extract all unique principals from all organizations
        const allPrincipals = new Set<string>()
        orgData.forEach((org: { principalNames?: string[] }) => {
          if (org.principalNames && Array.isArray(org.principalNames)) {
            org.principalNames.forEach((principal: string) =>
              allPrincipals.add(principal)
            )
          }
        })

        // Fetch access groups
        const groupsResponse = await fetch('/api/accessgroups')
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch access groups')
        }
        const groupsData = await groupsResponse.json()

        // Extract group names (sortKey format is "environment#groupName", we want just the groupName)
        // Exclude the current group being edited to prevent self-reference
        const allGroups = new Set<string>()
        groupsData.forEach(
          (group: { groupName?: string; sortKey?: string }) => {
            if (group.groupName && group.groupName !== formData.groupName) {
              allGroups.add(group.groupName)
            }
          }
        )

        // Combine principals and groups, then sort
        const combinedMembers = [
          ...Array.from(allPrincipals),
          ...Array.from(allGroups),
        ].sort()

        setAvailableMembers(combinedMembers)
      } catch (error) {
        console.error('Error fetching members data:', error)
        setAvailableMembers([])
      } finally {
        setIsLoadingMembers(false)
      }
    }

    fetchMembersData()
  }, [formData.groupName])

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
  const isAddMode = !isEditing

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
              {isAddMode
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
            {isAddMode
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
          <Box>
            <FormControl fullWidth>
              <InputLabel shrink>
                Members ({formData.members.length})
                {isLoadingMembers && ' (Loading...)'}
              </InputLabel>
              <Select
                multiple
                value={formData.members}
                onChange={(e) =>
                  handleInputChange('members', e.target.value as string[])
                }
                disabled={isLoadingMembers}
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
            <FormControl fullWidth required>
              <InputLabel
                shrink
                sx={{
                  '& .MuiInputLabel-asterisk': {
                    color: palette.error,
                  },
                }}
              >
                Roles
              </InputLabel>
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
