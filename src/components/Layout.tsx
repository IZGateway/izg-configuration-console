/** @jsxImportSource @emotion/react */
import Box from '@mui/material/Box'
import Navigation from './Navigation'
import AppHeaderBar from './AppHeader'

const container = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  boxShadow: 'inset 0px 0px 25px 10px rgba(0, 0, 0, 0.25)',
}

const content = {
  display: 'flex',
  flex: 1,
}

const pageContainer = {
  padding: 3,
  width: '80vw',
  flexGrow: 1,
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: DashboardLayoutProps) => {
  return (
    <Box sx={container}>
      <AppHeaderBar />
      <Box sx={content}>
        <Navigation />
        <Box sx={pageContainer}>{children}</Box>
      </Box>
    </Box>
  )
}

export default Layout
