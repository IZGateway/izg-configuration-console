import React from 'react'
import Box from '@mui/material/Box'
import type { NextPage } from 'next'
import Navigation from './Navigation'
import AppFooter from './AppFooter'

// A page opts in to the app footer by setting `Page.showFooter = true`. The
// main pages (Home and the navigation pages) do; sub-pages such as edit,
// history and test, and the error pages, do not.
export type PageWithFooter = NextPage & { showFooter?: boolean }

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
  showFooter?: boolean;
}

const Layout = ({ children, showFooter = false }: DashboardLayoutProps) => {
  return (
    <Box sx={container}>
      <Box sx={content}>
        <Navigation />
        <Box sx={pageColumn}>
          <Box role="main" sx={pageContainer}>
            {children}
          </Box>
          {showFooter && <AppFooter />}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
