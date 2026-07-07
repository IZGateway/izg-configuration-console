/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { buildRequestContext } from './requestContext'

describe('buildRequestContext (IGDD-2223 follow-up)', () => {
  it('builds the context from session + token and preserves user/sub', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { name: 'Austin Moody', email: 'amoody@example.com' },
    })
    ;(getToken as jest.Mock).mockResolvedValue({
      sub: '00uABC',
      sessionId: 'sess-1',
      oktaJti: 'ID.x',
      authTime: 1782408092,
    })

    const req: any = {
      headers: { 'x-forwarded-for': '203.0.113.7' },
      socket: {},
    }
    const ctx = await buildRequestContext(req, {} as any)

    expect(ctx.user).toBe('Austin Moody')
    expect(ctx.sub).toBe('00uABC')
    expect(ctx.userId).toBe('00uABC')
    expect(ctx.email).toBe('amoody@example.com')
    expect(ctx.sessionId).toBe('sess-1')
    expect(ctx.jti).toBe('ID.x') // sourced from token.oktaJti
    expect(ctx.authTime).toBe(1782408092)
    expect(ctx.ipAddress).toBe('203.0.113.7')
  })

  it('does not fabricate identity when there is no session (even if a token decodes)', async () => {
    // Session is unresolvable, but the token still decodes — identity must NOT
    // be populated, so the logger never attaches a sessionUser block.
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    ;(getToken as jest.Mock).mockResolvedValue({
      sub: '00uABC',
      sessionId: 'sess-1',
      oktaJti: 'ID.x',
      authTime: 1782408092,
    })

    const req: any = { headers: {}, socket: { remoteAddress: '10.0.0.1' } }
    const ctx = await buildRequestContext(req, {} as any)

    expect(ctx.user).toBe('unknown')
    expect(ctx.userId).toBeUndefined()
    expect(ctx.email).toBeUndefined()
    expect(ctx.sessionId).toBeUndefined()
    expect(ctx.jti).toBeUndefined()
    expect(ctx.authTime).toBeUndefined()
    expect(ctx.ipAddress).toBe('10.0.0.1')
  })
})
