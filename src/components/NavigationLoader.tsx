import React from 'react'
import { useRouter } from 'next/router'
import { Box } from '@mui/material'
import palette from '../styles/theme/palette'
import LogoSpinner from './Loader/LogoSpinner'

const LOADER_THRESHOLD = 250

export default function NavigationLoader() {
  const [isLoading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

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
        clearTimeout(timer)
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
        // Above the navigation drawer, header bar and dialogs, so the whole
        // screen is covered during a page change.
        zIndex: (theme) => theme.zIndex.modal + 1,
      }}
    >
      <LogoSpinner />
    </Box>
  )
}
