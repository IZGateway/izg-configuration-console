/**
 * @jest-environment node
 */
import accessLevel from './accesslevel'
import { ANY_JURISDICTION, can, mergePageAccess, hasGlobalTenancy } from './policy'
import { ROLE_PRECEDENCE, type CcRole } from './rolemapping'
import type { AuthzSubject } from './authzsubject'

const subject = (roles: CcRole[], jurisdictions: string[] = []): AuthzSubject => ({
  roles,
  jurisdictions,
})

describe('policy: single-role behaviour is unchanged', () => {
  it.each<[CcRole, boolean]>([
    ['IZG Operations', true],
    ['IZG Support', false],
    ['Jurisdiction Operations', true],
    ['Jurisdiction Support', false],
  ])('%s canListApiKeys === %s', (role, expected) => {
    const s = subject([role], ['az'])
    expect(can(s, 'apikeys', 'canListApiKeys', ANY_JURISDICTION).allowed).toBe(expected)
  })

  it('global roles reach any jurisdiction; scoped roles only their own', () => {
    expect(can(subject(['IZG Operations']), 'apikeys', 'canListApiKeys', 'vha').allowed).toBe(true)
    expect(
      can(subject(['Jurisdiction Operations'], ['az']), 'apikeys', 'canListApiKeys', 'az').allowed
    ).toBe(true)
    expect(
      can(subject(['Jurisdiction Operations'], ['az']), 'apikeys', 'canListApiKeys', 'vha').allowed
    ).toBe(false)
  })
})

describe('policy: THE escalation guard (permission and reach must come from one role)', () => {
  // IZG Support has globalTenancy but no apikeys permissions.
  // Jurisdiction Operations has apikeys permissions but is scoped to `az`.
  // Naively unioning the halves would grant listing over EVERY jurisdiction.
  const mixed = subject(['IZG Support', 'Jurisdiction Operations'], ['az'])

  it('allows the scoped role only within its own jurisdiction', () => {
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(true)
  })

  it('does NOT let IZG Support global reach carry the other role permission', () => {
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'vha').allowed).toBe(false)
    expect(can(mixed, 'apikeys', 'canRevokeApiKey', 'vha').allowed).toBe(false)
    expect(can(mixed, 'apikeys', 'canCreateApiKey', 'azova').allowed).toBe(false)
  })

  it('attributes the decision to the role that actually granted it', () => {
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'az').grantedBy).toBe(
      'Jurisdiction Operations'
    )
  })

  it('IZG Support alone gets nothing on apikeys despite global reach', () => {
    const s = subject(['IZG Support'], ['az'])
    expect(can(s, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(false)
    expect(can(s, 'apikeys', 'canListApiKeys', ANY_JURISDICTION).allowed).toBe(false)
  })
})

describe('policy: prefix matching is exact, never substring', () => {
  // Real data contains both `az` (Arizona) and `azova` (a sender org).
  const arizona = subject(['Jurisdiction Operations'], ['az'])

  it('az must not match azova', () => {
    expect(can(arizona, 'apikeys', 'canListApiKeys', 'azova').allowed).toBe(false)
  })

  it('azova must not match az', () => {
    const azova = subject(['Jurisdiction Operations'], ['azova'])
    expect(can(azova, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(false)
  })

  it('is case-insensitive on an exact match', () => {
    expect(can(arizona, 'apikeys', 'canListApiKeys', 'AZ').allowed).toBe(true)
  })
})

describe('policy: union grants what neither role alone would', () => {
  it('Jurisdiction Support + Jurisdiction Operations gets the latter permissions', () => {
    const s = subject(['Jurisdiction Support', 'Jurisdiction Operations'], ['az'])
    expect(can(s, 'apikeys', 'canRevokeApiKey', 'az').allowed).toBe(true)
  })

  it('mergePageAccess ORs flags across held roles', () => {
    const supportOnly = mergePageAccess(subject(['Jurisdiction Support']), 'apikeys')
    expect(supportOnly.canListApiKeys).toBeFalsy()

    const both = mergePageAccess(
      subject(['Jurisdiction Support', 'Jurisdiction Operations']),
      'apikeys'
    )
    expect(both.canListApiKeys).toBe(true)
  })
})

describe('policy: deny by default', () => {
  it('no roles denies everything and yields empty page access', () => {
    const none = subject([])
    expect(can(none, 'apikeys', 'canListApiKeys', ANY_JURISDICTION).allowed).toBe(false)
    expect(can(none, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(false)
    expect(mergePageAccess(none, 'apikeys').canListApiKeys).toBeFalsy()
    expect(hasGlobalTenancy(none)).toBe(false)
  })

  it('a scoped role with no jurisdictions reaches nothing', () => {
    const s = subject(['Jurisdiction Operations'], [])
    expect(can(s, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(false)
  })
})

describe('registry drift', () => {
  it('ROLE_PRECEDENCE and the access matrix describe the same role set', () => {
    expect([...ROLE_PRECEDENCE].sort()).toEqual(Object.keys(accessLevel).sort())
  })

  it('every role declares globalTenancy explicitly', () => {
    for (const role of ROLE_PRECEDENCE) {
      expect(typeof accessLevel[role].globalTenancy).toBe('boolean')
    }
  })
})
