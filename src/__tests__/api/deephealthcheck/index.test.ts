/**
 * @jest-environment node
 *
 * IGDD-3178: /api/deephealthcheck is deliberately public so the load balancer can
 * probe it without a credential, so the full per-component result — upstream error
 * messages, the Okta issuer, the Jira health URL, and the internal ALB DNS name and
 * port behind IZG_HEALTHCHECK_URL — was reaching anonymous callers.
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockIsDatabaseConnected = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      isDatabaseConnected: () => mockIsDatabaseConnected(),
    }),
  },
}))

const mockAxiosGet = jest.fn()
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}))

jest.mock('fs', () => ({ readFileSync: jest.fn(() => 'pem-bytes') }))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import handler from '../../../pages/api/deephealthcheck/index'
import { decideCapability } from '../../../lib/security/accessregistry'
import { subjectOf } from '../../../lib/security/authzsubject'
import { ROLE_PRECEDENCE } from '../../../lib/security/rolemapping'

/**
 * Stand-in addresses, not real ones. This repo is public, so the actual ALB DNS
 * name, Okta issuer and Jira URL do not belong in a committed test — least of all
 * one asserting that we stop disclosing them.
 *
 * The `.example` TLD is reserved by RFC 2606 and can never be delegated, so if a
 * mock is ever dropped the request fails loudly against an unresolvable name
 * instead of quietly reaching a real dependency.
 */
const IZG_URL = 'https://hub.izg.example:444/rest/healthy'
const OKTA_ISSUER = 'https://okta.izg.example'
const JIRA_URL =
  'https://jira.izg.example/rest/api/2/serverInfo?doHealthCheck=true'

const buildReqRes = () => {
  const req = {
    method: 'GET',
    url: '/api/deephealthcheck',
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    query: {},
  } as never
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  } as never
  return { req, res }
}

/** The body the handler passed to res.json(). */
const bodyOf = (res: never): unknown =>
  (res as unknown as { json: jest.Mock }).json.mock.calls[0][0]

const statusOf = (res: never): number =>
  (res as unknown as { status: jest.Mock }).status.mock.calls[0][0]

/**
 * Split every role by what the matrix grants, so a role added or re-granted by
 * a data change is exercised here without editing this file. Which roles hold
 * it is asserted once, in policy.test.ts and the role-matrix snapshot.
 */
const holdsDetail = (role: string) =>
  decideCapability(subjectOf({ user: { roles: [role], jurisdictions: ['az'] } }), {
    page: 'adminoperations',
    capability: 'canViewDeepHealthCheckDetail',
  })
const DETAIL_ROLES = ROLE_PRECEDENCE.filter(holdsDetail)
const NON_DETAIL_ROLES = ROLE_PRECEDENCE.filter((role) => !holdsDetail(role))

describe('GET /api/deephealthcheck disclosure by caller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })

    process.env.IZG_HEALTHCHECK_URL = IZG_URL
    process.env.IZG_ENDPOINT_CRT_PATH = '/certs/console.crt'
    process.env.IZG_ENDPOINT_KEY_PATH = '/certs/console.key'
    process.env.NEXT_PUBLIC_OKTA_ISSUER = OKTA_ISSUER
    process.env.JIRA_HEALTHCHECK_URL = JIRA_URL

    mockIsDatabaseConnected.mockResolvedValue(true)
    mockAxiosGet.mockResolvedValue({
      data: {
        healthy: true,
        statusAt: '2026-10-19T18:31:18.819+0000',
        lastChangeReason: 'Normal application startup',
      },
    })
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ state: 'RUNNING' }),
    }) as never
  })

  const anonymous = () =>
    (getServerSession as jest.Mock).mockResolvedValue(null)

  /**
   * Holds adminoperations.canViewDeepHealthCheckDetail through the role matrix
   * (IGDD-3552) — the only kind of caller entitled to the full result.
   */
  const detailHolder = (role = 'IZG Operations') =>
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'ops@example.com', roles: [role] },
    })

  /**
   * Signed in without the permission. There is no `signIn` callback, so any Okta
   * tenant user who completes the flow lands here — including one holding no CC
   * roles at all.
   */
  const signedInWithoutDetail = (roles: string[] = [], jurisdictions: string[] = []) =>
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'viewer@example.com', roles, jurisdictions },
    })

  /**
   * The guard that matters: an exact key set, so a field added to any probe later
   * fails this test rather than reaching anonymous callers unnoticed.
   */
  it('discloses only component, status and statusAt to an unauthenticated caller', async () => {
    anonymous()
    const { req, res } = buildReqRes()

    await handler(req, res)

    expect(statusOf(res)).toBe(200)
    const body = bodyOf(res) as Record<string, unknown>[]
    expect(body).toHaveLength(4)
    for (const component of body) {
      expect(Object.keys(component).sort()).toEqual([
        'component',
        'status',
        'statusAt',
      ])
    }
  })

  it('discloses no dependency address or upstream detail to an unauthenticated caller', async () => {
    anonymous()
    const { req, res } = buildReqRes()

    await handler(req, res)

    const serialized = JSON.stringify(bodyOf(res))
    for (const secret of [
      'hub.izg.example',
      'okta.izg.example',
      'jira.izg.example',
      // Not ours, but still a literal in the handler that must not reach an
      // anonymous caller.
      'status.okta.com',
      'Normal application startup',
      '/certs/',
    ]) {
      expect(serialized).not.toContain(secret)
    }
  })

  it('still reports liveness per component to an unauthenticated caller', async () => {
    anonymous()
    const { req, res } = buildReqRes()

    await handler(req, res)

    const body = bodyOf(res) as {
      component: string
      status: string
      statusAt: string
    }[]
    expect(body.map((c) => c.component)).toEqual(['DB', 'OKTA', 'JIRA', 'IZG'])
    expect(body.every((c) => c.status === 'connected')).toBe(true)
    expect(body.every((c) => typeof c.statusAt === 'string')).toBe(true)
  })

  it('gives a caller holding canViewDeepHealthCheckDetail the full result', async () => {
    detailHolder()
    const { req, res } = buildReqRes()

    await handler(req, res)

    expect(statusOf(res)).toBe(200)
    const serialized = JSON.stringify(bodyOf(res))
    expect(serialized).toContain(IZG_URL)
    expect(serialized).toContain('Normal application startup')
    expect(serialized).toContain('status.okta.com')
  })

  it('has roles on both sides of the permission', () => {
    expect(DETAIL_ROLES.length).toBeGreaterThan(0)
    expect(NON_DETAIL_ROLES.length).toBeGreaterThan(0)
  })

  /**
   * The handler reads the matrix, so a role gains the detail by a data change
   * alone, with no code change (IGDD-3552).
   */
  it.each(DETAIL_ROLES)(
    'gives %s the full result',
    async (role) => {
      detailHolder(role)
      const { req, res } = buildReqRes()

      await handler(req, res)

      expect(JSON.stringify(bodyOf(res))).toContain(IZG_URL)
    }
  )

  /**
   * The reason the gate is a permission and not merely `session.user`:
   * authenticating to the console is not by itself a claim to see where its
   * dependencies live.
   */
  it('withholds detail from a signed-in caller holding no role', async () => {
    signedInWithoutDetail()
    const { req, res } = buildReqRes()

    await handler(req, res)

    expect(statusOf(res)).toBe(200)
    const body = bodyOf(res) as Record<string, unknown>[]
    for (const component of body) {
      expect(Object.keys(component).sort()).toEqual([
        'component',
        'status',
        'statusAt',
      ])
    }
    expect(JSON.stringify(body)).not.toContain('izg.example')
  })

  /**
   * Holding a real role is not enough: only a role granted the permission gets
   * the full result.
   */
  it.each(NON_DETAIL_ROLES)(
    'withholds detail from %s, which does not hold the permission',
    async (role) => {
      signedInWithoutDetail([role], ['az'])
      const { req, res } = buildReqRes()

      await handler(req, res)

      const body = bodyOf(res) as Record<string, unknown>[]
      expect(JSON.stringify(body)).not.toContain('izg.example')
      expect(Object.keys(body[0]).sort()).toEqual([
        'component',
        'status',
        'statusAt',
      ])
    }
  )

  /**
   * Okta group membership no longer widens the body: the session no longer
   * carries `isAdmin` (IGDD-3552), and one left on a stale or hand-built
   * session is ignored, because this handler reads only the matrix.
   */
  it('ignores a stale isAdmin flag on a session without the permission', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'viewer@example.com', roles: [], isAdmin: true },
    })
    const { req, res } = buildReqRes()

    await handler(req, res)

    const body = bodyOf(res) as Record<string, unknown>[]
    expect(JSON.stringify(body)).not.toContain('izg.example')
    expect(Object.keys(body[0]).sort()).toEqual([
      'component',
      'status',
      'statusAt',
    ])
  })

  /**
   * A failing dependency is where the disclosure is worst — `reason` carries the
   * upstream error message verbatim.
   */
  it('withholds the upstream error message when a dependency is unreachable', async () => {
    anonymous()
    mockAxiosGet.mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.3.44:444')
    )
    const { req, res } = buildReqRes()

    await handler(req, res)

    const body = bodyOf(res) as Record<string, unknown>[]
    const izg = body.find((c) => c.component === 'IZG')
    expect(izg).toEqual({
      component: 'IZG',
      status: 'unable to connect',
      statusAt: expect.any(String),
    })
    expect(JSON.stringify(body)).not.toContain('10.0.3.44')
  })

  it('reports the upstream error message to a caller holding the permission', async () => {
    detailHolder()
    mockAxiosGet.mockRejectedValue(
      new Error('connect ECONNREFUSED 10.0.3.44:444')
    )
    const { req, res } = buildReqRes()

    await handler(req, res)

    expect(JSON.stringify(bodyOf(res))).toContain('ECONNREFUSED 10.0.3.44')
  })

  /**
   * `isDatabaseConnected()` resolving false is a negative answer, not a throw, so it
   * bypassed the catch and the probe returned the empty object it was initialized
   * with — `{}` in the array, with no component, status or statusAt at all.
   */
  it('reports a disconnected database as a real component result rather than {}', async () => {
    anonymous()
    mockIsDatabaseConnected.mockResolvedValue(false)
    const { req, res } = buildReqRes()

    await handler(req, res)

    const body = bodyOf(res) as Record<string, unknown>[]
    expect(body[0]).toEqual({
      component: 'DB',
      status: 'unable to connect',
      statusAt: expect.any(String),
    })
  })

  /**
   * The load balancer acts on the status code, so it must not depend on the caller.
   */
  it('returns the same status code either way', async () => {
    anonymous()
    const anon = buildReqRes()
    await handler(anon.req, anon.res)

    detailHolder()
    const auth = buildReqRes()
    await handler(auth.req, auth.res)

    expect(statusOf(anon.res)).toBe(statusOf(auth.res))
  })
})
