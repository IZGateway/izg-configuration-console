import { MenuItem } from '.'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import GroupIcon from '@mui/icons-material/Group'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import React from 'react'
import accessLevel from '../../lib/security/accesslevel'
const iconSx = {
  fontSize: '2rem',
}

export const menuItems: MenuItem[] = [
  // {
  //   label: "User Profile",
  //   icon: <AccountCircleIcon fontSize="large" />,
  //   path: "/user",
  // },
  {
    label: 'Manage Connections',
    icon: (
      <CallMergeIcon
        sx={{
          ...iconSx,
          transform: 'rotate(90deg)',
        }}
      />
    ),
    path: '/manageconnections',
    adminOnly: false,
  },
  {
    label: 'Admin Operations',
    icon: <AdminPanelSettingsIcon sx={iconSx} />,
    path: '/adminoperations',
    adminOnly: true,
  },
  {
    label: 'Access Control',
    icon: <GroupIcon sx={iconSx} />,
    path: '/accesscontrol',
    adminOnly: true,
  },
  {
    label: 'Onboarding Senders',
    icon: <AddIcon sx={iconSx} />,
    path: '/onboarding',
    adminOnly: false,
  },
  {
    label: 'Console',
    icon: <AutoAwesomeMosaicIcon sx={iconSx} />,
    path: '/console',
    adminOnly: true,
  },
  {
    label: 'API Key Management',
    icon: <VpnKeyIcon sx={iconSx} />,
    path: '/apikeys',
    // Not admin-only: Jurisdiction Operations also has full server-side
    // apikeys access (its own jurisdiction's keys), so gate on the actual
    // permission rather than the narrower IZG-Operations-only isAdmin flag —
    // otherwise those users could use the page but never find it in the nav.
    adminOnly: false,
    isVisible: (role) => !!accessLevel[role ?? '']?.apikeys?.canListApiKeys,
  },
]
