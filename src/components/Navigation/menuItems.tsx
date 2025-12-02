import { MenuItem } from '.'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import LockIcon from '@mui/icons-material/Lock'
import GroupIcon from '@mui/icons-material/Group'
import AddIcon from '@mui/icons-material/Add'
import React from 'react'
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
    label: 'Password Encryption',
    icon: <LockIcon sx={iconSx} />,
    path: '/passwordencryption',
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
]
