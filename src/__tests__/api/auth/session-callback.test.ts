/**
 * @jest-environment node
 */
import { authOptions } from '../../../pages/api/auth/[...nextauth]'

const session = (args: any) => (authOptions.callbacks as any).session(args)

describe('next-auth session callback', () => {
  beforeEach(() => {
    process.env.FEATURE_API_KEY_MANAGEMENT_ENABLED = 'false'
  })

  const baseSession = () => ({ user: {} }) as any

  it('resolves roles from an exact-match group name', async () => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', groups: ['IZG Operations'], jurisdictions: [] },
    })
    expect(result.user.roles).toEqual(['IZG Operations'])
  })

  it('resolves roles from a differently cased/punctuated group name', async () => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', groups: ['izg-operations'], jurisdictions: [] },
    })
    expect(result.user.roles).toEqual(['IZG Operations'])
  })

  it('resolves no roles when the token has no groups', async () => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', jurisdictions: [] },
    })
    expect(result.user.roles).toEqual([])
  })

  // IGDD-3552: Okta operations-group membership used to be copied onto the
  // session as `isAdmin`, an authorization axis the role matrix could not see.
  // Every access decision now comes from `roles`, so the flag must not return.
  it.each([
    ['an IZG Operations member', ['IZG Operations']],
    ['a jurisdiction user', ['Jurisdiction Support']],
    ['a user with no groups', []],
  ])('sets no isAdmin flag for %s', async (_label, groups) => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', groups, jurisdictions: [] },
    })
    expect(result.user).not.toHaveProperty('isAdmin')
  })
})
