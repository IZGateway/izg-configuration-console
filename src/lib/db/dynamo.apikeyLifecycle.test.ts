/**
 * @jest-environment node
 */

// Unit tests for the DynamoDB layer of the API key lifecycle changes (IGDD-2707):
//  - cancelApiKeyCredential: SOFT cancel (status→cancelled, record retained)
//    guarded to ready_for_validation only
//  - supersedeApiKeyCredential: renewal transitions the old credential to
//    `grace_period` (Hub-aligned contract, IGDD-2711), not the legacy
//    `grace`/`superseded` values.

const mockSend = jest.fn()

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb')
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: () => ({ send: (...args: unknown[]) => mockSend(...args) }),
    },
  }
})

// Isolate the raw client so the Dynamo constructor's fire-and-forget
// connection check never hits AWS.
jest.mock('@aws-sdk/client-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/client-dynamodb')
  return {
    ...actual,
    DynamoDBClient: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({ TableNames: [] }),
      config: {
        region: async () => 'us-east-1',
        endpoint: async () => 'http://localhost:8000',
      },
    })),
  }
})

jest.mock('../../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import Dynamo from './dynamo'

describe('Dynamo API key lifecycle (IGDD-2707)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
  })

  describe('cancelApiKeyCredential', () => {
    it('issues an UpdateCommand setting status=cancelled, gated to ready_for_validation, retaining the record', async () => {
      mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

      await dynamo.cancelApiKeyCredential(
        '5#abc',
        'tester@example.com',
        '2026-07-28T00:00:00Z'
      )

      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      // Soft cancel = Update (record retained), not Delete.
      expect(command.constructor.name).toBe('UpdateCommand')
      expect(command.input.Key).toEqual({
        entityType: 'ApiKeyCredential',
        sortKey: '5#abc',
      })
      expect(command.input.ExpressionAttributeValues[':cancelled']).toBe('cancelled')
      expect(command.input.ExpressionAttributeValues[':cancelledBy']).toBe(
        'tester@example.com'
      )
      expect(command.input.ExpressionAttributeValues[':cancelledAt']).toBe(
        '2026-07-28T00:00:00Z'
      )
      // Atomic guard: only a pending credential may be cancelled.
      expect(command.input.ConditionExpression).toContain('#status')
      expect(command.input.ExpressionAttributeValues[':readyForValidation']).toBe(
        'ready_for_validation'
      )
    })

    it('propagates a conditional-check failure (wrong status) to the caller', async () => {
      const err = Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
      })
      mockSend.mockRejectedValueOnce(err)

      await expect(
        dynamo.cancelApiKeyCredential('5#active', 'tester@example.com', '2026-07-28T00:00:00Z')
      ).rejects.toThrow('conditional')
    })
  })

  describe('revokeApiKeyCredential', () => {
    it('pins the write to the caller-supplied expectedStatuses, atomically', async () => {
      mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

      await dynamo.revokeApiKeyCredential(
        '5#abc',
        'tester@example.com',
        '2026-07-28T00:00:00Z',
        'compromised',
        ['active', 'grace_period', 'grace', 'superseded']
      )

      const command = mockSend.mock.calls[0][0]
      expect(command.input.ConditionExpression).toContain('#status IN')
      const values = Object.values(command.input.ExpressionAttributeValues)
      expect(values).toEqual(
        expect.arrayContaining(['active', 'grace_period', 'grace', 'superseded'])
      )
    })

    it('omits the status guard when expectedStatuses is not supplied (existence check only)', async () => {
      mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

      await dynamo.revokeApiKeyCredential(
        '5#abc',
        'tester@example.com',
        '2026-07-28T00:00:00Z'
      )

      const command = mockSend.mock.calls[0][0]
      expect(command.input.ConditionExpression).not.toContain('IN')
    })

    it('propagates a conditional-check failure (lost race) to the caller', async () => {
      const err = Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
      })
      mockSend.mockRejectedValueOnce(err)

      await expect(
        dynamo.revokeApiKeyCredential(
          '5#abc',
          'tester@example.com',
          '2026-07-28T00:00:00Z',
          undefined,
          ['active']
        )
      ).rejects.toThrow('conditional')
    })
  })

  describe('supersedeApiKeyCredential', () => {
    it('transitions the old credential to grace_period (Hub-aligned) with a supersededBy successor jti', async () => {
      mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

      await dynamo.supersedeApiKeyCredential({
        sortKey: '5#old',
        renewedBy: 'tester@example.com',
        renewedAt: '2026-07-27T00:00:00Z',
        graceExpiresAt: '2026-08-10T00:00:00Z',
        supersededBy: 'new-jti',
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      expect(command.constructor.name).toBe('UpdateCommand')
      // Status value + attribute name must match the Hub contract (izgw-hub
      // GracePeriodRevocationScheduler / ApiKeyCredential model, IGDD-2711).
      expect(command.input.ExpressionAttributeValues[':status']).toBe('grace_period')
      expect(command.input.ExpressionAttributeValues[':graceExpiresAt']).toBe(
        '2026-08-10T00:00:00Z'
      )
      expect(command.input.ExpressionAttributeValues[':supersededBy']).toBe(
        'new-jti'
      )
      // Atomic guard: renewal is only ever valid from `active` — pinning it
      // here (not just at the route) prevents a concurrent status change from
      // superseding a credential that no longer qualifies.
      expect(command.input.ConditionExpression).toContain('#status = :expectedStatus')
      expect(command.input.ExpressionAttributeValues[':expectedStatus']).toBe('active')
    })

    it('propagates a conditional-check failure (not active) to the caller', async () => {
      const err = Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
      })
      mockSend.mockRejectedValueOnce(err)

      await expect(
        dynamo.supersedeApiKeyCredential({
          sortKey: '5#old',
          renewedBy: 'tester@example.com',
          renewedAt: '2026-07-27T00:00:00Z',
          graceExpiresAt: '2026-08-10T00:00:00Z',
          supersededBy: 'new-jti',
        })
      ).rejects.toThrow('conditional')
    })
  })

  describe('fetchApiKeyCredentials', () => {
    // Minimal credential item as stored in DynamoDB.
    const cred = (sortKey: string, jurisdictionId: string) => ({
      entityType: 'ApiKeyCredential',
      sortKey,
      jti: sortKey,
      jurisdictionId,
      status: 'active',
      createdBy: 'seed',
    })

    it('follows LastEvaluatedKey so results are not truncated at the 1MB page limit', async () => {
      const dynamo = new Dynamo()
      mockSend.mockImplementation((command) => {
        const name = command.constructor.name
        if (name === 'QueryCommand') {
          // First page carries a LastEvaluatedKey; the second ends the scan.
          return command.input.ExclusiveStartKey
            ? Promise.resolve({ Items: [cred('p2a', 'J-2')] })
            : Promise.resolve({
                Items: [cred('p1a', 'J-1'), cred('p1b', 'J-1')],
                LastEvaluatedKey: { entityType: 'ApiKeyCredential', sortKey: 'p1b' },
              })
        }
        if (name === 'GetCommand') {
          return Promise.resolve({
            Item: { description: `Desc ${command.input.Key.sortKey}` },
          })
        }
        return Promise.resolve({})
      })

      const result = await dynamo.fetchApiKeyCredentials()

      // All three rows across both pages are returned (not just page one).
      expect(result.map((r) => r.sortKey)).toEqual(['p1a', 'p1b', 'p2a'])
      // The second Query passed the first page's LastEvaluatedKey.
      const queryCalls = mockSend.mock.calls
        .map((c) => c[0])
        .filter((cmd) => cmd.constructor.name === 'QueryCommand')
      expect(queryCalls).toHaveLength(2)
      expect(queryCalls[1].input.ExclusiveStartKey).toEqual({
        entityType: 'ApiKeyCredential',
        sortKey: 'p1b',
      })
    })

    it('resolves each distinct jurisdiction once, not once per credential', async () => {
      const dynamo = new Dynamo()
      mockSend.mockImplementation((command) => {
        const name = command.constructor.name
        if (name === 'QueryCommand') {
          return Promise.resolve({
            Items: [cred('a', 'J-DUP'), cred('b', 'J-DUP'), cred('c', 'J-DUP')],
          })
        }
        if (name === 'GetCommand') {
          return Promise.resolve({ Item: { description: 'Dup' } })
        }
        return Promise.resolve({})
      })

      const result = await dynamo.fetchApiKeyCredentials()

      expect(result).toHaveLength(3)
      const getCalls = mockSend.mock.calls
        .map((c) => c[0])
        .filter((cmd) => cmd.constructor.name === 'GetCommand')
      // Three credentials sharing one jurisdiction => a single jurisdiction read.
      expect(getCalls).toHaveLength(1)
      expect(result.every((r) => r.jurisdictionDescription === 'Dup')).toBe(true)
    })
  })

  // `getJurisdiction`'s memo has no TTL and no invalidation, and it now feeds the
  // ownership check in lib/security/apiKeyAuthz (a jurisdiction's `prefix` decides
  // access). Caching a MISS would therefore pin "this jurisdiction does not exist"
  // for the lifetime of the process — locking an organization out until redeploy
  // once the IGDD-3258 backfill creates the row or populates its `prefix`.
  describe('getJurisdiction caching', () => {
    // A fresh instance per test: the memo is per-Dynamo-instance and the shared
    // `dynamo` above has already cached entries from the suites before this one.
    it('caches a hit — a second read issues no further DynamoDB call', async () => {
      const client = new Dynamo()
      mockSend.mockResolvedValue({
        Item: { jurisdictionId: 1000, sortKey: '1000', name: 'AINQ', prefix: 'AINQ' },
      })

      const first = await client.getJurisdiction('1000')
      const second = await client.getJurisdiction('1000')

      expect(first?.prefix).toBe('AINQ')
      expect(second?.prefix).toBe('AINQ')
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('does NOT cache a miss — a later read sees a jurisdiction created since', async () => {
      const client = new Dynamo()
      // Absent on first read (pre-backfill), present on the next.
      mockSend
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          Item: { jurisdictionId: 2000, sortKey: '2000', name: 'NEW', prefix: 'NEWORG' },
        })

      const before = await client.getJurisdiction('2000')
      const after = await client.getJurisdiction('2000')

      expect(before).toBeNull()
      // Would be `null` forever if the miss had been memoized.
      expect(after?.prefix).toBe('NEWORG')
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('normalizes the item the same way fetchJurisdictions does', async () => {
      const client = new Dynamo()
      // useTypes arrives as a native Set (DynamoDB String Set) and `description`
      // is absent — both must be normalized, not passed through raw.
      mockSend.mockResolvedValue({
        Item: {
          jurisdictionId: 3000,
          sortKey: '3000',
          name: 'SOMEORG',
          prefix: 'SOMEORG',
          useTypes: new Set(['PATIENT', 'BOGUS']),
        },
      })

      const jurisdiction = await client.getJurisdiction('3000')

      // Array, not a Set — and filtered to the known enum.
      expect(jurisdiction?.useTypes).toEqual(['PATIENT'])
      // description falls back to name when absent.
      expect(jurisdiction?.description).toBe('SOMEORG')
    })
  })
})
