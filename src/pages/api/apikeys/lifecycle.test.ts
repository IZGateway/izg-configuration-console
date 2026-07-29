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
  default: { getDbClient: (...args: unknown[]) => mockGetDbClient(...args) },
}))

jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import type { NextApiRequest, NextApiResponse } from 'next'
import apikeysHandler from './index'
import renewHandler from './renew/index'
import verifyDomainHandler from './verify-domain/index'

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
  body: Record<string, unknown> = {}
): NextApiRequest {
  return { method, body, query: {}, headers: {} } as unknown as NextApiRequest
}

const authedSession = { user: { email: 'tester@example.com' } }

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
          'compromised'
        )
      }
    )
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
      envId: 5,
      upn: 'immunize.example.gov',
    }

    it('returns 409 and mutates nothing when the credential is not active', async () => {
      const getApiKeyCredential = jest
        .fn()
        .mockResolvedValue({ status: 'grace_period', expiresAt: new Date() })
      const createApiKeyCredential = jest.fn()
      const supersedApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(409)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
      expect(supersedApiKeyCredential).not.toHaveBeenCalled()
    })

    it('returns 404 when the credential to renew is missing', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue(null)
      const createApiKeyCredential = jest.fn()
      const supersedApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedApiKeyCredential,
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
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const supersedApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(201)
      expect(createApiKeyCredential).toHaveBeenCalledTimes(1)
      expect(supersedApiKeyCredential).toHaveBeenCalledTimes(1)
      // The credential being renewed is the one moved to grace.
      expect(supersedApiKeyCredential.mock.calls[0][0].sortKey).toBe('5#old')
    })

    it('uses the stored domain, ignoring any client-supplied upn', async () => {
      const getApiKeyCredential = jest.fn().mockResolvedValue({
        status: 'active',
        domain: 'stored.example.gov',
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      })
      const createApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      const supersedApiKeyCredential = jest.fn().mockResolvedValue(undefined)
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedApiKeyCredential,
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
      const supersedApiKeyCredential = jest.fn()
      mockGetDbClient.mockResolvedValue({
        getApiKeyCredential,
        createApiKeyCredential,
        supersedApiKeyCredential,
      })

      const res = createRes()
      await renewHandler(createReq('POST', baseBody), res)

      expect(res.statusCode).toBe(409)
      expect(createApiKeyCredential).not.toHaveBeenCalled()
      expect(supersedApiKeyCredential).not.toHaveBeenCalled()
    })
  })

  describe('create — POST /api/apikeys (useTypes validation)', () => {
    const validBody = {
      jurisdictionId: '1',
      envId: 5,
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
  })

  describe('verify-domain — activation is bound to the verified domain', () => {
    // Uses the already-`authorized` fast-path so no DNS lookup is needed.
    const body = {
      domain: 'immunize.example.gov',
      envId: '5',
      jurisdictionId: '1',
      sortKey: '5#cred-jti',
    }
    const matchingCredential = {
      status: 'ready_for_validation',
      domain: 'immunize.example.gov',
      jurisdictionId: '1',
      env: '5',
    }

    it('activates a pending credential bound to the verified domain (status-guarded write)', async () => {
      const getApiKeyDomain = jest.fn().mockResolvedValue({ status: 'authorized' })
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
      const getApiKeyDomain = jest.fn().mockResolvedValue({ status: 'authorized' })
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
      const getApiKeyDomain = jest.fn().mockResolvedValue({ status: 'authorized' })
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
      const getApiKeyDomain = jest.fn().mockResolvedValue({ status: 'authorized' })
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
  })
})
