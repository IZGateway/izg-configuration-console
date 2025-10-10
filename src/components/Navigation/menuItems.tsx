import { MenuItem } from '.'
import { CallMerge, Lock, Group } from '@mui/icons-material'

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
      <CallMerge
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
    icon: <Lock sx={iconSx} />,
    path: '/passwordencryption',
    adminOnly: true,
  },
  {
    label: 'Access Control',
    icon: <Group sx={iconSx} />,
    path: '/accesscontrol',
    adminOnly: false,
  },
]
