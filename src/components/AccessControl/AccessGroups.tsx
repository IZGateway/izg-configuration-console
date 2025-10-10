import React from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
} from '@mui/material'
import {
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import { mockAccessGroups, type AccessGroup } from './mockData'

interface AccessGroupsProps {
  data?: AccessGroup[]
}

const AccessGroups: React.FC<AccessGroupsProps> = ({ data = [] }) => {
  const groups = data.length > 0 ? data : mockAccessGroups

  const handleAddGroup = () => {
    console.log('Add new group clicked')
  }

  const handleEditGroup = (groupId: string) => {
    console.log('Edit group:', groupId)
  }

  const handleDeleteGroup = (groupId: string) => {
    console.log('Delete group:', groupId)
  }

  return (
    <Box
      sx={{
        backgroundColor: palette.white,
        boxShadow: 2,
        borderRadius: '0px 16px 16px 16px',
        p: 3,
      }}
    >
      {/* Header with Add Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Access Groups ({groups.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddGroup}
          sx={{
            backgroundColor: palette.primary,
            color: '#fff',
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: palette.primary,
              opacity: 0.9,
            },
          }}
        >
          Add Group
        </Button>
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
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.1)',
              border: `1px solid ${palette.border}`,
              position: 'relative',
              '&:hover': {
                boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
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
                <GroupIcon sx={{ color: palette.primary, fontSize: 24 }} />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleEditGroup(group.id)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: palette.primary },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteGroup(group.id)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Group Name */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  fontSize: '1.1rem',
                }}
              >
                {group.groupName}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, lineHeight: 1.4 }}
              >
                {group.description}
              </Typography>

              {/* User Count */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  mb: 2,
                  color: 'text.primary',
                }}
              >
                Users ({group.userCount})
              </Typography>

              {/* Roles */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {group.roles.map((role, index) => (
                  <Chip
                    key={index}
                    label={role}
                    size="small"
                    sx={{
                      backgroundColor: '#f5f5f5',
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      height: '24px',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}

export default AccessGroups
