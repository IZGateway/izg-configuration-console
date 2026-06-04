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
 * Security model for rebinding:
 *   Binding is write-once. If the session already has a `boundPublicKey` and the
 *   submitted key differs from it, the request is rejected (409 Conflict). This
 *   prevents a storageState replay attack from rebinding the session to the
 *   attacker's own key — the `/api/auth/**` path is excluded from DPoP verification
 *   in middleware.ts, so a stolen cookie could otherwise reach this endpoint.
 *   If the submitted key matches the already-bound key (e.g., a second tab reload
 *   with the same IndexedDB key), 200 is returned without re-encoding.
 *
 * next-auth/jwt — encode / getToken:
 *   https://next-auth.js.org/configuration/options#jwt
 * RFC 7517 — JSON Web Key (JWK) format (the public key payload):
 *   https://www.rfc-editor.org/rfc/rfc7517
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { getToken, encode } from 'next-auth/jwt'

// Maximum safe byte length for the encoded JWT value in the session cookie.
// The Set-Cookie header has a 4096-byte browser limit; the cookie name and
// attributes consume ~200 bytes, leaving ~3800 bytes for the JWT value itself.
const MAX_COOKIE_JWT_BYTES = 3800

/**
 * Adds `boundPublicKey` to the NextAuth JWT and re-issues the session cookie.
 *
 * Security flow:
 *  1. Reads the current session JWT using `getToken` (decrypts the cookie with
 *     NEXTAUTH_SECRET — returns null if the session is absent or tampered).
 *  2. Validates the submitted public key JWK structure.
 *  3. Enforces write-once binding — rejects if a different key is already bound.
 *  4. Strips large one-time claims (id_token, idToken) that are set at login
 *     but never read at runtime, to keep the re-issued cookie within size limits.
 *  5. Re-encodes the updated token, preserving the original session expiration.
 *  6. Guards against cookie overflow, which would silently corrupt the session.
 *  7. Sets the updated session cookie with identical security attributes to those
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

  // Reject requests from sessions that have already expired.
  const remainingSec =
    typeof token.exp === 'number' ? token.exp - Math.floor(Date.now() / 1000) : -1
  if (remainingSec <= 0) return res.status(401).end()

  const { publicKey } = req.body ?? {}

  // Validate the submitted JWK — reject malformed, non-EC, or private keys before
  // storing anything in the session cookie. We only accept ECDSA P-256 public keys.
  if (
    !publicKey ||
    typeof publicKey !== 'object' ||
    Array.isArray(publicKey) ||
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256' ||
    typeof publicKey.x !== 'string' ||
    typeof publicKey.y !== 'string' ||
    'n' in publicKey ||   // RSA key field — reject
    'd' in publicKey      // private key scalar — reject
  ) {
    return res.status(400).end()
  }

  // Enforce write-once binding. If a different key is already bound to this
  // session, reject the request. A storageState replay that navigates to the
  // app would otherwise generate a new local key and overwrite the victim's
  // binding via this endpoint (which is exempt from DPoP verification).
  const existingBoundKey = token.boundPublicKey as JsonWebKey | undefined
  if (existingBoundKey) {
    const keysMatch =
      existingBoundKey.kty === publicKey.kty &&
      existingBoundKey.crv === publicKey.crv &&
      existingBoundKey.x === publicKey.x &&
      existingBoundKey.y === publicKey.y
    if (!keysMatch) return res.status(409).end()
    // Same key already bound — idempotent; no re-encoding needed.
    return res.status(200).end()
  }

  // Strip token claims that inflate the cookie but are never read after the
  // jwt callback completes at login. id_token and idToken are OIDC artefacts
  // that are only available during the sign-in flow and serve no runtime purpose.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { idToken: _idToken, id_token: _id_token, ...minimalToken } = token as any
  const updatedToken = { ...minimalToken, boundPublicKey: publicKey }

  // Re-encode the token, preserving the original session expiration by passing
  // the remaining lifetime. encode() sets exp = now + maxAge, which restores
  // the original exp value (to within clock-skew tolerance).
  const encoded = await encode({
    token: updatedToken,
    secret: process.env.NEXTAUTH_SECRET as string,
    maxAge: remainingSec,
  })

  // Guard against cookie overflow, which would silently corrupt the session.
  if (encoded.length > MAX_COOKIE_JWT_BYTES) return res.status(500).end()

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
    `Max-Age=${remainingSec}`,
  ]
  if (secureCookies) cookieParts.push('Secure')

  res.setHeader('Set-Cookie', cookieParts.join('; '))
  res.status(200).end()
}
