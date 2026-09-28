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

describe('RBAC rejection audit logging', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs a structured AccessDenied event when checkAdmin rejects a non-admin caller', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'nonadmin@example.com', role: 'Jurisdiction Operations', isAdmin: false },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: '00uXYZ' })
    const warnSpy = jest.spyOn(logger, 'warn')

    const handler = jest.fn()
    // checkAdmin still runs alongside the capability on the two status routes;
    // the capability is granted here so the assertion isolates checkAdmin.
    const wrapped = withMiddleware(
      { capability: { page: 'adminoperations', capability: 'canResetHubCircuitBreakers' } },
      'checkAdmin'
    )(handler)

    const req: any = {
      url: '/api/status/reset',
      method: 'POST',
      headers: {},
      socket: { remoteAddress: '203.0.113.7' },
      query: {},
    }
    const res: any = { status: jest.fn(() => res), json: jest.fn(), send: jest.fn() }

    await wrapped(req, res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)

    const deniedCall: any = warnSpy.mock.calls.find(
      (call: any) => call[1]?.eventType === 'AccessDenied'
    )
    expect(deniedCall).toBeDefined()
  })

  it('logs a structured AccessDenied event when checkAccessToDestId rejects an out-of-jurisdiction caller', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'jurops@example.com',
        role: 'Jurisdiction Operations',
        jurisdictions: ['ainq'],
      },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: '00uABC' })
    const warnSpy = jest.spyOn(logger, 'warn')

    const handler = jest.fn()
    const wrapped = withMiddleware(
      { inHandler: 'IGDD-3472: test fixture' },
      'checkAccessToDestId'
    )(handler)

    const req: any = {
      url: '/api/destinations/other-jurisdiction',
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '203.0.113.7' },
      query: { id: 'other-jurisdiction' },
    }
    const res: any = { status: jest.fn(() => res), json: jest.fn(), send: jest.fn() }

    await wrapped(req, res)

    expect(handler).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)

    const deniedCall: any = warnSpy.mock.calls.find(
      (call: any) => call[1]?.eventType === 'AccessDenied'
    )
    expect(deniedCall).toBeDefined()
    expect(deniedCall[1]).toMatchObject({
      eventType: 'AccessDenied',
      reason: 'caller has no access to destination',
      destId: 'other-jurisdiction',
    })
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
      // canViewChangeRequest exists on two page blocks.
      permission: 'adminoperations.canManagePasswordEncryption',
      url: '/api/rotatekey',
      method: 'POST',
      roles: ['Jurisdiction Operations'],
    })
  })

  it('calls next() for an authorized caller', async () => {
    signIn(['IZG Operations'])
    const res = response()
    const handler = await run(ROTATEKEY, request('POST', '/api/rotatekey'), res)

    expect(handler).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(deniedEvent(warnSpy)).toHaveLength(0)
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
