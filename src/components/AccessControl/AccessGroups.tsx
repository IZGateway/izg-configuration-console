import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import AddIcon from '@mui/icons-material/Add'
import palette from '../../styles/theme/palette'
import CustomDialogBox from '../DialogBox/CustomDialogBox'

interface AccessGroupsProps {
  data?: AccessGroup[]
  onEditGroup?: (group: AccessGroup) => void
  onAddGroup?: () => void
  onDeleteGroup?: (groupId: string) => void
}

interface AccessGroup {
  id: string
  groupName: string
  description: string
  memberCount: number
  roles: string[]
  members: string[]
}

const AccessGroups: React.FC<AccessGroupsProps> = ({
  data = [],
  onEditGroup,
  onAddGroup,
  onDeleteGroup,
}) => {
  const groups = data
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<AccessGroup | null>(null)

  const handleAddGroup = () => {
    onAddGroup?.()
  }

  const handleEditGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group && onEditGroup) {
      onEditGroup(group)
    }
  }

  const handleDeleteGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group) {
      setGroupToDelete(group)
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = () => {
    if (groupToDelete && onDeleteGroup) {
      onDeleteGroup(groupToDelete.id)
    }
    setDeleteDialogOpen(false)
    setGroupToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setGroupToDelete(null)
  }

  const actionButtonStyle = {
    borderRadius: 90,
    background: palette.white,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
    width: 35,
    height: 35,
    marginRight: 1,
  }

  return (
    <Box>
      {/* Access Groups Container */}
      <Box
        sx={{
          backgroundColor: palette.white,
          boxShadow: 1,
          borderRadius: '0px 0px 16px 16px',
          border: `1px solid ${palette.border}`,
          p: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Access Groups ({groups.length})
          </Typography>
        </Box>

        {/* Groups Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 3,
          }}
        >
          {groups.map((group) => (
            <Card
              key={group.id}
              sx={{
                borderRadius: '12px',
                boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.1)',
                border: `1px solid ${palette.border}`,
                position: 'relative',
                '&:hover': {
                  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Header with Actions */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  {/* Group Name */}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: '1.1rem',
                    }}
                  >
                    {group.groupName}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip arrow title="Edit">
                      <IconButton
                        sx={actionButtonStyle}
                        size="small"
                        color="primary"
                        onClick={() => handleEditGroup(group.id)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip arrow title="Delete">
                      <IconButton
                        sx={actionButtonStyle}
                        size="small"
                        color="error"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2, lineHeight: 1.4 }}
                >
                  {group.description}
                </Typography>

                {/* Members Section */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: 'text.primary',
                  }}
                >
                  Members (
                  {Array.isArray(group.members) ? group.members.length : 0})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {Array.isArray(group.members) &&
                    group.members.map((member, index) => (
                      <Chip
                        key={index}
                        label={member}
                        size="small"
                        sx={{
                          backgroundColor: '#e3f2fd',
                          color: palette.primary,
                          fontSize: '0.75rem',
                          height: '24px',
                          border: `1px solid ${palette.primary}`,
                        }}
                      />
                    ))}
                </Box>

                {/* Roles Section */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: 'text.primary',
                  }}
                >
                  Roles
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Array.isArray(group.roles) &&
                    group.roles.map((role, index) => (
                      <Chip
                        key={index}
                        label={role}
                        size="small"
                        sx={{
                          backgroundColor: '#f5f5f5',
                          color: 'text.primary',
                          fontSize: '0.75rem',
                          height: '24px',
                          border: '1px solid #d0d0d0',
                        }}
                      />
                    ))}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Add Group Card at Bottom */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px',
          backgroundColor: palette.white,
          borderRadius: '60px',
          boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
          marginTop: '24px',
          width: 'fit-content',
        }}
      >
        <Button
          color="primary"
          onClick={handleAddGroup}
          variant="text"
          startIcon={<AddIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          Add Group
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <CustomDialogBox
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        titleText="Delete Access Group"
        showCloseIcon={true}
        content={
          <>
            <Typography
              sx={{
                color: 'text.primary',
                fontSize: '1rem',
                lineHeight: 1.6,
              }}
            >
              Are you sure you want to delete the access group &quot;
              <Box component="span" sx={{ fontWeight: 600 }}>
                {groupToDelete?.groupName}
              </Box>
              &quot;?
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.875rem',
                mt: 2,
                lineHeight: 1.5,
              }}
            >
              This action cannot be undone. All members in this group will lose
              their assigned roles and permissions. Please confirm that you want
              to proceed with this deletion.
            </Typography>
          </>
        }
        actions={
          <Button
            onClick={handleConfirmDelete}
            variant="outlined"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete Group
          </Button>
        }
      />
    </Box>
  )
}

export default AccessGroups
