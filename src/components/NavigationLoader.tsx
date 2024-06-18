import React from 'react'
import { useRouter } from 'next/router'
import { Box, CircularProgress } from '@mui/material'
import izgLogo from '../public/IZG_Loader_Logo_DarkBlue.svg'
import Image from 'next/image'
import palette from '../styles/theme/palette'

const LOADER_THRESHOLD = 250

export default function NavigationLoader() {
  const [isLoading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    let timer

    const start = () =>
      (timer = setTimeout(() => setLoading(true), LOADER_THRESHOLD))

    const end = () => {
      if (timer) {
        clearTimeout(timer)
      }
      setLoading(false)
    }

    router.events.on('routeChangeStart', start)
    router.events.on('routeChangeComplete', end)
    router.events.on('routeChangeError', end)

    return () => {
      router.events.off('routeChangeStart', start)
      router.events.off('routeChangeComplete', end)
      router.events.off('routeChangeError', end)

      if (timer) {
        clearTimeout(timer.current)
      }
    }
  }, [router.events])

  if (!isLoading) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0006',
        color: palette.white,
        zIndex: 999,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ m: 1, position: 'relative' }}>
          <Image src={izgLogo} alt="izg logo" width={56} />
          <CircularProgress
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
      </Box>
    </Box>
  )
}
