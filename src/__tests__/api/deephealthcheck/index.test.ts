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

  /** Member of OPERATIONS_GROUP — the only caller entitled to the full result. */
  const admin = () =>
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'ops@example.com',
        roles: ['IZG Operations'],
        isAdmin: true,
      },
    })

  /**
   * Signed in but outside OPERATIONS_GROUP. There is no `signIn` callback, so any
   * Okta tenant user who completes the flow lands here — including one holding no
   * CC roles at all.
   */
  const signedInNonAdmin = (roles: string[] = []) =>
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'viewer@example.com', roles, isAdmin: false },
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

  it('gives a caller in OPERATIONS_GROUP the full result', async () => {
    admin()
    const { req, res } = buildReqRes()

    await handler(req, res)

    expect(statusOf(res)).toBe(200)
    const serialized = JSON.stringify(bodyOf(res))
    expect(serialized).toContain(IZG_URL)
    expect(serialized).toContain('Normal application startup')
    expect(serialized).toContain('status.okta.com')
  })

  /**
   * The reason the gate is `isAdmin` and not merely `session.user`: authenticating
   * to the console is not by itself a claim to see where its dependencies live.
   */
  it('withholds detail from a signed-in caller outside OPERATIONS_GROUP', async () => {
    signedInNonAdmin()
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
   * A role on the CcRole axis is not the admin axis. `isAdmin` tracks
   * OPERATIONS_GROUP membership and is deliberately separate from `roles`, so a
   * caller holding a real role but not that group still gets the public view.
   */
  it('withholds detail from a signed-in caller holding a non-admin role', async () => {
    signedInNonAdmin(['IZG Support'])
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

  it('reports the upstream error message to a caller in OPERATIONS_GROUP', async () => {
    admin()
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

    admin()
    const auth = buildReqRes()
    await handler(auth.req, auth.res)

    expect(statusOf(anon.res)).toBe(statusOf(auth.res))
  })
})
