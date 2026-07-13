import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import { asyncRequestContext, Context } from './Context'

type ContextReq = GetServerSidePropsContext['req'] | NextApiRequest
type ContextRes = GetServerSidePropsContext['res'] | NextApiResponse

/**
 * Build the per-request audit context from the authenticated session and token.
 *
 * Shared by both `withMiddleware` (API routes) and authenticated
 * `getServerSideProps` page reads so the two paths cannot drift (IGDD-2223
 * follow-up). When there is no resolvable session the identity fields are left
 * undefined, so the logger's injector no-ops rather than fabricating identity.
 */
export async function buildRequestContext(
  req: ContextReq,
  res: ContextRes
): Promise<Context> {
  const session = await getServerSession(req, res, authOptions)
  const jwtToken = await getToken({ req })
  const user = session?.user?.name || session?.user?.email || 'unknown'
  const sub = (jwtToken?.sub as string) || undefined
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket?.remoteAddress ||
    'unknown'
  // Only populate identity fields when there is a resolvable authenticated
  // session. The token can sometimes be decoded even when the session is not
  // valid; gating here ensures the logger never attaches a sessionUser block
  // for unauthenticated/expired requests (no fabricated identity, IGDD-2223).
  // `user` and `sub` are left as-is to preserve the existing logApiRequest fields.
  const authenticated = Boolean(session?.user)
  return {
    user,
    ipAddress,
    sub,
    session,
    userId: authenticated ? sub : undefined,
    email: authenticated ? session?.user?.email || undefined : undefined,
    sessionId: authenticated ? jwtToken?.sessionId || undefined : undefined,
    jti: authenticated ? jwtToken?.oktaJti || undefined : undefined,
    authTime: authenticated ? jwtToken?.authTime || undefined : undefined,
  }
}

/**
 * Wrap a page's `getServerSideProps` so its entire body — every server-side
 * data read and any log statement — executes inside the per-request
 * `AsyncLocalStorage` context. Log events emitted during the render then
 * automatically carry `sessionUser`, exactly like a `withMiddleware`-wrapped
 * `/api/*` request (IGDD-2223).
 *
 * Building the context here — once, centrally — means every current and future
 * SSR page is attributed by construction: there is no per-page
 * `buildRequestContext` + `asyncRequestContext.run` boilerplate to copy and
 * nothing to forget when a new page is added (the drift risk of hand-wiring
 * each page). The resolved `Context` is passed to the handler as a second
 * argument so pages reuse its `session` for their auth check instead of calling
 * `getServerSession` again.
 *
 * When there is no authenticated session the context's identity fields are
 * undefined, so the logger's injector no-ops — no fabricated identity, matching
 * the API path.
 */
export function withRequestContext<
  P extends Record<string, unknown> = Record<string, unknown>
>(
  handler: (
    context: GetServerSidePropsContext,
    requestContext: Context
  ) => ReturnType<GetServerSideProps<P>>
): GetServerSideProps<P> {
  return async (context) => {
    const requestContext = await buildRequestContext(context.req, context.res)
    return asyncRequestContext.run(requestContext, () =>
      handler(context, requestContext)
    )
  }
}
