/**
 * @jest-environment node
 */
import { authOptions } from './[...nextauth]'

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

  it('generates a sessionId and captures authTime at sign-in', async () => {
    const account = {
      providerAccountId: '00uABC',
      id_token: makeIdToken({ auth_time: 1782408092 }),
      provider: 'okta',
      access_token: 'tok',
    }
    const token = await jwt({
      token: {},
      account,
      profile: { id: 'pid', groups: ['g'] },
    })
    expect(token.sessionId).toMatch(UUID_RE)
    expect(token.authTime).toBe(1782408092)
  })

  it('preserves an existing sessionId on subsequent calls without account', async () => {
    const token = await jwt({ token: { sessionId: 'existing-id', authTime: 123 } })
    expect(token.sessionId).toBe('existing-id')
    expect(token.authTime).toBe(123)
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
  })
})
