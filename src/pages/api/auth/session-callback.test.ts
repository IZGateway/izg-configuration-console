/**
 * @jest-environment node
 */
import { authOptions } from './[...nextauth]'

const session = (args: any) => (authOptions.callbacks as any).session(args)

describe('next-auth session callback — isAdmin group matching', () => {
  const originalOperationsGroup = process.env.OPERATIONS_GROUP

  beforeEach(() => {
    process.env.OPERATIONS_GROUP = 'IZG Operations'
    process.env.FEATURE_API_KEY_MANAGEMENT_ENABLED = 'false'
  })

  afterEach(() => {
    process.env.OPERATIONS_GROUP = originalOperationsGroup
  })

  const baseSession = () => ({ user: {} }) as any

  it('sets isAdmin true for an exact-match group name', async () => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', groups: ['IZG Operations'], jurisdictions: [] },
    })
    expect(result.user.isAdmin).toBe(true)
  })

  it('sets isAdmin true for a differently cased/punctuated group name', async () => {
    // Reviewer-flagged case (PR #666): `isAdmin` used to be a raw `includes`
    // against OPERATIONS_GROUP while `roles` was normalized via
    // rolesFromGroups, so a group like `izg-operations` resolved the correct
    // role but left isAdmin false — silently hiding admin-only controls
    // (DenyList.tsx, FileTypeList.tsx) that key off isAdmin alone.
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', groups: ['izg-operations'], jurisdictions: [] },
    })
    expect(result.user.isAdmin).toBe(true)
  })

  it('sets isAdmin false when no held group matches OPERATIONS_GROUP', async () => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', groups: ['Jurisdiction Support'], jurisdictions: [] },
    })
    expect(result.user.isAdmin).toBe(false)
  })

  it('sets isAdmin false when the token has no groups', async () => {
    const result = await session({
      session: baseSession(),
      token: { id: 'u1', jurisdictions: [] },
    })
    expect(result.user.isAdmin).toBe(false)
  })
})
