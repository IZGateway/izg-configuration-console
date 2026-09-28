/**
 * @jest-environment node
 */
import accessLevel from './accesslevel'
import type { PageKey } from './accesslevel'
import { ANY_JURISDICTION, can, mergePageAccess, hasGlobalTenancy } from './policy'
import { ROLE_PRECEDENCE, type CcRole } from './rolemapping'
import type { AuthzSubject } from './authzsubject'
import {
  PAGE_ENTRY,
  REQUIRES_GLOBAL_TENANCY,
  requiresGlobalTenancy,
  type CapabilityRef,
} from './accessregistry'

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

describe('policy: Sender Operations is scoped to its own organization', () => {
  const sender = subject(['Sender Operations'], ['vha'])

  it('has full apikeys lifecycle within its own jurisdiction', () => {
    expect(can(sender, 'apikeys', 'canListApiKeys', 'vha').allowed).toBe(true)
    expect(can(sender, 'apikeys', 'canCreateApiKey', 'vha').allowed).toBe(true)
    expect(can(sender, 'apikeys', 'canRevokeApiKey', 'vha').allowed).toBe(true)
    expect(can(sender, 'apikeys', 'canRenewApiKey', 'vha').allowed).toBe(true)
    expect(can(sender, 'apikeys', 'canCancelApiKey', 'vha').allowed).toBe(true)
  })

  it('has no reach outside its own jurisdiction', () => {
    expect(can(sender, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(false)
    expect(can(sender, 'apikeys', 'canListApiKeys', ANY_JURISDICTION).allowed).toBe(true)
  })

  it('has no access to any IIS-only page', () => {
    const access = mergePageAccess(sender, 'manageconnections')
    expect(access.canViewConnections).toBeFalsy()
    expect(mergePageAccess(sender, 'test').canRunConnectionTest).toBeFalsy()
    expect(mergePageAccess(sender, 'changerequest').canViewDetails).toBeFalsy()
    expect(mergePageAccess(sender, 'history').canViewChangeHistory).toBeFalsy()
    expect(mergePageAccess(sender, 'onboarding').canViewOnboarding).toBeFalsy()
  })
})

describe('policy: THE escalation guard generalizes to Sender Operations', () => {
  // Mirrors the IZG Support + Jurisdiction Operations case above, but with the
  // sender role as the scoped, permission-granting half.
  const mixed = subject(['IZG Support', 'Sender Operations'], ['vha'])

  it('allows only the sender organization, never every jurisdiction', () => {
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'vha').allowed).toBe(true)
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(false)
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'azova').allowed).toBe(false)
  })

  it('attributes the decision to Sender Operations, not IZG Support', () => {
    expect(can(mixed, 'apikeys', 'canListApiKeys', 'vha').grantedBy).toBe(
      'Sender Operations'
    )
  })
})

describe('policy: union with Sender Operations keeps each role scoped independently', () => {
  it('Jurisdiction Operations + Sender Operations reaches both, and only both', () => {
    const s = subject(['Jurisdiction Operations', 'Sender Operations'], ['az', 'vha'])
    expect(can(s, 'apikeys', 'canListApiKeys', 'az').allowed).toBe(true)
    expect(can(s, 'apikeys', 'canListApiKeys', 'vha').allowed).toBe(true)
    expect(can(s, 'apikeys', 'canListApiKeys', 'md').allowed).toBe(false)
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

// ---------------------------------------------------------------------------
// IGDD-3472 — admin page capabilities
// ---------------------------------------------------------------------------

const ADMIN_CAPABILITIES: CapabilityRef[] = [
  { page: 'accesscontrol', capability: 'canViewAccessControl' },
  { page: 'accesscontrol', capability: 'canManageAccessGroups' },
  { page: 'accesscontrol', capability: 'canManageDenyList' },
  { page: 'accesscontrol', capability: 'canManageAdsFileTypes' },
  { page: 'adminoperations', capability: 'canViewAdminOperations' },
  { page: 'adminoperations', capability: 'canManagePasswordEncryption' },
  { page: 'adminoperations', capability: 'canResetHubCircuitBreakers' },
  { page: 'adminoperations', capability: 'canRefreshHubDatabase' },
  { page: 'console', capability: 'canViewConsole' },
  { page: 'api-doc', capability: 'canViewApiDoc' },
]

const NON_OPERATIONS_ROLES: CcRole[] = [
  'IZG Support',
  'Jurisdiction Operations',
  'Jurisdiction Support',
  'Sender Operations',
]

describe('IGDD-3472 seeds: the admin capabilities reproduce today access exactly', () => {
  // The seed values must grant precisely what `isAdmin` grants today and no
  // more. If this table ever needs editing, the change is granting or removing
  // access and must be reviewed as such.
  it.each(ADMIN_CAPABILITIES)(
    'IZG Operations holds $page.$capability',
    (ref) => {
      const s = subject(['IZG Operations'])
      expect(can(s, ref.page, ref.capability as never, ANY_JURISDICTION).allowed).toBe(
        true
      )
    }
  )

  it.each(NON_OPERATIONS_ROLES)('%s holds no new admin capability', (role) => {
    const s = subject([role], ['az'])
    for (const ref of ADMIN_CAPABILITIES) {
      expect(
        can(s, ref.page, ref.capability as never, ANY_JURISDICTION).allowed
      ).toBe(false)
    }
  })
})

describe('IGDD-3472 block-shape drift', () => {
  // Catches a hand-written block with a typo'd flag name. Omitting the `as`
  // assertions restores excess-property checking for a literal, but it cannot
  // catch a flag that is simply absent from one role and present in another.
  const roles = Object.keys(accessLevel) as CcRole[]

  it('every role declares the same set of page keys', () => {
    const reference = Object.keys(accessLevel[roles[0]])
      .filter((k) => k !== 'globalTenancy')
      .sort()
    for (const role of roles) {
      const keys = Object.keys(accessLevel[role])
        .filter((k) => k !== 'globalTenancy')
        .sort()
      expect({ role, keys }).toEqual({ role, keys: reference })
    }
  })

  it('every role declares the same capability set within each page block', () => {
    const pages = Object.keys(accessLevel[roles[0]]).filter(
      (k) => k !== 'globalTenancy'
    ) as PageKey[]
    for (const page of pages) {
      const reference = Object.keys(accessLevel[roles[0]][page]).sort()
      for (const role of roles) {
        const keys = Object.keys(accessLevel[role][page]).sort()
        expect({ role, page, keys }).toEqual({ role, page, keys: reference })
      }
    }
  })
})

describe('IGDD-3472 tenancy invariant on unfiltered data paths', () => {
  // DERIVED from REQUIRES_GLOBAL_TENANCY, never hardcoded: the test and the
  // guard cannot drift, and adding a capability to the set extends the
  // coverage automatically.
  //
  // Do NOT widen this to every admin flag. Only capabilities over an
  // unfiltered data path are invariants; the rest are today's provisional
  // seeds, and a test asserting "adminoperations is false for every scoped
  // role" fails legitimately the first time the ratified matrix grants one.
  // Whoever hits that red build under deadline deletes the test rather than
  // narrowing it, taking the real invariants with it. The set is the line.
  it('no jurisdiction-scoped role holds a guarded capability', () => {
    for (const ref of REQUIRES_GLOBAL_TENANCY) {
      for (const role of Object.keys(accessLevel) as CcRole[]) {
        if (accessLevel[role].globalTenancy) continue
        const held = !!accessLevel[role][ref.page][ref.capability as never]
        expect({ role, ...ref, held }).toEqual({ role, ...ref, held: false })
      }
    }
  })

  it('the guarded set is exactly the capabilities over unfiltered reads', () => {
    // A change to this list is a claim about a data path, so it should be a
    // deliberate edit here as well as in the source.
    expect(
      REQUIRES_GLOBAL_TENANCY.map((r) => `${r.page}.${String(r.capability)}`).sort()
    ).toEqual([
      'accesscontrol.canManageAccessGroups',
      'accesscontrol.canManageAdsFileTypes',
      'accesscontrol.canManageDenyList',
      'accesscontrol.canViewAccessControl',
      'console.canViewConsole',
    ])
  })

  it('the guard is evaluated per alternative in an any-of rule', () => {
    // The /api/organizations rule. Two of its three alternatives are guarded;
    // Jurisdiction Support reaches the route through the unguarded third and
    // must continue to. Applying the strictest guard across the array would
    // break that silently.
    const organizationsRule: CapabilityRef[] = [
      { page: 'accesscontrol', capability: 'canViewAccessControl' },
      { page: 'console', capability: 'canViewConsole' },
      { page: 'onboarding', capability: 'canViewOnboarding' },
    ]
    const scoped = subject(['Jurisdiction Support'], ['az'])

    const satisfies = (ref: CapabilityRef) =>
      can(scoped, ref.page, ref.capability as never, ANY_JURISDICTION).allowed &&
      (!requiresGlobalTenancy(ref) || hasGlobalTenancy(scoped))

    expect(organizationsRule.some(satisfies)).toBe(true)
    // ...and only via the unguarded alternative.
    expect(satisfies(organizationsRule[0])).toBe(false)
    expect(satisfies(organizationsRule[1])).toBe(false)
    expect(satisfies(organizationsRule[2])).toBe(true)
  })
})

describe('IGDD-3472 extension contract: a role is data, not code', () => {
  // The design claims adding a role with one narrow capability requires no
  // edit to any enforcement function. The compiler already covers the
  // completeness half (PageControls is a required-key type). This covers the
  // isolation half: holding one capability must not confer any other.
  it('a synthetic role holding exactly one capability gets that one and nothing else', () => {
    const ONE: CapabilityRef = {
      page: 'adminoperations',
      capability: 'canRefreshHubDatabase',
    }
    // Built from the matrix's own shape with every flag forced false, rather
    // than cloning an existing role: cloning inherits whatever that role
    // happens to hold, which makes "and nothing else" vacuous.
    const synthetic = JSON.parse(JSON.stringify(accessLevel['Sender Operations']))
    synthetic.globalTenancy = true
    for (const key of Object.keys(synthetic)) {
      if (key === 'globalTenancy') continue
      for (const flag of Object.keys(synthetic[key])) {
        synthetic[key][flag] = false
      }
    }
    synthetic[ONE.page][ONE.capability] = true

    const ROLE = 'Synthetic Narrow Role'
    ;(accessLevel as Record<string, unknown>)[ROLE] = synthetic
    try {
      const s = subject([ROLE as CcRole])
      expect(can(s, ONE.page, ONE.capability as never, ANY_JURISDICTION).allowed).toBe(
        true
      )

      const pages = Object.keys(synthetic).filter(
        (k) => k !== 'globalTenancy'
      ) as PageKey[]
      for (const page of pages) {
        for (const capability of Object.keys(accessLevel[ROLE][page])) {
          if (page === ONE.page && capability === ONE.capability) continue
          expect({
            page,
            capability,
            allowed: can(s, page, capability as never, ANY_JURISDICTION).allowed,
          }).toEqual({ page, capability, allowed: false })
        }
      }
    } finally {
      delete (accessLevel as Record<string, unknown>)[ROLE]
    }
  })
})

describe('IGDD-3472 PAGE_ENTRY', () => {
  it('names a capability that exists on every page block it points at', () => {
    for (const [page, capability] of Object.entries(PAGE_ENTRY)) {
      for (const role of Object.keys(accessLevel) as CcRole[]) {
        expect({
          page,
          capability,
          present: capability in accessLevel[role][page as PageKey],
        }).toEqual({ page, capability, present: true })
      }
    }
  })

  it('covers every page key in the access matrix', () => {
    const matrixPages = Object.keys(accessLevel['IZG Operations'])
      .filter((k) => k !== 'globalTenancy')
      .sort()
    expect(Object.keys(PAGE_ENTRY).sort()).toEqual(matrixPages)
  })
})
