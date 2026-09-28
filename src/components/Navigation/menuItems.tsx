import { MenuItem } from '.'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import GroupIcon from '@mui/icons-material/Group'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import React from 'react'
import accessLevel from '../../lib/security/accesslevel'
import type { PageKey } from '../../lib/security/accesslevel'
import { PAGE_ENTRY } from '../../lib/security/accessregistry'

const iconSx = {
  fontSize: '2rem',
}

/**
 * Is this page's entry capability held by any of these roles?
 *
 * Reads `PAGE_ENTRY` — the same constant `withPageAccess` reads — so a nav
 * link and the page it points at cannot resolve to different flags. That drift
 * was live before IGDD-3472: the "OUR API" button on the landing page admitted
 * IZG Operations *and* IZG Support while the /api-doc guard admitted IZG
 * Operations only, so IZG Support saw a link to a page that rejected them.
 *
 * A "what"-only check with no jurisdiction, so unioning across roles is
 * correct here — unlike `can()`, which must evaluate capability and reach
 * within a single role.
 */
export const canEnterPage = (
  page: PageKey,
  roles: string[] | undefined
): boolean => {
  const capability = PAGE_ENTRY[page]
  return (roles ?? []).some(
    (role) => !!accessLevel[role]?.[page]?.[capability as never]
  )
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
    isVisible: (roles) => canEnterPage('manageconnections', roles),
  },
  {
    label: 'Admin Operations',
    icon: <AdminPanelSettingsIcon sx={iconSx} />,
    path: '/adminoperations',
    // Was adminOnly: true (the Okta OPERATIONS_GROUP axis). Now a matrix
    // capability, which is what the page gate reads. Behaviour-identical
    // today, since IZG Operations is the only role seeded with it.
    isVisible: (roles) => canEnterPage('adminoperations', roles),
  },
  {
    label: 'Access Control',
    icon: <GroupIcon sx={iconSx} />,
    path: '/accesscontrol',
    isVisible: (roles) => canEnterPage('accesscontrol', roles),
  },
  {
    label: 'Onboarding Senders',
    icon: <AddIcon sx={iconSx} />,
    path: '/onboarding',
    isVisible: (roles) => canEnterPage('onboarding', roles),
  },
  {
    label: 'Console',
    icon: <AutoAwesomeMosaicIcon sx={iconSx} />,
    path: '/console',
    isVisible: (roles) => canEnterPage('console', roles),
  },
  {
    label: 'API Key Management',
    icon: <VpnKeyIcon sx={iconSx} />,
    path: '/apikeys',
    // Not admin-only: Jurisdiction Operations also has full server-side
    // apikeys access (its own jurisdiction's keys), so gate on the actual
    // permission rather than the narrower IZG-Operations-only isAdmin flag —
    // otherwise those users could use the page but never find it in the nav.
    // Also requires the apiKeyManagementEnabled release flag (IGDD-3444),
    // set server-side per request in the session callback, so the link
    // disappears for every role while the feature is disabled.
    isVisible: (roles, session) =>
      !!session?.apiKeyManagementEnabled && canEnterPage('apikeys', roles),
  },
]
