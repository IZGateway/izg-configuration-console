/**
 * API endpoint: POST /api/auth/bind-session
 *
 * Binds the current authenticated session to the browser's DPoP public key by
 * re-encoding the NextAuth JWT to include the key as `boundPublicKey`, then
 * re-issuing the session cookie. After this call, the middleware will require a
 * valid DPoP proof on every protected request — a stolen cookie alone is no
 * longer sufficient to authenticate.
 *
 * This endpoint is called once per browser tab session by the Auth component in
 * _app.tsx, immediately after generating or loading the ECDSA P-256 key pair.
 *
 * next-auth/jwt — encode / getToken:
 *   https://next-auth.js.org/configuration/options#jwt
 * RFC 7517 — JSON Web Key (JWK) format (the public key payload):
 *   https://www.rfc-editor.org/rfc/rfc7517
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { getToken, encode } from 'next-auth/jwt'

// Match the NextAuth default session lifetime so the re-issued cookie does not
// extend or shorten the existing session.
const SESSION_MAX_AGE = 30 * 60

/**
 * Adds `boundPublicKey` to the NextAuth JWT and re-issues the session cookie.
 *
 * Security flow:
 *  1. Reads the current session JWT using `getToken` (decrypts the cookie with
 *     NEXTAUTH_SECRET — returns null if the session is absent or tampered).
 *  2. Merges `boundPublicKey` (the JWK received from the browser) into the token.
 *  3. Re-encodes the updated token with `encode` — produces a new signed/encrypted
 *     JWT string using the same NEXTAUTH_SECRET.
 *  4. Sets the updated session cookie with identical security attributes to those
 *     used by next-auth@4 itself (HttpOnly, SameSite=Lax, Secure on HTTPS).
 *
 * The cookie name differs between HTTP and HTTPS deployments — next-auth@4 uses
 * `__Secure-` prefix on HTTPS to leverage the browser's Secure cookie prefix
 * enforcement (RFC 6265bis §4.1.3). We derive `secureCookies` from the
 * `x-forwarded-proto` header (set by the ECS ALB) to match that logic exactly.
 *   RFC 6265bis §4.1.3 — Cookie prefixes:
 *   https://www.rfc-editor.org/rfc/rfc6265bis#section-4.1.3
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Decrypt and validate the existing session JWT. Returns null if the user is
  // unauthenticated or the cookie has been tampered with.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return res.status(401).end()

  const { publicKey } = req.body ?? {}
  if (!publicKey) return res.status(400).end()

  // Spread the existing token claims and add boundPublicKey. All prior claims
  // (sub, name, email, jurisdictions, isAdmin, etc.) are preserved unchanged.
  const updatedToken = { ...token, boundPublicKey: publicKey }
  const encoded = await encode({
    token: updatedToken,
    secret: process.env.NEXTAUTH_SECRET as string,
    maxAge: SESSION_MAX_AGE,
  })

  // Determine whether to use the __Secure- cookie prefix.
  // x-forwarded-proto is set by the ECS Application Load Balancer and is the
  // authoritative indicator of the TLS termination state at the edge.
  // NEXTAUTH_URL is used as a fallback for local dev (no ALB, no x-forwarded-proto).
  const proto = req.headers['x-forwarded-proto']
  const secureCookies =
    (Array.isArray(proto) ? proto[0] : proto) === 'https' ||
    process.env.NEXTAUTH_URL?.startsWith('https://')
  const cookieName = secureCookies
    ? '__Secure-next-auth.session-token'   // HTTPS: enforces Secure prefix (RFC 6265bis)
    : 'next-auth.session-token'            // HTTP (local dev only)

  const cookieParts = [
    `${cookieName}=${encoded}`,
    'Path=/',
    'HttpOnly',       // not readable by JavaScript — matches next-auth@4 behavior
    'SameSite=Lax',   // allows top-level navigations while blocking cross-site POSTs
    `Max-Age=${SESSION_MAX_AGE}`,
  ]
  if (secureCookies) cookieParts.push('Secure')

  res.setHeader('Set-Cookie', cookieParts.join('; '))
  res.status(200).end()
}
