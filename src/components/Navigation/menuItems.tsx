import CallMergeIcon from '@mui/icons-material/CallMerge'
import { MenuItem } from '.'

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
    path: '/manage',
  },
  // {
  //   label: "Add Connection",
  //   icon: (
  //     <CloseIcon
  //       sx={{ transform: "rotate(45deg)"}}
  //       fontSize="large"
  //     />
  //   ),
  //   path: "/add",
  // },
]
