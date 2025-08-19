import CallMergeIcon from '@mui/icons-material/CallMerge'
import { MenuItem } from '.'
import LockIcon from '@mui/icons-material/Lock'

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
          transform: 'rotate(90deg)',
        }}
        fontSize="large"
      />
    ),
    path: '/manageconnections',
  },
  {
    label: 'Password Encryption',
    icon: (
      <LockIcon
        sx={{
          transform: 'rotate(90deg)',
        }}
        fontSize="large"
      />
    ),
    path: '/passwordencryption',
  },
]
