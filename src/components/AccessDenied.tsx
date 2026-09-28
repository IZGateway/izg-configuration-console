import { Box, Typography, Button, List, ListItem } from '@mui/material'
import Image from 'next/image'
import pageNotFound from '../public/IZG_PageNotFound_Graphic.png'
import Container from './Container'
import AppHeaderBar from './AppHeader'

type AccessDeniedProps = {
  /** Shown in the page chrome. Defaults to a neutral title. */
  title?: string
}

/**
 * The denial surface for `withPageAccess` (IGDD-3472).
 *
 * Rendered **in place** rather than redirecting: a redirect hides the fact
 * that access was denied and makes the outcome indistinguishable from a broken
 * link. The browser URL stays on the requested page, and the normal navigation
 * chrome still renders, so the user can see where they are and go elsewhere.
 *
 * Reuses the 404 visual pattern and its graphic rather than introducing a
 * second full-page error style.
 */
const AccessDenied = ({ title = 'Access Denied' }: AccessDeniedProps) => (
  <Container title={title}>
    <AppHeaderBar open />
    <Box justifyContent="center" paddingLeft={10} paddingTop={10}>
      <Typography
        variant="h1"
        display="flex"
        flexGrow={1}
        fontWeight={'700'}
        lineHeight={'auto'}
        sx={{
          width: {
            xs: '6em',
            sm: '8em',
            md: '8em',
            lg: '10em',
            xl: '12em',
          },
          fontSize: {
            xs: '2rem',
            sm: '3rem',
            md: '4rem',
            lg: '4rem',
            xl: '4rem',
          },
        }}
      >
        You do not have access to this page.
      </Typography>
      <Typography
        paddingTop={2}
        variant="h2"
        flexGrow={1}
        display="flex"
        fontWeight={'400'}
        fontSize={'24px'}
        lineHeight={'28px'}
      >
        This page is restricted to specific roles.
      </Typography>
      <List
        sx={{
          listStyleType: 'disc',
          fontWeight: '400',
          fontSize: '14px',
          lineHeight: '16px',
          padding: 2,
        }}
      >
        <ListItem sx={{ display: 'list-item' }}>
          Your account may not hold the role this page requires.
        </ListItem>
        <ListItem sx={{ display: 'list-item' }}>
          Group membership is captured when you sign in. If you were granted a
          new role recently, sign out and sign in again before trying this page
          — an existing session keeps the roles it started with.
        </ListItem>
        <ListItem sx={{ display: 'list-item' }}>
          If you believe you should have access, contact support with the page
          address and the time you tried.
        </ListItem>
      </List>
      <Button
        target="_blank"
        href="https://support.izgateway.org/plugins/servlet/desk/site/izg"
        variant="contained"
        color="primary"
        disableElevation
        sx={{
          marginRight: 2,
          marginTop: 2,
          width: '15em',
          borderRadius: '30px',
          textTransform: 'none',
        }}
      >
        Need Help
      </Button>
      <Button
        variant="outlined"
        color="primary"
        href="/"
        sx={{
          marginTop: 2,
          width: '15em',
          borderRadius: '30px',
          textTransform: 'none',
        }}
      >
        Back to Home
      </Button>
      <Box
        sx={{
          position: {
            md: 'fixed',
          },
          marginTop: {
            xs: '2em',
            sm: '2em',
            md: 'auto',
            lg: 'auto',
            xl: 'auto',
          },
          marginBottom: {
            xs: '-2em',
            sm: '-2em',
            md: 'auto',
            lg: 'auto',
            xl: 'auto',
          },
          right: '0',
          bottom: '0',
        }}
      >
        <Image
          src={pageNotFound}
          width={600}
          height={500}
          alt="access denied image"
          style={{ marginBottom: '-36px' }}
        />
      </Box>
    </Box>
  </Container>
)

export default AccessDenied
