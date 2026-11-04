import React from 'react'
import { Box } from '@mui/material'
import palette from '../../styles/theme/palette'
import LogoSpinner from './LogoSpinner'

export interface PageLoadingProps {
  // Cover the whole viewport. Used before the app shell has rendered, such as
  // while the session and DPoP binding initialise on a full page load.
  fullScreen?: boolean
}

// Placeholder shown while a page cannot render yet. It uses the same logo
// indicator as every other loading state, in place of a bare "Loading..." text.
const PageLoading = ({ fullScreen = false }: PageLoadingProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullScreen
          ? {
              position: 'fixed',
              inset: 0,
              backgroundColor: palette.greyLight,
            }
          : { minHeight: '50vh' }),
      }}
    >
      <LogoSpinner />
    </Box>
  )
}

export default PageLoading
