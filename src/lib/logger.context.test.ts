import ecsFormat from '@elastic/ecs-winston-format'
import { injectUserContext } from '../../logger'
import { asyncRequestContext, Context } from './Context'

const baseInfo = () => ({ level: 'info', message: 'test' }) as never

const authedContext: Context = {
  user: 'Austin Moody',
  ipAddress: '203.0.113.7',
  sub: '00uABC',
  userId: '00uABC',
  email: 'amoody@example.com',
  sessionId: 'sess-123',
  jti: 'ID.abc',
  authTime: 1782408092,
}

const expectedSessionUser = {
  name: 'Austin Moody',
  userId: '00uABC',
  email: 'amoody@example.com',
  sessionId: 'sess-123',
  jti: 'ID.abc',
  authTime: 1782408092,
  ip: '203.0.113.7',
}

describe('injectUserContext (logger request-context format)', () => {
  it('omits sessionUser when there is no request context', () => {
    const out = injectUserContext(baseInfo())
    expect(out.sessionUser).toBeUndefined()
  })

  it('attaches sessionUser (identity + correlation fields) when authenticated', () => {
    const out = asyncRequestContext.run(authedContext, () =>
      injectUserContext(baseInfo())
    )
    expect(out.sessionUser).toEqual(expectedSessionUser)
  })

  it('does not fabricate identity for an unauthenticated context', () => {
    const ctx: Context = { user: 'unknown', ipAddress: '203.0.113.7' }
    const out = asyncRequestContext.run(ctx, () => injectUserContext(baseInfo()))
    expect(out.sessionUser).toBeUndefined()
  })

  it('leaves a pre-existing user string field untouched (additive)', () => {
    const info = {
      level: 'info',
      message: 'test',
      user: 'amoody@example.com',
    } as never
    const out = asyncRequestContext.run(authedContext, () =>
      injectUserContext(info)
    )
    expect((out as Record<string, unknown>).user).toBe('amoody@example.com')
    expect(out.sessionUser).toBeDefined()
  })

  it('survives ECS serialization (ecsFormat passes sessionUser through)', () => {
    const enriched = asyncRequestContext.run(authedContext, () =>
      injectUserContext(baseInfo())
    )
    const transformed = ecsFormat().transform({ ...enriched }) as Record<
      symbol,
      string
    >
    const serialized = JSON.parse(transformed[Symbol.for('message')])
    expect(serialized.sessionUser).toEqual(expectedSessionUser)
  })
})
