import type { NextRequest } from 'next/server'
import nextAuthMiddleware, { NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Custom logger middleware
function loggerMiddleware(req: NextRequest) {
  console.info('Route Request', {
    path: req.nextUrl.pathname,
    method: req.method,
    ip: req.headers.get('x-forwarded-for') ?? 'unknown',
    userAgent: req.headers.get('user-agent') ?? 'unknown',
  })
  return NextResponse.next()
}

// Export the middleware that combines auth and logging
export default nextAuthMiddleware

// For logging, we wrap the auth middleware
export function middleware(req: NextRequest) {
  loggerMiddleware(req)
  return nextAuthMiddleware(req as NextRequestWithAuth)
}

export const config = {
  matcher: ['/((?!api/healthcheck|api/deephealthcheck|_next/static).*)'],
}
