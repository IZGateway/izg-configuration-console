/**
 * @jest-environment node
 */

// Exercises the REAL withMiddleware/enforceRouteAuthz gate for the
// apikeysaudit/* routes converted by IGDD-3549. These two routes had no
// prior test coverage at all (grep confirms zero references under
// src/__tests__ before this file), so there is no lifecycle.test.ts
// counterpart to prune — see design.md Decision 6 for the apikeys/* routes'
// equivalent split.

const mockGetServerSession = jest.fn()
const mockGetToken = jest.fn()
const mockGetDbClient = jest.fn()

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

jest.mock('next-auth/jwt', () => ({
  __esModule: true,
  getToken: (...args: unknown[]) => mockGetToken(...args),
}))

jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: async (...args: unknown[]) => (await mockGetDbClient(...args)) ?? {},
  },
}))

jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import apikeysAuditHandler from '../../../pages/api/apikeysaudit/index'
import apikeysAuditBySortKeyHandler from '../../../pages/api/apikeysaudit/[sortKey]'

type MockRes = NextApiResponse & { statusCode: number; body: unknown }

function createRes(): MockRes {
  const res = {} as MockRes
  res.statusCode = 0
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as MockRes['status']
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes['json']
  res.send = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes['send']
  res.setHeader = jest.fn() as unknown as MockRes['setHeader']
  return res
}

function createReq(
  method: string,
  body: Record<string, unknown> = {},
  query: Record<string, unknown> = {}
): NextApiRequest {
  return {
    method,
    body,
    query,
    headers: {},
    socket: { remoteAddress: '203.0.113.7' },
    url: '/api/apikeysaudit',
  } as unknown as NextApiRequest
}

const signIn = (roles: string[], jurisdictions: string[] = []) => {
  mockGetServerSession.mockResolvedValue({
    user: { email: 'tester@example.com', roles, jurisdictions },
  })
  mockGetToken.mockResolvedValue({ sub: '00uABC' })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('apikeysaudit/index.ts — real declarative gate (IGDD-3549)', () => {
  it('403s for a role without canListApiKeys', async () => {
    signIn(['IZG Support'])
    const fetchApiKeyCredentials = jest.fn()
    mockGetDbClient.mockResolvedValue({ fetchApiKeyCredentials })

    const res = createRes()
    await apikeysAuditHandler(createReq('GET'), res)

    expect(res.statusCode).toBe(403)
    expect(fetchApiKeyCredentials).not.toHaveBeenCalled()
  })

  it('admits a jurisdiction-scoped role (capability-only — no scope declared)', async () => {
    signIn(['Jurisdiction Security'], ['az'])
    const fetchApiKeyCredentials = jest.fn().mockResolvedValue([
      { sortKey: 'a', jurisdictionId: '1', status: 'active' },
    ])
    const fetchApiKeyCredentialAudits = jest.fn().mockResolvedValue([])
    mockGetDbClient.mockResolvedValue({
      getJurisdiction: jest.fn().mockResolvedValue({ prefix: 'az' }),
      fetchApiKeyCredentials,
      fetchApiKeyCredentialAudits,
    })

    const res = createRes()
    await apikeysAuditHandler(createReq('GET'), res)

    expect(res.statusCode).toBe(200)
  })
})

describe('apikeysaudit/[sortKey].ts — real declarative gate (IGDD-3549)', () => {
  const getJurisdiction = jest.fn((jurisdictionId: string) =>
    Promise.resolve({ jurisdictionId: Number(jurisdictionId), prefix: jurisdictionId === '1' ? 'az' : 'ma' })
  )

  it('403s for a role without canListApiKeys', async () => {
    signIn(['IZG Support'])
    const fetchApiKeyCredentialAuditHistory = jest.fn()
    mockGetDbClient.mockResolvedValue({
      getJurisdiction,
      getApiKeyCredential: jest.fn().mockResolvedValue({ jurisdictionId: '1' }),
      fetchApiKeyCredentialAuditHistory,
    })

    const res = createRes()
    await apikeysAuditBySortKeyHandler(createReq('GET', {}, { sortKey: 'jti-1' }), res)

    expect(res.statusCode).toBe(403)
    expect(fetchApiKeyCredentialAuditHistory).not.toHaveBeenCalled()
  })

  it('403s a credential in a non-owned jurisdiction — same capability as index.ts, now reach-scoped', async () => {
    signIn(['Jurisdiction Security'], ['az'])
    const fetchApiKeyCredentialAuditHistory = jest.fn()
    mockGetDbClient.mockResolvedValue({
      getJurisdiction,
      getApiKeyCredential: jest.fn().mockResolvedValue({ jurisdictionId: '2' }),
      fetchApiKeyCredentialAuditHistory,
    })

    const res = createRes()
    await apikeysAuditBySortKeyHandler(createReq('GET', {}, { sortKey: 'jti-2' }), res)

    expect(res.statusCode).toBe(403)
    expect(fetchApiKeyCredentialAuditHistory).not.toHaveBeenCalled()
  })

  it('allows a credential the caller\'s jurisdiction owns', async () => {
    signIn(['Jurisdiction Security'], ['az'])
    mockGetDbClient.mockResolvedValue({
      getJurisdiction,
      getApiKeyCredential: jest.fn().mockResolvedValue({ jurisdictionId: '1' }),
      fetchApiKeyCredentialAuditHistory: jest.fn().mockResolvedValue([]),
    })

    const res = createRes()
    await apikeysAuditBySortKeyHandler(createReq('GET', {}, { sortKey: 'jti-1' }), res)

    expect(res.statusCode).toBe(200)
  })
})
