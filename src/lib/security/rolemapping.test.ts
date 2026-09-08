/**
 * @jest-environment node
 */
import {
  getGroups,
  getGroupsFromClaims,
  getGroupsFromJwt,
  mergeGroups,
  normalizeGroupName,
  rolesFromGroups,
} from './rolemapping'

const jwtWith = (payload: unknown) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`

describe('group name normalization', () => {
  it.each([
    'IZG Operations',
    'izg operations',
    'IZG-Operations',
    'izg_operations',
    '  IZG   OPERATIONS  ',
  ])('resolves %p to the IZG Operations role', (groupName) => {
    expect(rolesFromGroups([groupName])).toEqual(['IZG Operations'])
  })

  it('collapses separators and case to one key', () => {
    expect(normalizeGroupName('IZG-Operations')).toBe(
      normalizeGroupName('izg operations')
    )
  })
})

describe('tolerant claim shapes', () => {
  it('reads an array of strings', () => {
    expect(getGroups(['IZG Support'])).toEqual(['IZG Support'])
  })

  it('reads an array of group objects', () => {
    expect(
      getGroups([
        { name: 'IZG Operations' },
        { label: 'IZG Support' },
        { value: 'Jurisdiction Support' },
        { profile: { name: 'Jurisdiction Operations' } },
      ])
    ).toEqual([
      'IZG Operations',
      'IZG Support',
      'Jurisdiction Support',
      'Jurisdiction Operations',
    ])
  })

  it('reads a JSON-encoded array', () => {
    expect(getGroups('["IZG Operations","IZG Support"]')).toEqual([
      'IZG Operations',
      'IZG Support',
    ])
  })

  it('reads a comma-separated string', () => {
    expect(getGroups('IZG Operations, IZG Support')).toEqual([
      'IZG Operations',
      'IZG Support',
    ])
  })

  it('reads a single bare string', () => {
    expect(getGroups('IZG Operations')).toEqual(['IZG Operations'])
  })

  it.each(['groups', 'Groups', 'group', 'Group'])(
    'reads the %s claim key',
    (key) => {
      expect(getGroupsFromClaims({ [key]: ['IZG Support'] })).toEqual(['IZG Support'])
    }
  )

  it('returns [] for junk rather than throwing', () => {
    expect(getGroups(undefined)).toEqual([])
    expect(getGroups(null)).toEqual([])
    expect(getGroups(42)).toEqual([])
    expect(getGroupsFromClaims(null)).toEqual([])
    expect(getGroupsFromJwt('not-a-jwt')).toEqual([])
    expect(getGroupsFromJwt('a.!!!notbase64!!!.c')).toEqual([])
  })
})

describe('multi-source merge', () => {
  const profile = { groups: ['IZG Support'] }
  const idToken = jwtWith({ groups: ['Jurisdiction Support'] })
  const accessToken = jwtWith({ groups: ['Jurisdiction Operations'] })
  const userInfo = { groups: ['IZG Operations'] }

  it('picks up a group present in ONLY the ID token', () => {
    const groups = mergeGroups(
      getGroupsFromClaims({}),
      getGroupsFromJwt(idToken),
      getGroupsFromJwt(undefined),
      getGroupsFromClaims({})
    )
    expect(rolesFromGroups(groups)).toEqual(['Jurisdiction Support'])
  })

  it('picks up a group present in ONLY the access token', () => {
    const groups = mergeGroups(
      getGroupsFromClaims({}),
      getGroupsFromJwt(undefined),
      getGroupsFromJwt(accessToken),
      getGroupsFromClaims({})
    )
    expect(rolesFromGroups(groups)).toEqual(['Jurisdiction Operations'])
  })

  it('picks up a group present in ONLY userinfo', () => {
    const groups = mergeGroups(
      getGroupsFromClaims({}),
      getGroupsFromJwt(undefined),
      getGroupsFromJwt(undefined),
      getGroupsFromClaims(userInfo)
    )
    expect(rolesFromGroups(groups)).toEqual(['IZG Operations'])
  })

  it('unions all four and never subtracts', () => {
    const groups = mergeGroups(
      getGroupsFromClaims(profile),
      getGroupsFromJwt(idToken),
      getGroupsFromJwt(accessToken),
      getGroupsFromClaims(userInfo)
    )
    expect(rolesFromGroups(groups).sort()).toEqual(
      [
        'IZG Operations',
        'IZG Support',
        'Jurisdiction Operations',
        'Jurisdiction Support',
      ].sort()
    )
  })

  it('de-duplicates a group present in several sources', () => {
    expect(mergeGroups(['IZG Support'], ['IZG Support'])).toEqual(['IZG Support'])
  })
})

describe('role resolution', () => {
  it('is order-independent — the defect this change fixes', () => {
    const a = rolesFromGroups(['Jurisdiction Operations', 'IZG Support'])
    const b = rolesFromGroups(['IZG Support', 'Jurisdiction Operations'])
    expect(a).toEqual(b)
    expect(a).toEqual(['IZG Support', 'Jurisdiction Operations'])
  })

  it('ignores unmapped groups without displacing a working role', () => {
    expect(rolesFromGroups(['CDC Program', 'Jurisdiction Operations'])).toEqual([
      'Jurisdiction Operations',
    ])
    expect(rolesFromGroups(['IZG Program', 'CDC CISO'])).toEqual([])
  })

  it('returns [] for a user in no recognized group', () => {
    expect(rolesFromGroups(['Some Unrelated Okta Group'])).toEqual([])
    expect(rolesFromGroups([])).toEqual([])
  })
})
