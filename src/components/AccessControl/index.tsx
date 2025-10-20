import React, { useState, useContext, useEffect } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import GroupIcon from '@mui/icons-material/Group'
import BlockIcon from '@mui/icons-material/Block'
import palette from '../../styles/theme/palette'

import AccessGroups from './AccessGroups'
import DenyList from './DenyList'

import EditAccessGroup from './EditAccessGroup'
import AddAccessGroup from './AddAccessGroup'
import CustomSnackbar from '../SnackBar'
import CombinedContext from '../../contexts/app'

import { type AccessGroup, mockAccessGroups } from './mockData'

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

  return (
    <div>
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
              <DenyList />
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
