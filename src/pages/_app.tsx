/* eslint-disable @typescript-eslint/no-var-requires */
import { SessionProvider, useSession } from 'next-auth/react'
import { CacheProvider } from '@emotion/react'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'
import Layout from '../components/Layout'
import '@fontsource/ubuntu/300.css'
import '@fontsource/ubuntu/400.css'
import '@fontsource/ubuntu/500.css'
import '@fontsource/ubuntu/700.css'
import createEmotionCache from '../utility/createEmotionCache'
import blueThemeOptions from '../styles/theme/blueThemeOptions'
import { AppProvider } from '../contexts/app'
import { SWRConfig } from 'swr'
import fetch from '../lib/fetch'
import GoogleAnalytics from '../components/GoogleAnalytics'
import React from 'react'
import NavigationLoader from '../components/NavigationLoader'
import type { AppProps } from 'next/app'
import { EmotionCache } from '@emotion/cache'

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const ReactDOM = require('react-dom')
  const axe = require('@axe-core/react')
  axe(React, ReactDOM, 1000)
}

const clientSideEmotionCache = createEmotionCache()
const blueTheme = createTheme(blueThemeOptions)

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

const MyApp = (props: MyAppProps) => {
  const {
    Component,
    emotionCache = clientSideEmotionCache,
    pageProps: { session, ...pageProps },
  } = props

  return (
    <SessionProvider session={session}>
      <Auth>
        <CacheProvider value={emotionCache}>
          <ThemeProvider theme={blueTheme}>
            <CssBaseline />
            <Layout>
              <AppProvider>
                <SWRConfig value={{ fetcher: fetch }}>
                  <GoogleAnalytics />
                  <NavigationLoader />
                  <Component {...pageProps} />
                </SWRConfig>
              </AppProvider>
            </Layout>
          </ThemeProvider>
        </CacheProvider>
      </Auth>
    </SessionProvider>
  )
}

function Auth({ children }: { children: React.ReactNode }) {
  const { status } = useSession({ required: true })

  if (status === 'loading') {
    return <div>Loading...</div>
  }
  return children
}

export default MyApp
