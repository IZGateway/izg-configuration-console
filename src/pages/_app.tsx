import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from 'next/app'
import { CacheProvider, EmotionCache } from '@emotion/react'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'
import Layout from '../components/Layout'
import '@fontsource/ubuntu/300.css'
import '@fontsource/ubuntu/400.css'
import '@fontsource/ubuntu/500.css'
import '@fontsource/ubuntu/700.css'
import createEmotionCache from '../utility/createEmotionCache'
import lightThemeOptions from '../styles/theme/lightThemeOptions'
import { AppProvider } from '../contexts/app'
import { SWRConfig } from 'swr'
import fetch from '../lib/fetch'
import GoogleAnalytics from '../components/GoogleAnalytics'
interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache
  pageProps: { session: any; pageProps: any }
}

const clientSideEmotionCache = createEmotionCache()
const lightTheme = createTheme(lightThemeOptions)

const MyApp: React.FunctionComponent<MyAppProps> = (props) => {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props

  return (
    <SessionProvider session={pageProps.session}>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={lightTheme}>
          <CssBaseline />
          <Layout>
            <AppProvider>
              <SWRConfig value={{ fetcher: fetch }}>
                <GoogleAnalytics />
                <Component {...pageProps} />
              </SWRConfig>
            </AppProvider>
          </Layout>
        </ThemeProvider>
      </CacheProvider>
    </SessionProvider>
  )
}

export default MyApp
