import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next'
import { authOptions } from '../pages/api/auth/[...nextauth]'
import { Context } from './Context'

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
  return {
    user,
    ipAddress,
    sub,
    session,
    userId: sub,
    email: session?.user?.email || undefined,
    sessionId: jwtToken?.sessionId || undefined,
    jti: jwtToken?.oktaJti || undefined,
    authTime: jwtToken?.authTime || undefined,
  }
}
