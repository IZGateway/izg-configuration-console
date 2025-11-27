import React, { useState, useContext, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Box, Typography, Tabs, Tab } from '@mui/material'
import GroupIcon from '@mui/icons-material/Group'
import BlockIcon from '@mui/icons-material/Block'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import palette from '../../styles/theme/palette'

import AccessGroups from './AccessGroups'
import DenyList from './DenyList'
import AddDenyList from './AddDenyList'

import EditAccessGroup from './EditAccessGroup'
import AddAccessGroup from './AddAccessGroup'

import FileTypeList from './FileTypeList'
import AddFileTypeList from './AddFileTypeList'

import CustomSnackbar from '../SnackBar'
import CombinedContext from '../../contexts/app'
import fetcher from '../../lib/fetch'
import { type AccessGroup } from './AccessGroups'
import { type AccessGroupRecord } from '../../lib/type/AccessGroupRecord'
import { mockFileTypeListData, type FileTypeListItem } from './mockData'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`access-control-tabpanel-${index}`}
      aria-labelledby={`access-control-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0, boxShadow: 'none' }}>{children}</Box>
      )}
    </div>
  )
}

const AccessControlComponent = () => {
  const { alert, setAlert } = useContext(CombinedContext)
  const [tabValue, setTabValue] = useState(0)
  const [editGroupMode, setEditGroupMode] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<AccessGroup | null>(null)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [showSnackbar, setShowSnackbar] = useState(false)

  // Available members for dropdown (principals + groups)
  const [availableMembers, setAvailableMembers] = useState<string[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Deny List add mode state
  const [isAddingDeny, setIsAddingDeny] = useState(false)
  // Deny List add logic
  const handleAddDeny = () => setIsAddingDeny(true)
  const handleSaveDeny = async (item) => {
    try {
      const response = await fetch('/api/denylist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add deny list entry')
      }

      setIsAddingDeny(false)
      setAlert({
        level: 'success',
        jurisdiction: '',
        dest_type: '',
        message: `Deny list entry has been successfully added.`,
      })
    } catch (error) {
      setIsAddingDeny(false)
      setAlert({
        level: 'error',
        jurisdiction: '',
        dest_type: '',
        message: error.message || 'Failed to add deny list entry.',
      })
    }
  }
  const handleDeleteDeny = () => {
    setAlert({
      level: 'success',
      jurisdiction: '',
      dest_type: '',
      message: `Deny list entry has been successfully deleted.`,
    })
  }
  const handleCancelDeny = () => setIsAddingDeny(false)

  const [isAddingFileType, setIsAddingFileType] = useState(false)
  const [fileTypeData, setFileTypeData] =
    useState<FileTypeListItem[]>(mockFileTypeListData)
  const handleAddFileType = () => setIsAddingFileType(true)
  const handleSaveFileType = (item) => {
    setFileTypeData((prev) => [...prev, item])
    setIsAddingFileType(false)
    setAlert({
      level: 'success',
      jurisdiction: '',
      dest_type: '',
      message: `File Type List has been successfully added.`,
    })
  }

  const handleDeleteFileType = (id: string) => {
    setFileTypeData((prev) => prev.filter((item) => item.id !== id))
    setAlert({
      level: 'success',
      jurisdiction: '',
      dest_type: '',
      message: `File Type List entry has been successfully deleted.`,
    })
  }
  const handleCancelFileType = () => setIsAddingFileType(false)

  const { data: session } = useSession()
  const currentUserName = session?.user?.name || 'Unknown'

  // Manage actual data state
  const [accessGroupsData, setAccessGroupsData] = useState<AccessGroup[]>([])

  // Fetch access groups from API
  useEffect(() => {
    const fetchAccessGroups = async () => {
      try {
        const response = await fetcher<AccessGroupRecord[]>('/api/accessgroups')

        // Transform DynamoDB data to UI format
        console.log('Raw DynamoDB response:', response)
        const transformedData: AccessGroup[] = response.map((item) => {
          console.log('Processing item:', {
            sortKey: item.sortKey,
            environment: item.environment,
            groupName: item.groupName,
          })
          // Extract members
          let members: string[] = []

          // Add users if they exist
          if (Array.isArray(item.users)) {
            members = [...item.users]
          }

          // Also add groups if they exist
          if (Array.isArray(item.groups)) {
            members = [...members, ...item.groups]
          }

          // Extract roles
          let roles: string[] = []
          if (Array.isArray(item.roles)) {
            roles = item.roles
          }

          return {
            id: item.sortKey || `${item.environment}-${item.groupName}`,
            groupName: item.groupName || '',
            description: item.description || '',
            memberCount: members.length,
            roles: roles,
            members: members,
            environment: item.environment || '3',
          }
        })

        setAccessGroupsData(transformedData)
      } catch (error) {
        console.error('Failed to fetch access groups:', error)
        setAlert({
          level: 'error',
          jurisdiction: '',
          dest_type: '',
          message: 'Failed to load access groups. Please try again.',
        })
      }
    }

    fetchAccessGroups()
  }, [setAlert])

  // Fetch available members (principals + groups) for dropdown
  useEffect(() => {
    const fetchAvailableMembers = async () => {
      try {
        setIsLoadingMembers(true)

        // Fetch both organizations and access groups in parallel
        const [orgsResponse, groupsResponse] = await Promise.all([
          fetch('/api/organizations'),
          fetch('/api/accessgroups'),
        ])

        if (!orgsResponse.ok) {
          throw new Error('Failed to fetch organizations')
        }
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch access groups')
        }

        const [orgData, groupsData] = await Promise.all([
          orgsResponse.json(),
          groupsResponse.json(),
        ])

        // Extract all unique principals from all organizations
        const allPrincipals = new Set<string>()
        orgData.forEach((org: { principalNames?: string[] }) => {
          if (org.principalNames && Array.isArray(org.principalNames)) {
            org.principalNames.forEach((principal: string) =>
              allPrincipals.add(principal)
            )
          }
        })

        // Extract group names
        const allGroups = new Set<string>()
        groupsData.forEach((group: { groupName?: string }) => {
          if (group.groupName) {
            allGroups.add(group.groupName)
          }
        })

        // Combine principals and groups, then sort
        const combinedMembers = [
          ...Array.from(allPrincipals),
          ...Array.from(allGroups),
        ].sort()

        setAvailableMembers(combinedMembers)
      } catch (error) {
        console.error('Error fetching available members:', error)
        setAvailableMembers([])
      } finally {
        setIsLoadingMembers(false)
      }
    }

    fetchAvailableMembers()
  }, [accessGroupsData]) // Re-fetch when access groups change

  // Handle snackbar visibility
  useEffect(() => {
    setShowSnackbar(!!alert.level)
  }, [alert])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleEditGroup = (groupData: AccessGroup) => {
    console.log('Editing group data:', groupData)
    setSelectedGroup(groupData)
    setEditGroupMode(true)
  }

  const handleAddGroup = () => {
    setIsAddingGroup(true)
    setEditGroupMode(true)
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // Find the group name before deleting
      const groupToDelete = accessGroupsData.find(
        (group) => group.id === groupId
      )
      const groupName = groupToDelete?.groupName || 'Unknown'

      const response = await fetch(
        `/api/accessgroups/${encodeURIComponent(groupId)}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete access group')
      }

      // Remove the group from state
      setAccessGroupsData((prevGroups) =>
        prevGroups.filter((group) => group.id !== groupId)
      )

      // Show success message
      setAlert({
        level: 'success',
        jurisdiction: '',
        dest_type: '',
        message: `Access group "${groupName}" has been successfully deleted.`,
      })
    } catch (error) {
      console.error('Failed to delete access group:', error)
      setAlert({
        level: 'error',
        jurisdiction: '',
        dest_type: '',
        message:
          error.message || 'Failed to delete access group. Please try again.',
      })
    }
  }

  const handleSaveGroup = async (updatedData: AccessGroup) => {
    if (isAddingGroup) {
      // Adding new group - call API to create
      try {
        console.log('Creating new access group:', {
          groupName: updatedData.groupName,
          description: updatedData.description,
          roles: updatedData.roles,
          members: updatedData.members,
        })

        // Use environment from the form data
        const environment = updatedData.environment

        const response = await fetch('/api/accessgroups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            environment: environment,
            groupName: updatedData.groupName,
            description: updatedData.description,
            roles: updatedData.roles,
            users: updatedData.members.filter(
              (m) => m.includes('.') || m.includes('@')
            ), // Users typically have . or @
            groups: updatedData.members.filter(
              (m) => !m.includes('.') && !m.includes('@')
            ), // Groups don't
            createdBy: currentUserName,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(
            'Create failed with status:',
            response.status,
            errorData
          )
          throw new Error(errorData.error || 'Failed to create access group')
        }

        const createdGroup = await response.json()

        // Transform the response to match UI format
        const newGroup: AccessGroup = {
          id: createdGroup.sortKey,
          groupName: createdGroup.groupName,
          description: createdGroup.description,
          memberCount: updatedData.members.length,
          roles: Array.isArray(createdGroup.roles) ? createdGroup.roles : [],
          members: updatedData.members,
          environment: createdGroup.environment,
        }

        setAccessGroupsData((prevGroups) => [...prevGroups, newGroup])

        setAlert({
          level: 'success',
          jurisdiction: '',
          dest_type: '',
          message: `Access group "${updatedData.groupName}" has been successfully created.`,
        })
      } catch (error) {
        console.error('Failed to create access group:', error)
        setAlert({
          level: 'error',
          jurisdiction: '',
          dest_type: '',
          message:
            error.message || 'Failed to create access group. Please try again.',
        })

        return
      }
    } else {
      // Editing existing group - call API to update in database
      try {
        console.log('Updating access group:', {
          id: updatedData.id,
          groupName: updatedData.groupName,
          description: updatedData.description,
          roles: updatedData.roles,
          members: updatedData.members,
        })

        const response = await fetch(
          `/api/accessgroups/${encodeURIComponent(updatedData.id)}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              groupName: updatedData.groupName,
              description: updatedData.description,
              roles: updatedData.roles,
              users: updatedData.members.filter(
                (m) => m.includes('.') || m.includes('@')
              ), // Users typically have . or @
              groups: updatedData.members.filter(
                (m) => !m.includes('.') && !m.includes('@')
              ), // Groups don't
              updatedBy: currentUserName,
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(
            'Update failed with status:',
            response.status,
            errorData
          )
          throw new Error(errorData.error || 'Failed to update access group')
        }

        await response.json()

        // Update the local state with the updated data
        setAccessGroupsData((prevGroups) =>
          prevGroups.map((group) =>
            group.id === updatedData.id
              ? { ...updatedData, memberCount: updatedData.members.length }
              : group
          )
        )

        setAlert({
          level: 'success',
          jurisdiction: '',
          dest_type: '',
          message: `Access group "${updatedData.groupName}" has been successfully updated.`,
        })
      } catch (error) {
        console.error('Failed to update access group:', error)
        setAlert({
          level: 'error',
          jurisdiction: '',
          dest_type: '',
          message: 'Failed to update access group. Please try again.',
        })
        // Don't reset edit mode on error so user can try again
        return
      }
    }

    // Reset edit mode
    setEditGroupMode(false)
    setSelectedGroup(null)
    setIsAddingGroup(false)
  }

  const handleCancelGroupEdit = () => {
    setEditGroupMode(false)
    setSelectedGroup(null)
    setIsAddingGroup(false)
  }

  const handleCloseSnackbar = () => {
    setShowSnackbar(false)
    setAlert({
      level: '',
      jurisdiction: '',
      dest_type: '',
      message: '',
    })
  }

  if (isAddingDeny) {
    return (
      <AddDenyList
        onSave={handleSaveDeny}
        onCancel={handleCancelDeny}
        userName={currentUserName}
      />
    )
  }

  if (isAddingFileType) {
    return (
      <AddFileTypeList
        onSave={handleSaveFileType}
        onCancel={handleCancelFileType}
        userName={currentUserName}
      />
    )
  }

  return (
    <div>
      <Box>
        {!editGroupMode && (
          <Box
            sx={{
              position: 'relative',
              zIndex: 10,
              height: 'auto',
              boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.40)',
              marginBottom: '-16px',
              backgroundColor: palette.white,
              borderRadius: '4px',
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
                  Access Control
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Tab Content */}
      <Box sx={{ mt: 0.8, borderRadius: 3, boxShadow: 0 }}>
        {editGroupMode ? (
          // Show AddAccessGroup or EditAccessGroup component when in group edit mode
          isAddingGroup ? (
            <AddAccessGroup
              onSave={handleSaveGroup}
              onCancel={handleCancelGroupEdit}
              availableMembers={availableMembers}
              isLoadingMembers={isLoadingMembers}
            />
          ) : (
            <EditAccessGroup
              group={selectedGroup || undefined}
              onSave={handleSaveGroup}
              onCancel={handleCancelGroupEdit}
              availableMembers={availableMembers}
              isLoadingMembers={isLoadingMembers}
            />
          )
        ) : (
          <>
            {/* Tabs */}
            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                backgroundColor: palette.white,
                boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.25)',
              }}
            >
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="access control tabs"
                sx={{ pt: 1 }}
              >
                <Tab
                  icon={<GroupIcon />}
                  label="ACCESS GROUPS"
                  iconPosition="start"
                  sx={{ fontWeight: 'bold' }}
                />
                <Tab
                  icon={<BlockIcon />}
                  label="DENY LIST"
                  iconPosition="start"
                  sx={{ fontWeight: 'bold' }}
                />
                <Tab
                  icon={<UploadFileIcon />}
                  label="ADS FILE TYPES"
                  iconPosition="start"
                  sx={{ fontWeight: 'bold' }}
                />
              </Tabs>
            </Box>

            {/* Tab Panel 0 - Access Groups */}
            <TabPanel value={tabValue} index={0}>
              <AccessGroups
                data={accessGroupsData}
                onEditGroup={handleEditGroup}
                onAddGroup={handleAddGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            </TabPanel>

            {/* Tab Panel 1 - Deny List */}
            <TabPanel value={tabValue} index={1}>
              <DenyList
                onAddDeny={handleAddDeny}
                onDeleteDeny={handleDeleteDeny}
              />
            </TabPanel>

            {/* Tab Panel 2 - ADS File Types */}
            <TabPanel value={tabValue} index={2}>
              <FileTypeList
                data={fileTypeData}
                onAddFileType={handleAddFileType}
                onDeleteFileType={handleDeleteFileType}
              />
            </TabPanel>
          </>
        )}
      </Box>

      {/* Success/Error Snackbar */}
      <CustomSnackbar
        open={showSnackbar}
        severity={alert.level}
        message={alert.message}
        onClose={handleCloseSnackbar}
      />
    </div>
  )
}
export default AccessControlComponent
