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
  authTime: 1782408092,
}

describe('injectUserContext (logger request-context format)', () => {
  it('omits the user block when there is no request context', () => {
    const out = injectUserContext(baseInfo())
    expect(out.user).toBeUndefined()
    expect(out.client).toBeUndefined()
  })

  it('attaches the standardized user block + correlation fields when authenticated', () => {
    const out = asyncRequestContext.run(authedContext, () =>
      injectUserContext(baseInfo())
    )
    expect(out.user).toEqual({
      name: 'Austin Moody',
      id: '00uABC',
      email: 'amoody@example.com',
      sessionId: 'sess-123',
    })
    expect(out.auth_time).toBe(1782408092)
    expect(out.client).toEqual({ ip: '203.0.113.7' })
  })

  it('does not fabricate identity for an unauthenticated context', () => {
    const ctx: Context = { user: 'unknown', ipAddress: '203.0.113.7' }
    const out = asyncRequestContext.run(ctx, () => injectUserContext(baseInfo()))
    expect(out.user).toBeUndefined()
    // IP is request metadata, not identity — fine to include.
    expect(out.client).toEqual({ ip: '203.0.113.7' })
  })

  it('survives ECS serialization (ecsFormat passes the user block through)', () => {
    const enriched = asyncRequestContext.run(authedContext, () =>
      injectUserContext(baseInfo())
    )
    const transformed = ecsFormat().transform({ ...enriched }) as Record<
      symbol,
      string
    >
    const serialized = JSON.parse(transformed[Symbol.for('message')])
    expect(serialized.user).toEqual({
      name: 'Austin Moody',
      id: '00uABC',
      email: 'amoody@example.com',
      sessionId: 'sess-123',
    })
    expect(serialized.client).toEqual({ ip: '203.0.113.7' })
    expect(serialized.auth_time).toBe(1782408092)
  })
})
