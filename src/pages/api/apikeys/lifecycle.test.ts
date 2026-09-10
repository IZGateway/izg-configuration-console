/**
 * @jest-environment node
 */

// Unit tests for the API key lifecycle state-machine guards (IGDD-2707):
//  - revoke  (PATCH):  allowed from active / grace_period (+ legacy grace / superseded)
//  - cancel  (DELETE): hard delete, allowed only from ready_for_validation
//  - renew   (POST):   allowed only from active; creates a new key + supersedes old
// The request-context/logging middleware is stubbed to a pass-through so the
// raw handlers can be exercised directly.

const mockGetServerSession = jest.fn()
const mockGetDbClient = jest.fn()

// Jurisdiction-ownership checks bridge two identifier spaces: routes/credentials
// carry the numeric `jurisdictionId`, while `session.user.jurisdictions` holds the
// lowercased jurisdiction PREFIXES that Okta group membership is keyed on. So
// `ownsJurisdiction` resolves the id to its jurisdiction's `prefix` via
// `getJurisdiction` before comparing. Every route that authorizes therefore needs
// that method on the db client, so it's defaulted in the factory mock below —
// individual tests only supply their own when the prefix mapping is the thing
// under test.
//
// Fixture mapping: jurisdiction '1' -> 'AINQ' (the one `jurOpsSession` owns);
// every other id gets a distinct `JUR<id>` prefix so it is deterministically NOT
// owned by a scoped caller.
const testJurisdictionPrefix = (jurisdictionId: string) =>
  String(jurisdictionId) === '1' ? 'AINQ' : `JUR${jurisdictionId}`

const defaultGetJurisdiction = (jurisdictionId: string) =>
  Promise.resolve({
    jurisdictionId: Number(jurisdictionId),
    sortKey: String(jurisdictionId),
    name: `Jurisdiction ${jurisdictionId}`,
    description: `Jurisdiction ${jurisdictionId} description`,
    prefix: testJurisdictionPrefix(jurisdictionId),
  })

jest.mock('next-auth', () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

// Avoid loading the real NextAuth options (provider/env side effects).
jest.mock('../auth/[...nextauth]', () => ({ authOptions: {} }))

// Run handlers directly, bypassing buildRequestContext + logging middleware.
jest.mock('../api-middleware-helper', () => ({
  __esModule: true,
  default: () => (handler: unknown) => handler,
}))

jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: async (...args: unknown[]) => {
      const client = (await mockGetDbClient(...args)) ?? {}
      // Spread the test's own client last so it can override getJurisdiction.
      return { getJurisdiction: defaultGetJurisdiction, ...client }
    },
  },
}))

jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// The token route re-signs a JWT; stub the crypto module so importing/exercising
// the handler needs no real signing secret.
jest.mock('../../../lib/apikeys/jwt', () => ({
  __esModule: true,
  getJwtSigningSecret: jest
    .fn()
    .mockResolvedValue({ secretString: 'test-secret', kid: 'test-kid' }),
  issueApiKeyJwt: jest.fn().mockReturnValue('signed.jwt.token'),
}))

// Stub the real DNS TXT lookup so the domain-exclusivity tests can drive
// verify-domain through an actual "match" without a live DNS record.
const mockResolveTxt = jest.fn()
jest.mock('dns/promises', () => ({
  __esModule: true,
  default: { resolveTxt: (...args: unknown[]) => mockResolveTxt(...args) },
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import apikeysHandler from './index'
import renewHandler from './renew/index'
import verifyDomainHandler from './verify-domain/index'
import tokenHandler from './token'
import domainsHandler from './domains'

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
  res.setHeader = jest.fn() as unknown as MockRes['setHeader']
  return res
}

function createReq(
  method: string,
  body: Record<string, unknown> = {},
  query: Record<string, unknown> = {}
): NextApiRequest {
  return { method, body, query, headers: {} } as unknown as NextApiRequest
}

// Default test identity: IZG Operations is global (all API-key permissions +
// access to every jurisdiction), so the lifecycle/state-machine tests below are
// not affected by the authorization layer. Authorization itself is covered in
// its own describe block.
const authedSession = { user: { email: 'tester@example.com', role: 'IZG Operations' } }

describe('API key lifecycle guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(authedSession)
  })

  describe('revoke — PATCH /api/apikeys', () => {
    it('returns 409 and does not revoke a ready_for_validation credential', async () => {
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'ready_for_validation' })
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, revokeApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(409)
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('returns 404 when the credential does not exist', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue(null)
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, revokeApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: '5#missing' }), res)

      expect(res.statusCode).toBe(404)
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it.each(['active', 'grace_period', 'grace', 'superseded'])(
      'revokes a %s credential and records the reason',
      async (status) => {
        const getApiKeyCredential = jest.fn().mockResolvedValue({ status })
        const revokeApiKeyCredential = jest.fn().mockResolvedValue(undefined)
        mockGetDbClient.mockResolvedValue({ getApiKeyCredential, revokeApiKeyCredential })

        const res = createRes()
        await apikeysHandler(
          createReq('PATCH', { sortKey: '5#abc', reason: 'compromised' }),
          res
        )

        expect(res.statusCode).toBe(200)
        expect(revokeApiKeyCredential).toHaveBeenCalledWith(
          '5#abc',
          'tester@example.com',
          expect.any(String),
          'compromised',
          ['active', 'grace_period', 'grace', 'superseded']
        )
      }
    )

    it('surfaces a concurrent status change (lost race) as the same 409 as the pre-check', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue({ status: 'active' })
      const conditionalError = Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
      })
      const revokeApiKeyCredential = jest.fn().mockRejectedValue(conditionalError)
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, revokeApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(409)
    })
  })

  describe('cancel — DELETE /api/apikeys', () => {
    it('soft-cancels a ready_for_validation credential (retains record)', async () => {
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'ready_for_validation' })
      const cancelApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, cancelApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('DELETE', { sortKey: '5#pending' }), res)

      expect(res.statusCode).toBe(200)
      expect(cancelApiKeyCredential).toHaveBeenCalledWith(
        '5#pending',
        'tester@example.com',
        expect.any(String)
      )
    })

    it.each(['active', 'grace_period', 'revoked'])(
      'returns 409 and does not cancel a %s credential',
      async (status) => {
        const getApiKeyCredential = jest.fn().mockResolvedValue({ status })
        const cancelApiKeyCredential = jest.fn()
        mockGetDbClient.mockResolvedValue({ getApiKeyCredential, cancelApiKeyCredential })

        const res = createRes()
        await apikeysHandler(createReq('DELETE', { sortKey: '5#abc' }), res)

        expect(res.statusCode).toBe(409)
        expect(cancelApiKeyCredential).not.toHaveBeenCalled()
      }
    )

    it('returns 404 when cancelling a missing credential', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue(null)
      const cancelApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, cancelApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('DELETE', { sortKey: '5#missing' }), res)

      expect(res.statusCode).toBe(404)
      expect(cancelApiKeyCredential).not.toHaveBeenCalled()
    })
  })

  describe('renew — POST /api/apikeys/renew', () => {
    const baseBody = {
      oldSortKey: '5#old',
      jurisdictionId: '1',
      upn: 'immunize.example.gov',
    }

    it('returns 409 and mutates nothing when the credential is not active', async () => {
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'grace_period', expiresAt: new Date() })
      const createApiKeyCredential = jest.fn()
      const supersedeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedeApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(409)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
      expect(supersedeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('returns 404 when the credential to renew is missing', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue(null)
      const createApiKeyCredential = jest.fn()
      const supersedeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedeApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(404)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
    })

    it('renews an active credential: creates a new key and supersedes the old one', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue({
        status: 'active',
        domain: 'stored.example.gov',
        environments: [2],
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const supersedeApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedeApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(201)
      expect(createApiKeyCredential).toHaveBeenCalledTimes(1)
      expect(supersedeApiKeyCredential).toHaveBeenCalledTimes(1)
      // The credential being renewed is the one moved to grace.
      expect(supersedeApiKeyCredential.mock.calls[0][0].sortKey).toBe('5#old')
      // The new credential is keyed by bare jti, with no env prefix
      // (IGDD-2707 re-key — the Hub reads a credential by jti alone).
      const created = createApiKeyCredential.mock.calls[0][0]
      expect(created.sortKey).toBe(created.jti)
    })

    it('uses the stored domain, ignoring any client-supplied upn', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue({
        status: 'active',
        domain: 'stored.example.gov',
        environments: [2],
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const supersedeApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedeApiKeyCredential,
      })

      const res = createRes()
      // Client tries to redirect the renewal to a different domain — it must be ignored.
      await renewHandler(
        createReq('POST', { ...baseBody, upn: 'attacker.example.gov' }),
        res
      )

      expect(res.statusCode).toBe(201)
      expect(createApiKeyCredential.mock.calls[0][0].domain).toBe('stored.example.gov')
    })

    it('returns 409 when the credential being renewed has no domain on record', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue({
        status: 'active',
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      })
      const createApiKeyCredential = jest.fn()
      const supersedeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedeApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(409)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
      expect(supersedeApiKeyCredential).not.toHaveBeenCalled()
    })
  })

  describe('create — POST /api/apikeys (useTypes validation)', () => {
    const validBody = {
      jurisdictionId: '1',
      environments: [5],
      upn: 'immunize.example.gov',
      dnsChoice: 'existing',
    }

    it('returns 400 when useTypes is missing', async () => {
      const res = createRes()
      await apikeysHandler(createReq('POST', { ...validBody }), res)
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when useTypes is empty', async () => {
      const res = createRes()
      await apikeysHandler(createReq('POST', { ...validBody, useTypes: [] }), res)
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when useTypes contains an invalid value', async () => {
      const res = createRes()
      await apikeysHandler(
        createReq('POST', { ...validBody, useTypes: ['PATIENT', 'BOGUS'] }),
        res
      )
      expect(res.statusCode).toBe(400)
    })

    it('creates the credential and passes useTypes through for an authorized domain', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({ getApiKeyDomain, createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', { ...validBody, useTypes: ['PATIENT', 'PROVIDER'] }),
        res
      )

      expect(res.statusCode).toBe(201)
      expect(createApiKeyCredential).toHaveBeenCalledTimes(1)
      expect(createApiKeyCredential.mock.calls[0][0].useTypes).toEqual([
        'PATIENT',
        'PROVIDER',
      ])
    })

    it('keys the new credential by bare jti, with no env prefix (IGDD-2707 re-key)', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({ getApiKeyDomain, createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', { ...validBody, useTypes: ['PATIENT'] }),
        res
      )

      const created = createApiKeyCredential.mock.calls[0][0]
      expect(created.sortKey).toBe(created.jti)
      const body = res.body as { jti: string; sortKey: string }
      expect(body.sortKey).toBe(body.jti)
    })

    it('places the DNS challenge TXT record at the domain apex, not a _izg-verify. subdomain', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue(null)
      const getDomainOwner = jest.fn().mockResolvedValue(undefined)
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const upsertApiKeyDomain = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getDomainOwner,
        createApiKeyCredential,
        upsertApiKeyDomain,
      })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', { ...validBody, dnsChoice: 'other', useTypes: ['PATIENT'] }),
        res
      )

      expect(res.statusCode).toBe(202)
      const body = res.body as { txtRecord: string; txtValue: string; domain: string }
      expect(body.txtRecord).toBe('immunize.example.gov')
      expect(body.txtValue).toMatch(/^izg-challenge=/)
    })

    it('refuses to start a DNS challenge for a domain already owned by another jurisdiction (early exclusivity check)', async () => {
      const getDomainOwner = jest.fn().mockResolvedValue('999')
      const createApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getDomainOwner, createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', {
          ...validBody,
          jurisdictionId: '1',
          dnsChoice: 'other',
          useTypes: ['PATIENT'],
        }),
        res
      )

      expect(res.statusCode).toBe(409)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
    })

    it('allows a DNS challenge when the domain is unclaimed or already owned by the same jurisdiction', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue(null)
      const getDomainOwner = jest.fn().mockResolvedValue('1')
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const upsertApiKeyDomain = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getDomainOwner,
        createApiKeyCredential,
        upsertApiKeyDomain,
      })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', {
          ...validBody,
          jurisdictionId: '1',
          dnsChoice: 'other',
          useTypes: ['PATIENT'],
        }),
        res
      )

      expect(res.statusCode).toBe(202)
      expect(createApiKeyCredential).toHaveBeenCalledTimes(1)
    })
  })

  describe('verify-domain — activation is bound to the verified domain', () => {
    // Uses the already-`authorized` fast-path so no DNS lookup is needed.
    const body = {
      domain: 'immunize.example.gov',
      jurisdictionId: '1',
      sortKey: '5#cred-jti',
    }
    const matchingCredential = {
      status: 'ready_for_validation',
      domain: 'immunize.example.gov',
      jurisdictionId: '1',
      environments: [5],
    }

    it('activates a pending credential bound to the verified domain (status-guarded write)', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const getApiKeyCredential = jest.fn().mockResolvedValue({ ...matchingCredential })
      const updateApiKeyCredentialStatus = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getApiKeyCredential,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(createReq('POST', { ...body }), res)

      expect(res.statusCode).toBe(200)
      expect(updateApiKeyCredentialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          sortKey: '5#cred-jti',
          status: 'active',
          expectedStatus: 'ready_for_validation',
        })
      )
    })

    it('refuses (400) to activate a credential not bound to the verified domain', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ ...matchingCredential, domain: 'attacker.example' })
      const updateApiKeyCredentialStatus = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getApiKeyCredential,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(createReq('POST', { ...body }), res)

      expect(res.statusCode).toBe(400)
      expect(updateApiKeyCredentialStatus).not.toHaveBeenCalled()
    })

    it('refuses (409) to resurrect a non-pending (e.g. revoked) credential', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ ...matchingCredential, status: 'revoked' })
      const updateApiKeyCredentialStatus = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getApiKeyCredential,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(createReq('POST', { ...body }), res)

      expect(res.statusCode).toBe(409)
      expect(updateApiKeyCredentialStatus).not.toHaveBeenCalled()
    })

    it('returns 404 when the credential to activate does not exist', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const getApiKeyCredential = jest.fn().mockResolvedValue(null)
      const updateApiKeyCredentialStatus = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getApiKeyCredential,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(createReq('POST', { ...body }), res)

      expect(res.statusCode).toBe(404)
      expect(updateApiKeyCredentialStatus).not.toHaveBeenCalled()
    })

    it('does not take the already-authorized fast path when authExpiresAt has passed (stale authorization)', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() - 86_400_000).toISOString(), // expired yesterday
        // No challengeUuid — matches real data once a domain has been
        // authorized (upsertApiKeyDomain clears the challenge fields).
      })
      const getApiKeyCredential = jest.fn().mockResolvedValue({ ...matchingCredential })
      const updateApiKeyCredentialStatus = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyDomain,
        getApiKeyCredential,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(createReq('POST', { ...body }), res)

      // Falls through to "needs a pending challenge" and finds none, rather
      // than silently activating on the stale authorization.
      expect(res.statusCode).toBe(404)
      expect(updateApiKeyCredentialStatus).not.toHaveBeenCalled()
    })
  })

  describe('token reveal — view exactly once', () => {
    const activeCredential = {
      status: 'active',
      jurisdictionId: '1',
      sortKey: '5#abc',
      jti: 'jti-abc',
      domain: 'immunize.example.gov',
      createdOn: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000),
    }

    it('surfaces a lost view-once race (concurrent request already marked it viewed) as the same 410 as the pre-check', async () => {
      // credential.viewedAt is still falsy here — the pre-check is a stale
      // read; markApiKeyCredentialViewed's own atomic condition is what
      // actually catches a concurrent request that won the race.
      const getApiKeyCredential = jest.fn().mockResolvedValue({ ...activeCredential })
      const conditionalError = Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
      })
      const markApiKeyCredentialViewed = jest.fn().mockRejectedValue(conditionalError)
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, markApiKeyCredentialViewed })

      const res = createRes()
      await tokenHandler(createReq('POST', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(410)
    })

    it('reveals the token and marks it viewed when no concurrent request has won the race', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue({ ...activeCredential })
      const markApiKeyCredentialViewed = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, markApiKeyCredentialViewed })

      const res = createRes()
      await tokenHandler(createReq('POST', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(200)
      expect(markApiKeyCredentialViewed).toHaveBeenCalledWith('5#abc', expect.any(String))
    })
  })
})

// Server-side authorization (IGDD-2707 P1): the routes must enforce BOTH a role
// gate (does this role manage API keys at all?) and a tenancy gate (does this
// caller own the target jurisdiction?). UI gating is not a security boundary.
describe('API key authorization (role + tenancy)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // IZG Support has no API-key permissions in the access matrix.
  const izgSupportSession = {
    user: { email: 'support@example.com', role: 'IZG Support' },
  }
  // Jurisdiction Operations scoped to jurisdiction '1' only. Note this holds the
  // jurisdiction's PREFIX ('ainq', lowercased), not its numeric id — that is the
  // shape Okta actually puts in the session (see the `jwt` callback in
  // pages/api/auth/[...nextauth].ts), and `testJurisdictionPrefix` maps
  // jurisdiction '1' to 'AINQ'. Targets below use jurisdictionId '99', which maps
  // to 'JUR99' and is therefore not owned.
  const jurOpsSession = {
    user: {
      email: 'jurops@example.com',
      role: 'Jurisdiction Operations',
      jurisdictions: ['ainq'],
    },
  }

  describe('role gate — a role without API-key permissions is forbidden', () => {
    it('403s POST create for IZG Support (no DB write)', async () => {
      mockGetServerSession.mockResolvedValue(izgSupportSession)
      const createApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', {
          jurisdictionId: '1',
          environments: [5],
          upn: 'immunize.example.gov',
          dnsChoice: 'existing',
          useTypes: ['PATIENT'],
        }),
        res
      )

      expect(res.statusCode).toBe(403)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
    })

    it('403s PATCH revoke for IZG Support (before any DB read)', async () => {
      mockGetServerSession.mockResolvedValue(izgSupportSession)
      const getApiKeyCredential = jest.fn()
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, revokeApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(403)
      expect(getApiKeyCredential).not.toHaveBeenCalled()
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('403s GET list for IZG Support', async () => {
      mockGetServerSession.mockResolvedValue(izgSupportSession)
      const fetchApiKeyCredentials = jest.fn()
      mockGetDbClient.mockResolvedValue({ fetchApiKeyCredentials })

      const res = createRes()
      await apikeysHandler(createReq('GET'), res)

      expect(res.statusCode).toBe(403)
      expect(fetchApiKeyCredentials).not.toHaveBeenCalled()
    })

    it('403s token reveal for IZG Support (before any DB read)', async () => {
      mockGetServerSession.mockResolvedValue(izgSupportSession)
      const getApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential })

      const res = createRes()
      await tokenHandler(createReq('POST', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(403)
      expect(getApiKeyCredential).not.toHaveBeenCalled()
    })
  })

  // Regression coverage for the identifier-space mismatch between the session and
  // the credential. `session.user.jurisdictions` holds lowercased jurisdiction
  // PREFIXES from Okta ('ainq'); credentials/routes carry the numeric
  // `jurisdictionId` ('1000'). An implementation that compares the session against
  // the numeric id — or against the jurisdiction's `name` instead of its `prefix`
  // — denies every legitimate owner while still passing the tests above, because
  // those construct sessions whose values already match the ids they target.
  // These tests use deliberately non-overlapping values so that cannot happen.
  describe('tenancy gate — numeric jurisdictionId is resolved to its prefix', () => {
    // Session owns 'ainq'; the target credential's numeric id is 1000, and that
    // jurisdiction's stored prefix is 'AINQ' with an unrelated long-form name.
    const prefixOwnerSession = {
      user: {
        email: 'sender@example.com',
        role: 'Jurisdiction Operations',
        jurisdictions: ['ainq'],
      },
    }
    const jurisdiction1000 = {
      jurisdictionId: 1000,
      sortKey: '1000',
      name: 'Audacious Inquiry (operators)',
      description: 'Audacious Inquiry LLC',
      prefix: 'AINQ',
    }

    it('authorizes a revoke when the session prefix matches the jurisdiction prefix', async () => {
      mockGetServerSession.mockResolvedValue(prefixOwnerSession)
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'active', jurisdictionId: '1000' })
      const revokeApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const getJurisdiction = jest.fn().mockResolvedValue(jurisdiction1000)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        revokeApiKeyCredential,
        getJurisdiction,
      })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: 'jti-1000' }), res)

      expect(res.statusCode).toBe(200)
      expect(revokeApiKeyCredential).toHaveBeenCalled()
      // The lookup must be keyed on the credential's numeric jurisdictionId.
      expect(getJurisdiction).toHaveBeenCalledWith('1000')
    })

    it('denies when the session matches the jurisdiction NAME but not its prefix', async () => {
      // Guards specifically against matching on `name`: this session would be
      // authorized by a name-based check and must still be refused.
      mockGetServerSession.mockResolvedValue({
        user: {
          email: 'nameonly@example.com',
          role: 'Jurisdiction Operations',
          jurisdictions: ['audacious inquiry (operators)'],
        },
      })
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'active', jurisdictionId: '1000' })
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        revokeApiKeyCredential,
        getJurisdiction: jest.fn().mockResolvedValue(jurisdiction1000),
      })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: 'jti-1000' }), res)

      expect(res.statusCode).toBe(403)
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('denies when the session matches the numeric jurisdictionId but not the prefix', async () => {
      // Guards against the original bug: comparing the raw numeric id.
      mockGetServerSession.mockResolvedValue({
        user: {
          email: 'numeric@example.com',
          role: 'Jurisdiction Operations',
          jurisdictions: ['1000'],
        },
      })
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'active', jurisdictionId: '1000' })
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        revokeApiKeyCredential,
        getJurisdiction: jest.fn().mockResolvedValue(jurisdiction1000),
      })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: 'jti-1000' }), res)

      expect(res.statusCode).toBe(403)
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('fails closed when the jurisdiction row carries no prefix', async () => {
      mockGetServerSession.mockResolvedValue(prefixOwnerSession)
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'active', jurisdictionId: '1000' })
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        revokeApiKeyCredential,
        getJurisdiction: jest
          .fn()
          .mockResolvedValue({ ...jurisdiction1000, prefix: undefined }),
      })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: 'jti-1000' }), res)

      expect(res.statusCode).toBe(403)
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('scopes the GET list by resolved prefix, not by numeric id', async () => {
      mockGetServerSession.mockResolvedValue(prefixOwnerSession)
      const fetchApiKeyCredentials = jest.fn().mockResolvedValue([
        { sortKey: 'a', jurisdictionId: '1000', status: 'active' },
        { sortKey: 'b', jurisdictionId: '2000', status: 'active' },
      ])
      mockGetDbClient.mockResolvedValue({
        fetchApiKeyCredentials,
        getJurisdiction: jest.fn().mockImplementation((id: string) =>
          Promise.resolve(
            String(id) === '1000'
              ? jurisdiction1000
              : { jurisdictionId: 2000, prefix: 'OTHER', name: 'Other Org' }
          )
        ),
      })

      const res = createRes()
      await apikeysHandler(createReq('GET'), res)

      expect(res.statusCode).toBe(200)
      const returned = res.body as Array<{ jurisdictionId: string }>
      expect(returned).toHaveLength(1)
      expect(returned[0].jurisdictionId).toBe('1000')
    })
  })

  describe('tenancy gate — a jurisdiction user cannot act on another jurisdiction', () => {
    it('403s PATCH revoke of a credential in a non-owned jurisdiction', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'active', jurisdictionId: '99' })
      const revokeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, revokeApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('PATCH', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(403)
      expect(revokeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('403s DELETE cancel of a credential in a non-owned jurisdiction', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'ready_for_validation', jurisdictionId: '99' })
      const cancelApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, cancelApiKeyCredential })

      const res = createRes()
      await apikeysHandler(createReq('DELETE', { sortKey: '5#pending' }), res)

      expect(res.statusCode).toBe(403)
      expect(cancelApiKeyCredential).not.toHaveBeenCalled()
    })

    it('403s token reveal for a credential in a non-owned jurisdiction (no reveal)', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const getApiKeyCredential = jest.fn().mockResolvedValue({
        status: 'active',
        jurisdictionId: '99',
        domain: 'immunize.example.gov',
        createdOn: new Date(),
        expiresAt: new Date(),
      })
      const markApiKeyCredentialViewed = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyCredential, markApiKeyCredentialViewed })

      const res = createRes()
      await tokenHandler(createReq('POST', { sortKey: '5#abc' }), res)

      expect(res.statusCode).toBe(403)
      expect(markApiKeyCredentialViewed).not.toHaveBeenCalled()
    })

    it('403s renew of a credential in a non-owned jurisdiction', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const getApiKeyCredential = jest.fn().mockResolvedValue({
        status: 'active',
        jurisdictionId: '99',
        domain: 'stored.example.gov',
        expiresAt: new Date(),
      })
      const createApiKeyCredential = jest.fn()
      const supersedeApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedeApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(
        createReq('POST', { oldSortKey: '5#old', jurisdictionId: '1' }),
        res
      )

      expect(res.statusCode).toBe(403)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
      expect(supersedeApiKeyCredential).not.toHaveBeenCalled()
    })

    it('403s verify-domain for a non-owned jurisdiction (before touching the DB)', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const getApiKeyDomain = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyDomain })

      const res = createRes()
      await verifyDomainHandler(
        createReq('POST', {
          domain: 'immunize.example.gov',
          envId: '5',
          jurisdictionId: '99',
        }),
        res
      )

      expect(res.statusCode).toBe(403)
      expect(getApiKeyDomain).not.toHaveBeenCalled()
    })

    it('403s GET domains for a non-owned jurisdiction', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const fetchAuthorizedApiKeyDomains = jest.fn()
      mockGetDbClient.mockResolvedValue({ fetchAuthorizedApiKeyDomains })

      const res = createRes()
      await domainsHandler(
        createReq('GET', {}, { envId: '5', jurisdictionId: '99' }),
        res
      )

      expect(res.statusCode).toBe(403)
      expect(fetchAuthorizedApiKeyDomains).not.toHaveBeenCalled()
    })
  })

  describe('GET list scoping — only owned jurisdictions are returned', () => {
    it("filters the list to the caller's jurisdictions", async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const fetchApiKeyCredentials = jest.fn().mockResolvedValue([
        { sortKey: '5#a', jurisdictionId: '1', status: 'active' },
        { sortKey: '5#b', jurisdictionId: '99', status: 'active' },
        { sortKey: '5#c', jurisdictionId: '1', status: 'grace_period' },
      ])
      mockGetDbClient.mockResolvedValue({ fetchApiKeyCredentials })

      const res = createRes()
      await apikeysHandler(createReq('GET'), res)

      expect(res.statusCode).toBe(200)
      const returned = res.body as Array<{ jurisdictionId: string }>
      expect(returned).toHaveLength(2)
      expect(returned.every((c) => c.jurisdictionId === '1')).toBe(true)
    })

    it('returns all credentials for a global IZG Operations caller', async () => {
      mockGetServerSession.mockResolvedValue(authedSession)
      const fetchApiKeyCredentials = jest.fn().mockResolvedValue([
        { sortKey: '5#a', jurisdictionId: '1', status: 'active' },
        { sortKey: '5#b', jurisdictionId: '99', status: 'active' },
      ])
      mockGetDbClient.mockResolvedValue({ fetchApiKeyCredentials })

      const res = createRes()
      await apikeysHandler(createReq('GET'), res)

      expect(res.statusCode).toBe(200)
      expect(res.body as unknown[]).toHaveLength(2)
    })
  })

  // Multi-env credentials are an IZG Operations (admin) capability, both in
  // the UI and server-enforced here — every other role is limited to a single
  // environment even if it otherwise has create/list permission (IGDD-2707).
  describe('multi-environment credentials (admin only)', () => {
    const adminSession = {
      user: { email: 'admin@example.com', role: 'IZG Operations', isAdmin: true },
    }

    it('creates a multi-env credential when the domain is authorized in every requested environment', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({ getApiKeyDomain, createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', {
          jurisdictionId: '1',
          environments: [4, 5],
          upn: 'immunize.example.gov',
          dnsChoice: 'existing',
          useTypes: ['PATIENT'],
        }),
        res
      )

      expect(res.statusCode).toBe(201)
      expect(getApiKeyDomain).toHaveBeenCalledTimes(2)
      expect(createApiKeyCredential.mock.calls[0][0].environments).toEqual([4, 5])
    })

    it('403s a multi-env create for a non-admin role, even one that can create single-env keys', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const createApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', {
          jurisdictionId: '1',
          environments: [4, 5],
          upn: 'immunize.example.gov',
          dnsChoice: 'existing',
          useTypes: ['PATIENT'],
        }),
        res
      )

      expect(res.statusCode).toBe(403)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
    })

    it('400s a multi-env create when the domain is not authorized in every requested environment', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const getApiKeyDomain = jest
        .fn()
        .mockResolvedValueOnce({
          status: 'authorized',
          authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        })
        .mockResolvedValueOnce(null)
      const createApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({ getApiKeyDomain, createApiKeyCredential })

      const res = createRes()
      await apikeysHandler(
        createReq('POST', {
          jurisdictionId: '1',
          environments: [4, 5],
          upn: 'immunize.example.gov',
          dnsChoice: 'existing',
          useTypes: ['PATIENT'],
        }),
        res
      )

      expect(res.statusCode).toBe(400)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
    })

    it('403s a multi-envId domains query for a non-admin', async () => {
      mockGetServerSession.mockResolvedValue(jurOpsSession)
      const fetchAuthorizedApiKeyDomains = jest.fn()
      mockGetDbClient.mockResolvedValue({ fetchAuthorizedApiKeyDomains })

      const res = createRes()
      await domainsHandler(
        createReq('GET', {}, { envId: '4,5', jurisdictionId: '1' }),
        res
      )

      expect(res.statusCode).toBe(403)
      expect(fetchAuthorizedApiKeyDomains).not.toHaveBeenCalled()
    })

    it('returns only domains authorized in every requested environment (intersection)', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const fetchAuthorizedApiKeyDomains = jest.fn().mockImplementation((envId: number) =>
        Promise.resolve(
          envId === 4
            ? [{ domain: 'a.example.gov' }, { domain: 'shared.example.gov' }]
            : [{ domain: 'shared.example.gov' }, { domain: 'b.example.gov' }]
        )
      )
      mockGetDbClient.mockResolvedValue({ fetchAuthorizedApiKeyDomains })

      const res = createRes()
      await domainsHandler(
        createReq('GET', {}, { envId: '4,5', jurisdictionId: '1' }),
        res
      )

      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual([{ domain: 'shared.example.gov' }])
    })

    it('activates a multi-env credential in one step when every environment is already authorized', async () => {
      mockGetServerSession.mockResolvedValue(adminSession)
      const credential = {
        sortKey: 'multi-jti',
        status: 'ready_for_validation',
        domain: 'immunize.example.gov',
        jurisdictionId: '1',
        environments: [4, 5],
      }
      const getApiKeyCredential = jest.fn().mockResolvedValue(credential)
      const getApiKeyDomain = jest.fn().mockResolvedValue({
        status: 'authorized',
        authExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      const updateApiKeyCredentialStatus = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        getApiKeyDomain,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(
        createReq('POST', {
          domain: 'immunize.example.gov',
          jurisdictionId: '1',
          sortKey: 'multi-jti',
        }),
        res
      )

      expect(res.statusCode).toBe(200)
      expect(getApiKeyDomain).toHaveBeenCalledTimes(2)
      expect(updateApiKeyCredentialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          sortKey: 'multi-jti',
          status: 'active',
          expectedStatus: 'ready_for_validation',
        })
      )
    })
  })

  // GLOBAL domain exclusivity (IGDD-2707): a domain belongs to exactly one
  // jurisdiction across every environment. These are the first tests in this
  // file to exercise the real (non-fast-path) DNS TXT match branch — every
  // pre-existing verify-domain test uses the already-`authorized` fast path.
  describe('verify-domain — global domain exclusivity', () => {
    const pendingDomainRecord = {
      status: 'pending_challenge',
      challengeUuid: 'chal-uuid',
      challengeExpiresAt: new Date(Date.now() + 86_400_000),
    }
    const credential = {
      sortKey: 'cred-jti',
      status: 'ready_for_validation',
      domain: 'immunize.example.gov',
      jurisdictionId: '1',
      environments: [5],
    }

    beforeEach(() => {
      mockResolveTxt.mockResolvedValue([['izg-challenge=chal-uuid']])
    })

    it('claims ownership and authorizes when the domain is unclaimed', async () => {
      mockGetServerSession.mockResolvedValue(authedSession)
      const getApiKeyCredential = jest.fn().mockResolvedValue(credential)
      const getApiKeyDomain = jest.fn().mockResolvedValue(pendingDomainRecord)
      const claimDomainOwnership = jest.fn().mockResolvedValue({ claimed: true })
      const upsertApiKeyDomain = jest.fn().mockResolvedValue(undefined)
      const updateApiKeyCredentialStatus = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        getApiKeyDomain,
        claimDomainOwnership,
        upsertApiKeyDomain,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(
        createReq('POST', {
          domain: 'immunize.example.gov',
          jurisdictionId: '1',
          sortKey: 'cred-jti',
        }),
        res
      )

      expect(res.statusCode).toBe(200)
      expect(claimDomainOwnership).toHaveBeenCalledWith('immunize.example.gov', '1')
      expect(upsertApiKeyDomain).toHaveBeenCalledTimes(1)
      expect(updateApiKeyCredentialStatus).toHaveBeenCalled()
    })

    it('409s when the domain is already claimed by another jurisdiction, even though DNS matches', async () => {
      mockGetServerSession.mockResolvedValue(authedSession)
      const getApiKeyCredential = jest.fn().mockResolvedValue(credential)
      const getApiKeyDomain = jest.fn().mockResolvedValue(pendingDomainRecord)
      const claimDomainOwnership = jest
        .fn()
        .mockResolvedValue({ claimed: false, ownerJurisdictionId: '99' })
      const upsertApiKeyDomain = jest.fn()
      const updateApiKeyCredentialStatus = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        getApiKeyDomain,
        claimDomainOwnership,
        upsertApiKeyDomain,
        updateApiKeyCredentialStatus,
      })

      const res = createRes()
      await verifyDomainHandler(
        createReq('POST', {
          domain: 'immunize.example.gov',
          jurisdictionId: '1',
          sortKey: 'cred-jti',
        }),
        res
      )

      expect(res.statusCode).toBe(409)
      expect(upsertApiKeyDomain).not.toHaveBeenCalled()
      expect(updateApiKeyCredentialStatus).not.toHaveBeenCalled()
    })
  })
})
