/**
 * Next.js Edge Middleware — DPoP proof verification for protected routes.
 *
 * Every request to a protected route is checked for a valid DPoP proof before
 * being forwarded. The proof is a compact JWT signed with the session's private
 * key; it binds the request to the browser that initiated the session. A stolen
 * session cookie is useless without the matching private key.
 *
 * `withAuth` (next-auth/middleware) runs first to verify the session is
 * authenticated and populates `req.nextauth.token` with the decoded JWT claims.
 * This means `boundPublicKey` is available without a second `getToken` call.
 *
 * DPoP specification — RFC 9449:
 *   https://www.rfc-editor.org/rfc/rfc9449
 * next-auth/middleware — withAuth:
 *   https://next-auth.js.org/configuration/nextjs#middleware
 */

import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { verifyDpopProof } from './lib/dpop'

/**
 * Process-local store of recently seen DPoP token IDs (jti values).
 *
 * Each jti is stored with an absolute expiry timestamp. On each request, expired
 * entries are pruned before the lookup. A jti that appears a second time within
 * the TTL window is rejected — this prevents replay attacks where a captured proof
 * is reused within its 30-second validity window.
 *
 * Limitation: this Map is process-local. In a multi-isolate runtime (Vercel Edge,
 * Cloudflare Workers), each isolate starts with an empty Map and replay protection
 * becomes best-effort only. An external shared store (Redis, KV) would be required
 * for guaranteed deduplication in such an environment. This is acceptable for the
 * current single-process ECS Fargate deployment.
 */
const seenJtis = new Map<string, number>()

/** Duration (ms) to remember a jti — must exceed the ±30s proof validity window. */
const JTI_TTL_MS = 60_000

/**
 * Returns true and records the jti if it has not been seen within the TTL window.
 * Returns false if the jti is a replay (already present in the store).
 *
 * Prunes expired entries on each call to prevent unbounded Map growth under
 * sustained traffic.
 */
function checkAndRecordJti(jti: string): boolean {
  const now = Date.now()
  // Prune expired entries to keep the Map bounded.
  for (const [key, expiry] of seenJtis) {
    if (expiry < now) seenJtis.delete(key)
  }
  if (seenJtis.has(jti)) return false  // replay detected
  seenJtis.set(jti, now + JTI_TTL_MS)
  return true
}

/**
 * Paths that are exempt from DPoP verification:
 *  - `/api/auth/**`   — NextAuth sign-in / sign-out / callback routes (no session yet)
 *  - `/_next/**`      — Next.js static assets and HMR
 *  - `/api/healthcheck`, `/api/deephealthcheck` — infra probes (no auth context)
 */
const DPOP_SKIP = /^\/(api\/auth|_next|api\/healthcheck|api\/deephealthcheck)/

export default withAuth(async function middleware(req: NextRequestWithAuth) {
  console.info('Route Request', {
    path: req.nextUrl.pathname,
    method: req.method,
    ip: req.headers.get('x-forwarded-for') ?? 'unknown',
    userAgent: req.headers.get('user-agent') ?? 'unknown',
  })

  // Skip DPoP checks for auth callbacks and static assets.
  if (DPOP_SKIP.test(req.nextUrl.pathname)) return NextResponse.next()

  // `boundPublicKey` is set by bind-session after the browser generates its key pair.
  // If it is absent (e.g. the session predates this deployment), pass the request
  // through — DPoP enforcement is contingent on the key being bound. Sessions that
  // were established before bind-session ran will re-bind on the next page load.
  // `req.nextauth.token` is populated by `withAuth` — no second decode needed.
  const boundPublicKey = req.nextauth?.token?.boundPublicKey as JsonWebKey | undefined
  if (!boundPublicKey) return NextResponse.next()

  // Require a proof header. Absence after binding is always a violation — the
  // fetch interceptor in _app.tsx attaches a proof to every request once bound.
  const proof = req.headers.get('x-dpop-proof')
  if (!proof) return NextResponse.redirect(new URL('/api/auth/signin', req.url))

  // Verify the proof: structure, timestamp, method/path binding, jti replay,
  // and cryptographic signature against the session's bound public key.
  // verifyDpopProof catches all exceptions internally and returns false on any error.
  const valid = await verifyDpopProof(
    proof,
    boundPublicKey,
    req.method,
    req.nextUrl.pathname,
    checkAndRecordJti
  )
  if (!valid) return NextResponse.redirect(new URL('/api/auth/signin', req.url))

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/healthcheck|api/deephealthcheck|_next/static).*)'],
}
