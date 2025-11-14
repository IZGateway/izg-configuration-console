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

import {
  type AccessGroup,
  mockAccessGroups,
  mockDenyListData,
  type DenyListItem,
  mockFileTypeListData,
  type FileTypeListItem,
} from './mockData'

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
  // Deny List add mode state
  const [isAddingDeny, setIsAddingDeny] = useState(false)
  // Deny List data state (seeded with mock data so table shows demo rows and new entries append)
  const [denyListData, setDenyListData] =
    useState<DenyListItem[]>(mockDenyListData)
  // Deny List add logic
  const handleAddDeny = () => setIsAddingDeny(true)
  const handleSaveDeny = (item) => {
    setDenyListData((prev) => [...prev, item])
    setIsAddingDeny(false)
    setAlert({
      level: 'success',
      jurisdiction: '',
      dest_type: '',
      message: `Deny list entry has been successfully added.`,
    })
  }
  const handleDeleteDeny = (id: string) => {
    setDenyListData((prev) => prev.filter((item) => item.id !== id))
    setAlert({
      level: 'success',
      jurisdiction: '',
      dest_type: '',
      message: `Deny list entry has been successfully deleted.`,
    })
  }
  const handleCancelDeny = () => setIsAddingDeny(false)

  const [isAddingFileType, setIsAddingFileType] = useState(false)
  const [fileTypeData, setFileTypeData] = useState<FileTypeListItem[]>(mockFileTypeListData)
  const handleAddFileType = () =>  setIsAddingFileType(true)
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
  const [accessGroupsData, setAccessGroupsData] =
    useState<AccessGroup[]>(mockAccessGroups)

  // Handle snackbar visibility
  useEffect(() => {
    setShowSnackbar(!!alert.level)
  }, [alert])

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleEditGroup = (groupData: AccessGroup) => {
    setSelectedGroup(groupData)
    setEditGroupMode(true)
  }

  const handleAddGroup = () => {
    setIsAddingGroup(true)
    setEditGroupMode(true)
  }

  const handleDeleteGroup = (groupId: string) => {
    // Remove the group from state
    setAccessGroupsData((prevGroups) =>
      prevGroups.filter((group) => group.id !== groupId)
    )

    // Show success message
    setAlert({
      level: 'success',
      jurisdiction: '',
      dest_type: '',
      message: `Access group has been successfully deleted.`,
    })

    // TODO: Implement API call to delete group
  }

  const handleSaveGroup = (updatedData: AccessGroup) => {
    if (isAddingGroup) {
      // Adding new group - generate new ID and add to state
      const newGroup: AccessGroup = {
        ...updatedData,
        id: `group-${Date.now()}`, // Generate unique ID
        memberCount: updatedData.members.length, // Ensure member count is correct
      }
      setAccessGroupsData((prevGroups) => [...prevGroups, newGroup])

      setAlert({
        level: 'success',
        jurisdiction: '',
        dest_type: '',
        message: `Access group "${updatedData.groupName}" has been successfully created.`,
      })
    } else {
      // Editing existing group - update in state
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
    }

    // Reset edit mode
    setEditGroupMode(false)
    setSelectedGroup(null)
    setIsAddingGroup(false)

    // TODO: Implement API call to save/update group
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
            />
          ) : (
            <EditAccessGroup
              group={selectedGroup || undefined}
              onSave={handleSaveGroup}
              onCancel={handleCancelGroupEdit}
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
                data={denyListData}
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
