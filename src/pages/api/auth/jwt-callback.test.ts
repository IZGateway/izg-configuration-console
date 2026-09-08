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
    const established = calls.filter((c) => c[0] === 'Session established')
    expect(established).toHaveLength(1)
    const meta = established[0]?.[1]
    expect(meta.sessionUser.sessionId).toBe(token.sessionId)
    expect(meta.sessionUser.jti).toBe('ID.xyz')
    expect(meta.sessionUser.userId).toBe('00uABC')
    expect(meta.groups).toEqual(['izg-ops'])
    // The snapshot records the FULL role set, not a single role: permissions are
    // a union across held roles, so logging one would make "which role
    // authorized this?" unanswerable after the fact. `izg-ops` is not a mapped
    // group name, so it resolves to no roles — the point here is that the field
    // is present and is an array.
    expect('roles' in meta).toBe(true)
    expect(Array.isArray(meta.roles)).toBe(true)
    expect('role' in meta).toBe(false)
  })

  it('merges groups from profile, id_token, access_token and userinfo', async () => {
    const encode = (payload: unknown) =>
      Buffer.from(JSON.stringify(payload)).toString('base64url')

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jurisdictions: ['AZ'],
        groups: ['Jurisdiction Support'],
      }),
    }) as unknown as typeof fetch

    const token = await jwt({
      token: {},
      account: {
        providerAccountId: '00uABC',
        id_token: `h.${encode({ auth_time: 1, jti: 'ID.x', groups: ['IZG Support'] })}.s`,
        provider: 'okta',
        access_token: `h.${encode({ groups: ['Jurisdiction Operations'] })}.s`,
      },
      profile: { id: 'pid', groups: ['IZG Operations'] },
    })

    // One group from each of the four sources must survive the union.
    expect([...token.groups].sort()).toEqual([
      'IZG Operations',
      'IZG Support',
      'Jurisdiction Operations',
      'Jurisdiction Support',
    ])
    // Jurisdictions still resolve, and are lowercased.
    expect(token.jurisdictions).toEqual(['az'])
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
