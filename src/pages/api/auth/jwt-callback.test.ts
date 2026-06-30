/**
 * @jest-environment node
 */
import { authOptions } from './[...nextauth]'
import logger from '../../../../logger'

const makeIdToken = (payload: object) =>
  'header.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.sig'

const jwt = (args: any) => (authOptions.callbacks as any).jwt(args)

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('next-auth jwt callback — audit session identity (IGDD-2223)', () => {
  const realFetch = global.fetch

  beforeEach(() => {
    // The callback fetches Okta /userinfo on sign-in; stub it so no real
    // network call happens (the failure path is handled internally).
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'stubbed',
      json: async () => ({}),
    }) as any
  })

  afterEach(() => {
    global.fetch = realFetch
    jest.restoreAllMocks()
  })

  it('generates sessionId, captures authTime + jti, and logs one Session established record', async () => {
    const logSpy = jest.spyOn(logger, 'info')
    const account = {
      providerAccountId: '00uABC',
      id_token: makeIdToken({ auth_time: 1782408092, jti: 'ID.xyz' }),
      provider: 'okta',
      access_token: 'tok',
    }
    const token = await jwt({
      token: {},
      account,
      profile: {
        id: 'pid',
        name: 'Austin Moody',
        email: 'amoody@example.com',
        groups: ['izg-ops'],
      },
    })

    expect(token.sessionId).toMatch(UUID_RE)
    expect(token.authTime).toBe(1782408092)
    expect(token.oktaJti).toBe('ID.xyz')

    const calls = logSpy.mock.calls as unknown as Array<[string, any]>
    const established = calls.find((c) => c[0] === 'Session established')
    expect(established).toBeDefined()
    const meta = established?.[1]
    expect(meta.sessionUser.sessionId).toBe(token.sessionId)
    expect(meta.sessionUser.jti).toBe('ID.xyz')
    expect(meta.sessionUser.userId).toBe('00uABC')
    expect(meta.groups).toEqual(['izg-ops'])
    expect('role' in meta).toBe(true)
  })

  it('preserves an existing sessionId on subsequent calls without account', async () => {
    const token = await jwt({
      token: { sessionId: 'existing-id', authTime: 123, oktaJti: 'ID.k' },
    })
    expect(token.sessionId).toBe('existing-id')
    expect(token.authTime).toBe(123)
    expect(token.oktaJti).toBe('ID.k')
  })

  it('still sets sessionId and does not throw when id_token is malformed', async () => {
    const account = {
      providerAccountId: '00uABC',
      id_token: 'not-a-jwt',
      provider: 'okta',
      access_token: 'tok',
    }
    const token = await jwt({
      token: {},
      account,
      profile: { id: 'pid', groups: [] },
    })
    expect(token.sessionId).toMatch(UUID_RE)
    expect(token.authTime).toBeUndefined()
    expect(token.oktaJti).toBeUndefined()
  })
})
