/* eslint-disable @typescript-eslint/no-var-requires */
import { SessionProvider, useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { buildDpopProof } from '../lib/dpop'
import { storeKeyPair, loadKeyPair, clearSessionKeys } from '../lib/sessionKeys'
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

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const ReactDOM = require('react-dom')
  const axe = require('@axe-core/react')
  axe(React, ReactDOM, 1000)
}

const clientSideEmotionCache = createEmotionCache()
const blueTheme = createTheme(blueThemeOptions)

const MyApp = (props) => {
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

/**
 * Auth wraps every page and enforces DPoP session binding for all authenticated
 * requests. It runs once per browser tab session — Next.js Pages Router keeps
 * this component mounted across client-side navigation, so initialization does
 * not repeat when the user moves between pages.
 *
 * DPoP overview — RFC 9449:
 *   https://www.rfc-editor.org/rfc/rfc9449
 * Web Cryptography API — crypto.subtle:
 *   https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
 */
function Auth({ children }) {
  const { status } = useSession({ required: true })

  // Guards against running DPoP initialization more than once per mount.
  // useRef is used rather than useState because changing the ref must not
  // trigger a re-render, and because the ref value persists across the
  // double-mount cycle that React 18 Strict Mode introduces in development.
  // The cleanup function resets the flag so that a genuine remount (e.g.
  // after error recovery) re-initializes correctly.
  const dpopInitialized = useRef(false)

  useEffect(() => {
    // Only initialize when the user is authenticated and we have not already done so.
    if (status !== 'authenticated' || dpopInitialized.current) return
    dpopInitialized.current = true

    // Capture the real window.fetch before replacing it, so the interceptor
    // can delegate to the original and the cleanup can restore it.
    const originalFetch = window.fetch

    ;(async () => {
      try {
        let privateKey: CryptoKey
        let publicKeyJwk: JsonWebKey

        // Reuse an existing key pair from IndexedDB if one was stored during a
        // previous page load. Reusing the pair avoids generating a new key and
        // re-binding the session on every navigation within the same tab.
        const existing = await loadKeyPair()
        if (existing) {
          privateKey = existing.privateKey
          publicKeyJwk = existing.publicKeyJwk
        } else {
          // Generate a non-exportable ECDSA P-256 key pair.
          // extractable=false (the second argument) is enforced by the browser's
          // cryptographic subsystem — the raw private key bytes can never be read
          // out by JavaScript, CDP, or any other software path.
          const keyPair = await crypto.subtle.generateKey(
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,   // extractable=false — private key material stays in crypto subsystem
            ['sign', 'verify']
          )
          // Export only the public key as JWK so it can be sent to the server.
          // The private key is never exported — it stays inside the crypto subsystem.
          publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
          await storeKeyPair(keyPair.privateKey, publicKeyJwk)
          privateKey = keyPair.privateKey
        }

        // Bind the session: POST the public key JWK to the server so it can be
        // stored in the NextAuth JWT. The server will re-issue the session cookie
        // with boundPublicKey included. After this, the middleware will require a
        // valid DPoP proof on every protected request.
        // Use originalFetch directly — the interceptor is not yet installed.
        await originalFetch('/api/auth/bind-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: publicKeyJwk }),
        })

        // Install the fetch interceptor. Every outgoing request is intercepted
        // to attach a fresh DPoP proof scoped to that request's URL path and method.
        // The proof is a compact JWT signed with the session's private key.
        window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
          try {
            // Resolve the request URL to extract the pathname. The proof binds
            // to the path only — query string is excluded to avoid mismatch with
            // the server's verifyDpopProof check (RFC 9449 §4.2 uses the full
            // URI, but we scope to pathname to avoid query-string drift issues
            // with Next.js rewrites).
            const urlObj = new URL(
              typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.href
                  : (input as Request).url,
              window.location.origin
            )
            const proof = await buildDpopProof(
              privateKey,
              urlObj.pathname,
              init.method ?? 'GET'
            )
            // Merge the proof header into the existing headers rather than
            // replacing them, so caller-supplied headers are preserved.
            init = {
              ...init,
              headers: { ...(init.headers as Record<string, string>), 'x-dpop-proof': proof },
            }
          } catch {
            // If proof generation fails for any reason, fall through and send the
            // request without a proof rather than breaking the call entirely.
            // The middleware will reject the request if a proof is required.
          }
          return originalFetch(input, init)
        }
      } catch {
        // DPoP init failed — app continues without session binding.
        // The middleware will pass requests through if no boundPublicKey is in
        // the session token yet (fail-open during initialization).
      }
    })()

    return () => {
      // Reset the guard so a genuine remount (Strict Mode second cycle, error
      // recovery) can re-initialize DPoP from scratch.
      dpopInitialized.current = false
      // Restore the original fetch so the interceptor is not left installed
      // after the component unmounts.
      window.fetch = originalFetch
      // Remove the key pair from IndexedDB on unmount (tab close, logout).
      clearSessionKeys().catch(() => undefined)
    }
  }, [status])

  if (status === 'loading') {
    return <div>Loading...</div>
  }
  return children
}

export default MyApp
