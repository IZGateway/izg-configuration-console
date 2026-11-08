/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import withMiddleware, { type RouteAuthz } from './api-middleware-helper'
import { asyncRequestContext, Context } from '../../lib/Context'
import logger from '../../../logger'

describe('withMiddleware request context population (IGDD-2223)', () => {
  it('populates userId, email, sessionId, jti, authTime and leaves user/sub intact', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { name: 'Austin Moody', email: 'amoody@example.com' },
    })
    ;(getToken as jest.Mock).mockResolvedValue({
      sub: '00uABC',
      sessionId: 'sess-123',
      oktaJti: 'ID.xyz',
      authTime: 1782408092,
    })

    let captured: Context | undefined
    const handler = jest.fn(async () => {
      captured = asyncRequestContext.getStore()
    })
    const wrapped = withMiddleware({ session: true })(handler)

    const req: any = {
      url: '/api/test',
      headers: {},
      socket: { remoteAddress: '203.0.113.7' },
      query: {},
    }
    const res: any = { status: jest.fn(() => res), json: jest.fn(), send: jest.fn() }

    await wrapped(req, res)

    expect(handler).toHaveBeenCalled()
    expect(captured).toBeDefined()
    expect(captured?.userId).toBe('00uABC')
    expect(captured?.email).toBe('amoody@example.com')
    expect(captured?.sessionId).toBe('sess-123')
    expect(captured?.jti).toBe('ID.xyz')
    expect(captured?.authTime).toBe(1782408092)
    // existing fields preserved (additive change)
    expect(captured?.user).toBe('Austin Moody')
    expect(captured?.sub).toBe('00uABC')
  })
})

// ---------------------------------------------------------------------------
// IGDD-3472 — enforceRouteAuthz
// ---------------------------------------------------------------------------

const signIn = (roles: string[] | null, jurisdictions: string[] = []) => {
  ;(getServerSession as jest.Mock).mockResolvedValue(
    roles === null
      ? null
      : { user: { email: 'u@example.com', roles, jurisdictions } }
  )
  ;(getToken as jest.Mock).mockResolvedValue({ sub: '00uABC' })
}

const request = (method = 'GET', url = '/api/test') =>
  ({
    url,
    method,
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    query: {},
  }) as any

const response = () => {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    setHeader: jest.fn(() => res),
  }
  return res
}

const run = async (authz: RouteAuthz, req: any, res: any) => {
  const handler = jest.fn(async () => undefined)
  await withMiddleware(authz)(handler)(req, res)
  return handler
}

const deniedEvent = (warnSpy: jest.SpyInstance) =>
  warnSpy.mock.calls.filter((call: any) => call[1]?.eventType === 'AccessDenied')

describe('enforceRouteAuthz: capability rules', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as never)
  })
  afterEach(() => jest.restoreAllMocks())

  const ROTATEKEY: RouteAuthz = {
    capability: {
      page: 'adminoperations',
      capability: 'canManagePasswordEncryption',
    },
  }

  it('403s an unauthorized caller without invoking the handler', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const res = response()
    const handler = await run(ROTATEKEY, request('POST', '/api/rotatekey'), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('writes exactly one AccessDenied event carrying a dotted permission and the roles', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    await run(ROTATEKEY, request('POST', '/api/rotatekey'), response())

    const events = deniedEvent(warnSpy)
    expect(events).toHaveLength(1)
    expect(events[0][1]).toMatchObject({
      eventType: 'AccessDenied',
      deniedAt: 'api',
      page: 'adminoperations',
      // Page-qualified: a bare capability is ambiguous, since
      // canRunConnectionTest exists on two page blocks.
      permission: 'adminoperations.canManagePasswordEncryption',
      // The ECS object, never a string, or Elastic rejects it (IGDD-3541).
      url: { path: '/api/rotatekey' },
      method: 'POST',
      roles: ['Jurisdiction Operations'],
    })
  })

  it('calls next() for an authorized caller', async () => {
    signIn(['IZG Security'])
    const res = response()
    const handler = await run(ROTATEKEY, request('POST', '/api/rotatekey'), res)

    expect(handler).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(deniedEvent(warnSpy)).toHaveLength(0)
  })

  it('403s IZG Operations, which no longer holds password encryption (IGDD-3498)', async () => {
    signIn(['IZG Operations'])
    const res = response()
    const handler = await run(ROTATEKEY, request('POST', '/api/rotatekey'), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(deniedEvent(warnSpy)).toHaveLength(1)
  })

  // IGDD-3549 — a handler recording an audit trail's "which role authorized
  // this?" reads it off the request context rather than re-deciding.
  it('stashes the granting role on the request context for an allowed capability', async () => {
    signIn(['IZG Security'])
    let captured: string | undefined
    const wrapped = withMiddleware(ROTATEKEY)(async () => {
      captured = asyncRequestContext.getStore()?.grantedBy
    })
    await wrapped(request('POST', '/api/rotatekey'), response())
    expect(captured).toBe('IZG Security')
  })
})

describe('enforceRouteAuthz: any-of', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as never)
  })
  afterEach(() => jest.restoreAllMocks())

  // The /api/organizations rule. Two of its three alternatives are
  // tenancy-guarded; the third is not.
  const ORGANIZATIONS: RouteAuthz = {
    capability: [
      { page: 'accesscontrol', capability: 'canViewAccessControl' },
      { page: 'console', capability: 'canViewConsole' },
      { page: 'onboarding', capability: 'canViewOnboarding' },
    ],
  }

  it('admits a caller holding only the unguarded alternative', async () => {
    // Jurisdiction Support: globalTenancy false, canViewOnboarding true.
    // A whole-array guard would break this route for them silently.
    signIn(['Jurisdiction Support'], ['az'])
    const res = response()
    const handler = await run(ORGANIZATIONS, request('GET', '/api/organizations'), res)

    expect(handler).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(403)
  })

  it('admits a caller holding only a guarded alternative when globally scoped', async () => {
    signIn(['IZG Operations'])
    const handler = await run(ORGANIZATIONS, request('GET', '/api/organizations'), response())
    expect(handler).toHaveBeenCalled()
  })

  it('403s a caller holding none of the alternatives', async () => {
    signIn(['Sender Operations'], ['azova'])
    const res = response()
    const handler = await run(ORGANIZATIONS, request('GET', '/api/organizations'), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('names every alternative in the audit event, not just the first', async () => {
    // The caller failed ALL THREE, so there is no single missing capability.
    // Reporting `permission: 'accesscontrol.canViewAccessControl'` would tell
    // an operator to grant that one specifically, when any of the three would
    // have served — and the three sit on three different page blocks, so a
    // `page` field would be arbitrary too. Both are therefore left unset.
    signIn(['Sender Operations'], ['azova'])
    await run(ORGANIZATIONS, request('GET', '/api/organizations'), response())

    const events = deniedEvent(warnSpy)
    expect(events).toHaveLength(1)
    expect(events[0][1]).toMatchObject({
      eventType: 'AccessDenied',
      deniedAt: 'api',
      permissionAnyOf: [
        'accesscontrol.canViewAccessControl',
        'console.canViewConsole',
        'onboarding.canViewOnboarding',
      ],
    })
    expect(events[0][1].permission).toBeUndefined()
    expect(events[0][1].page).toBeUndefined()
  })

  it('still reports a precise permission when a single capability is declared', async () => {
    // The any-of branch must not regress the common case: 21 of the 22
    // capability-enforced routes declare exactly one, and their events carry
    // the dotted page.capability that operators query on.
    signIn(['Sender Operations'], ['azova'])
    await run(
      { capability: { page: 'onboarding', capability: 'canViewOnboarding' } },
      request('GET', '/api/allowedusers'),
      response()
    )

    const events = deniedEvent(warnSpy)
    expect(events).toHaveLength(1)
    expect(events[0][1]).toMatchObject({
      permission: 'onboarding.canViewOnboarding',
      page: 'onboarding',
    })
    expect(events[0][1].permissionAnyOf).toBeUndefined()
  })
})

describe('enforceRouteAuthz: the tenancy guard on unfiltered data paths', () => {
  const DENYLIST_READ: RouteAuthz = {
    capability: { page: 'accesscontrol', capability: 'canViewAccessControl' },
  }

  it('denies a jurisdiction-scoped role that holds the guarded capability', async () => {
    // Simulates the hazard the guard exists for: a one-line matrix edit
    // granting an unfiltered read to a scoped role. The deny-list query takes
    // no jurisdiction argument at all, so the grant would leak every tenant.
    const accessLevel = require('../security/accesslevel').default
    accessLevel['Jurisdiction Support'].accesscontrol.canViewAccessControl = true
    try {
      signIn(['Jurisdiction Support'], ['az'])
      const res = response()
      const handler = await run(DENYLIST_READ, request('GET', '/api/denylist'), res)

      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    } finally {
      accessLevel['Jurisdiction Support'].accesscontrol.canViewAccessControl = false
    }
  })

  it('admits the same capability held through a globally-scoped role', async () => {
    signIn(['IZG Operations'])
    const handler = await run(DENYLIST_READ, request('GET', '/api/denylist'), response())
    expect(handler).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// PR #756 — REQUIRES_DESTINATION_SCOPE: a capability scoped roles hold, whose
// data path is filtered to one destination per request
// ---------------------------------------------------------------------------

describe('enforceRouteAuthz: destination-scoped capabilities', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as never)
  })
  afterEach(() => jest.restoreAllMocks())

  const CONSOLE = { page: 'console', capability: 'canViewConsole' } as const
  const SCOPED: RouteAuthz = {
    capability: CONSOLE,
    scope: (req) => req.body?.destId,
  }
  const post = (body: unknown) => ({ ...request('POST', '/api/console/metrics'), body })

  it('REQUIRES_DESTINATION_SCOPE names exactly the expected capabilities, none also globally guarded', () => {
    const { REQUIRES_DESTINATION_SCOPE, REQUIRES_GLOBAL_TENANCY } =
      require('../security/accessregistry')
    const key = (r: { page: string; capability: string }) => `${r.page}.${r.capability}`
    // console.canViewConsole predates this change; the next eleven were added
    // by protect-connection-pages-and-endpoints (IGDD-3545/3548); the five
    // apikeys.* entries by declare-api-key-endpoint-permissions (IGDD-3549).
    expect(REQUIRES_DESTINATION_SCOPE.map(key).sort()).toEqual(
      [
        'console.canViewConsole',
        'history.canViewConnectionInfo',
        'history.canViewChangeHistory',
        'history.canViewHubStatusHistory',
        'test.canRunConnectionTest',
        'manageconnections.canResetCircuitBreaker',
        'manageconnections.canScheduleMaintainance',
        'edit.canCreateChangeRequest',
        'changerequest.canRescheduleRequest',
        'changerequest.canCancelRequest',
        'changerequest.canViewDetails',
        'onboarding.canManageSenders',
        'apikeys.canListApiKeys',
        'apikeys.canCreateApiKey',
        'apikeys.canRenewApiKey',
        'apikeys.canRevokeApiKey',
        'apikeys.canCancelApiKey',
      ].sort()
    )
    const guarded = new Set(REQUIRES_GLOBAL_TENANCY.map(key))
    expect(REQUIRES_DESTINATION_SCOPE.map(key).filter((k: string) => guarded.has(k))).toEqual([])
  })

  it.each(['Jurisdiction Operations', 'Jurisdiction Support'])(
    '%s passes for its own destination',
    async (role) => {
      signIn([role], ['az'])
      const handler = await run(SCOPED, post({ destId: 'az' }), response())
      expect(handler).toHaveBeenCalled()
    }
  )

  it('matches the destination case-insensitively, as can() does', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const handler = await run(SCOPED, post({ destId: 'AZ' }), response())
    expect(handler).toHaveBeenCalled()
  })

  it('403s another jurisdiction and audits it as a reach denial naming the destination', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const res = response()
    const handler = await run(SCOPED, post({ destId: 'ma' }), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    const events = deniedEvent(warnSpy)
    expect(events).toHaveLength(1)
    expect(events[0][1]).toMatchObject({
      reason: 'Destination outside caller reach',
      deniedAt: 'api',
      permission: 'console.canViewConsole',
      destId: 'ma',
    })
  })

  it.each(['IZG Operations', 'IZG Support'])('%s passes for any destination', async (role) => {
    signIn([role])
    const handler = await run(SCOPED, post({ destId: 'ma' }), response())
    expect(handler).toHaveBeenCalled()
  })

  it('a role without the capability is a role denial, not a reach denial', async () => {
    signIn(['Sender Operations'], ['azova'])
    await run(SCOPED, post({ destId: 'azova' }), response())
    expect(deniedEvent(warnSpy)[0][1].reason).toBe('insufficient role for route access')
  })

  // The review concern this guards: a route that DECLARES a `scope`
  // extractor but it resolves nothing for a given request must lock scoped
  // roles out, not hand them every jurisdiction. Omitting `scope` entirely is
  // a different, deliberate declaration (IGDD-3549) — see the describe block
  // below.
  describe('fails closed when a declared scope resolves nothing', () => {
    it('a scope that names nothing: Jurisdiction Operations is refused', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      const res = response()
      const handler = await run(SCOPED, post({}), res)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(deniedEvent(warnSpy)[0][1]).toMatchObject({
        permission: 'console.canViewConsole',
      })
    })

    it('a global-reach role still passes', async () => {
      signIn(['IZG Operations'])
      const handler = await run(SCOPED, post({}), response())
      expect(handler).toHaveBeenCalled()
    })

    it('the denial says the destination is missing', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      await run(SCOPED, post({}), response())
      expect(deniedEvent(warnSpy)[0][1].reason).toBe(
        'destination-scoped capability used without a destination'
      )
    })
  })

  // IGDD-3549, review follow-up: a scope extractor that THROWS is an
  // infrastructure failure, not a permission decision — it must not be
  // silently folded into "fails closed" (403) above, or an outage becomes
  // indistinguishable from a legitimate deny in the audit trail. 500, logged
  // at error level, no AccessDenied event.
  describe('a scope extractor that throws is an infrastructure failure, not a denial', () => {
    let errorSpy: jest.SpyInstance
    beforeEach(() => {
      errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined as never)
    })
    afterEach(() => errorSpy.mockRestore())

    const THROWING: RouteAuthz = {
      capability: CONSOLE,
      scope: () => {
        throw new Error('bad body')
      },
    }

    it('500s rather than 403ing', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      const res = response()
      const handler = await run(THROWING, post({ destId: 'az' }), res)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(500)
    })

    it('logs at error level and writes no AccessDenied event', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      await run(THROWING, post({ destId: 'az' }), response())
      expect(errorSpy).toHaveBeenCalledWith(
        'Route scope extractor failed',
        expect.objectContaining({ errorMessage: 'bad body' })
      )
      expect(deniedEvent(warnSpy)).toHaveLength(0)
    })

    it('same treatment for a byMethod scope extractor', async () => {
      signIn(['Jurisdiction Operations'], ['az'])
      const res = response()
      const handler = await run(
        {
          byMethod: {
            POST: {
              ...CONSOLE,
              scope: () => {
                throw new Error('bad body')
              },
            },
          },
        },
        post({ destId: 'az' }),
        res
      )
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // IGDD-3549 — Decision 2: omitting `scope` entirely is not "forgetting" it;
  // it is how a route declares "this capability alone governs here, any
  // jurisdiction" (e.g. a list the route row-filters to the caller's reach
  // afterward, rather than naming one destination up front).
  describe('no scope extractor declared at all: capability alone governs', () => {
    it.each([
      ['top-level capability', { capability: CONSOLE } as RouteAuthz],
      ['byMethod', { byMethod: { POST: CONSOLE } } as RouteAuthz],
    ])('%s: a jurisdiction-scoped role holding the capability is admitted', async (_label, authz) => {
      signIn(['Jurisdiction Operations'], ['az'])
      const handler = await run(authz, post({}), response())
      expect(handler).toHaveBeenCalled()
    })

    it('a role without the capability is still refused', async () => {
      signIn(['Sender Operations'], ['azova'])
      const res = response()
      const handler = await run({ capability: CONSOLE }, post({}), res)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    })

    it('a global-reach role is still admitted', async () => {
      signIn(['IZG Operations'])
      const handler = await run({ capability: CONSOLE }, post({}), response())
      expect(handler).toHaveBeenCalled()
    })
  })

  // Role-local: the capability and the reach must come from ONE role. Modelled
  // by temporarily removing IZG Support's console grant, so it supplies global
  // reach but not the capability.
  it('does not let a scoped role borrow reach from an unrelated global role', async () => {
    const accessLevel = require('../security/accesslevel').default
    const original = accessLevel['IZG Support'].console.canViewConsole
    accessLevel['IZG Support'].console.canViewConsole = false
    try {
      signIn(['Jurisdiction Operations', 'IZG Support'], ['az'])
      const res = response()
      const handler = await run(SCOPED, post({ destId: 'ma' }), res)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
    } finally {
      accessLevel['IZG Support'].console.canViewConsole = original
    }
  })

  // IGDD-3549 — `scope` may resolve asynchronously (e.g. a database lookup
  // keyed by a value on the request), not only read a value already on `req`.
  it('awaits an async scope extractor before deciding', async () => {
    const ASYNC_SCOPED: RouteAuthz = {
      capability: CONSOLE,
      scope: async (req) => {
        await Promise.resolve()
        return (req.body as { destId?: string } | undefined)?.destId
      },
    }
    signIn(['Jurisdiction Operations'], ['az'])
    const handler = await run(ASYNC_SCOPED, post({ destId: 'az' }), response())
    expect(handler).toHaveBeenCalled()
  })

  it('an async scope extractor that rejects is a 500, same as a sync throw', async () => {
    const ASYNC_SCOPED: RouteAuthz = {
      capability: CONSOLE,
      scope: async () => {
        await Promise.resolve()
        throw new Error('db unavailable')
      },
    }
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined as never)
    signIn(['Jurisdiction Operations'], ['az'])
    const res = response()
    const handler = await run(ASYNC_SCOPED, post({ destId: 'az' }), res)
    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    errorSpy.mockRestore()
  })

  it('ignores scope for a capability that is not destination-scoped', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const handler = await run(
      {
        capability: { page: 'onboarding', capability: 'canViewOnboarding' },
        scope: () => 'ma',
      },
      post({}),
      response()
    )
    expect(handler).toHaveBeenCalled()
  })
})

describe('enforceRouteAuthz: byMethod', () => {
  const DENYLIST: RouteAuthz = {
    byMethod: {
      GET: { page: 'accesscontrol', capability: 'canViewAccessControl' },
      POST: { page: 'accesscontrol', capability: 'canManageDenyList' },
    },
  }

  it('authorizes the read and refuses the write for a view-only subject', async () => {
    const accessLevel = require('../security/accesslevel').default
    const izgOps = accessLevel['IZG Operations']
    izgOps.accesscontrol.canManageDenyList = false
    try {
      signIn(['IZG Operations'])

      const getHandler = await run(DENYLIST, request('GET', '/api/denylist'), response())
      expect(getHandler).toHaveBeenCalled()

      const postRes = response()
      const postHandler = await run(DENYLIST, request('POST', '/api/denylist'), postRes)
      expect(postHandler).not.toHaveBeenCalled()
      expect(postRes.status).toHaveBeenCalledWith(403)
    } finally {
      izgOps.accesscontrol.canManageDenyList = true
    }
  })

  it('405s a method the route does not declare, with an Allow header', async () => {
    signIn(['IZG Operations'])
    const res = response()
    const handler = await run(DENYLIST, request('PUT', '/api/denylist'), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'GET, POST')
  })
})

// ---------------------------------------------------------------------------
// protect-connection-pages-and-endpoints (IGDD-3545/3548) — byMethod gains
// the same `scope` extractor as the top-level `capability` variant, plus a
// per-method `{ inHandler }` escape for the one method whose destination id
// isn't known without a database lookup the declaration site can't do.
// ---------------------------------------------------------------------------

describe('enforceRouteAuthz: byMethod with a scope extractor and a per-method inHandler escape', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as never)
  })
  afterEach(() => jest.restoreAllMocks())

  // canCancelRequest: true for IZG/Jurisdiction Operations, false for every
  // Support role and Sender Operations — a real discriminator, unlike
  // canViewDetails, which almost every role holds.
  const CANCEL_REQUEST = { page: 'changerequest', capability: 'canCancelRequest' } as const
  const BY_METHOD: RouteAuthz = {
    byMethod: {
      GET: { ...CANCEL_REQUEST, scope: (req) => (req.query.slug as string[] | undefined)?.[1] },
      DELETE: { inHandler: 'IGDD-3545/3548: test fixture, destination id needs a DB lookup' },
    },
  }
  const slugReq = (method: string, destId: string) => {
    const req = request(method, `/api/changerequest/1/${destId}`)
    req.query = { slug: ['1', destId] }
    return req
  }

  it('a byMethod entry with scope passes when one role grants both halves', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const handler = await run(BY_METHOD, slugReq('GET', 'az'), response())
    expect(handler).toHaveBeenCalled()
  })

  it('a byMethod entry with scope 403s a role that reaches the destination but lacks the capability', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    const res = response()
    const handler = await run(BY_METHOD, slugReq('GET', 'az'), res)
    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('a byMethod entry with scope 403s a role that holds the capability but not reach to this destination', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const res = response()
    const handler = await run(BY_METHOD, slugReq('GET', 'ma'), res)
    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  // Regression test: `deny()` used to read the top-level `scope` closure
  // variable, which is never set for byMethod routes, so every byMethod
  // reach-denial was mis-logged as "no destination named" with no destId,
  // even when the per-method `scope` extractor had resolved one correctly.
  it('a byMethod reach-denial logs the resolved destId and the correct reason', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    await run(BY_METHOD, slugReq('GET', 'ma'), response())

    const events = deniedEvent(warnSpy)
    expect(events).toHaveLength(1)
    expect(events[0][1]).toMatchObject({
      reason: 'Destination outside caller reach',
      destId: 'ma',
    })
  })

  it('a byMethod inHandler entry runs the handler for that method without a capability check', async () => {
    signIn(['Sender Operations'], ['azova'])
    const handler = await run(BY_METHOD, slugReq('DELETE', 'azova'), response())
    expect(handler).toHaveBeenCalled()
    expect(deniedEvent(warnSpy)).toHaveLength(0)
  })

  it('the two methods on one declaration are decided independently', async () => {
    // Same caller, same declaration: GET is capability+scope gated and denies
    // them; DELETE is inHandler and lets them through regardless.
    signIn(['Sender Operations'], ['azova'])
    const getRes = response()
    const getHandler = await run(BY_METHOD, slugReq('GET', 'azova'), getRes)
    expect(getHandler).not.toHaveBeenCalled()
    expect(getRes.status).toHaveBeenCalledWith(403)

    const deleteHandler = await run(BY_METHOD, slugReq('DELETE', 'azova'), response())
    expect(deleteHandler).toHaveBeenCalled()
  })
})

describe('enforceRouteAuthz: session, public and inHandler', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined as never)
  })
  afterEach(() => jest.restoreAllMocks())

  it('{ session: true } 401s with no session and writes NO audit event', async () => {
    // Authentication, not RBAC. Logging it would fire on every expired
    // session, which is the noise accessDeniedAudit's header warns against.
    signIn(null)
    const res = response()
    const handler = await run({ session: true }, request(), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(deniedEvent(warnSpy)).toHaveLength(0)
  })

  it('{ session: true } admits any authenticated caller, even with no roles', async () => {
    signIn([])
    const handler = await run({ session: true }, request(), response())
    expect(handler).toHaveBeenCalled()
  })

  it('{ public } admits an unauthenticated caller', async () => {
    signIn(null)
    const handler = await run(
      { public: 'load balancer probe' },
      request('GET', '/api/healthcheck'),
      response()
    )
    expect(handler).toHaveBeenCalled()
  })

  it('{ inHandler } runs the handler without a capability check', async () => {
    signIn(['Sender Operations'], ['azova'])
    const handler = await run(
      { inHandler: 'IGDD-3472: handler decides' },
      request(),
      response()
    )
    expect(handler).toHaveBeenCalled()
    expect(deniedEvent(warnSpy)).toHaveLength(0)
  })
})

describe('a refused request always gets a response', () => {
  // Two instances of "resolves without responding" were found in this
  // change's scope — the middleware helper served as a route, and the deploy
  // handler's unbalanced isAdmin conditional. Neither was caught by any
  // existing test, and both stall the caller with no audit record.
  it.each<[string, RouteAuthz, string, boolean]>([
    [
      'capability',
      { capability: { page: 'changerequest', capability: 'canDeployChange' } },
      'GET',
      true,
    ],
    [
      'byMethod with an undeclared method',
      { byMethod: { POST: { page: 'changerequest', capability: 'canDeployChange' } } },
      'GET',
      true,
    ],
    // The only way { session: true } refuses is with no session at all.
    ['session', { session: true }, 'GET', false],
  ])('%s refusal sends a status', async (_name, authz, method, authenticated) => {
    if (authenticated) signIn(['Sender Operations'], ['azova'])
    else signIn(null)
    const res = response()
    const handler = await run(authz, request(method), res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalled()
  })

  it('a non-admin GET of the deploy route is refused, not left hanging', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    const res = response()
    const handler = await run(
      { capability: { page: 'changerequest', capability: 'canDeployChange' } },
      request('GET', '/api/changerequest/deploy/42'),
      res
    )

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

// IGDD-3541: a string `url` makes Elastic reject the whole document, so the
// error trap's log silently never arrived. Assert the emitted shape directly —
// nothing else would notice, since the event still prints to stdout.
describe('captureErrors log shape (IGDD-3541)', () => {
  it('logs the request url as the ECS object, never a string', async () => {
    signIn(['IZG Operations'])
    const errorSpy = jest
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined as never)
    const res = response()
    const handler = jest.fn(async () => {
      throw new Error('boom')
    })

    await withMiddleware({ session: true }, 'captureErrors')(handler)(
      request('POST', '/api/status/reset?env=dev'),
      res
    )

    const call: any = errorSpy.mock.calls.find(
      (c: any) => c[0] === 'Unhandled error in request'
    )
    expect(call).toBeDefined()
    expect(call[1].url).toEqual({ path: '/api/status/reset', query: 'env=dev' })
    expect(res.status).toHaveBeenCalledWith(500)
    errorSpy.mockRestore()
  })
})
