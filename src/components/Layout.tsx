import React from 'react'
import Box from '@mui/material/Box'
import { useRouter } from 'next/router'
import Navigation from './Navigation'
import { menuItems } from './Navigation/menuItems'
import AppFooter from './AppFooter'

// The footer belongs to the main pages only: Home and every page listed in
// the navigation. Sub-pages (edit, history, test, error pages) render without it.
const FOOTER_PATHS = new Set(['/', ...menuItems.map((item) => item.path)])

const container = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  boxShadow: 'inset 0px 0px 25px 10px rgba(0, 0, 0, 0.25)',
};

const content = {
  display: 'flex',
  flex: 1,
};

// The column to the right of the navigation. Page content grows to fill it,
// which keeps the footer at the bottom of the viewport on short pages and
// directly after the content on long ones.
const pageColumn = {
  display: 'flex',
  flexDirection: 'column',
  width: '80vw',
  flexGrow: 1,
};

const pageContainer = {
  padding: 3,
  flexGrow: 1,
  paddingTop: '3em',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: DashboardLayoutProps) => {
  const { pathname } = useRouter()
  return (
    <Box sx={container}>
      <Box sx={content}>
        <Navigation />
        <Box sx={pageColumn}>
          <Box role="main" sx={pageContainer}>
            {children}
          </Box>
          {FOOTER_PATHS.has(pathname) && <AppFooter />}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
