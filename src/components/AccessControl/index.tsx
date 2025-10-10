import React, { useState } from 'react'
import { Box, Typography, Tabs, Tab } from '@mui/material'
import {
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Block as BlockIcon,
} from '@mui/icons-material'
import palette from '../../styles/theme/palette'
import OnboardSender from './OnboardSender'
import AccessGroups from './AccessGroups'
import DenyList from './DenyList'

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
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <div>
      <Box>
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
          <Typography
            id="title-table"
            sx={{ padding: 2, fontSize: '1.75rem', fontWeight: 700 }}
            flexGrow={1}
            display="flex"
            align="center"
          >
            Access Control
          </Typography>
        </Box>
      </Box>

      {/* Tab Content */}
      <Box sx={{ mt: 0.8, borderRadius: 3, boxShadow: 0 }}>
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
              icon={<PersonAddIcon />}
              label="ONBOARD SENDER"
              iconPosition="start"
              sx={{
                fontWeight: 'bold',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            />
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

        {/* Tab Panel 0 - Onboard Sender */}
        <TabPanel value={tabValue} index={0}>
          <OnboardSender />
        </TabPanel>

        {/* Tab Panel 1 - Access Groups */}
        <TabPanel value={tabValue} index={1}>
          <AccessGroups />
        </TabPanel>

        {/* Tab Panel 2 - Deny List */}
        <TabPanel value={tabValue} index={2}>
          <DenyList />
        </TabPanel>
      </Box>
    </div>
  )
}
export default AccessControlComponent
