import React from 'react'
import Image from 'next/image'
import { Box, CircularProgress } from '@mui/material'
import izgLogo from '../../public/IZG_Loader_Logo_DarkBlue.svg'
import palette from '../../styles/theme/palette'

// The IZG logo inside a spinning ring. The one loading indicator used across
// the app, by both the route-change overlay and the in-page Loader.
const LogoSpinner = () => {
  return (
    <Box sx={{ m: 1, position: 'relative' }}>
      {/* Decorative: the ring carries the accessible "Loading" name, and an
          alt of "izg logo" would collide with the navigation logo's locator. */}
      <Image src={izgLogo} alt="" width={56} />
      <CircularProgress
        aria-label="Loading"
        size={68}
        sx={{
          position: 'absolute',
          top: -6,
          left: -6,
          zIndex: 1,
          color: palette.primaryLight,
          '.MuiCircularProgress-circle': {
            r: '22px',
          },
        }}
        thickness={3}
      />
    </Box>
  )
}

export default LogoSpinner
