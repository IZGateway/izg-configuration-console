/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import NextLink from 'next/link'
import IZGLogo from './Branding'
import MuiDrawer from '@mui/material/Drawer'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import Cookies from 'js-cookie'
import {
  Collapse,
  styled,
  List,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Link,
} from '@mui/material'
import { menuItems } from './menuItems'
import palette from '../../styles/theme/palette'

const drawerWidthOpen = '300px'
const drawerWidthClosed = '5em'

const closedMixin = () => ({
  width: drawerWidthClosed,
  overflowX: 'hidden',
  background: palette.primaryDark,
  color: palette.white,
  boxShadow: '5px 0px 10px rgb(0 0 0 / 30%)',
  transition: 'width 0.8s ease',
})

const openMixin = () => ({
  width: drawerWidthOpen,
  overflowX: 'hidden',
  background: palette.primaryDark,
  color: palette.white,
  boxShadow: '5px 0px 10px rgb(0 0 0 / 30%)',
  transition: 'width 0.2s ease',
})

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(2),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}))

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ open }) => ({
  width: drawerWidthOpen,
  flexShrink: 1,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  padding: 2,

  ...(open && { '& .MuiDrawer-paper': openMixin() }),
  ...(!open && {
    width: drawerWidthClosed,
    '& .MuiDrawer-paper': closedMixin(),
  }),
}))

export type MenuItem = {
  label: string
  icon: any
  path: string
  adminOnly?: boolean
}

const MiniDrawer = () => {
  const { data: session } = useSession()
  const [isMobile, setIsMobile] = React.useState(false)
  // Initialize drawer state based on screen size
  const [open, setOpen] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1455
    }
    return true
  })
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  // Handle responsive design for mobile
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1455
      setIsMobile(mobile)
      // Set drawer to closed by default on mobile
      if (mobile) {
        setOpen(false)
      } else {
        setOpen(true)
      }
    }

    handleResize() // Set initial value
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleClick = () => {
    setOpen(!open)
  }

  const handleListItemClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    index: number
  ) => {
    setSelectedIndex(index)
  }

  const list = () => (
    <>
      <List
        sx={{
          padding: '0 0',
          backgroundColor: palette.primaryDark,
          ' && .Mui-selected:focus': {
            backgroundColor: palette.primaryLight,

            '&, & .MuiListItemIcon-root': {
              color: palette.primaryDark,
            },

            '&, & .MuiListItemText-root': {
              color: palette.primaryDark,
            },

            'span.MuiTypography-root.MuiTypography-body1.MuiListItemText-primary.css-8dlta7-MuiTypography-root':
              {
                fontWeight: 700,
              },
          },
          '& .MuiListItem-root:hover': {
            bgcolor: 'rgb(255 255 255 / 10%)',
            color: palette.white,
            '&, & .MuiListItemIcon-root': {
              color: palette.white,
            },
          },
        }}
      >
        {menuItems
          .filter((item) => !item.adminOnly || session.user.isAdmin)
          .map((item: MenuItem, index) => (
            <ListItem
              key={item.label}
              id={item.label}
              sx={{
                padding: '0 0',
              }}
            >
              <NextLink
                key={item.label}
                href={item.path}
                style={{ textDecoration: 'none', color: 'white' }}
                passHref
              >
                <ListItemButton
                  sx={{
                    padding: '1rem 1.5rem',
                    borderBottom: `1px solid ${palette.primaryLight}`,
                    '&& .Mui-selected , && .Mui-selected:hover': {
                      fontWeight: '700',
                    },
                    width: '150%',
                  }}
                  key={item.label}
                  selected={selectedIndex === index}
                  onClick={(event) => handleListItemClick(event, index)}
                  id={item.label + '_button'}
                >
                  <ListItemIcon
                    sx={{
                      color: 'white',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </NextLink>
              <Divider color={palette.primaryLight} />
            </ListItem>
          ))}
      </List>
    </>
  )
  return (
    <>
      <Drawer
        variant="permanent"
        transitionDuration={2000000 | 100}
        open={open}
        id="navigation"
        role="navigation"
        sx={{
          // Add mobile-specific styling if needed
          ...(isMobile && {
            '& .MuiDrawer-paper': {
              zIndex: 1300, // Higher z-index on mobile to overlay content
            },
          }),
        }}
      >
        <DrawerHeader
          sx={{ justifyContent: 'space-between', mt: 0, pl: 2, pt: 0, pb: 2 }}
        >
          <IZGLogo />
          <IconButton
            onClick={handleClick}
            name="toggle navigation drawer"
            aria-label="toggle navigation drawer"
          >
            {!open ? (
              <ChevronRightIcon
                fontSize="large"
                sx={{ color: palette.white }}
              />
            ) : (
              <ChevronLeftIcon fontSize="large" sx={{ color: palette.white }} />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider color={palette.primaryLight} />
        {list()}
        {session?.user.isAdmin && (
          <Link href="/api-doc">
            <Button
              variant="text"
              name="swagger api"
              sx={{
                color: palette.white,
                textDecoration: 'underline',
                position: 'absolute',
                left: '5px',
                bottom: '50px',
                textTransform: 'capitalize',
                textWrap: 'wrap',
                textAlign: 'left',
              }}
            >
              Swagger API
            </Button>
          </Link>
        )}
        <Button
          id="logout"
          variant="text"
          onClick={() => {
            Cookies.remove('destination')
            signOut().then(() => {
              return (window.location.href = `${process.env.NEXT_PUBLIC_OKTA_ISSUER}/login/signout`)
            })
          }}
          sx={{
            textWrap: 'wrap',
            textAlign: 'center',
            color: palette.white,
            textDecoration: 'underline',
            position: 'absolute',
            left: '8px',
            bottom: '20px',
            textTransform: 'capitalize',
          }}
        >
          Log Out
        </Button>
        <Collapse in={!open} timeout="auto" />
        {/* Commenting this code as it is not part of any user story right now */}
        {/* <Button
        variant="contained"
        size="large"
        sx={{
          background: color={palette.primaryLight},
          borderRadius: "37.5px",
          margin: "1em",
          //marginTop:"700px", TODO fix this with a better positioning option
          alignItems: "center",
          }}
      >
        Need Help?
      </Button> */}
      </Drawer>
    </>
  )
}
export default MiniDrawer
