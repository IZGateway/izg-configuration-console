/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('./auth/[...nextauth]', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import withMiddleware from './api-middleware-helper'
import { asyncRequestContext, Context } from '../../lib/Context'

describe('withMiddleware request context population (IGDD-2223)', () => {
  it('populates userId, email, sessionId, jti, authTime and leaves user/sub intact', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { name: 'Austin Moody', email: 'amoody@example.com' },
    })
    ;(getToken as jest.Mock).mockResolvedValue({
      sub: '00uABC',
      sessionId: 'sess-123',
      oktaJti: 'ID.xyz',
      authTime: 1782408092,
    })

    let captured: Context | undefined
    const handler = jest.fn(async () => {
      captured = asyncRequestContext.getStore()
    })
    const wrapped = withMiddleware()(handler)

    const req: any = {
      url: '/api/test',
      headers: {},
      socket: { remoteAddress: '203.0.113.7' },
      query: {},
    }
    const res: any = { status: jest.fn(() => res), json: jest.fn(), send: jest.fn() }

    await wrapped(req, res)

    expect(handler).toHaveBeenCalled()
    expect(captured).toBeDefined()
    expect(captured?.userId).toBe('00uABC')
    expect(captured?.email).toBe('amoody@example.com')
    expect(captured?.sessionId).toBe('sess-123')
    expect(captured?.jti).toBe('ID.xyz')
    expect(captured?.authTime).toBe(1782408092)
    // existing fields preserved (additive change)
    expect(captured?.user).toBe('Austin Moody')
    expect(captured?.sub).toBe('00uABC')
  })
})
