/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import NextLink from 'next/link'
import IZGLogo from './Branding'
import MuiDrawer from '@mui/material/Drawer'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import Cookies from 'js-cookie'
import {
  Box,
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
  Tooltip,
} from '@mui/material'
import { menuItems } from './menuItems'
import { canEnterPage } from '../../lib/security/accessregistry'
import palette from '../../styles/theme/palette'

// Swagger API and Log Out: two halves of a row pinned to the bottom of the
// drawer, under a divider. Icons only when collapsed (both fit the 5em
// drawer), icon and label when open. White, like the menu items.
//
// `first`: the left-hand item. When open, its icon is centred on the menu
// icons' column, 40px in (1.5rem item padding + half the 2rem icon).
const footerButtonSx = (open: boolean, first: boolean) => ({
  flex: 1,
  minWidth: 0,
  justifyContent: open ? 'flex-start' : 'center',
  gap: 1.5,
  pl: open ? (first ? '28px' : 2) : 0,
  pr: open ? 1 : 0,
  py: 1.5,
  borderRadius: 0,
  color: palette.white,
  fontSize: '0.875rem',
  textTransform: 'none',
  whiteSpace: 'nowrap',
  '&:hover': { bgcolor: 'rgb(255 255 255 / 10%)' },
})
const footerIconSx = { fontSize: '1.125rem' }

const drawerWidthOpen = '300px'
const drawerWidthClosed = '5em'

// A subtle curve, as if the panel turned away from the light toward its right
// edge: the original navy on the left, easing into shade on the right. The
// shade builds slowly and then faster (an ease-in), so it reads as a rounded
// surface rather than a flat fade. Only darkens, so white text contrast only
// goes up.
const navBackground = `linear-gradient(
  90deg,
  rgb(0 0 0 / 0%) 0%,
  rgb(0 0 0 / 0%) 25%,
  rgb(0 0 0 / 2%) 45%,
  rgb(0 0 0 / 5%) 62%,
  rgb(0 0 0 / 9%) 76%,
  rgb(0 0 0 / 14%) 88%,
  rgb(0 0 0 / 20%) 100%
), ${palette.primaryDark}`

const closedMixin = () => ({
  width: drawerWidthClosed,
  overflowX: 'hidden',
  background: navBackground,
  color: palette.white,
  boxShadow: '5px 0px 10px rgb(0 0 0 / 30%)',
  transition: 'width 0.8s ease',
})

const openMixin = () => ({
  width: drawerWidthOpen,
  overflowX: 'hidden',
  background: navBackground,
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
  // The only visibility mechanism. An `adminOnly?: boolean` field used to sit
  // beside this and gate on the coarse `isAdmin` flag; IGDD-3472 moved its
  // three remaining users onto matrix capabilities and removed the field
  // rather than leaving it dead, because a dead authorization field invites
  // someone to set it again and reintroduce an axis `can()` cannot see.
  //
  // Receives ALL roles the user holds (so an item is visible when any held
  // role grants it) and the full session, for flags that live outside the
  // role matrix (e.g. apiKeyManagementEnabled, the feature-wide kill switch).
  // Nav visibility is discoverability only; the API routes remain the
  // security boundary.
  isVisible?: (roles: string[] | undefined, session?: Session | null) => boolean
}

const MiniDrawer = () => {
  const { data: session } = useSession()
  // Was `session?.user.isAdmin`. Now the same PAGE_ENTRY constant the page's
  // own gate reads, so the Swagger API link and /api-doc cannot disagree —
  // which they did before IGDD-3472.
  const canSeeApiDoc = canEnterPage('api-doc', session?.user.roles)
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
          // Transparent so the drawer's shading shows through.
          backgroundColor: 'transparent',
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
          .filter(
            (item) =>
              !item.isVisible || item.isVisible(session.user.roles, session)
          )
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
                    minWidth: '200%',
                    borderBottom: `1px solid ${palette.primaryLight}`,
                    '&& .Mui-selected , && .Mui-selected:hover': {
                      fontWeight: '700',
                    },
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
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            borderTop: `1px solid ${palette.primaryLight}`,
          }}
        >
          {canSeeApiDoc && (
            // Labels show only in the open drawer; the tooltip stands in for
            // them when it's collapsed (an empty title disables it).
            <Tooltip title={open ? '' : 'Swagger API'} placement="top">
              <Button
                component={NextLink}
                href="/api-doc"
                aria-label="Swagger API"
                sx={footerButtonSx(open, true)}
              >
                <DescriptionOutlinedIcon sx={footerIconSx} />
                {open && 'Swagger API'}
              </Button>
            </Tooltip>
          )}
          <Tooltip title={open ? '' : 'Log Out'} placement="top">
            <Button
              id="logout"
              aria-label="Log Out"
              onClick={() => {
                Cookies.remove('destination')
                signOut().then(() => {
                  return (window.location.href = `${process.env.NEXT_PUBLIC_OKTA_ISSUER}/login/signout`)
                })
              }}
              sx={[
                footerButtonSx(open, !canSeeApiDoc),
                // The divider between the two, when both are shown.
                canSeeApiDoc && {
                  borderLeft: `1px solid ${palette.primaryLight}`,
                },
              ]}
            >
              <LogoutIcon sx={footerIconSx} />
              {open && 'Log Out'}
            </Button>
          </Tooltip>
        </Box>
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
